/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import PatriciaScreen from '@/app/patricia';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway, patriciaScript } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

async function renderWith(overrides: Partial<PatientAppGateway> = {}) {
  const gateway = { ...createMockPatientAppGateway(), ...overrides };
  await render(
    <PatientAppGatewayProvider gateway={gateway}>
      <PatriciaScreen />
    </PatientAppGatewayProvider>
  );
  await screen.findByText(patriciaScript.greeting);
}

describe('Conversa com a Patrícia', () => {
  beforeEach(() => jest.mocked(router.push).mockClear());

  it('mostra a saudação vinda do gateway e o aviso de demonstração', async () => {
    await renderWith();

    expect(screen.getByText('Patrícia')).toBeOnTheScreen();
    expect(screen.getByText(/188 \(CVV\) ou 192 \(SAMU\)/)).toBeOnTheScreen();
    expect(screen.getByText(patriciaScript.moodCheck)).toBeOnTheScreen();
  });

  it('envia a mensagem do paciente e mostra a resposta fixa', async () => {
    await renderWith();
    const input = screen.getByLabelText('Mensagem para a Patrícia');

    await fireEvent.changeText(input, 'Hoje estou um pouco ansioso');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(await screen.findByText('Hoje estou um pouco ansioso')).toBeOnTheScreen();
    expect(await screen.findByText(patriciaScript.afterMessage)).toBeOnTheScreen();
    expect(input.props.value).toBe('');
  });

  it('não deixa enviar mensagem vazia', async () => {
    await renderWith();

    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled();
  });

  it('registra o humor pelo cartão', async () => {
    await renderWith();

    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'Bem' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText(patriciaScript.afterMood)).toBeOnTheScreen();
    expect(screen.getByText('Registrado')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Bem' })).toBeSelected();
  });

  it('abre um novo cartão de humor pelo atalho', async () => {
    await renderWith();

    await fireEvent.press(screen.getByRole('button', { name: 'Registrar humor' }));

    expect(await screen.findByText(patriciaScript.moodCheckAgain)).toBeOnTheScreen();
  });

  it('leva aos documentos e às consultas pelos atalhos', async () => {
    await renderWith();

    await fireEvent.press(screen.getByRole('button', { name: 'Meus documentos' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Minhas consultas' }));

    expect(router.push).toHaveBeenCalledWith('/cofre');
    expect(router.push).toHaveBeenCalledWith('/consultas');
  });

  it('mostra o erro do contrato e mantém o texto digitado', async () => {
    await renderWith({
      sendMessage: async () => ({
        ok: false,
        requestId: 'test',
        error: { code: 'not_available', message: 'A Patrícia está indisponível no momento.' },
      }),
    });
    const input = screen.getByLabelText('Mensagem para a Patrícia');

    await fireEvent.changeText(input, 'Olá');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar mensagem' }));

    expect(await screen.findByText('A Patrícia está indisponível no momento.')).toBeOnTheScreen();
    expect(input.props.value).toBe('Olá');
  });
});
