// Rotas da Patrícia na plataforma (patricia-service.mjs e patricia-chat.js, no
// repositório aldonetorv-creator/ipsiquiatra). Uma só Patrícia por médico, com
// a mesma lógica no site e no app (docs/fases.md). A IA nunca escreve na
// agenda: ela prepara, e só o toque do paciente num cartão confirma.
//
// Duas versões das rotas (services/patricia-api.ts):
// - a pública do site (/api/public/patricia/<slug>), que não sabe quem
//   escreve: os cartões pedem nome, celular, CPF e nascimento (modo 'demo');
// - a do paciente identificado (/api/patient-app/<slug>/patricia, com o token
//   do login, docs/api-paciente.md): os dados vêm do cadastro, sem cartão de
//   identificação e sem formulário (modo 'real').

export type PatriciaSlot = { id: string; label: string };

// "Já faz acompanhamento" (procura o cadastro por CPF e nascimento) ou
// "primeira consulta" (pede o cadastro).
export type BookingPath = 'paciente' | 'primeira';

export type BookingConfirm = {
  kind: 'booking';
  holdId: string;
  when: string;
  expiresInSec?: number;
  declared?: BookingPath;
  modalityLabel?: string;
  where?: string;
};

export type RescheduleConfirm = {
  kind: 'reschedule';
  holdId: string;
  from: string;
  when: string;
  expiresInSec?: number;
};

export type CancelConfirm = { kind: 'cancel'; when: string };

export type PatriciaConfirm = BookingConfirm | RescheduleConfirm | CancelConfirm;

export type PatriciaIdentify = { action: 'cancelar' | 'remarcar' };

// Uma rodada de conversa. `bubbles` traz a resposta e os balões seguintes
// (o primeiro é igual a `reply`).
export type PatriciaTurn = {
  reply: string;
  bubbles?: string[];
  slots?: PatriciaSlot[];
  confirm?: PatriciaConfirm | null;
  identify?: PatriciaIdentify | null;
  // Paciente identificado com mais de uma consulta futura: a Patrícia pergunta
  // qual mudar, com um botão para cada uma (o toque volta em /message).
  appointments?: PatriciaSlot[];
  crisis?: boolean;
};

// Campos que o servidor manda nas recusas e avisos.
export type PatriciaFields = {
  ok?: boolean;
  error?: string;
  message?: string;
  errors?: Record<string, string>;
  expired?: boolean;
  gone?: boolean;
  notFound?: boolean;
  locked?: boolean;
  limit?: boolean;
  crisis?: boolean;
  // Rota do paciente identificado: o token do login não vale mais.
  reason?: string;
};

// Resposta HTTP já lida: `ok` só quando o status é 2xx e o corpo não diz
// `ok: false`. As chamadas devolvem null quando não há conexão.
export type PatriciaResponse<T> = {
  status: number;
  ok: boolean;
  data: Partial<T> & PatriciaFields;
};

export type BookingData = {
  name?: string;
  phone?: string;
  noCpf?: boolean;
  cpf?: string;
  birthDate?: string;
  responsibleName?: string;
  responsibleCpf?: string;
};

export type IdentifyData = {
  noCpf: boolean;
  cpf: string;
  name: string;
  birthDate: string;
  date: string;
  time: string;
};

// Com o paciente identificado, só o texto: nome e celular vêm do cadastro.
export type NoAiReportData = { name?: string; phone?: string; text: string };

export type PatriciaMessagePayload = {
  text?: string;
  slot?: string;
  continue?: true;
  // Rota do paciente identificado: a consulta tocada entre as oferecidas.
  appointment?: string;
};

type Call<T> = Promise<PatriciaResponse<T> | null>;

export interface PatriciaApi {
  // true: rota do paciente identificado (os dados vêm do cadastro do login).
  readonly identified?: boolean;
  info(): Call<{ doctor: string; greeting: string; available: boolean }>;
  // Exige o consentimento do paciente (o termo da conversa com IA).
  startSession(): Call<{ session: string }>;
  message(session: string, payload: PatriciaMessagePayload): Call<PatriciaTurn>;
  // Reserva nova (com o cadastro, na rota pública) ou remarcação e reserva do
  // paciente identificado (só o holdId).
  confirm(
    session: string,
    holdId: string,
    booking?: { declared: BookingPath; data: BookingData }
  ): Call<{ message: string; bubbles: string[]; when: string }>;
  releaseHold(session: string): Call<object>;
  cancelChange(session: string): Call<{ message: string; when: string }>;
  // Só na rota pública.
  identify(session: string, data: IdentifyData): Call<{ when: string; continue: boolean }>;
  // Relato para o médico, sem IA, de quem não concordou com o termo.
  noAiReport(data: NoAiReportData): Call<{ message: string }>;
  // O paciente saiu do app com a triagem pela metade: o servidor manda o link por SMS.
  leave(session: string): Call<object>;
}
