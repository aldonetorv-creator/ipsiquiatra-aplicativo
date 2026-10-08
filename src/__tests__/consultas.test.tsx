/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import ConsultasScreen from '@/app/consultas';
import { PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway, mockDoctor } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import { formatLongDate } from '@/utils/time';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]),
}));

async function renderWith(gateway: PatientAppGateway) {
  await render(
    <PatientAppGatewayProvider gateway={gateway}>
      <ConsultasScreen />
    </PatientAppGatewayProvider>
  );
}

describe('Consultas', () => {
  beforeEach(() => jest.mocked(router.push).mockClear());

  it('mostra a próxima consulta e as anteriores, da mais recente', async () => {
    const gateway = createMockPatientAppGateway();
    const appointments = await gateway.listAppointments();
    if (!appointments.ok) throw new Error('listAppointments falhou');
    const past = appointments.data.filter((item) => item.status === 'completed').reverse();
    await renderWith(gateway);

    expect(await screen.findByText('Sua próxima consulta')).toBeOnTheScreen();
    // Já na tela Consultas, o cartão não repete "Ver consulta".
    expect(screen.queryByRole('button', { name: 'Ver consulta' })).toBeNull();

    const rows = screen.getAllByRole('button', { name: /^Ver documentos da consulta de / });
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual(
      past.map((item) => `Ver documentos da consulta de ${formatLongDate(item.startsAt)}`)
    );

    await fireEvent.press(rows[0]);
    expect(router.push).toHaveBeenCalledWith('/cofre');
  });

  it.each([
    ['Remarcar consulta', 'reschedule_appointment'],
    ['Agendar nova consulta', 'schedule_appointment'],
  ] as const)('"%s" leva o pedido à Patrícia', async (button, service) => {
    const gateway = createMockPatientAppGateway();
    const requestService = jest.spyOn(gateway, 'requestService');
    await renderWith(gateway);

    await fireEvent.press(await screen.findByRole('button', { name: button }));

    expect(requestService).toHaveBeenCalledWith(service);
    expect(router.push).toHaveBeenCalledWith('/patricia');
  });

  it('mostra a foto do médico, vinda do perfil da plataforma', async () => {
    const next = {
      id: 'next',
      startsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      durationMinutes: 60,
      modality: 'telemedicine' as const,
      status: 'scheduled' as const,
      doctor: { ...mockDoctor, photoUrl: 'https://example.com/perfil-medico.jpg' },
    };
    await renderWith({
      ...createMockPatientAppGateway(),
      listAppointments: async () => ({ ok: true, requestId: 'test', data: [next] }),
    });

    expect(await screen.findByLabelText('Foto de Dr. Aldo Araújo')).toBeOnTheScreen();
    expect(screen.queryByText('AA')).toBeNull();
  });

  it('sem foto no perfil, mostra as iniciais do médico', async () => {
    await renderWith(createMockPatientAppGateway());

    expect(await screen.findByText('AA')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Foto de Dr. Aldo Araújo')).toBeNull();
  });

  it('sem consultas, mostra os estados vazios', async () => {
    await renderWith({
      ...createMockPatientAppGateway(),
      listAppointments: async () => ({ ok: true, requestId: 'test', data: [] }),
    });

    expect(await screen.findByText('Você não tem consulta marcada.')).toBeOnTheScreen();
    expect(screen.getByText('Suas consultas realizadas vão aparecer aqui.')).toBeOnTheScreen();
  });

  it('mostra o erro do contrato', async () => {
    await renderWith({
      ...createMockPatientAppGateway(),
      listAppointments: async () => ({
        ok: false,
        requestId: 'test',
        error: { code: 'not_available', message: 'Agenda indisponível no momento.' },
      }),
    });

    expect(await screen.findByText('Agenda indisponível no momento.')).toBeOnTheScreen();
  });
});
