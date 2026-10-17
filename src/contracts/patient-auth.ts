// Login do paciente (fase 2, decisão do Dr. Aldo): CPF + código por SMS
// enviado ao celular do cadastro na clínica. As rotas da plataforma
// estão em docs/api-paciente.md. A versão real fica em
// services/patient-auth-api.ts; a simulada (mocks/patient-auth.ts) segue no
// modo demonstração (config/platform.ts).

// Desafio de login: o código foi pedido e vale por `expiresInSec`. Ele volta
// igual para CPF fora do cadastro, para não revelar quem é paciente.
export type LoginChallenge = {
  challengeId: string;
  expiresInSec: number;
  // Tempo até poder pedir outro código.
  resendInSec: number;
};

export type PatientSession = {
  token: string;
  expiresAt: string;
  patient: { firstName: string };
};

export type AuthFailureReason =
  | 'invalid_cpf'
  | 'wrong_code'
  | 'expired'
  | 'locked'
  | 'rate_limited'
  | 'offline'
  | 'unavailable';

export type AuthFailure = {
  ok: false;
  reason: AuthFailureReason;
  message: string;
  // wrong_code: tentativas que ainda restam neste código.
  attemptsLeft?: number;
  // rate_limited: quando dá para tentar de novo.
  retryInSec?: number;
};

export type AuthResult<T> = { ok: true; data: T } | AuthFailure;

export interface PatientAuthApi {
  startLogin(cpf: string): Promise<AuthResult<LoginChallenge>>;
  resendCode(challengeId: string): Promise<AuthResult<LoginChallenge>>;
  verifyCode(challengeId: string, code: string): Promise<AuthResult<PatientSession>>;
  logout(token: string): Promise<void>;
  // Confere, ao abrir o app, se a sessão salva ainda vale na plataforma (GET
  // /me). 'unknown' quando não deu para saber (sem conexão): a sessão fica.
  // A demonstração não tem.
  checkSession?(token: string): Promise<SessionCheck>;
}

export type SessionCheck =
  | { status: 'valid'; firstName: string }
  | { status: 'signed_out' }
  | { status: 'unknown' };

export const authTexts = {
  // Igual para quem está ou não no cadastro: não revela quem é paciente.
  sent: 'Se o CPF estiver no cadastro da clínica, você vai receber o código por SMS.',
  invalidCpf: 'Confira o CPF: os números não formam um CPF válido.',
  wrongCode: 'Código incorreto.',
  expired: 'Este código expirou. Peça um novo código.',
  locked: 'Muitas tentativas com este código. Peça um novo código.',
  rateLimited: 'Muitos pedidos seguidos. Aguarde um pouco e tente de novo.',
  offline: 'Sem conexão. Verifique a internet e tente de novo.',
  unavailable: 'Não foi possível falar com a clínica agora. Tente de novo em instantes.',
  // O app não troca o celular do cadastro: só a clínica (decisão do Dr. Aldo,
  // 12/10/2026). Assim ninguém troca o celular de outra pessoa pelo app.
  notReceived: 'Se o seu celular mudou, atualize o cadastro diretamente com a clínica.',
};
