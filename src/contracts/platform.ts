import type {
  BookingConfirm,
  BookingData,
  BookingPath,
  CancelConfirm,
  IdentifyData,
  NoAiReportData,
  PatriciaSlot,
  RescheduleConfirm,
} from '@/contracts/patricia';

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: 'not_available' | 'not_authorized' | 'validation_failed';
    message: string;
  };
  requestId: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type ConsentRecord = {
  policyVersion: string;
  acceptedAt: string | null;
  status: 'not_requested' | 'accepted' | 'revoked';
};

export type AppointmentModality = 'telemedicine' | 'in_person';

// `photoUrl`: a foto que o médico envia em "Perfil médico" na plataforma, a
// mesma do site (docs/fases.md). Sem foto, o app mostra as iniciais.
export type Doctor = {
  name: string;
  specialty: string;
  photoUrl: string | null;
};

// Consulta do paciente com o médico. `startsAt` em ISO 8601 (UTC).
export type Appointment = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  modality: AppointmentModality;
  status: 'scheduled' | 'completed';
  doctor: Doctor;
};

export type DocumentKind =
  | 'care_plan'
  | 'prescription'
  | 'exam_request'
  | 'report'
  | 'invoice'
  | 'certificate'
  | 'guidance';

export type DocumentMetadata = {
  id: string;
  displayName: string;
  kind: DocumentKind;
  createdAt: string;
  // Consulta a que o documento pertence (o Cofre agrupa por ela); null para
  // documentos avulsos.
  appointmentId: string | null;
  // 'pending': ainda não emitido. A nota fiscal fica assim até 24 horas
  // depois da realização da consulta (docs/fases.md).
  availability: 'mock_only' | 'available' | 'pending' | 'expired';
};

export const MESSAGE_MAX_LENGTH = 1000;
export const MOOD_NOTE_MAX_LENGTH = 300;

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type TextMessage = {
  id: string;
  kind: 'text';
  author: 'patricia' | 'patient';
  text: string;
  sentAt: string;
  // Respostas da Patrícia real: horários para o paciente tocar e o bloco de
  // emergência (o servidor detectou um sinal de crise).
  slots?: PatriciaSlot[];
  crisis?: boolean;
};

// Cartão "Diário de humor" enviado pela Patrícia; `answer` fica null até o
// paciente registrar.
export type MoodCheckMessage = {
  id: string;
  kind: 'mood_check';
  author: 'patricia';
  text: string;
  sentAt: string;
  answer: MoodLevel | null;
};

// Cartões da Patrícia real (os mesmos do chat do site). `open`: esperando o
// paciente; `done`: concluído; `closed`: expirou ou foi deixado de lado.
export type PatriciaCard =
  | { type: 'consent' }
  | { type: 'booking'; confirm: BookingConfirm }
  | { type: 'reschedule'; confirm: RescheduleConfirm }
  | { type: 'cancel'; confirm: CancelConfirm }
  | { type: 'identify'; action: 'cancelar' | 'remarcar' }
  | { type: 'report' };

export type PatriciaCardMessage = {
  id: string;
  kind: 'patricia_card';
  author: 'patricia';
  // Título do cartão (aparece também na Início).
  text: string;
  sentAt: string;
  card: PatriciaCard;
  status: 'open' | 'done' | 'closed';
  // Resumo do que aconteceu, depois de concluído ou fechado.
  note?: string;
};

export type ConversationMessage = TextMessage | MoodCheckMessage | PatriciaCardMessage;

// O que o paciente fez num cartão da Patrícia.
export type PatriciaCardAction =
  | { type: 'confirm' }
  | { type: 'confirm_booking'; declared: BookingPath; data: BookingData }
  | { type: 'release' }
  | { type: 'keep' }
  | { type: 'identify'; data: IdentifyData }
  | { type: 'report'; data: NoAiReportData };

// Resultado de um cartão: mensagens a inserir ou atualizar e, quando o cartão
// continua aberto, os avisos dos campos ou um aviso geral.
export type PatriciaCardOutcome = {
  messages: ConversationMessage[];
  fieldErrors?: Record<string, string>;
  notice?: string;
  // "Já sou paciente" sem cadastro encontrado: oferecer um cadastro novo.
  offerNewRecord?: boolean;
};

