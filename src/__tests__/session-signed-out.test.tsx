/// <reference types="jest" />

import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import EntrarScreen from '@/app/entrar';
import HomeScreen from '@/app/index';
import PatriciaScreen from '@/app/patricia';
import AppTabs from '@/components/app-tabs';
import { PatientAuthApi, PatientSession } from '@/contracts/patient-auth';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { createMockPatientAuth } from '@/mocks/patient-auth';
import { noBiometrics } from '@/services/biometrics';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import { createPlatformPatientAppGateway } from '@/services/patient-app-gateway-http';
import { createPatriciaHttpApi } from '@/services/patricia-api';
import { createMemorySessionStore, PatientSessionProvider } from '@/services/patient-session';
import { AttachableSessionLink, createSessionLink } from '@/services/session-link';

const ENTER = 'Entrar com CPF';
const ACCOUNT = 'Sua conta';

const stub = (label: string) =>
  function Stub() {
    return <Text>{label}</Text>;
  };

const savedSession: PatientSession = {
  token: 'tok',
  expiresAt: '2099-01-01T00:00:00Z',
  patient: { firstName: 'Ana' },
};

// A plataforma diz que a sessão acabou em todas as rotas de dados.
const signedOutFetch = jest.fn(async () => ({
  status: 401,
  ok: false,
  json: async () => ({ ok: false, reason: 'signed_out' }),
})) as unknown as typeof fetch;

async function renderApp({
  gateway = createMockPatientAppGateway(),
  api = createMockPatientAuth({ firstName: 'Ana' }),
  link = createSessionLink(),
  patricia = stub('Conversa com a Patrícia'),
}: {
  gateway?: PatientAppGateway;
  api?: PatientAuthApi;
  link?: AttachableSessionLink;
  patricia?: () => React.JSX.Element;
} = {}) {
  const store = createMemorySessionStore(savedSession);
  function Layout() {
    return (
      <PatientAppGatewayProvider gateway={gateway}>
        <PatientSessionProvider store={store} api={api} biometrics={noBiometrics} link={link}>
          <AppTabs />
        </PatientSessionProvider>
      </PatientAppGatewayProvider>
    );
  }
  await renderRouter(
    {
      _layout: Layout,
      index: HomeScreen,
      entrar: EntrarScreen,
      patricia,
      medicacoes: stub('Minhas medicações'),
      consultas: stub('Consultas'),
      cofre: stub('Cofre'),
      questionarios: stub('Questionários'),
      plano: stub('Plano de cuidados'),
    },
    { initialUrl: '/' }
  );
  return store;
}

afterEach(() => {
  // O renderRouter liga os relógios falsos do Jest.
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('sessão encerrada na plataforma', () => {
  it('um 401 signed_out nos dados volta para a tela de entrar e apaga a sessão', async () => {
    const link = createSessionLink();
    const gateway = createPlatformPatientAppGateway({
      baseUrl: 'https://app.ipsiquiatra.com.br',
      slug: 'dr-aldo-araujo-psiquiatra',
      fetch: signedOutFetch,
      session: link,
      local: createMockPatientAppGateway(),
    });
    const store = await renderApp({ gateway, link });

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: ACCOUNT })).toBeNull();
    expect(await store.load()).toBeNull();
  });

  it('ao abrir o app, a /me com 401 signed_out pede para entrar de novo', async () => {
    const checkSession = jest.fn(async () => ({ status: 'signed_out' as const }));
    const store = await renderApp({ api: { ...createMockPatientAuth(), checkSession } });

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(checkSession).toHaveBeenCalledWith('tok');
    expect(await store.load()).toBeNull();
  });

  it('sem conexão na /me, a sessão salva continua', async () => {
    const checkSession = jest.fn(async () => ({ status: 'unknown' as const }));
    const store = await renderApp({ api: { ...createMockPatientAuth(), checkSession } });

    expect(await screen.findByRole('button', { name: ACCOUNT })).toBeOnTheScreen();
    expect(checkSession).toHaveBeenCalledWith('tok');
    expect(await store.load()).toEqual(savedSession);
  });

  it('um 401 signed_out na Patrícia do paciente identificado também volta para a tela de entrar', async () => {
    const link = createSessionLink();
    const patriciaFetch = jest.fn(async () => ({
      status: 401,
      ok: false,
      json: async () => ({ ok: false, reason: 'signed_out' }),
    })) as unknown as jest.MockedFunction<typeof fetch>;
    const gateway = createMockPatientAppGateway({
      patricia: createPatriciaHttpApi({
        baseUrl: 'https://app.ipsiquiatra.com.br',
        slug: 'dr-aldo-araujo-psiquiatra',
        fetch: patriciaFetch,
        session: link,
      }),
    });
    const store = await renderApp({ gateway, link, patricia: PatriciaScreen });
    expect(await screen.findByRole('button', { name: ACCOUNT })).toBeOnTheScreen();
    await act(() => router.push('/patricia'));

    await fireEvent.press(await screen.findByRole('button', { name: 'Concordo e continuar' }));

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(await store.load()).toBeNull();
    expect(patriciaFetch).toHaveBeenCalledWith(
      'https://app.ipsiquiatra.com.br/api/patient-app/dr-aldo-araujo-psiquiatra/patricia/session',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
      })
    );
  });
});
