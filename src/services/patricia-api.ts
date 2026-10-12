import { PatriciaApi, PatriciaResponse } from '@/contracts/patricia';

type Options = {
  // Endereço da plataforma, sem barra no fim (ex.: https://app.ipsiquiatra.com.br).
  baseUrl: string;
  // Endereço da Patrícia do médico: app.ipsiquiatra.com.br/patricia/<slug>.
  slug: string;
  fetch?: typeof fetch;
  // Sem resposta nesse tempo, conta como sem conexão (a IA pode levar alguns segundos).
  timeoutMs?: number;
};

// Cliente das rotas públicas da Patrícia (contracts/patricia.ts). Sem conexão,
// devolve null; quem chama decide o que dizer ao paciente.
export function createPatriciaHttpApi({
  baseUrl,
  slug,
  fetch: doFetch = fetch,
  timeoutMs = 60_000,
}: Options): PatriciaApi {
  const root = `${baseUrl.replace(/\/+$/, '')}/api/public/patricia/${encodeURIComponent(slug)}`;

  async function call<T>(path: string, body?: object): Promise<PatriciaResponse<T> | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await doFetch(`${root}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, ok: response.ok && data?.ok !== false, data: data ?? {} };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    info: () => call(''),
    startSession: () => call('/session', { consent: true }),
    message: (session, payload) => call('/message', { session, ...payload }),
    confirm: (session, holdId, booking) =>
      call('/confirm', { session, holdId, ...(booking ?? {}) }),
    releaseHold: (session) => call('/hold/cancel', { session }),
    cancelChange: (session) => call('/change/cancel', { session }),
    identify: (session, data) => call('/identify', { session, data }),
    noAiReport: (data) => call('/relato', data),
    leave: (session) => call('/leave', { session }),
  };
}
