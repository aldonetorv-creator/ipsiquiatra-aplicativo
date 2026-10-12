/// <reference types="jest" />

import {
  CODE_TTL_SEC,
  createMockPatientAuth,
  DEMO_LOGIN_CODE,
  MAX_ATTEMPTS,
  RESEND_AFTER_SEC,
} from '@/mocks/patient-auth';

// CPF válido (dígitos verificadores certos), sem ser de ninguém.
const CPF = '529.982.247-25';

function clock(start = '2026-10-12T10:00:00Z') {
  let current = new Date(start).getTime();
  return {
    now: () => new Date(current),
    advance: (seconds: number) => {
      current += seconds * 1000;
    },
  };
}

async function challengeId(auth = createMockPatientAuth()) {
  const result = await auth.startLogin(CPF);
  if (!result.ok) throw new Error(result.message);
  return result.data.challengeId;
}

describe('login do paciente: regras (versão simulada)', () => {
  it('CPF inválido nem pede código', async () => {
    const result = await createMockPatientAuth().startLogin('111.111.111-11');
    expect(result).toMatchObject({ ok: false, reason: 'invalid_cpf' });
  });

  it('o código certo abre a sessão, uma vez só', async () => {
    const auth = createMockPatientAuth({ firstName: 'Ana' });
    const id = await challengeId(auth);

    const first = await auth.verifyCode(id, DEMO_LOGIN_CODE);
    expect(first).toMatchObject({ ok: true, data: { patient: { firstName: 'Ana' } } });
    expect(await auth.verifyCode(id, DEMO_LOGIN_CODE)).toMatchObject({ reason: 'expired' });
  });

  it('código errado conta as tentativas e bloqueia na última', async () => {
    const auth = createMockPatientAuth();
    const id = await challengeId(auth);

    expect(await auth.verifyCode(id, '000000')).toMatchObject({
      reason: 'wrong_code',
      attemptsLeft: MAX_ATTEMPTS - 1,
    });
    for (let i = 2; i < MAX_ATTEMPTS; i += 1) await auth.verifyCode(id, '000000');
    expect(await auth.verifyCode(id, '000000')).toMatchObject({ reason: 'locked' });
    // Bloqueado, nem o código certo entra: é preciso pedir outro.
    expect(await auth.verifyCode(id, DEMO_LOGIN_CODE)).toMatchObject({ reason: 'locked' });
  });

  it('o código vence em 10 minutos', async () => {
    const time = clock();
    const auth = createMockPatientAuth({ now: time.now });
    const id = await challengeId(auth);

    time.advance(CODE_TTL_SEC + 1);
    expect(await auth.verifyCode(id, DEMO_LOGIN_CODE)).toMatchObject({ reason: 'expired' });
  });

  it('outro código só depois de 1 minuto, e ele zera as tentativas', async () => {
    const time = clock();
    const auth = createMockPatientAuth({ now: time.now });
    const id = await challengeId(auth);
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) await auth.verifyCode(id, '000000');

    expect(await auth.resendCode(id)).toMatchObject({ reason: 'rate_limited' });
    time.advance(RESEND_AFTER_SEC);
    expect(await auth.resendCode(id)).toMatchObject({ ok: true });
    expect(await auth.verifyCode(id, DEMO_LOGIN_CODE)).toMatchObject({ ok: true });
  });
});
