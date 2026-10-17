/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';

import PatriciaScreen from '@/app/patricia';
import { createMockPatientAppGateway, patriciaScript } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import { createPatriciaHttpApi } from '@/services/patricia-api';
import { patriciaTexts, pickedAppointment } from '@/services/patricia-live';
import { SessionLink } from '@/services/session-link';

// Patrícia com o paciente identificado (docs/api-paciente.md): as rotas
// /api/patient-app/<slug>/patricia com o token do login, sem formulários.

const BASE = 'https://app.ipsiquiatra.com.br';
const SLUG = 'dr-aldo-araujo-psiquiatra';
const ROOT = `${BASE}/api/patient-app/${SLUG}/patricia`;
const SLOT = 'terça-feira, 13/10, às 08:00';

type Route = { status?: number; body: Record<string, unknown> };
type Routes = Record<string, Route | Route[]>;

// Plataforma de mentira: cada rota (depois de /patricia) responde o que o
// teste mandou; uma lista responde em ordem, repetindo a última.
function platform(routes: Routes) {
  const doFetch = jest.fn(async (url: string) => {
    const path = url.slice(ROOT.length);
    const entry = routes[path];
    const list = Array.isArray(entry) ? entry : entry ? [entry] : [];
    const route = (list.length > 1 ? list.shift() : list[0]) ?? {
      status: 404,
      body: { ok: false, error: 'Rota não encontrada.' },
    };
    const status = route.status ?? 200;
    return { status, ok: status < 300, json: async () => route.body };
  }) as unknown as jest.MockedFunction<typeof fetch>;
  const calls = (path: string) =>
    doFetch.mock.calls
      .filter(([url]) => url === `${ROOT}${path}`)
      .map(([, init]) => (init?.body ? JSON.parse(String(init.body)) : undefined));
  return { doFetch, calls };
}

const link = (token: string | null = 'tok-login'): SessionLink & { signedOut: jest.Mock } => ({
  token: () => token,
  signedOut: jest.fn(),
});

const base: Routes = {
  '': { body: { ok: true, doctor: 'Dr. Aldo', greeting: 'Olá, Ana!', available: true } },
  '/session': { body: { ok: true, session: 'conv-1' } },
};

async function renderPatricia(routes: Routes, session = link()) {
  const fake = platform({ ...base, ...routes });
  const api = createPatriciaHttpApi({
    baseUrl: BASE,
    slug: SLUG,
    fetch: fake.doFetch,
    session,
  });
  await render(
    <PatientAppGatewayProvider gateway={createMockPatientAppGateway({ patricia: api })}>
      <PatriciaScreen />
    </PatientAppGatewayProvider>
  );
  return { ...fake, session };
}

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

async function agree() {
  await fireEvent.press(await screen.findByRole('button', { name: 'Concordo e continuar' }));
  expect(await screen.findByText(patriciaScript.greeting)).toBeOnTheScreen();
}

async function say(body: string) {
  await fireEvent.changeText(screen.getByLabelText('Mensagem para a Patrícia'), body);
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar mensagem' }));
}

