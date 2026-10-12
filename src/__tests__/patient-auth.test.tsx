/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { PatientSession } from '@/contracts/patient-auth';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import {
  CODE_TTL_SEC,
  createMockPatientAuth,
  DEMO_LOGIN_CODE,
  MAX_ATTEMPTS,
  RESEND_AFTER_SEC,
} from '@/mocks/patient-auth';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import {
  createMemorySessionStore,
  PatientSessionProvider,
  SessionStore,
} from '@/services/patient-session';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

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

async function renderHome(store: SessionStore = createMemorySessionStore()) {
  await render(
    <PatientAppGatewayProvider gateway={createMockPatientAppGateway()}>
      <PatientSessionProvider store={store} api={createMockPatientAuth({ firstName: 'Ana' })}>
        <HomeScreen />
      </PatientSessionProvider>
    </PatientAppGatewayProvider>
  );
}

const savedSession = (expiresAt: string): PatientSession => ({
  token: 'tok',
  expiresAt,
  patient: { firstName: 'Ana' },
});

describe('login do paciente na Início', () => {
  it('entra com CPF e código, avisa o código errado e guarda a sessão', async () => {
    const store = createMemorySessionStore();
    await renderHome(store);

    await fireEvent.press(await screen.findByRole('button', { name: 'Entrar com CPF' }));
    await fireEvent.changeText(screen.getByLabelText('CPF'), '52998224725');
    expect(screen.getByLabelText('CPF').props.value).toBe(CPF);
    await fireEvent.press(screen.getByRole('button', { name: 'Receber código por SMS' }));

    expect(await screen.findByText(/enviamos um código por SMS/)).toBeOnTheScreen();
    expect(screen.getByText(/Use o código 123456/)).toBeOnTheScreen();
    expect(screen.getByText(/Você pode pedir outro código em 1:00/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Código incorreto. Restam 4 tentativas.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Código de 6 números'), DEMO_LOGIN_CODE);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Você entrou como Ana')).toBeOnTheScreen();
    expect(await store.load()).toMatchObject({ patient: { firstName: 'Ana' } });
  });

  it('CPF inválido não sai do aparelho', async () => {
    await renderHome();

    await fireEvent.press(await screen.findByRole('button', { name: 'Entrar com CPF' }));
    await fireEvent.changeText(screen.getByLabelText('CPF'), '11111111111');
    await fireEvent.press(screen.getByRole('button', { name: 'Receber código por SMS' }));

    expect(await screen.findByText(/não formam um CPF válido/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Código de 6 números')).toBeNull();
  });

  it('ao reabrir o app continua dentro, e "Sair" apaga a sessão', async () => {
    const store = createMemorySessionStore(savedSession('2099-01-01T00:00:00Z'));
    await renderHome(store);

    expect(await screen.findByText('Você entrou como Ana')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));

    expect(await screen.findByRole('button', { name: 'Entrar com CPF' })).toBeOnTheScreen();
    expect(await store.load()).toBeNull();
  });

  it('sessão vencida não vale: pede para entrar de novo', async () => {
    const store = createMemorySessionStore(savedSession('2020-01-01T00:00:00Z'));
    await renderHome(store);

    expect(await screen.findByRole('button', { name: 'Entrar com CPF' })).toBeOnTheScreen();
    expect(await store.load()).toBeNull();
  });
});
