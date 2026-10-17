/// <reference types="jest" />

import { Appointment, MedicationPlan } from '@/contracts/platform';
import { createMockPatientAppGateway, mockDoctor } from '@/mocks/patient-app-gateway';
import { createPlatformPatientAppGateway, gatewayTexts } from '@/services/patient-app-gateway-http';
import { SessionLink } from '@/services/session-link';

type Route = { status: number; body: unknown };

// Responde cada rota pelo caminho; o que não estiver na lista fica sem conexão.
function routedFetch(routes: Record<string, Route>) {
  return jest.fn(async (url: string) => {
    const path = url.replace(/^.*\/api\/patient-app\/[^/]+/, '');
    const route = routes[path];
    if (!route) throw new TypeError('Network request failed');
    return {
      status: route.status,
      ok: route.status >= 200 && route.status < 300,
      json: async () => route.body,
    };
  }) as unknown as jest.MockedFunction<typeof fetch>;
}

const fixedSession = (token: string | null): SessionLink & { signedOut: jest.Mock } => ({
  token: () => token,
  signedOut: jest.fn(),
});

function gatewayWith(doFetch: typeof fetch, session: SessionLink = fixedSession('tok')) {
  return createPlatformPatientAppGateway({
    baseUrl: 'https://app.ipsiquiatra.com.br',
    slug: 'dr-aldo-araujo-psiquiatra',
    fetch: doFetch,
    session,
    local: createMockPatientAppGateway(),
  });
}

const appointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'a1',
  startsAt: '2026-10-01T13:00:00.000Z',
  durationMinutes: 50,
  modality: null,
  status: 'completed',
  doctor: mockDoctor,
  returnDueAt: null,
  ...overrides,
});

const signedOut = { status: 401, body: { ok: false, reason: 'signed_out' } };

describe('dados de verdade (rotas /api/patient-app)', () => {
  it('lê as consultas com o token no cabeçalho', async () => {
    const doFetch = routedFetch({
      '/appointments': { status: 200, body: { ok: true, appointments: [appointment()] } },
    });

    const result = await gatewayWith(doFetch).listAppointments();

    expect(result).toEqual({ ok: true, requestId: 'patient-app', data: [appointment()] });
    const [url, init] = doFetch.mock.calls[0];
    expect(url).toBe(
      'https://app.ipsiquiatra.com.br/api/patient-app/dr-aldo-araujo-psiquiatra/appointments'
    );
    expect(init?.method).toBe('GET');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('documentos, medicações e plano (null enquanto não houver)', async () => {
    const plan: MedicationPlan = { sources: [], medications: [] };
    const doFetch = routedFetch({
      '/documents': { status: 200, body: { ok: true, documents: [] } },
      '/medications': { status: 200, body: { ok: true, plan } },
      '/care-plan': { status: 200, body: { ok: true, plan: null } },
      '/care-plan?document=doc-1': { status: 200, body: { ok: true, plan: null } },
    });
    const gateway = gatewayWith(doFetch);

    expect(await gateway.listDocuments()).toMatchObject({ ok: true, data: [] });
    expect(await gateway.getMedicationPlan()).toMatchObject({ ok: true, data: plan });
    expect(await gateway.getCarePlan()).toMatchObject({ ok: true, data: null });
    expect(await gateway.getCarePlan('doc-1')).toMatchObject({ ok: true, data: null });
    expect(gateway.dataMode()).toBe('real');
  });

  it('401 signed_out tira o paciente do app', async () => {
    const session = fixedSession('tok');
    const gateway = gatewayWith(routedFetch({ '/documents': signedOut }), session);

    expect(await gateway.listDocuments()).toEqual({
      ok: false,
      requestId: 'patient-app',
      error: { code: 'not_authorized', message: gatewayTexts.signedOut },
    });
    expect(session.signedOut).toHaveBeenCalledTimes(1);
  });

  it('sem conexão, fora do ar, limite ou resposta estranha: avisa sem sair', async () => {
    const session = fixedSession('tok');
    const gateway = gatewayWith(
      routedFetch({
        '/documents': { status: 503, body: { ok: false, reason: 'unavailable' } },
        '/medications': { status: 429, body: { ok: false, reason: 'rate_limited' } },
        '/care-plan': { status: 200, body: { ok: true } },
      }),
      session
    );

    expect(await gateway.listAppointments()).toMatchObject({
      ok: false,
      error: { code: 'not_available', message: gatewayTexts.offline },
    });
    expect(await gateway.listDocuments()).toMatchObject({
      error: { message: gatewayTexts.unavailable },
    });
    expect(await gateway.getMedicationPlan()).toMatchObject({
      error: { message: gatewayTexts.rateLimited },
    });
    expect(await gateway.getCarePlan()).toMatchObject({
      error: { message: gatewayTexts.unavailable },
    });
    expect(session.signedOut).not.toHaveBeenCalled();
  });

  it('sem sessão, nem pergunta à plataforma', async () => {
    const doFetch = routedFetch({});
    const result = await gatewayWith(doFetch, fixedSession(null)).listAppointments();

    expect(result).toMatchObject({ ok: false, error: { code: 'not_authorized' } });
    expect(doFetch).not.toHaveBeenCalled();
  });

  it('a conversa, o humor e os questionários continuam no aparelho', async () => {
    const doFetch = routedFetch({});
    const gateway = gatewayWith(doFetch);

    expect((await gateway.listConversation()).ok).toBe(true);
    expect((await gateway.listQuestionnaires()).ok).toBe(true);
    expect(doFetch).not.toHaveBeenCalled();
  });
});
