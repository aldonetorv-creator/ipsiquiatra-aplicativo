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

// Consulta do paciente com o médico. `startsAt` em ISO 8601 (UTC).
export type Appointment = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  modality: AppointmentModality;
  status: 'scheduled' | 'completed';
  doctor: { name: string; specialty: string };
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

export type ConversationMessage = TextMessage | MoodCheckMessage;

export type MoodEntry = {
  id: string;
  checkId: string;
  level: MoodLevel;
  note: string | null;
  recordedAt: string;
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
}