export type MoodEntry = {
  id: string;
  checkId: string;
  level: MoodLevel;
  note: string | null;
  recordedAt: string;
};

export const QUESTIONNAIRE_TEXT_MAX_LENGTH = 1000;

export type QuestionnaireQuestion =
  | {
      id: string;
      prompt: string;
      type: 'scale';
      options: string[];
      required: boolean;
      // Pergunta de segurança (item 9 do PHQ-9): qualquer resposta além da
      // primeira opção mostra na hora as orientações de emergência.
      safety?: boolean;
    }
  | { id: string; prompt: string; type: 'text'; required: boolean };

// Questionário que o médico pede antes da consulta. Os textos são os mesmos
// da plataforma (docs/fases.md, "Uma só Patrícia por médico").
export type Questionnaire = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  // Consulta para a qual o médico pediu as respostas.
  appointmentId: string | null;
  questions: QuestionnaireQuestion[];
  answeredAt: string | null;
};

// Resposta de cada pergunta pelo `id`: o texto da opção escolhida ou o texto
// livre digitado.
export type QuestionnaireAnswers = Record<string, string>;

export type SubmitQuestionnaireInput = {
  questionnaireId: string;
  answers: QuestionnaireAnswers;
};

// Pedidos que a Patrícia vai atender de verdade na fase 2 (agenda e NFS-e).
export type PatientService = 'schedule_appointment' | 'reschedule_appointment' | 'request_invoice';

export type RecordMoodInput = {
  checkId: string;
  level: MoodLevel;
  note: string | null;
};

// As operações da conversa devolvem as mensagens a inserir ou atualizar
// (pelo `id`) na tela, na ordem em que aparecem.
export interface PatientAppGateway {
  // Consultas do paciente, da mais antiga para a mais recente.
  listAppointments(): Promise<ApiResult<Appointment[]>>;
  listDocuments(): Promise<ApiResult<DocumentMetadata[]>>;
  readConsent(): Promise<ApiResult<ConsentRecord>>;
  listConversation(): Promise<ApiResult<ConversationMessage[]>>;
  sendMessage(text: string): Promise<ApiResult<ConversationMessage[]>>;
  requestMoodCheck(): Promise<ApiResult<ConversationMessage[]>>;
  recordMood(
    input: RecordMoodInput
  ): Promise<ApiResult<{ entry: MoodEntry; messages: ConversationMessage[] }>>;
  requestService(service: PatientService): Promise<ApiResult<ConversationMessage[]>>;
  // Registros de humor do paciente, do mais antigo para o mais recente.
  listMoodEntries(): Promise<ApiResult<MoodEntry[]>>;
  // Apaga a conversa e os registros de humor e recomeça a conversa.
  clearHistory(): Promise<ApiResult<ConversationMessage[]>>;
  // Patrícia de verdade (a mesma do site): 'live' quando o app está ligado à
  // plataforma; 'demo', com respostas fixas, quando não está.
  patriciaMode(): 'live' | 'demo';
  // Termo da conversa com IA: concordar abre a conversa; recusar oferece o
  // relato sem IA.
  answerPatriciaTerms(accept: boolean): Promise<ApiResult<ConversationMessage[]>>;
  pickSlot(messageId: string, slotId: string): Promise<ApiResult<ConversationMessage[]>>;
  submitPatriciaCard(
    cardId: string,
    action: PatriciaCardAction
  ): Promise<ApiResult<PatriciaCardOutcome>>;
  // O paciente saiu do app (triagem pela metade vira SMS com o link).
  leavePatricia(): Promise<void>;
  // Questionários pedidos pelo médico, na ordem em que devem ser respondidos.
  listQuestionnaires(): Promise<ApiResult<Questionnaire[]>>;
  // `safetyTriggered`: a resposta de segurança pede as orientações de
  // emergência (e, na fase 2, o aviso ao médico).
  submitQuestionnaire(
    input: SubmitQuestionnaireInput
  ): Promise<ApiResult<{ questionnaire: Questionnaire; safetyTriggered: boolean }>>;
}
