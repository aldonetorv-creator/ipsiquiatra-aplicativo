/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';

import PatriciaScreen from '@/app/patricia';
import { patriciaPace, readingDelay } from '@/constants/patricia-pace';
import { PatriciaApi } from '@/contracts/patricia';
import { createMockPatientAppGateway, patriciaScript } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

const reply = (data: Record<string, unknown>) => ({ status: 200, ok: true, data });

function fakeApi(): Record<Exclude<keyof PatriciaApi, 'identified'>, jest.Mock> {
  return {
    info: jest.fn(async () => reply({ greeting: 'Olá, sou a Patrícia.' })),
    startSession: jest.fn(async () => reply({ session: 'tok-1' })),
    message: jest.fn(async () => reply({ reply: 'Oi!' })),
    confirm: jest.fn(async () => reply({})),
    releaseHold: jest.fn(async () => reply({})),
    cancelChange: jest.fn(async () => reply({})),
    identify: jest.fn(async () => reply({})),
    noAiReport: jest.fn(async () => reply({})),
    leave: jest.fn(async () => reply({})),
  };
}

// test/setup.js zera o ritmo; aqui ele volta, curto, para ver a ordem.
const zero = patriciaPace.delayFor;
beforeEach(() => {
  patriciaPace.delayFor = () => 300;
});
afterEach(() => {
  patriciaPace.delayFor = zero;
});

describe('ritmo da Patrícia no primeiro acesso', () => {
  it('termo primeiro; depois do "Concordo", a apresentação e só então o diário', async () => {
    await render(
      <PatientAppGatewayProvider gateway={createMockPatientAppGateway({ patricia: fakeApi() })}>
        <PatriciaScreen />
      </PatientAppGatewayProvider>
    );

    expect(await screen.findByText('Termo da conversa com a Patrícia')).toBeOnTheScreen();
    expect(screen.queryByText(patriciaScript.greeting)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Concordo e continuar' }));

    expect(await screen.findByLabelText('Patrícia está digitando')).toBeOnTheScreen();
    expect(screen.queryByText(patriciaScript.greeting)).toBeNull();

    expect(await screen.findByText(patriciaScript.greeting)).toBeOnTheScreen();
    expect(screen.queryByText(patriciaScript.moodCheck)).toBeNull();

    expect(await screen.findByText(patriciaScript.moodCheck)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Patrícia está digitando')).toBeNull();
  });

  it('o padrão dá mais tempo para mensagens longas, sem passar de 2,2 s', () => {
    const text = (body: string) =>
      ({ id: 'm', kind: 'text', author: 'patricia', text: body, sentAt: '' }) as const;
    expect(readingDelay(text('Oi'))).toBe(730);
    expect(readingDelay(text(patriciaScript.greeting))).toBeGreaterThan(1500);
    expect(readingDelay(text('a'.repeat(500)))).toBe(2200);
  });
});
