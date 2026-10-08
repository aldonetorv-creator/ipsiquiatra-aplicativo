import {
  ApiFailure,
  ApiResult,
  ConsentRecord,
  ConversationMessage,
  DocumentMetadata,
  MESSAGE_MAX_LENGTH,
  MOOD_NOTE_MAX_LENGTH,
  MoodCheckMessage,
  MoodEntry,
  PatientAppGateway,
  PatientService,
  TextMessage,
} from '@/contracts/platform';
import { createMemoryStore, KeyValueStore } from '@/services/storage';
import { dayKey } from '@/utils/time';

const REQUEST_ID = 'local-sprint-zero';

const mockResult = <T>(data: T): ApiResult<T> => ({
  ok: true,
  data,
  requestId: REQUEST_ID,
});

const validationFailure = (message: string): ApiFailure => ({
  ok: false,
  error: { code: 'validation_failed', message },
  requestId: REQUEST_ID,
});

// Documentos fictícios: nenhum dado real de paciente nem arquivo armazenado.
export const mockDocuments: DocumentMetadata[] = [
  {
    id: 'mock-certificate',
    displayName: 'Atestado de comparecimento',
    kind: 'certificate',
    createdAt: '2026-01-15',
    availability: 'mock_only',
  },
  {
    id: 'mock-receipt',
    displayName: 'Recibo de consulta',
    kind: 'receipt',
    createdAt: '2026-01-15',
    availability: 'mock_only',
  },
  {
    id: 'mock-guidance',
    displayName: 'Orientações gerais',
    kind: 'guidance',
    createdAt: '2026-01-15',
    availability: 'mock_only',
  },
];

// Respostas fixas: a Patrícia desta versão não lê nem interpreta o que o
// paciente escreve (sem IA e sem conteúdo clínico, conforme a issue #1).
export const patriciaScript = {
  greeting:
    'Oi! Eu sou a Patrícia, assistente do Dr. Aldo. Estou aqui para ajudar com consultas, documentos e lembretes.',
  moodCheck: 'Como você está se sentindo hoje?',
  moodCheckAgain: 'Como você está se sentindo agora?',
  afterMood: 'Obrigada por me contar como você está. Estou aqui com você. 💙',
  afterMessage:
    'Recebi sua mensagem. Nesta versão de demonstração eu ainda não consigo ler nem responder o que você escreve.',
  // Agenda e nota fiscal chegam na fase 2; por enquanto a Patrícia orienta.
  services: {
    schedule_appointment: {
      request: 'Quero agendar uma consulta.',
      reply:
        'Em breve vou poder agendar sua consulta por aqui. Por enquanto, fale com a equipe do consultório.',
    },
    reschedule_appointment: {
      request: 'Preciso remarcar minha consulta.',
      reply:
        'Em breve vou poder remarcar sua consulta por aqui. Por enquanto, fale com a equipe do consultório.',
    },
    request_invoice: {
      request: 'Quero pedir a nota fiscal.',
      reply:
        'Em breve vou poder enviar sua nota fiscal por aqui. Por enquanto, fale com a equipe do consultório.',
    },
  } satisfies Record<PatientService, { request: string; reply: string }>,
};

type MockOptions = {
  now?: () => Date;
  // Onde o histórico fica salvo; por padrão, só em memória (testes).
  store?: KeyValueStore;
};

export const HISTORY_STORAGE_KEY = 'ipsiquiatra:patient-history';

// Formato salvo no aparelho. Mudou o formato? Suba a versão e trate a migração.
type PersistedHistory = {
  version: 1;
  sequence: number;
  conversation: ConversationMessage[];
  moodEntries: MoodEntry[];
};

function parseHistory(raw: string | null): PersistedHistory | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<PersistedHistory>;
    if (
      data.version !== 1 ||
      typeof data.sequence !== 'number' ||
      !Array.isArray(data.conversation) ||
      !Array.isArray(data.moodEntries)
    ) {
      return null;
    }
    return data as PersistedHistory;
  } catch {
    return null;
  }
}

