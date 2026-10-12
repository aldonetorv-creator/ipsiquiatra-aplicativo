import {
  authTexts,
  AuthResult,
  LoginChallenge,
  PatientAuthApi,
  PatientSession,
} from '@/contracts/patient-auth';
import { isValidCpf } from '@/utils/patient-data';

// Login simulado, com as mesmas regras pedidas à plataforma
// (docs/api-paciente.md): código de 6 números, válido por 10 minutos, 5
// tentativas e novo envio depois de 60 segundos. Na demonstração não há SMS: o
// código é sempre este.
export const DEMO_LOGIN_CODE = '123456';
export const CODE_TTL_SEC = 10 * 60;
export const RESEND_AFTER_SEC = 60;
export const MAX_ATTEMPTS = 5;
const SESSION_DAYS = 30;

type Challenge = { id: string; sentAt: number; attempts: number; used: boolean };

type Options = {
  now?: () => Date;
  firstName?: string;
};

export function createMockPatientAuth({
  now = () => new Date(),
  firstName = 'Maria',
}: Options = {}): PatientAuthApi {
  const challenges = new Map<string, Challenge>();
  let next = 0;

  const issue = (challenge: Challenge): AuthResult<LoginChallenge> => ({
    ok: true,
    data: { challengeId: challenge.id, expiresInSec: CODE_TTL_SEC, resendInSec: RESEND_AFTER_SEC },
  });
  const elapsedSec = (challenge: Challenge) => (now().getTime() - challenge.sentAt) / 1000;

  return {
    async startLogin(cpf) {
      if (!isValidCpf(cpf))
        return { ok: false, reason: 'invalid_cpf', message: authTexts.invalidCpf };
      next += 1;
      const challenge = { id: `demo-${next}`, sentAt: now().getTime(), attempts: 0, used: false };
      challenges.set(challenge.id, challenge);
      return issue(challenge);
    },

    async resendCode(challengeId) {
      const challenge = challenges.get(challengeId);
      if (!challenge || challenge.used) {
        return { ok: false, reason: 'expired', message: authTexts.expired };
      }
      const wait = Math.ceil(RESEND_AFTER_SEC - elapsedSec(challenge));
      if (wait > 0) {
        return {
          ok: false,
          reason: 'rate_limited',
          message: authTexts.rateLimited,
          retryInSec: wait,
        };
      }
      // Um código novo substitui o anterior, com as tentativas zeradas.
      challenge.sentAt = now().getTime();
      challenge.attempts = 0;
      return issue(challenge);
    },

    async verifyCode(challengeId, code): Promise<AuthResult<PatientSession>> {
      const challenge = challenges.get(challengeId);
      if (!challenge || challenge.used || elapsedSec(challenge) > CODE_TTL_SEC) {
        return { ok: false, reason: 'expired', message: authTexts.expired };
      }
      if (challenge.attempts >= MAX_ATTEMPTS) {
        return { ok: false, reason: 'locked', message: authTexts.locked };
      }
      if (code !== DEMO_LOGIN_CODE) {
        challenge.attempts += 1;
        const attemptsLeft = MAX_ATTEMPTS - challenge.attempts;
        return attemptsLeft > 0
          ? { ok: false, reason: 'wrong_code', message: authTexts.wrongCode, attemptsLeft }
          : { ok: false, reason: 'locked', message: authTexts.locked };
      }
      challenge.used = true;
      const expiresAt = new Date(now().getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
      return {
        ok: true,
        data: {
          token: `demo-token-${challenge.id}`,
          expiresAt: expiresAt.toISOString(),
          patient: { firstName },
        },
      };
    },

    async logout() {},
  };
}
