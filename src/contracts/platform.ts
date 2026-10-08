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

export type DocumentMetadata = {
  id: string;
  displayName: string;
  kind: 'receipt' | 'certificate' | 'guidance';
  createdAt: string;
  availability: 'mock_only' | 'available' | 'expired';
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

export type RecordMoodInput = {
  checkId: string;
  level: MoodLevel;
  note: string | null;
};

// As operações da conversa devolvem as mensagens a inserir ou atualizar
// (pelo `id`) na tela, na ordem em que aparecem.
export interface PatientAppGateway {
  listDocuments(): Promise<ApiResult<DocumentMetadata[]>>;
  readConsent(): Promise<ApiResult<ConsentRecord>>;
  listConversation(): Promise<ApiResult<ConversationMessage[]>>;
  sendMessage(text: string): Promise<ApiResult<ConversationMessage[]>>;
  requestMoodCheck(): Promise<ApiResult<ConversationMessage[]>>;
  recordMood(
    input: RecordMoodInput
  ): Promise<ApiResult<{ entry: MoodEntry; messages: ConversationMessage[] }>>;
}
