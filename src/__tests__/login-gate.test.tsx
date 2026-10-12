/// <reference types="jest" />

import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import EntrarScreen from '@/app/entrar';
import HomeScreen from '@/app/index';
import AppTabs from '@/components/app-tabs';
import { PatientSession } from '@/contracts/patient-auth';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { createMockPatientAuth, DEMO_LOGIN_CODE } from '@/mocks/patient-auth';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import {
  createMemorySessionStore,
  PatientSessionProvider,
  SessionStore,
} from '@/services/patient-session';

const WELCOME = 'Que bom ter você aqui';
const HOME = 'Tem alguém cuidando de você.';

const stub = (label: string) =>
  function Stub() {
    return <Text>{label}</Text>;
  };

// O app de verdade (abas com as rotas protegidas e a tela de entrar), com o
// login simulado e a sessão em memória. O renderRouter chama o render da
// Testing Library 14 sem esperar (ele é assíncrono): aqui a renderização é
// esperada antes das conferências.
async function renderApp(store: SessionStore = createMemorySessionStore(), initialUrl = '/') {
  function Layout() {
    return (
      <PatientAppGatewayProvider gateway={createMockPatientAppGateway()}>
        <PatientSessionProvider store={store} api={createMockPatientAuth({ firstName: 'Ana' })}>
          <AppTabs />
        </PatientSessionProvider>
      </PatientAppGatewayProvider>
    );
  }
  const rendered = renderRouter(
    {
      _layout: Layout,
      index: HomeScreen,
      entrar: EntrarScreen,
      patricia: stub('Conversa com a Patrícia'),
      consultas: stub('Consultas'),
      cofre: stub('Cofre'),
      questionarios: stub('Questionários'),
    },
    { initialUrl }
  );
  await rendered;
  return { pathname: () => rendered.getPathname() };
}

afterEach(() => {
  // O renderRouter liga os relógios falsos do Jest.
  jest.useRealTimers();
});

const session = (expiresAt: string): PatientSession => ({
  token: 'tok',
  expiresAt,
  patient: { firstName: 'Ana' },
});

async function enterCpfAndCode(code = DEMO_LOGIN_CODE) {
  await fireEvent.changeText(await screen.findByLabelText('CPF'), '52998224725');
  await fireEvent.press(screen.getByRole('button', { name: 'Receber código por SMS' }));
  await fireEvent.changeText(await screen.findByLabelText('Código de 6 números'), code);
  await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
}

describe('login com CPF como primeira tela', () => {
  it('abre na tela de entrar, sem a Início e sem as abas', async () => {
    const app = await renderApp();

    expect(await screen.findByText(WELCOME)).toBeOnTheScreen();
    expect(screen.queryByText(HOME)).toBeNull();
    expect(screen.queryByRole('button', { name: /Patrícia/ })).toBeNull();
    expect(app.pathname()).toBe('/entrar');
  });

  it('depois do CPF e do código, aparece a Início e a sessão fica guardada', async () => {
    const store = createMemorySessionStore();
    const app = await renderApp(store);

    await enterCpfAndCode();

    expect(await screen.findByText(HOME)).toBeOnTheScreen();
    expect(screen.getByText('Você entrou como Ana')).toBeOnTheScreen();
    expect(screen.queryByText(WELCOME)).toBeNull();
    expect(app.pathname()).toBe('/');
    expect(await store.load()).toMatchObject({ patient: { firstName: 'Ana' } });
  });

  it('código errado avisa e continua na tela de entrar', async () => {
    await renderApp();

    await enterCpfAndCode('000000');

    expect(await screen.findByText('Código incorreto. Restam 4 tentativas.')).toBeOnTheScreen();
    expect(screen.queryByText(HOME)).toBeNull();
  });

  it('CPF inválido não sai do aparelho', async () => {
    await renderApp();

    await fireEvent.changeText(await screen.findByLabelText('CPF'), '11111111111');
    await fireEvent.press(screen.getByRole('button', { name: 'Receber código por SMS' }));

    expect(await screen.findByText(/não formam um CPF válido/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Código de 6 números')).toBeNull();
  });

  it('com sessão salva, abre direto na Início; "Sair" volta para a tela de entrar', async () => {
    const store = createMemorySessionStore(session('2099-01-01T00:00:00Z'));
    await renderApp(store);

    expect(await screen.findByText(HOME)).toBeOnTheScreen();
    expect(screen.queryByText(WELCOME)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    expect(await screen.findByText(WELCOME)).toBeOnTheScreen();
    expect(screen.queryByText(HOME)).toBeNull();
    expect(await store.load()).toBeNull();
  });

  it('sessão vencida não vale: abre na tela de entrar', async () => {
    const store = createMemorySessionStore(session('2020-01-01T00:00:00Z'));
    await renderApp(store);

    expect(await screen.findByText(WELCOME)).toBeOnTheScreen();
    expect(await store.load()).toBeNull();
  });

  it('sem login, abrir direto a conversa (ex.: pela notificação) cai na tela de entrar', async () => {
    await renderApp(createMemorySessionStore(), '/patricia');

    expect(await screen.findByText(WELCOME)).toBeOnTheScreen();
    expect(screen.queryByText('Conversa com a Patrícia')).toBeNull();
  });
});