describe('rotas da Patrícia com o paciente identificado', () => {
  it('usam o endereço do app do paciente com o token do login', async () => {
    const { doFetch } = platform(base);
    const api = createPatriciaHttpApi({
      baseUrl: BASE,
      slug: SLUG,
      fetch: doFetch,
      session: link(),
    });

    expect(api.identified).toBe(true);
    const started = await api.startSession();

    expect(started).toEqual({ status: 200, ok: true, data: { ok: true, session: 'conv-1' } });
    expect(doFetch).toHaveBeenCalledWith(
      `${ROOT}/session`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ consent: true }),
        headers: expect.objectContaining({ Authorization: 'Bearer tok-login' }),
      })
    );
  });

  it('a reserva vai só com a conversa e o holdId, e o relato só com o texto', async () => {
    const { doFetch, calls } = platform({
      '/confirm': { body: { ok: true, message: 'Pronto.' } },
      '/relato': { body: { ok: true, message: 'Recebido.' } },
    });
    const api = createPatriciaHttpApi({
      baseUrl: BASE,
      slug: SLUG,
      fetch: doFetch,
      session: link(),
    });

    await api.confirm('conv-1', 'hold-1', {
      declared: 'primeira',
      data: { name: 'Não deve ir', cpf: '000' },
    });
    await api.noAiReport({ name: 'Não deve ir', phone: '000', text: 'Quero contar algo.' });

    expect(calls('/confirm')).toEqual([{ session: 'conv-1', holdId: 'hold-1' }]);
    expect(calls('/relato')).toEqual([{ text: 'Quero contar algo.' }]);
  });

  it('não há identificação nesta rota: nada vai à plataforma', async () => {
    const { doFetch } = platform(base);
    const api = createPatriciaHttpApi({
      baseUrl: BASE,
      slug: SLUG,
      fetch: doFetch,
      session: link(),
    });

    const result = await api.identify('conv-1', {
      noCpf: false,
      cpf: '',
      name: '',
      birthDate: '',
      date: '',
      time: '',
    });

    expect(result?.ok).toBe(false);
    expect(doFetch).not.toHaveBeenCalled();
  });

  it('um 401 signed_out avisa a sessão do login; sem token, nem chama a plataforma', async () => {
    const out = platform({
      '/session': { status: 401, body: { ok: false, reason: 'signed_out' } },
    });
    const session = link();
    const api = createPatriciaHttpApi({ baseUrl: BASE, slug: SLUG, fetch: out.doFetch, session });

    expect((await api.startSession())?.data.reason).toBe('signed_out');
    expect(session.signedOut).toHaveBeenCalledTimes(1);

    const none = platform(base);
    const noToken = link(null);
    const loggedOut = createPatriciaHttpApi({
      baseUrl: BASE,
      slug: SLUG,
      fetch: none.doFetch,
      session: noToken,
    });
    expect((await loggedOut.startSession())?.status).toBe(401);
    expect(none.doFetch).not.toHaveBeenCalled();
    expect(noToken.signedOut).toHaveBeenCalledTimes(1);
  });

  it('a conversa vencida (401 sem reason) abre outra, sem sair do app', async () => {
    const { doFetch } = platform({
      '/message': [
        { status: 401, body: { ok: false, expired: true } },
        { body: { ok: true, reply: 'Oi de novo.', bubbles: ['Oi de novo.'] } },
      ],
    });
    const session = link();
    const api = createPatriciaHttpApi({ baseUrl: BASE, slug: SLUG, fetch: doFetch, session });

    const first = await api.message('conv-1', { text: 'Oi' });
    expect(first?.status).toBe(401);
    expect(session.signedOut).not.toHaveBeenCalled();
  });
});

