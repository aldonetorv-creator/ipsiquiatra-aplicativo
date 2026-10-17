// Pedidos às rotas do app do paciente na plataforma
// (/api/patient-app/<slug>/..., docs/api-paciente.md), no mesmo endereço e com
// o mesmo slug da Patrícia (config/platform.ts).

export type PatientAppHttpOptions = {
  // Endereço da plataforma, sem barra no fim (ex.: https://app.ipsiquiatra.com.br).
  baseUrl: string;
  // O mesmo de app.ipsiquiatra.com.br/patricia/<slug>.
  slug: string;
  fetch?: typeof fetch;
  // Sem resposta nesse tempo, conta como sem conexão.
  timeoutMs?: number;
};

// Resposta da plataforma; null quando não houve resposta (sem conexão ou tempo
// esgotado).
export type PatientAppReply = { status: number; body: Record<string, unknown> } | null;

export type PatientAppRequest = (
  path: string,
  options?: { body?: object; token?: string | null; method?: 'GET' | 'POST' }
) => Promise<PatientAppReply>;

export function createPatientAppHttp({
  baseUrl,
  slug,
  fetch: doFetch = fetch,
  timeoutMs = 20_000,
}: PatientAppHttpOptions): PatientAppRequest {
  const root = `${baseUrl.replace(/\/+$/, '')}/api/patient-app/${encodeURIComponent(slug)}`;

  return async (path, { body, token, method } = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      const response = await doFetch(`${root}${path}`, {
        method: method ?? (body ? 'POST' : 'GET'),
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      return {
        status: response.status,
        body: data && typeof data === 'object' ? (data as Record<string, unknown>) : {},
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
}

// A resposta deu certo: 2xx e sem `ok: false` no corpo.
export const succeeded = (reply: PatientAppReply): reply is NonNullable<PatientAppReply> =>
  !!reply && reply.status >= 200 && reply.status < 300 && reply.body.ok !== false;

// A sessão não vale mais na plataforma (Sair em outro lugar, vencida, celular
// trocado no cadastro, paciente excluído).
export const signedOutReply = (reply: PatientAppReply) =>
  !!reply && reply.status === 401 && reply.body.reason === 'signed_out';
