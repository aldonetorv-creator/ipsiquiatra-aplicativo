/// <reference types="jest" />

import { patriciaSlug, platformUrl, resolvePatientAppMode } from '@/config/platform';
import { authTexts } from '@/contracts/patient-auth';
import { createPatientAuthHttpApi } from '@/services/patient-auth-api';

function fakeFetch(status: number, body: unknown) {
  return jest.fn(async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

const offlineFetch = () =>
  jest.fn(async () => {
    throw new TypeError('Network request failed');
  }) as unknown as jest.MockedFunction<typeof fetch>;

const apiWith = (doFetch: typeof fetch) =>
  createPatientAuthHttpApi({ baseUrl: platformUrl, slug: patriciaSlug, fetch: doFetch });

const ROOT = 'https://app.ipsiquiatra.com.br/api/patient-app/dr-aldo-araujo-psiquiatra';
const CHALLENGE = { ok: true, challengeId: 'c'.repeat(24), expiresInSec: 600, resendInSec: 60 };

describe('modo do app (config/platform.ts)', () => {
  it('com endereço e slug, é o real; demo só quando pedido ou sem a plataforma', () => {
    expect(resolvePatientAppMode(undefined, platformUrl, patriciaSlug)).toBe('real');
    expect(resolvePatientAppMode('real', platformUrl, patriciaSlug)).toBe('real');
    expect(resolvePatientAppMode('demo', platformUrl, patriciaSlug)).toBe('demo');
    expect(resolvePatientAppMode(' DEMO ', platformUrl, patriciaSlug)).toBe('demo');
    expect(resolvePatientAppMode(undefined, platformUrl, '')).toBe('demo');
    expect(resolvePatientAppMode('real', '', patriciaSlug)).toBe('demo');
  });

  it('os testes rodam na demonstração', () => {
    expect(process.env.EXPO_PUBLIC_PATIENT_APP_MODE).toBe('demo');
  });
});

describe('login de verdade (rotas /api/patient-app)', () => {
  it('pede o código com o CPF só com os números, no endereço da Patrícia do médico', async () => {
    const doFetch = fakeFetch(200, CHALLENGE);

    const result = await apiWith(doFetch).startLogin('529.982.247-25');

    expect(result).toEqual({
      ok: true,
      data: { challengeId: CHALLENGE.challengeId, expiresInSec: 600, resendInSec: 60 },
    });
    const [url, init] = doFetch.mock.calls[0];
    expect(url).toBe(`${ROOT}/auth/start`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ cpf: '52998224725' });
  });

  it('pede de novo e confere o código com o desafio', async () => {
    const resend = fakeFetch(200, CHALLENGE);
    await apiWith(resend).resendCode('abc');
    expect(resend.mock.calls[0][0]).toBe(`${ROOT}/auth/resend`);
    expect(JSON.parse(String(resend.mock.calls[0][1]?.body))).toEqual({ challengeId: 'abc' });

    const verify = fakeFetch(200, {
      ok: true,
      token: 't'.repeat(43),
      expiresAt: '2026-11-16T12:00:00.000Z',
      patient: { firstName: 'Ana' },
    });
    const session = await apiWith(verify).verifyCode('abc', '123456');
    expect(verify.mock.calls[0][0]).toBe(`${ROOT}/auth/verify`);
    expect(JSON.parse(String(verify.mock.calls[0][1]?.body))).toEqual({
      challengeId: 'abc',
      code: '123456',
    });
    expect(session).toEqual({
      ok: true,
      data: {
        token: 't'.repeat(43),
        expiresAt: '2026-11-16T12:00:00.000Z',
        patient: { firstName: 'Ana' },
      },
    });
  });

  it.each([
    [
      400,
      { ok: false, reason: 'invalid_cpf' },
      { reason: 'invalid_cpf', message: authTexts.invalidCpf },
    ],
    [
      401,
      { ok: false, reason: 'wrong_code', attemptsLeft: 3 },
      { reason: 'wrong_code', message: authTexts.wrongCode, attemptsLeft: 3 },
    ],
    [410, { ok: false, reason: 'expired' }, { reason: 'expired', message: authTexts.expired }],
    [423, { ok: false, reason: 'locked' }, { reason: 'locked', message: authTexts.locked }],
    [
      429,
      { ok: false, reason: 'rate_limited', retryInSec: 42 },
      { reason: 'rate_limited', message: authTexts.rateLimited, retryInSec: 42 },
    ],
    [
      503,
      { ok: false, reason: 'unavailable' },
      { reason: 'unavailable', message: authTexts.unavailable },
    ],
    [500, null, { reason: 'unavailable', message: authTexts.unavailable }],
    // Endereço do médico desconhecido ou outro erro: a clínica não respondeu.
    [
      404,
      { ok: false, reason: 'not_found' },
      { reason: 'unavailable', message: authTexts.unavailable },
    ],
  ])('responde %i: vira o aviso certo', async (status, body, expected) => {
    const result = await apiWith(fakeFetch(status, body)).verifyCode('abc', '000000');
    expect(result).toEqual({ ok: false, ...expected });
  });

  it('resposta 200 sem os campos não vale como sucesso', async () => {
    expect(await apiWith(fakeFetch(200, { ok: true })).startLogin('52998224725')).toEqual({
      ok: false,
      reason: 'unavailable',
      message: authTexts.unavailable,
    });
    expect(await apiWith(fakeFetch(200, { ok: true })).verifyCode('abc', '123456')).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('sem conexão, avisa "offline"', async () => {
    expect(await apiWith(offlineFetch()).startLogin('52998224725')).toEqual({
      ok: false,
      reason: 'offline',
      message: authTexts.offline,
    });
  });

  it('tempo esgotado conta como sem conexão', async () => {
    const hanging = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    ) as unknown as typeof fetch;
    const api = createPatientAuthHttpApi({
      baseUrl: platformUrl,
      slug: patriciaSlug,
      fetch: hanging,
      timeoutMs: 5,
    });

    expect(await api.startLogin('52998224725')).toMatchObject({ reason: 'offline' });
  });

  it('"Sair" manda o token no cabeçalho e não falha sem conexão', async () => {
    const doFetch = fakeFetch(200, { ok: true });
    await apiWith(doFetch).logout('tok');
    const [url, init] = doFetch.mock.calls[0];
    expect(url).toBe(`${ROOT}/auth/logout`);
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');

    await expect(apiWith(offlineFetch()).logout('tok')).resolves.toBeUndefined();
  });

  it('confere a sessão salva com a /me', async () => {
    const valid = fakeFetch(200, { ok: true, patient: { firstName: 'Ana' } });
    expect(await apiWith(valid).checkSession!('tok')).toEqual({
      status: 'valid',
      firstName: 'Ana',
    });
    expect(valid.mock.calls[0][0]).toBe(`${ROOT}/me`);
    expect(valid.mock.calls[0][1]?.method).toBe('GET');
    expect((valid.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBe(
      'Bearer tok'
    );

    expect(
      await apiWith(fakeFetch(401, { ok: false, reason: 'signed_out' })).checkSession!('tok')
    ).toEqual({ status: 'signed_out' });
    // Sem conexão ou fora do ar: não dá para saber, a sessão fica.
    expect(await apiWith(offlineFetch()).checkSession!('tok')).toEqual({ status: 'unknown' });
    expect(await apiWith(fakeFetch(503, {})).checkSession!('tok')).toEqual({
      status: 'unknown',
    });
  });
});