describe('Patrícia com o paciente identificado no app', () => {
  it('termo, horário e cartão só com a consulta e "Confirmar", sem formulário', async () => {
    const { calls } = await renderPatricia({
      '/message': [
        {
          body: {
            ok: true,
            reply: 'Separei alguns horários.',
            bubbles: ['Separei alguns horários.'],
            slots: [{ id: '2026-10-13|08:00', label: SLOT }],
            appointments: [],
            confirm: null,
            crisis: false,
          },
        },
        {
          body: {
            ok: true,
            reply: 'Confira o cartão.',
            bubbles: ['Confira o cartão.'],
            slots: [],
            appointments: [],
            confirm: {
              kind: 'booking',
              holdId: 'hold-1',
              when: SLOT,
              expiresInSec: 600,
              modality: 'online',
              modalityLabel: 'Online',
              where: 'Por vídeo',
            },
            crisis: false,
          },
        },
      ],
      '/confirm': {
        body: {
          ok: true,
          message: 'Pronto, sua consulta está marcada.',
          bubbles: ['Pronto, sua consulta está marcada.'],
          when: SLOT,
        },
      },
    });

    expect(await screen.findByText('Termo da conversa com a Patrícia')).toBeOnTheScreen();
    await agree();
    expect(await screen.findByText(patriciaScript.moodCheck)).toBeOnTheScreen();

    await say('Quero marcar');
    await fireEvent.press(await screen.findByRole('button', { name: `Escolher ${SLOT}` }));

    expect(await screen.findByRole('button', { name: 'Confirmar consulta' })).toBeOnTheScreen();
    expect(screen.getByText('Online')).toBeOnTheScreen();
    expect(screen.getByText('Por vídeo')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Preencher e confirmar' })).toBeNull();
    expect(calls('/message')).toEqual([
      { session: 'conv-1', text: 'Quero marcar' },
      { session: 'conv-1', slot: '2026-10-13|08:00' },
    ]);

    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar consulta' }));

    expect(await screen.findByText('Pronto, sua consulta está marcada.')).toBeOnTheScreen();
    expect(screen.getByText('Consulta marcada.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('CPF')).toBeNull();
    expect(calls('/confirm')).toEqual([{ session: 'conv-1', holdId: 'hold-1' }]);
  });

  it('não mostra o cartão de identificação, mesmo se a resposta trouxer um', async () => {
    await renderPatricia({
      '/message': {
        body: {
          ok: true,
          reply: 'Vou localizar a sua consulta.',
          bubbles: ['Vou localizar a sua consulta.'],
          identify: { action: 'remarcar' },
        },
      },
    });

    await agree();
    await say('Quero remarcar');

    expect(await screen.findByText('Vou localizar a sua consulta.')).toBeOnTheScreen();
    expect(screen.queryByText(/Identificação/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Preencher dados' })).toBeNull();
  });

  it('com mais de uma consulta, os botões mandam o id da consulta tocada', async () => {
    const { calls } = await renderPatricia({
      '/message': [
        {
          body: {
            ok: true,
            reply: 'Qual consulta você quer remarcar?',
            bubbles: ['Qual consulta você quer remarcar?'],
            slots: [],
            appointments: [
              { id: 'appt-1', label: 'segunda-feira, 19/10, às 10:00' },
              { id: 'appt-2', label: 'segunda-feira, 26/10, às 10:00' },
            ],
            confirm: null,
          },
        },
        {
          body: {
            ok: true,
            reply: 'Certo. Para quando?',
            bubbles: ['Certo. Para quando?'],
            slots: [],
            appointments: [],
            confirm: null,
          },
        },
      ],
    });

    await agree();
    await say('Quero remarcar');
    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Escolher a consulta de segunda-feira, 26/10, às 10:00',
      })
    );

    expect(await screen.findByText('Certo. Para quando?')).toBeOnTheScreen();
    expect(screen.getByText(pickedAppointment('segunda-feira, 26/10, às 10:00'))).toBeOnTheScreen();
    // Os botões somem depois do toque.
    expect(
      screen.queryByRole('button', {
        name: 'Escolher a consulta de segunda-feira, 19/10, às 10:00',
      })
    ).toBeNull();
    expect(calls('/message')[1]).toEqual({ session: 'conv-1', appointment: 'appt-2' });
  });

  it('a consulta que não é do paciente (409 gone) volta com o aviso da plataforma', async () => {
    await renderPatricia({
      '/message': [
        {
          body: {
            ok: true,
            reply: 'Qual consulta você quer cancelar?',
            bubbles: ['Qual consulta você quer cancelar?'],
            appointments: [{ id: 'appt-x', label: 'segunda-feira, 19/10, às 10:00' }],
          },
        },
        {
          status: 409,
          body: {
            ok: false,
            gone: true,
            error:
              'Não encontrei essa consulta. Peça à Patrícia para remarcar ou cancelar de novo.',
          },
        },
      ],
    });

    await agree();
    await say('Quero cancelar');
    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Escolher a consulta de segunda-feira, 19/10, às 10:00',
      })
    );

    expect(await screen.findByText(/Não encontrei essa consulta/)).toBeOnTheScreen();
  });

  it('o cancelamento confirma direto no cartão', async () => {
    const { calls } = await renderPatricia({
      '/message': {
        body: {
          ok: true,
          reply: 'Confira o cartão.',
          bubbles: ['Confira o cartão.'],
          confirm: { kind: 'cancel', when: 'segunda-feira, 19/10, às 10:00' },
        },
      },
      '/change/cancel': {
        body: {
          ok: true,
          message: 'Consulta cancelada.',
          bubbles: ['Pronto, cancelei a sua consulta.'],
          when: 'segunda-feira, 19/10, às 10:00',
        },
      },
    });

    await agree();
    await say('Quero cancelar');
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar consulta' }));

    expect(await screen.findByText('Pronto, cancelei a sua consulta.')).toBeOnTheScreen();
    expect(calls('/change/cancel')).toEqual([{ session: 'conv-1' }]);
  });

  it('o relato sem IA pede só o texto: nome e celular vêm do cadastro', async () => {
    const { calls } = await renderPatricia({
      '/relato': { body: { ok: true, message: 'Recebemos o seu relato.' } },
    });

    await fireEvent.press(await screen.findByRole('button', { name: 'Não concordo' }));
    expect(await screen.findByText(patriciaTexts.noAi)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Escrever relato' }));

    expect(screen.queryByLabelText('Seu nome')).toBeNull();
    expect(screen.queryByLabelText(/Celular com DDD/)).toBeNull();
    await fireEvent.changeText(
      screen.getByLabelText('O que você quer contar ao médico'),
      'Quero contar algo ao médico.'
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar para a clínica' }));

    expect(await screen.findByText('Recebemos o seu relato.')).toBeOnTheScreen();
    expect(calls('/relato')).toEqual([{ text: 'Quero contar algo ao médico.' }]);
  });
});
