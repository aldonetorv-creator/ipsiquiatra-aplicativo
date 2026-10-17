import { PatriciaApi, PatriciaResponse } from '@/contracts/patricia';
import { createPatientAppHttp, signedOutReply } from '@/services/patient-app-http';
import { SessionLink } from '@/services/session-link';

type Options = {
  // Endereço da plataforma, sem barra no fim (ex.: https://app.ipsiquiatra.com.br).
  baseUrl: string;
  // Endereço da Patrícia do médico: app.ipsiquiatra.com.br/patricia/<slug>.
  slug: string;
  fetch?: typeof fetch;
  // Sem resposta nesse tempo, conta como sem conexão (a IA pode levar alguns segundos).
  timeoutMs?: number;
  // Paciente identificado (modo 'real', config/platform.ts): as rotas
  // /api/patient-app/<slug>/patricia com o token do login. Sem ela, as rotas
  // públicas do site.
  session?: SessionLink;
};

// Resposta de quem não está mais com a sessão do login: a mesma da plataforma.
const signedOut = <T>(): PatriciaResponse<T> => ({
  status: 401,
  ok: false,
  data: { ok: false, reason: 'signed_out' } as PatriciaResponse<T>['data'],
});

// Cliente das rotas da Patrícia (contracts/patricia.ts). Sem conexão, devolve
// null; quem chama decide o que dizer ao paciente.
export function createPatriciaHttpApi(options: Options): PatriciaApi {
  return options.session ? identifiedApi(options, options.session) : publicApi(options);
}

// Rotas públicas, as mesmas do chat do site: os cartões pedem os dados.
function publicApi({ baseUrl, slug, fetch: doFetch = fetch, timeoutMs = 60_000 }: Options) {
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

  const api: PatriciaApi = {
    identified: false,
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
  return api;
}

// Paciente identificado (docs/api-paciente.md, "Patrícia com o paciente
// identificado"): a Patrícia já sabe quem escreve. A reserva vai só com o
// holdId, o relato só com o texto, e não há identificação. Um 401 signed_out
// tira o paciente do app, como nas outras rotas do paciente.
function identifiedApi(
  { baseUrl, slug, fetch: doFetch, timeoutMs = 60_000 }: Options,
  session: SessionLink
) {
  const request = createPatientAppHttp({ baseUrl, slug, fetch: doFetch, timeoutMs });

  async function call<T>(path: string, body?: object): Promise<PatriciaResponse<T> | null> {
    const token = session.token();
    if (!token) {
      session.signedOut();
      return signedOut<T>();
    }
    const reply = await request(`/patricia${path}`, { body, token });
    if (!reply) return null;
    if (signedOutReply(reply)) {
      session.signedOut();
      return signedOut<T>();
    }
    const data = reply.body as PatriciaResponse<T>['data'];
    return {
      status: reply.status,
      ok: reply.status >= 200 && reply.status < 300 && data.ok !== false,
      data,
    };
  }

  const api: PatriciaApi = {
    identified: true,
    info: () => call(''),
    startSession: () => call('/session', { consent: true }),
    message: (id, payload) => call('/message', { session: id, ...payload }),
    // Os dados da consulta vêm do cadastro: sem formulário.
    confirm: (id, holdId) => call('/confirm', { session: id, holdId }),
    releaseHold: (id) => call('/hold/cancel', { session: id }),
    cancelChange: (id) => call('/change/cancel', { session: id }),
    // Não existe nesta rota: a Patrícia já vê as consultas do paciente.
    identify: async () => ({ status: 404, ok: false, data: { ok: false } }),
    noAiReport: ({ text }) => call('/relato', { text }),
    leave: (id) => call('/leave', { session: id }),
  };
  return api;
}