export function createMockPatientAppGateway({
  now = () => new Date(),
  store = createMemoryStore(),
}: MockOptions = {}): PatientAppGateway {
  let history: PersistedHistory | null = null;
  let loading: Promise<PersistedHistory> | null = null;

  const nextId = (prefix: string) => `${prefix}-${++history!.sequence}`;

  const text = (author: TextMessage['author'], body: string): TextMessage => ({
    id: nextId('msg'),
    kind: 'text',
    author,
    text: body,
    sentAt: now().toISOString(),
  });

  const moodCheck = (body: string): MoodCheckMessage => ({
    id: nextId('mood-check'),
    kind: 'mood_check',
    author: 'patricia',
    text: body,
    sentAt: now().toISOString(),
    answer: null,
  });

  const seed = () => {
    history = { version: 1, sequence: 0, conversation: [], moodEntries: [] };
    history.conversation.push(text('patricia', patriciaScript.greeting));
    history.conversation.push(moodCheck(patriciaScript.moodCheck));
    return history;
  };

  // Carrega o histórico salvo uma única vez; sem histórico válido, começa do zero.
  const load = () => {
    if (history) return Promise.resolve(history);
    loading ??= store
      .getItem(HISTORY_STORAGE_KEY)
      .catch(() => null)
      .then((raw) => {
        history = parseHistory(raw) ?? seed();
        return history;
      });
    return loading;
  };

  const save = async () => {
    await store.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  };

  const append = async (...messages: ConversationMessage[]) => {
    history!.conversation.push(...messages);
    await save();
    return messages;
  };

  // Diário: a cada novo dia, a Patrícia pergunta de novo como o paciente está.
  const ensureTodayMoodCheck = async () => {
    const today = dayKey(now());
    const askedToday = history!.conversation.some(
      (message) => message.kind === 'mood_check' && dayKey(new Date(message.sentAt)) === today
    );
    if (!askedToday) await append(moodCheck(patriciaScript.moodCheck));
  };

  return {
    async listDocuments() {
      return mockResult(mockDocuments);
    },
    async readConsent(): Promise<ApiResult<ConsentRecord>> {
      return mockResult({
        policyVersion: 'not-published',
        acceptedAt: null,
        status: 'not_requested',
      });
    },
    async listConversation() {
      await load();
      await ensureTodayMoodCheck();
      return mockResult([...history!.conversation]);
    },
    async sendMessage(body) {
      const trimmed = body.trim();
      if (trimmed.length === 0) {
        return validationFailure('Escreva uma mensagem antes de enviar.');
      }
      if (trimmed.length > MESSAGE_MAX_LENGTH) {
        return validationFailure(`A mensagem pode ter até ${MESSAGE_MAX_LENGTH} caracteres.`);
      }
      await load();
      return mockResult(
        await append(text('patient', trimmed), text('patricia', patriciaScript.afterMessage))
      );
    },
    async requestMoodCheck() {
      await load();
      return mockResult(await append(moodCheck(patriciaScript.moodCheckAgain)));
    },
    async recordMood({ checkId, level, note }) {
      const { conversation, moodEntries } = await load();
      const index = conversation.findIndex(
        (message) => message.id === checkId && message.kind === 'mood_check'
      );
      const check = conversation[index] as MoodCheckMessage | undefined;
      if (!check) {
        return validationFailure('Registro de humor não encontrado.');
      }
      if (check.answer !== null) {
        return validationFailure('Este registro de humor já foi feito.');
      }
      const trimmedNote = note?.trim() || null;
      if (trimmedNote && trimmedNote.length > MOOD_NOTE_MAX_LENGTH) {
        return validationFailure(`A nota pode ter até ${MOOD_NOTE_MAX_LENGTH} caracteres.`);
      }

      const answered: MoodCheckMessage = { ...check, answer: level };
      conversation[index] = answered;
      const entry: MoodEntry = {
        id: nextId('mood'),
        checkId,
        level,
        note: trimmedNote,
        recordedAt: now().toISOString(),
      };
      moodEntries.push(entry);
      const reply = await append(text('patricia', patriciaScript.afterMood));
      return mockResult({ entry, messages: [answered, ...reply] });
    },
    async requestService(service) {
      const script = patriciaScript.services[service];
      if (!script) return validationFailure('Serviço desconhecido.');
      await load();
      return mockResult(
        await append(text('patient', script.request), text('patricia', script.reply))
      );
    },
    async listMoodEntries() {
      const { moodEntries } = await load();
      return mockResult([...moodEntries]);
    },
    async clearHistory() {
      await store.removeItem(HISTORY_STORAGE_KEY);
      seed();
      await save();
      return mockResult([...history!.conversation]);
    },
  };
}

export const mockPatientAppGateway = createMockPatientAppGateway();
