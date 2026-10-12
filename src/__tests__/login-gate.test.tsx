/// <reference types="jest" />

import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AppState, AppStateStatus, BackHandler, Text } from 'react-native';

import EntrarScreen from '@/app/entrar';
import HomeScreen from '@/app/index';
import AppTabs from '@/components/app-tabs';
import { BiometricOffer } from '@/components/auth/biometric-offer';
import { STORY_SLIDE_MS, storySlides } from '@/components/auth/welcome-story';
import { authTexts, PatientAuthApi, PatientSession } from '@/contracts/patient-auth';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { createMockPatientAuth, DEMO_LOGIN_CODE, RESEND_AFTER_SEC } from '@/mocks/patient-auth';
import { BiometricAuth, BiometricKind, noBiometrics } from '@/services/biometrics';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import {
  createMemorySessionStore,
  LOCK_AFTER_MS,
  PatientSessionProvider,
  SessionStore,
} from '@/services/patient-session';

// A história de boas-vindas sempre tem o botão de entrar; a Início, o botão da
// conta; o bloqueio da biometria, o "de volta".
const ENTER = 'Entrar com CPF';
const ACCOUNT = 'Sua conta';
const LOCKED = 'Que bom ter você de volta.';
const GREETING = /^(Bom dia|Boa tarde|Boa noite|Olá), Ana!$/;
const [CARE, PATRICIA, PLACES] = storySlides.map((slide) => slide.title);

const findHome = () => screen.findByRole('button', { name: ACCOUNT });
const queryHome = () => screen.queryByRole('button', { name: ACCOUNT });

const stub = (label: string) =>
  function Stub() {
    return <Text>{label}</Text>;
  };

