/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/index';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway, patriciaScript } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

async function renderWith(gateway: PatientAppGateway) {
  await render(
    <PatientAppGatewayProvider gateway={gateway}>
      <HomeScreen />
    </PatientAppGatewayProvider>
  );
}

async function answerFirstMoodCheck(gateway: PatientAppGateway, level: 1 | 2 | 3 | 4 | 5) {
  const conversation = await gateway.listConversation();
  if (!conversation.ok) throw new Error('listConversation falhou');
  const check = conversation.data.find((message) => message.kind === 'mood_check')!;
  await gateway.recordMood({ checkId: check.id, level, note: null });
}

describe('Início', () => {
  beforeEach(() => jest.mocked(router.push).mockClear());

  it('mostra a saudação e a última mensagem da Patrícia, que abre a conversa', async () => {
    await renderWith(createMockPatientAppGateway());

    expect(await screen.findByText(/^(Bom dia|Boa tarde|Boa noite)!$/)).toBeOnTheScreen();
    expect(screen.getByText(patriciaScript.moodCheck)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Abrir conversa com a Patrícia' }));
    expect(router.push).toHaveBeenCalledWith('/patricia');
  });

  it('mostra a semana vazia quando ainda não há registro de humor', async () => {
    await renderWith(createMockPatientAppGateway());

    expect(
      await screen.findByText('Você ainda não registrou seu humor esta semana.')
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Hoje: sem registro')).toBeOnTheScreen();
  });

  it('mostra o humor registrado hoje no diário da semana', async () => {
    const gateway = createMockPatientAppGateway();
    await answerFirstMoodCheck(gateway, 5);

    await renderWith(gateway);

    expect(await screen.findByLabelText('Hoje: Muito bem')).toBeOnTheScreen();
    expect(screen.getByText('Como você se sentiu nos últimos 7 dias.')).toBeOnTheScreen();
    expect(screen.getByText(patriciaScript.afterMood)).toBeOnTheScreen();
  });

  it('usa o cartão de humor em aberto, sem criar outro', async () => {
    const gateway = createMockPatientAppGateway();
    const requestMoodCheck = jest.spyOn(gateway, 'requestMoodCheck');
    await renderWith(gateway);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Registrar como me senti hoje' })
    );

    expect(requestMoodCheck).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/patricia');
  });

  it('abre um novo cartão de humor quando o anterior já foi respondido', async () => {
    const gateway = createMockPatientAppGateway();
    await answerFirstMoodCheck(gateway, 3);
    const requestMoodCheck = jest.spyOn(gateway, 'requestMoodCheck');
    await renderWith(gateway);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Registrar como me senti hoje' })
    );

    expect(requestMoodCheck).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/patricia');
  });

  it('leva aos questionários', async () => {
    await renderWith(createMockPatientAppGateway());

    await fireEvent.press(screen.getByRole('button', { name: 'Responder agora' }));
    expect(router.push).toHaveBeenCalledWith('/questionarios');
  });

  it('mostra o erro do contrato', async () => {
    await renderWith({
      ...createMockPatientAppGateway(),
      listMoodEntries: async () => ({
        ok: false,
        requestId: 'test',
        error: { code: 'not_available', message: 'Resumo indisponível no momento.' },
      }),
    });

    expect(await screen.findByText('Resumo indisponível no momento.')).toBeOnTheScreen();
  });
});
