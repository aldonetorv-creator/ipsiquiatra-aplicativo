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

  it('escreve no diário numa janela própria, onde dá para corrigir e apagar o texto', async () => {
    const gateway = createMockPatientAppGateway();
    const recordMood = jest.spyOn(gateway, 'recordMood');
    await render(
      <PatientAppGatewayProvider gateway={gateway}>
        <PatriciaScreen />
      </PatientAppGatewayProvider>
    );
    await screen.findByText(patriciaScript.greeting);
    await fireEvent.press(screen.getByRole('radio', { name: 'Mal' }));

    // Escreve, corrige e conclui.
    await fireEvent.press(screen.getByRole('button', { name: 'Escrever no diário de humor' }));
    const input = screen.getByLabelText('Texto do diário de humor');
    expect(screen.getByText('Hoje: Mal')).toBeOnTheScreen();
    await fireEvent.changeText(input, 'Dormi mau');
    await fireEvent.changeText(input, 'Dormi mal');
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));
    expect(screen.queryByLabelText('Texto do diário de humor')).toBeNull();
    expect(screen.getByText('Dormi mal')).toBeOnTheScreen();

    // Reabre com o texto, apaga tudo e cancela: o texto anterior continua.
    await fireEvent.press(screen.getByRole('button', { name: 'Editar o texto do diário' }));
    expect(screen.getByLabelText('Texto do diário de humor').props.value).toBe('Dormi mal');
    await fireEvent.changeText(screen.getByLabelText('Texto do diário de humor'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Dormi mal')).toBeOnTheScreen();

    // Reabre, completa e registra junto com o humor.
    await fireEvent.press(screen.getByRole('button', { name: 'Editar o texto do diário' }));
    await fireEvent.changeText(
      screen.getByLabelText('Texto do diário de humor'),
      'Dormi mal, mas a tarde foi boa.'
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar' }));

    expect(await screen.findByText(patriciaScript.afterMood)).toBeOnTheScreen();
    expect(recordMood).toHaveBeenCalledWith(
      expect.objectContaining({ level: 2, note: 'Dormi mal, mas a tarde foi boa.' })
    );
  });

  it('apagar todo o texto do diário volta ao campo vazio', async () => {
    await renderWith();

    await fireEvent.press(screen.getByRole('button', { name: 'Escrever no diário de humor' }));
    await fireEvent.changeText(screen.getByLabelText('Texto do diário de humor'), 'Rascunho');
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Editar o texto do diário' }));
    await fireEvent.changeText(screen.getByLabelText('Texto do diário de humor'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Concluir' }));

    expect(screen.queryByText('Rascunho')).toBeNull();
    expect(screen.getByRole('button', { name: 'Escrever no diário de humor' })).toBeOnTheScreen();
  });

  it.each([
    ['Agendar consulta', 'schedule_appointment'],
    ['Remarcar', 'reschedule_appointment'],
    ['Pedir nota fiscal', 'request_invoice'],
  ] as const)('"%s" mostra o pedido e a resposta de que chega em breve', async (label, service) => {
    await renderWith();

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar atalhos' }));
    await fireEvent.press(screen.getByRole('button', { name: label }));

    expect(await screen.findByText(patriciaScript.services[service].request)).toBeOnTheScreen();
    expect(screen.getByText(patriciaScript.services[service].reply)).toBeOnTheScreen();
    // Escolhido o atalho, o painel volta a ficar escondido.
    expect(screen.queryByText('Posso ajudar você com:')).toBeNull();
  });

  it('"Encontrar documento" leva ao Cofre', async () => {
    await renderWith();

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar atalhos' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Encontrar documento' }));

    expect(router.push).toHaveBeenCalledWith('/cofre');
  });

  it('esconde os atalhos até tocar no +, e de novo ao digitar', async () => {
    await renderWith();
    expect(screen.queryByText('Posso ajudar você com:')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar atalhos' }));
    expect(screen.getByText('Posso ajudar você com:')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Esconder atalhos' }));
    expect(screen.queryByText('Posso ajudar você com:')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar atalhos' }));
    await fireEvent(screen.getByLabelText('Mensagem para a Patrícia'), 'focus');
    expect(screen.queryByText('Posso ajudar você com:')).toBeNull();
  });

  it('separa a conversa por dia', async () => {
    await renderWith();

    expect(screen.getByText('Hoje')).toBeOnTheScreen();
  });

  it('apaga o histórico só depois de confirmar', async () => {
    await renderWith();
    await fireEvent.changeText(screen.getByLabelText('Mensagem para a Patrícia'), 'Algo pessoal');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText('Algo pessoal')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Apagar histórico' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Algo pessoal')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Apagar histórico' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar: apagar histórico' }));
    expect(await screen.findByText(patriciaScript.greeting)).toBeOnTheScreen();
    expect(screen.queryByText('Algo pessoal')).toBeNull();
  });

  it('amplia a foto da Patrícia ao tocar e fecha de novo', async () => {
    await renderWith();

    await fireEvent.press(screen.getAllByRole('imagebutton', { name: 'Ver foto da Patrícia' })[0]);
    expect(screen.getByLabelText('Foto da Patrícia, assistente do Dr. Aldo')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar foto da Patrícia' }));
    expect(screen.queryByLabelText('Foto da Patrícia, assistente do Dr. Aldo')).toBeNull();
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
