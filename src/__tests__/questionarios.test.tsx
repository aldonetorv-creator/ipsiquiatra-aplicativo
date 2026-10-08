/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';

import QuestionariosScreen from '@/app/questionarios';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

const EMERGENCY = 'Você não está sozinho(a). Procure ajuda agora.';

async function renderWith(gateway: PatientAppGateway) {
  await render(
    <PatientAppGatewayProvider gateway={gateway}>
      <QuestionariosScreen />
    </PatientAppGatewayProvider>
  );
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('Questionários', () => {
  it('lista o que o Dr. Aldo pediu, na ordem da plataforma', async () => {
    await renderWith(createMockPatientAppGateway());

    const buttons = await screen.findAllByRole('button', { name: /^Responder / });
    expect(buttons.map((button) => button.props.accessibilityLabel)).toEqual([
      'Responder Atualização pré-consulta',
      'Responder Bem-estar geral (WHO-5)',
      'Responder Sintomas depressivos (PHQ-9)',
      'Responder Sintomas ansiosos (GAD-7)',
    ]);
    expect(screen.getByText('3 perguntas · 2 minutos')).toBeOnTheScreen();
    expect(screen.queryByText('Respondidos')).toBeNull();
  });

  it('responde uma pergunta por vez e registra as respostas', async () => {
    const gateway = createMockPatientAppGateway();
    const submit = jest.spyOn(gateway, 'submitQuestionnaire');
    await renderWith(gateway);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Responder Atualização pré-consulta' })
    );
    expect(screen.getByText('Pergunta 1 de 3')).toBeOnTheScreen();
    // Sem resposta, não avança.
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();

    await fireEvent.changeText(
      screen.getByLabelText('O que mudou desde a última consulta?'),
      'Dormindo melhor.'
    );
    await press('Próxima');
    await fireEvent.press(screen.getByRole('radio', { name: 'Não esqueci nenhum dia' }));
    await press('Próxima');
    await fireEvent.changeText(
      screen.getByLabelText('Qual é o principal assunto que você gostaria de discutir na consulta?'),
      'Ajuste do sono.'
    );
    await press('Enviar');

    expect(await screen.findByText('Respostas registradas')).toBeOnTheScreen();
    expect(submit).toHaveBeenCalledWith({
      questionnaireId: 'general',
      answers: {
        mainChange: 'Dormindo melhor.',
        medicationUse: 'Não esqueci nenhum dia',
        priority: 'Ajuste do sono.',
      },
    });
    expect(screen.queryByText(EMERGENCY)).toBeNull();

    // Segue para o próximo do pacote ou volta à lista, já com o respondido.
    expect(
      screen.getByRole('button', { name: 'Próximo: Bem-estar geral (WHO-5)' })
    ).toBeOnTheScreen();
    await press('Voltar aos questionários');
    expect(screen.getByText('Respondidos')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Atualização pré-consulta\. Respondido em /)).toBeOnTheScreen();
  });

  it('mostra as orientações de emergência no item de segurança do PHQ-9', async () => {
    await renderWith(createMockPatientAppGateway());

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Responder Sintomas depressivos (PHQ-9)' })
    );
    for (let item = 1; item <= 8; item++) {
      await fireEvent.press(screen.getByRole('radio', { name: 'Nunca ou quase nunca' }));
      await press('Próxima');
    }
    expect(screen.getByText('Pergunta 9 de 9')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Alguns dias' }));
    expect(screen.getByText(EMERGENCY)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ligar para o SAMU (192)' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ligar para o CVV (188)' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Nunca ou quase nunca' }));
    expect(screen.queryByText(EMERGENCY)).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'Mais da metade dos dias' }));
    await press('Enviar');

    expect(await screen.findByText('Respostas registradas')).toBeOnTheScreen();
    expect(screen.getByText(EMERGENCY)).toBeOnTheScreen();
  });

  it('mostra o erro ao registrar e deixa tentar de novo', async () => {
    const gateway = createMockPatientAppGateway();
    await renderWith({
      ...gateway,
      submitQuestionnaire: async () => ({
        ok: false,
        requestId: 'test',
        error: { code: 'not_available', message: 'Não deu para registrar agora.' },
      }),
    });

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Responder Sintomas ansiosos (GAD-7)' })
    );
    for (let item = 1; item <= 7; item++) {
      await fireEvent.press(screen.getByRole('radio', { name: 'Alguns dias' }));
      await press(item === 7 ? 'Enviar' : 'Próxima');
    }

    expect(await screen.findByText('Não deu para registrar agora.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });

  it('mostra o erro do contrato', async () => {
    await renderWith({
      ...createMockPatientAppGateway(),
      listQuestionnaires: async () => ({
        ok: false,
        requestId: 'test',
        error: { code: 'not_available', message: 'Questionários indisponíveis no momento.' },
      }),
    });

    expect(await screen.findByText('Questionários indisponíveis no momento.')).toBeOnTheScreen();
  });
});
