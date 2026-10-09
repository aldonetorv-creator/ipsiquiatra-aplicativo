import {
  ApiFailure,
  ApiResult,
  Appointment,
  ConsentRecord,
  ConversationMessage,
  Doctor,
  DocumentMetadata,
  MESSAGE_MAX_LENGTH,
  MOOD_NOTE_MAX_LENGTH,
  MoodCheckMessage,
  MoodEntry,
  PatientAppGateway,
  PatientService,
  QUESTIONNAIRE_TEXT_MAX_LENGTH,
  Questionnaire,
  QuestionnaireAnswers,
  TextMessage,
} from '@/contracts/platform';
import { mockQuestionnaireDefinitions } from '@/mocks/questionnaires';
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

// Sem foto na demonstração: este repositório é público. Na fase 2 a foto vem
// do "Perfil médico" da plataforma.
export const mockDoctor: Doctor = {
  name: 'Dr. Aldo Araújo',
  specialty: 'Psiquiatra',
  photoUrl: null,
};

// Consultas fictícias, em datas relativas ao dia de hoje para a demonstração
// sempre ter uma consulta passada recente e uma próxima.
export function mockAppointments(now: Date): Appointment[] {
  const at = (daysFromToday: number, hour: number, minute = 0) =>
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysFromToday,
      hour,
      minute
    ).toISOString();
  // Acompanhamento mensal: seis consultas realizadas e a próxima marcada.
  const schedule: [number, number, number, Appointment['modality']][] = [
    [-160, 10, 0, 'in_person'],
    [-127, 15, 0, 'in_person'],
    [-95, 10, 0, 'telemedicine'],
    [-64, 14, 30, 'telemedicine'],
    [-36, 9, 30, 'in_person'],
    [-8, 14, 30, 'telemedicine'],
  ];
  const past: Appointment[] = schedule.map(([days, hour, minute, modality], index) => ({
    id: `appt-${index + 1}`,
    startsAt: at(days, hour, minute),
    durationMinutes: 60,
    modality,
    status: 'completed',
    doctor: mockDoctor,
  }));
  return [
    ...past,
    {
      id: `appt-${past.length + 1}`,
      startsAt: at(7, 14, 30),
      durationMinutes: 60,
      modality: 'telemedicine',
      status: 'scheduled',
      doctor: mockDoctor,
    },
  ];
}

const INVOICE_DELAY_MS = 24 * 60 * 60 * 1000;

// A nota fiscal sai 24 horas depois da realização da consulta (docs/fases.md).
function invoiceIssueTime(appointment: Appointment) {
  const end = new Date(appointment.startsAt).getTime() + appointment.durationMinutes * 60000;
  return end + INVOICE_DELAY_MS;
}

export function invoiceIsDue(appointment: Appointment, now: Date) {
  return now.getTime() >= invoiceIssueTime(appointment);
}

// Documentos fictícios: nenhum dado real de paciente nem arquivo armazenado.
export function mockDocuments(appointments: Appointment[], now: Date): DocumentMetadata[] {
  const documents: DocumentMetadata[] = [];
  const add = (
    appointment: Appointment | null,
    id: string,
    kind: DocumentMetadata['kind'],
    displayName: string
  ) =>
    documents.push({
      id,
      displayName,
      kind,
      createdAt: appointment?.startsAt ?? now.toISOString(),
      appointmentId: appointment?.id ?? null,
      availability: 'mock_only',
    });

  const completed = appointments.filter((item) => item.status === 'completed');
  completed.forEach((appointment, index) => {
    const isFirst = index === 0;
    const isLast = index === completed.length - 1;
    const id = (name: string) => `doc-${name}-${appointment.id}`;
    add(appointment, id('report'), 'report', 'Relatório da consulta');
    add(appointment, id('prescription'), 'prescription', 'Receita');
    if (isFirst) add(appointment, id('certificate'), 'certificate', 'Atestado de comparecimento');
    if (isLast) {
      add(appointment, id('care-plan'), 'care_plan', 'Plano de cuidados');
      add(appointment, id('exams'), 'exam_request', 'Solicitação de exames');
    }
    const due = invoiceIsDue(appointment, now);
    documents.push({
      id: id('invoice'),
      displayName: 'Nota fiscal',
      kind: 'invoice',
      createdAt: due ? new Date(invoiceIssueTime(appointment)).toISOString() : appointment.startsAt,
      appointmentId: appointment.id,
      availability: due ? 'mock_only' : 'pending',
    });
  });
  add(null, 'doc-guidance', 'guidance', 'Orientações gerais');
  return documents;
}

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
export const QUESTIONNAIRES_STORAGE_KEY = 'ipsiquiatra:questionnaires';