// O app de verdade (abas com as rotas protegidas e a tela de entrar), com o
// login simulado e a sessão em memória. O renderRouter chama o render da
// Testing Library 14 sem esperar (ele é assíncrono): aqui a renderização é
// esperada antes das conferências.
async function renderApp({
  store = createMemorySessionStore(),
  initialUrl = '/',
  api = createMockPatientAuth({ firstName: 'Ana' }),
  biometrics = noBiometrics,
}: {
  store?: SessionStore;
  initialUrl?: string;
  api?: PatientAuthApi;
  biometrics?: BiometricAuth;
} = {}) {
  function Layout() {
    return (
      <PatientAppGatewayProvider gateway={createMockPatientAppGateway()}>
        <PatientSessionProvider store={store} api={api} biometrics={biometrics}>
          <AppTabs />
          <BiometricOffer />
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
  jest.restoreAllMocks();
});

const session = (expiresAt: string): PatientSession => ({
  token: 'tok',
  expiresAt,
  patient: { firstName: 'Ana' },
});

async function openCpfStep() {
  await fireEvent.press(await screen.findByRole('button', { name: ENTER }));
}

async function requestCode(cpf = '52998224725') {
  await openCpfStep();
  await fireEvent.changeText(await screen.findByLabelText('CPF'), cpf);
  await fireEvent.press(screen.getByRole('button', { name: 'Receber código por SMS' }));
}

// Com os 6 números, o código é conferido sozinho, sem tocar em "Entrar".
async function typeCode(code = DEMO_LOGIN_CODE) {
  await fireEvent.changeText(await screen.findByLabelText('Código de 6 números'), code);
}

describe('login com CPF como primeira tela', () => {
  it('abre na história de boas-vindas, sem a Início e sem as abas', async () => {
    const app = await renderApp();

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(screen.getByText(CARE)).toBeOnTheScreen();
    expect(queryHome()).toBeNull();
    expect(screen.queryByRole('button', { name: /Patrícia/ })).toBeNull();
    expect(app.pathname()).toBe('/entrar');
  });

  it('a história passa sozinha, para no último quadro e também anda pelo leitor de tela', async () => {
    await renderApp();
    expect(await screen.findByText(CARE)).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(STORY_SLIDE_MS + 500);
    });
    expect(await screen.findByText(PATRICIA)).toBeOnTheScreen();
    expect(screen.queryByText(CARE)).toBeNull();

    // Ações de "próximo" e "anterior" do quadro (VoiceOver e TalkBack).
    const story = screen.getByRole('adjustable');
    await fireEvent(story, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(await screen.findByText(PLACES)).toBeOnTheScreen();
    await fireEvent(story, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(await screen.findByText(PATRICIA)).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(3 * (STORY_SLIDE_MS + 500));
    });
    expect(await screen.findByText(PLACES)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: ENTER })).toBeOnTheScreen();
  });

  it('depois do CPF e do código, aparece a Início e a sessão fica guardada', async () => {
    const store = createMemorySessionStore();
    const app = await renderApp({ store });

    await requestCode();
    await typeCode();

    expect(await findHome()).toBeOnTheScreen();
    // Boas-vindas pelo nome, sem o antigo "Você entrou como".
    expect(screen.getByText(GREETING)).toBeOnTheScreen();
    expect(screen.queryByText(/Você entrou como/)).toBeNull();
    expect(screen.queryByRole('button', { name: ENTER })).toBeNull();
    expect(app.pathname()).toBe('/');
    expect(await store.load()).toMatchObject({ patient: { firstName: 'Ana' } });
  });

  it('código errado avisa, apaga o código e continua no passo do código', async () => {
    await renderApp();

    await requestCode();
    await typeCode('000000');

    expect(await screen.findByText('Código incorreto. Restam 4 tentativas.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Código de 6 números')).toHaveDisplayValue('');
    expect(queryHome()).toBeNull();
  });

  it('sem conexão, o código fica no campo e "Entrar" tenta de novo', async () => {
    const mock = createMockPatientAuth({ firstName: 'Ana' });
    const verifyCode = jest
      .fn<ReturnType<PatientAuthApi['verifyCode']>, Parameters<PatientAuthApi['verifyCode']>>()
      .mockResolvedValueOnce({ ok: false, reason: 'offline', message: authTexts.offline })
      .mockImplementation((id, code) => mock.verifyCode(id, code));
    await renderApp({ api: { ...mock, verifyCode } });

    await requestCode();
    await typeCode();

    expect(await screen.findByText(authTexts.offline)).toBeOnTheScreen();
    expect(screen.getByLabelText('Código de 6 números')).toHaveDisplayValue(DEMO_LOGIN_CODE);

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await findHome()).toBeOnTheScreen();
    expect(verifyCode).toHaveBeenCalledTimes(2);
  });

  it('CPF inválido avisa já ao digitar e não sai do aparelho', async () => {
    const mock = createMockPatientAuth({ firstName: 'Ana' });
    const startLogin = jest.spyOn(mock, 'startLogin');
    await renderApp({ api: mock });

    await openCpfStep();
    await fireEvent.changeText(await screen.findByLabelText('CPF'), '11111111111');
    expect(await screen.findByText(/não formam um CPF válido/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Receber código por SMS' }));

    expect(screen.getByText(/não formam um CPF válido/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Código de 6 números')).toBeNull();
    expect(startLogin).not.toHaveBeenCalled();
  });

  it('pede outro código só depois de 1 minuto', async () => {
    const mock = createMockPatientAuth({ firstName: 'Ana' });
    const resendCode = jest.spyOn(mock, 'resendCode');
    await renderApp({ api: mock });

    await requestCode();
    expect(await screen.findByText('Reenviar código em 1:00')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reenviar código' })).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime((RESEND_AFTER_SEC + 1) * 1000);
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Reenviar código' }));

    expect(resendCode).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Reenviar código em 1:00')).toBeOnTheScreen();
  });

  it('voltar anda um passo: do código para o CPF e do CPF para a história', async () => {
    await renderApp();

    await requestCode();
    expect(await screen.findByLabelText('Código de 6 números')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByLabelText('CPF')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Código de 6 números')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(screen.queryByLabelText('CPF')).toBeNull();
  });

  it('o voltar do Android também anda um passo, e na história não é segurado', async () => {
    type Listener = Parameters<typeof BackHandler.addEventListener>[1];
    const handlers: Listener[] = [];
    // O último registrado é o primeiro chamado pelo Android.
    const pressBack = () => handlers.at(-1)?.({} as Parameters<Listener>[0]);
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
      handlers.push(handler);
      return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
    });
    await renderApp();
    await screen.findByRole('button', { name: ENTER });
    // O da navegação já está lá; o da tela de entrar só aparece fora da história.
    const navigation = handlers.length;

    await requestCode();
    expect(await screen.findByLabelText('Código de 6 números')).toBeOnTheScreen();
    expect(handlers).toHaveLength(navigation + 1);

    await act(async () => {
      expect(pressBack()).toBe(true);
    });
    expect(await screen.findByLabelText('CPF')).toBeOnTheScreen();

    await act(async () => {
      expect(pressBack()).toBe(true);
    });
    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(handlers).toHaveLength(navigation);
  });

  it('com sessão salva, abre direto na Início; "Sair", na conta, volta para a história', async () => {
    const store = createMemorySessionStore(session('2099-01-01T00:00:00Z'));
    await renderApp({ store });

    await fireEvent.press(await findHome());
    expect(screen.queryByRole('button', { name: ENTER })).toBeNull();

    await fireEvent.press(await screen.findByRole('button', { name: 'Sair da conta' }));

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(queryHome()).toBeNull();
    expect(await store.load()).toBeNull();
  });

  it('sessão vencida não vale: abre na história', async () => {
    const store = createMemorySessionStore(session('2020-01-01T00:00:00Z'));
    await renderApp({ store });

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(await store.load()).toBeNull();
  });

  it('sem login, abrir direto a conversa (ex.: pela notificação) cai na história', async () => {
    await renderApp({ initialUrl: '/patricia' });

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(screen.queryByText('Conversa com a Patrícia')).toBeNull();
  });
});

// Biometria do aparelho de mentira: diz que há digital (ou não) e responde aos
// pedidos na ordem de `answers`; depois deles, sempre confirma.
function fakeBiometrics(kind: BiometricKind | null = 'fingerprint', answers: boolean[] = []) {
  return {
    check: jest.fn(async () => kind),
    authenticate: jest.fn(async (_prompt: string) => answers.shift() ?? true),
  };
}

const lockedStore = () =>
  createMemorySessionStore(session('2099-01-01T00:00:00Z'), { biometricUnlock: true });

describe('biometria depois do login por SMS', () => {
  it('logo depois do SMS, oferece a biometria; "Usar biometria" confirma e liga', async () => {
    const store = createMemorySessionStore();
    const biometrics = fakeBiometrics('fingerprint');
    await renderApp({ store, biometrics });

    await requestCode();
    await typeCode();

    expect(await screen.findByText('Entrar com biometria?')).toBeOnTheScreen();
    expect(screen.getByText(/entre com a sua digital, sem esperar o SMS/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Usar biometria' }));

    await waitFor(() => expect(screen.queryByText('Entrar com biometria?')).toBeNull());
    expect(biometrics.authenticate).toHaveBeenCalledTimes(1);
    expect(await store.loadBiometricUnlock()).toBe(true);
    expect(await findHome()).toBeOnTheScreen();
  });

  it('"Agora não" fecha sem ligar e sem pedir a biometria', async () => {
    const store = createMemorySessionStore();
    const biometrics = fakeBiometrics('face');
    await renderApp({ store, biometrics });

    await requestCode();
    await typeCode();
    expect(await screen.findByText(/entre com o seu rosto/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));

    await waitFor(() => expect(screen.queryByText('Entrar com biometria?')).toBeNull());
    expect(biometrics.authenticate).not.toHaveBeenCalled();
    expect(await store.loadBiometricUnlock()).toBe(false);
  });

  it('se a confirmação não der certo, avisa e continua desligada', async () => {
    const store = createMemorySessionStore();
    await renderApp({ store, biometrics: fakeBiometrics('fingerprint', [false]) });

    await requestCode();
    await typeCode();
    await fireEvent.press(await screen.findByRole('button', { name: 'Usar biometria' }));

    expect(await screen.findByText('Não deu para confirmar. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByText('Entrar com biometria?')).toBeOnTheScreen();
    expect(await store.loadBiometricUnlock()).toBe(false);
  });

  it('sem biometria cadastrada no celular, não oferece', async () => {
    await renderApp({ biometrics: fakeBiometrics(null) });

    await requestCode();
    await typeCode();

    expect(await findHome()).toBeOnTheScreen();
    expect(screen.queryByText('Entrar com biometria?')).toBeNull();
  });

  it('com a biometria ligada, ao abrir o app ela é pedida antes da Início', async () => {
    const biometrics = fakeBiometrics('fingerprint');
    await renderApp({ store: lockedStore(), biometrics });

    expect(await screen.findByText(LOCKED)).toBeOnTheScreen();
    expect(queryHome()).toBeNull();

    // O pedido aparece sozinho.
    expect(await findHome()).toBeOnTheScreen();
    expect(biometrics.authenticate).toHaveBeenCalledTimes(1);
  });

  it('se a biometria não der certo, fica no bloqueio; o botão pede de novo', async () => {
    const biometrics = fakeBiometrics('fingerprint', [false]);
    await renderApp({ store: lockedStore(), biometrics });

    expect(await screen.findByText('Não deu para confirmar. Tente de novo.')).toBeOnTheScreen();
    expect(queryHome()).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar com biometria' }));

    expect(await findHome()).toBeOnTheScreen();
    expect(biometrics.authenticate).toHaveBeenCalledTimes(2);
  });

  it('"Entrar com CPF e SMS" apaga a sessão e vai direto ao CPF', async () => {
    const store = lockedStore();
    await renderApp({ store, biometrics: fakeBiometrics('fingerprint', [false]) });

    await fireEvent.press(await screen.findByRole('button', { name: 'Entrar com CPF e SMS' }));

    expect(await screen.findByLabelText('CPF')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: ENTER })).toBeNull();
    expect(await store.load()).toBeNull();
    expect(await store.loadBiometricUnlock()).toBe(false);
  });

  it('se o celular não tem mais biometria, a entrada volta a ser pelo SMS', async () => {
    const store = lockedStore();
    await renderApp({ store, biometrics: fakeBiometrics(null) });

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(screen.queryByText(LOCKED)).toBeNull();
    expect(await store.load()).toBeNull();
  });

  it('depois de 5 minutos fora do app, pede a biometria de novo; antes disso, não', async () => {
    const listeners: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      listeners.push(listener);
      return { remove: () => listeners.splice(listeners.indexOf(listener), 1) };
    });
    const leave = async (ms: number) => {
      await act(async () => {
        listeners.forEach((listener) => listener('background'));
        jest.advanceTimersByTime(ms);
        listeners.forEach((listener) => listener('active'));
      });
    };
    // Na volta depois de 5 minutos, a biometria falha: o bloqueio fica na tela.
    const biometrics = fakeBiometrics('fingerprint', [true, false]);
    await renderApp({ store: lockedStore(), biometrics });
    expect(await findHome()).toBeOnTheScreen();

    await leave(LOCK_AFTER_MS - 60 * 1000);
    expect(await findHome()).toBeOnTheScreen();
    expect(biometrics.authenticate).toHaveBeenCalledTimes(1);

    await leave(LOCK_AFTER_MS);
    expect(await screen.findByText(LOCKED)).toBeOnTheScreen();
    expect(queryHome()).toBeNull();
    await waitFor(() => expect(biometrics.authenticate).toHaveBeenCalledTimes(2));
  });

  it('a conta liga e desliga a biometria; "Sair" desliga e apaga tudo', async () => {
    const store = createMemorySessionStore(session('2099-01-01T00:00:00Z'));
    const biometrics = fakeBiometrics('fingerprint');
    await renderApp({ store, biometrics });

    await fireEvent.press(await findHome());
    const toggle = await screen.findByRole('switch', { name: 'Entrar com biometria' });
    expect(toggle).toHaveProp('value', false);

    await fireEvent(toggle, 'valueChange', true);
    await waitFor(() => expect(toggle).toHaveProp('value', true));
    expect(biometrics.authenticate).toHaveBeenCalledTimes(1);
    expect(await store.loadBiometricUnlock()).toBe(true);

    await fireEvent(toggle, 'valueChange', false);
    await waitFor(() => expect(toggle).toHaveProp('value', false));
    expect(await store.loadBiometricUnlock()).toBe(false);

    await fireEvent(toggle, 'valueChange', true);
    await waitFor(() => expect(toggle).toHaveProp('value', true));
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    expect(await screen.findByRole('button', { name: ENTER })).toBeOnTheScreen();
    expect(await store.load()).toBeNull();
    expect(await store.loadBiometricUnlock()).toBe(false);
  });
});
