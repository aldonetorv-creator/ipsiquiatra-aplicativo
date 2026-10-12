/// <reference types="jest" />

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ReactNode } from 'react';

import { PatientSession } from '@/contracts/patient-auth';
import { useDailyReminders } from '@/hooks/use-daily-reminders';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { createMockPatientAuth, DEMO_LOGIN_CODE } from '@/mocks/patient-auth';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import {
  createMemorySessionStore,
  PatientSessionProvider,
  SessionStore,
  usePatientSession,
} from '@/services/patient-session';

// Toque na notificação da Patrícia, como o expo-notifications entrega.
let mockLastResponse: unknown = null;
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/services/daily-reminders', () => ({
  scheduleDailyReminders: jest.fn(async () => undefined),
}));
jest.mock('@/services/notifications-module', () => ({
  notifications: () => ({
    DEFAULT_ACTION_IDENTIFIER: 'default',
    setNotificationHandler: jest.fn(),
    useLastNotificationResponse: () => mockLastResponse,
  }),
}));

const tap = (identifier: string) => ({
  actionIdentifier: 'default',
  notification: { date: 1, request: { identifier, content: { data: { screen: 'patricia' } } } },
});

const session: PatientSession = {
  token: 'tok',
  expiresAt: '2099-01-01T00:00:00Z',
  patient: { firstName: 'Ana' },
};

function renderReminders(store: SessionStore) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PatientAppGatewayProvider gateway={createMockPatientAppGateway()}>
      <PatientSessionProvider store={store} api={createMockPatientAuth()}>
        {children}
      </PatientSessionProvider>
    </PatientAppGatewayProvider>
  );
  return renderHook(
    () => {
      useDailyReminders();
      return usePatientSession();
    },
    { wrapper }
  );
}

describe('toque na notificação da Patrícia com o login como primeira tela', () => {
  beforeEach(() => jest.mocked(router.push).mockClear());

  it('com sessão salva, abre a conversa depois de ler a sessão, uma vez', async () => {
    mockLastResponse = tap('n1');
    const { result } = await renderReminders(createMemorySessionStore(session));

    await waitFor(() => expect(result.current.state.status).toBe('signed_in'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/patricia');
  });

  it('sem sessão, espera o login e só então abre a conversa, uma vez', async () => {
    mockLastResponse = tap('n2');
    const { result } = await renderReminders(createMemorySessionStore());

    await waitFor(() => expect(result.current.state.status).toBe('signed_out'));
    expect(router.push).not.toHaveBeenCalled();

    await act(async () => {
      const started = await result.current.startLogin('529.982.247-25');
      if (!started.ok) throw new Error(started.message);
      await result.current.verifyCode(started.data.challengeId, DEMO_LOGIN_CODE);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/patricia');

    // Sair e entrar de novo não reabre a conversa pelo mesmo toque.
    await act(async () => {
      await result.current.logout();
    });
    await act(async () => {
      const started = await result.current.startLogin('529.982.247-25');
      if (!started.ok) throw new Error(started.message);
      await result.current.verifyCode(started.data.challengeId, DEMO_LOGIN_CODE);
    });
    expect(router.push).toHaveBeenCalledTimes(1);
  });
});
