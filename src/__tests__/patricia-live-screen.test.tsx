/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';

import PatriciaScreen from '@/app/patricia';
import { PatriciaApi } from '@/contracts/patricia';
import { createMockPatientAppGateway } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

const reply = (data: { ok?: boolean } & Record<string, unknown>, status = 200) => ({
  status,
  ok: status < 300 && data.ok !== false,
  data,
});

const SLOT = 'terça-feira, 13/10, às 08:00';

// Patrícia da plataforma de mentira, só com as rotas que o fluxo de agendamento usa.
function fakeApi(): Record<keyof PatriciaApi, jest.Mock> {
  return {
    info: jest.fn(async () =>
      reply({ ok: true, greeting: 'Olá, sou a Patrícia. Em que posso ajudar?' })
    ),
    startSession: jest.fn(async () => reply({ ok: true, session: 'tok-1' })),
    message: jest
      .fn()
      .mockResolvedValueOnce(
        reply({
          ok: true,
          reply: 'Separei alguns horários.',
          bubbles: ['Separei alguns horários.'],
          slots: [{ id: '2026-10-13|08:00', label: SLOT }],
        })
      )
      .mockResolvedValueOnce(
        reply({
          ok: true,
          reply: 'Confira o cartão.',
          bubbles: ['Confira o cartão.'],
          confirm: {
            kind: 'booking',
            holdId: 'hold-1',
            when: SLOT,
            expiresInSec: 600,
            declared: 'primeira',
          },
        })
      ),
    confirm: jest.fn(async () =>
      reply({
        ok: true,
        message: 'Pronto, sua consulta está marcada.',
        bubbles: ['Pronto, sua consulta está marcada.'],
      })
    ),
    releaseHold: jest.fn(async () => reply({ ok: true })),
    cancelChange: jest.fn(async () => reply({ ok: true })),
    identify: jest.fn(async () => reply({ ok: true })),
    noAiReport: jest.fn(async () => reply({ ok: true })),
    leave: jest.fn(async () => reply({ ok: true })),
  };
}

describe('Conversa com a Patrícia real', () => {
  it('termo, horário tocado e formulário numa janela própria até a consulta marcada', async () => {
    const api = fakeApi();
    await render(
      <PatientAppGatewayProvider gateway={createMockPatientAppGateway({ patricia: api })}>
        <PatriciaScreen />
      </PatientAppGatewayProvider>
    );

    expect(await screen.findByText('Termo da conversa com a Patrícia')).toBeOnTheScreen();
    expect(screen.getByText(/Não faz diagnóstico nem orienta tratamento/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Concordo e continuar' }));
    expect(await screen.findByText('Olá, sou a Patrícia. Em que posso ajudar?')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Mensagem para a Patrícia'), 'Quero marcar');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar mensagem' }));
    await fireEvent.press(await screen.findByRole('button', { name: `Escolher ${SLOT}` }));

    expect(await screen.findByText('Confirmar consulta')).toBeOnTheScreen();
    expect(api.message).toHaveBeenLastCalledWith('tok-1', { slot: '2026-10-13|08:00' });
    await fireEvent.press(screen.getByRole('button', { name: 'Preencher e confirmar' }));

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Paciente Teste');
    await fireEvent.changeText(screen.getByLabelText('CPF'), '52998224725');
    await fireEvent.changeText(screen.getByLabelText('Data de nascimento'), '12041988');
    await fireEvent.changeText(screen.getByLabelText(/Celular com DDD/), '19988887777');
    const confirmButtons = screen.getAllByRole('button', { name: 'Confirmar consulta' });
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]);

    expect(await screen.findByText('Pronto, sua consulta está marcada.')).toBeOnTheScreen();
    expect(screen.getByText('Consulta marcada.')).toBeOnTheScreen();
    expect(api.confirm).toHaveBeenCalledWith('tok-1', 'hold-1', {
      declared: 'primeira',
      data: expect.objectContaining({
        name: 'Paciente Teste',
        cpf: '529.982.247-25',
        birthDate: '1988-04-12',
        phone: '(19) 98888-7777',
      }),
    });
  });
});
