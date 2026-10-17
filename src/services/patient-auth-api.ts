import {
  AuthFailure,
  AuthFailureReason,
  AuthResult,
  authTexts,
  LoginChallenge,
  PatientAuthApi,
  PatientSession,
  SessionCheck,
} from '@/contracts/patient-auth';
import {
  createPatientAppHttp,
  PatientAppHttpOptions,
  PatientAppReply,
  signedOutReply,
  succeeded,
} from '@/services/patient-app-http';

const messages: Record<AuthFailureReason, string> = {
  invalid_cpf: authTexts.invalidCpf,
  wrong_code: authTexts.wrongCode,
  expired: authTexts.expired,
  locked: authTexts.locked,
  rate_limited: authTexts.rateLimited,
  offline: authTexts.offline,
  unavailable: authTexts.unavailable,
};

const failure = (reason: AuthFailureReason, extra: Partial<AuthFailure> = {}): AuthFailure => ({
  ok: false,
  reason,
  message: messages[reason],
  ...extra,
});

const count = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.ceil(value) : undefined;

// Os erros da plataforma (patient-app-service.mjs): 400 invalid_cpf, 401
// wrong_code com attemptsLeft, 410 expired, 423 locked e 429 rate_limited com
// retryInSec. Sem resposta, 'offline'; o resto (5xx, endereço desconhecido,
// resposta estranha), 'unavailable'.
function failureOf(reply: PatientAppReply): AuthFailure {
  if (!reply) return failure('offline');
  const { status, body } = reply;
  const reason = body.reason;
  if (status === 400 && reason === 'invalid_cpf') return failure('invalid_cpf');
  if (status === 401 && reason === 'wrong_code') {
    const attemptsLeft = count(body.attemptsLeft);
    return failure('wrong_code', attemptsLeft === undefined ? {} : { attemptsLeft });
  }
  if (status === 410) return failure('expired');
  if (status === 423) return failure('locked');
  if (status === 429) {
    const retryInSec = count(body.retryInSec);
    return failure('rate_limited', retryInSec === undefined ? {} : { retryInSec });
  }
  return failure('unavailable');
}

function challengeOf(reply: PatientAppReply): AuthResult<LoginChallenge> {
  if (!succeeded(reply)) return failureOf(reply);
  const { challengeId, expiresInSec, resendInSec } = reply.body;
  if (typeof challengeId !== 'string' || !challengeId) return failure('unavailable');
  return {
    ok: true,
    data: {
      challengeId,
      expiresInSec: count(expiresInSec) ?? 10 * 60,
      resendInSec: count(resendInSec) ?? 60,
    },
  };
}

function sessionOf(reply: PatientAppReply): AuthResult<PatientSession> {
  if (!succeeded(reply)) return failureOf(reply);
  const { token, expiresAt, patient } = reply.body;
  const firstName = (patient as { firstName?: unknown } | undefined)?.firstName;
  if (typeof token !== 'string' || !token || typeof expiresAt !== 'string') {
    return failure('unavailable');
  }
  if (Number.isNaN(Date.parse(expiresAt))) return failure('unavailable');
  return {
    ok: true,
    data: {
      token,
      expiresAt,
      patient: { firstName: typeof firstName === 'string' ? firstName : '' },
    },
  };
}

const digits = (value: string) => value.replace(/\D/g, '');

// Login de verdade (docs/api-paciente.md): CPF + código por SMS nas rotas
// /api/patient-app/<slug>/auth/* da plataforma.
export function createPatientAuthHttpApi(options: PatientAppHttpOptions): PatientAuthApi {
  const request = createPatientAppHttp(options);
  return {
    async startLogin(cpf) {
      // O CPF só vai à plataforma; não fica salvo no celular.
      return challengeOf(await request('/auth/start', { body: { cpf: digits(cpf) } }));
    },
    async resendCode(challengeId) {
      return challengeOf(await request('/auth/resend', { body: { challengeId } }));
    },
    async verifyCode(challengeId, code) {
      return sessionOf(await request('/auth/verify', { body: { challengeId, code } }));
    },
    // "Sair" sempre apaga a sessão do celular, com ou sem resposta.
    async logout(token) {
      await request('/auth/logout', { body: {}, token });
    },
    async checkSession(token): Promise<SessionCheck> {
      const reply = await request('/me', { token });
      if (signedOutReply(reply)) return { status: 'signed_out' };
      if (!succeeded(reply)) return { status: 'unknown' };
      const firstName = (reply.body.patient as { firstName?: unknown } | undefined)?.firstName;
      return { status: 'valid', firstName: typeof firstName === 'string' ? firstName : '' };
    },
  };
}
