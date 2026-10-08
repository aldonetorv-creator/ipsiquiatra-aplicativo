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
  TextMessage,
} from '@/contracts/platform';

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
};

type MockOptions = {
  now?: () => Date;
};

export function createMockPatientAppGateway({
  now = () => new Date(),
}: MockOptions = {}): PatientAppGateway {
  let sequence = 0;
  const nextId = (prefix: string) => `${prefix}-${++sequence}`;

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

  const conversation: ConversationMessage[] = [
    text('patricia', patriciaScript.greeting),
    moodCheck(patriciaScript.moodCheck),
  ];

  const append = (...messages: ConversationMessage[]) => {
    conversation.push(...messages);
    return messages;
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
      return mockResult([...conversation]);
    },
    async sendMessage(body) {
      const trimmed = body.trim();
      if (trimmed.length === 0) {
        return validationFailure('Escreva uma mensagem antes de enviar.');
      }
      if (trimmed.length > MESSAGE_MAX_LENGTH) {
        return validationFailure(`A mensagem pode ter até ${MESSAGE_MAX_LENGTH} caracteres.`);
      }
      return mockResult(
        append(text('patient', trimmed), text('patricia', patriciaScript.afterMessage))
      );
    },
    async requestMoodCheck() {
      return mockResult(append(moodCheck(patriciaScript.moodCheckAgain)));
    },
    async recordMood({ checkId, level, note }) {
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
      const reply = append(text('patricia', patriciaScript.afterMood));
      return mockResult({ entry, messages: [answered, ...reply] });
    },
  };
}

export const mockPatientAppGateway = createMockPatientAppGateway();
