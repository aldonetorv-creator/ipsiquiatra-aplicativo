// Login do paciente (fase 2, decisão do Dr. Aldo): CPF + código por SMS
// enviado ao celular do cadastro na clínica. As rotas que a plataforma precisa
// ter estão em docs/api-paciente.md; enquanto elas não existem, o app usa a
// versão simulada (mocks/patient-auth.ts).

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
}

export const authTexts = {
  sent: 'Se este CPF estiver no cadastro da clínica, enviamos um código por SMS para o celular cadastrado.',
  invalidCpf: 'Confira o CPF: os números não formam um CPF válido.',
  wrongCode: 'Código incorreto.',
  expired: 'Este código expirou. Peça um novo código.',
  locked: 'Muitas tentativas com este código. Peça um novo código.',
  rateLimited: 'Muitos pedidos seguidos. Aguarde um pouco e tente de novo.',
  offline: 'Sem conexão. Verifique a internet e tente de novo.',
  notReceived:
    'Não recebeu? O celular do cadastro pode estar desatualizado. Fale com a Patrícia ou com a clínica.',
};