// Respostas salvas no aparelho, por questionário. Na fase 2 vão para o
// prontuário (docs/fases.md, "Contexto e prontuário").
type PersistedResponses = {
  version: 1;
  responses: Record<string, { answers: QuestionnaireAnswers; answeredAt: string }>;
};

function parseResponses(raw: string | null): PersistedResponses {
  try {
    const data = raw ? (JSON.parse(raw) as Partial<PersistedResponses>) : null;
    if (data?.version === 1 && data.responses && typeof data.responses === 'object') {
      return data as PersistedResponses;
    }
  } catch {
    // Dado corrompido: recomeça sem respostas.
  }
  return { version: 1, responses: {} };
}

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

  // Fixas desde a criação do gateway; a situação da nota fiscal segue o relógio.
  const appointments = mockAppointments(now());
  // Os questionários são pedidos para a próxima consulta.
  const nextAppointmentId =
    appointments.find((item) => item.status === 'scheduled')?.id ?? null;

  let responses: Promise<PersistedResponses> | null = null;
  const loadResponses = () =>
    (responses ??= store
      .getItem(QUESTIONNAIRES_STORAGE_KEY)
      .catch(() => null)
      .then(parseResponses));

  const questionnaire = (
    definition: (typeof mockQuestionnaireDefinitions)[number],
    saved: PersistedResponses
  ): Questionnaire => ({
    ...definition,
    appointmentId: nextAppointmentId,
    answeredAt: saved.responses[definition.id]?.answeredAt ?? null,
  });

  return {
    async listAppointments() {
      return mockResult([...appointments]);
    },
    async listDocuments() {
      return mockResult(mockDocuments(appointments, now()));
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
    async listQuestionnaires() {
      const saved = await loadResponses();
      return mockResult(
        mockQuestionnaireDefinitions.map((definition) => questionnaire(definition, saved))
      );
    },
    async submitQuestionnaire({ questionnaireId, answers }) {
      const definition = mockQuestionnaireDefinitions.find((item) => item.id === questionnaireId);
      if (!definition) return validationFailure('Questionário não encontrado.');
      const saved = await loadResponses();
      if (saved.responses[questionnaireId]) {
        return validationFailure('Este questionário já foi respondido.');
      }

      const cleaned: QuestionnaireAnswers = {};
      let safetyTriggered = false;
      for (const question of definition.questions) {
        const answer = (answers[question.id] ?? '').trim();
        if (!answer) {
          if (question.required) return validationFailure('Responda todas as perguntas.');
          continue;
        }
        if (question.type === 'scale') {
          const index = question.options.indexOf(answer);
          if (index === -1) return validationFailure('Escolha uma das opções em cada pergunta.');
          // Qualquer resposta além de "Nunca ou quase nunca" no item de segurança.
          if (question.safety && index > 0) safetyTriggered = true;
        } else if (answer.length > QUESTIONNAIRE_TEXT_MAX_LENGTH) {
          return validationFailure(
            `Cada resposta pode ter até ${QUESTIONNAIRE_TEXT_MAX_LENGTH} caracteres.`
          );
        }
        cleaned[question.id] = answer;
      }

      // Só marca como respondido depois de salvar no aparelho.
      const next: PersistedResponses = {
        ...saved,
        responses: {
          ...saved.responses,
          [questionnaireId]: { answers: cleaned, answeredAt: now().toISOString() },
        },
      };
      await store.setItem(QUESTIONNAIRES_STORAGE_KEY, JSON.stringify(next));
      responses = Promise.resolve(next);
      return mockResult({ questionnaire: questionnaire(definition, next), safetyTriggered });
    },
  };
}

export const mockPatientAppGateway = createMockPatientAppGateway();
