/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import CofreScreen from '@/app/cofre';
import { Appointment, DocumentMetadata, PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway, mockDoctor } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import { formatDate, formatLongDate } from '@/utils/time';

jest.mock('expo-router', () => ({
  router: { setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Parte do mock completo e troca só o que cada teste controla.
async function renderWith(overrides: Partial<PatientAppGateway>) {
  const gateway = { ...createMockPatientAppGateway(), ...overrides };
  return render(
    <PatientAppGatewayProvider gateway={gateway}>
      <CofreScreen />
    </PatientAppGatewayProvider>
  );
}

const ok = <T,>(data: T) => ({ ok: true as const, requestId: 'test', data });

const consult: Appointment = {
  id: 'c-1',
  startsAt: new Date(2026, 9, 5, 14, 30).toISOString(),
  durationMinutes: 60,
  modality: 'telemedicine',
  status: 'completed',
  doctor: mockDoctor,
};

const invoice = (availability: DocumentMetadata['availability']): DocumentMetadata => ({
  id: 'invoice',
  displayName: 'Nota fiscal',
  kind: 'invoice',
  createdAt: consult.startsAt,
  appointmentId: consult.id,
  availability,
});

async function completedAppointments() {
  const appointments = await createMockPatientAppGateway().listAppointments();
  if (!appointments.ok) throw new Error('listAppointments falhou');
  return appointments.data.filter((item) => item.status === 'completed');
}

describe('Cofre', () => {
  beforeEach(() => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});
    jest.mocked(router.setParams).mockClear();
  });

  it('agrupa os documentos por consulta, da mais recente para a mais antiga', async () => {
    const completed = await completedAppointments();
    await renderWith({});

    const groups = await screen.findAllByText(/^Consulta com Dr\. Aldo Araújo$/);
    expect(groups).toHaveLength(completed.length);
    const dates = screen.getAllByText(/ · \d{2}:\d{2} · (Teleconsulta|Presencial)$/);
    expect(dates.map((node) => node.props.children)).toEqual(
      [...completed].reverse().map((item) => expect.stringContaining(formatLongDate(item.startsAt)))
    );
    expect(screen.getByText('Plano de cuidados')).toBeOnTheScreen();
    expect(screen.getByText('Outros documentos')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ver todos os documentos' })).toBeNull();
  });

  it('vindo da roleta, mostra só os documentos daquela consulta', async () => {
    const completed = await completedAppointments();
    const chosen = completed[1];
    jest.mocked(useLocalSearchParams).mockReturnValue({ consulta: chosen.id });
    await renderWith({});

    expect(
      await screen.findByText(
        `Nota fiscal referente à consulta do dia ${formatDate(chosen.startsAt)}`
      )
    ).toBeOnTheScreen();
    expect(screen.getAllByText(/^Consulta com Dr\. Aldo Araújo$/)).toHaveLength(1);
    expect(screen.queryByText('Outros documentos')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver todos os documentos' }));
    expect(router.setParams).toHaveBeenCalledWith({ consulta: undefined });
  });

  it('avisa quando a consulta escolhida não tem documentos', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ consulta: 'sem-documentos' });
    await renderWith({});

    expect(await screen.findByText('Nenhum documento desta consulta.')).toBeOnTheScreen();
  });

  it('identifica cada nota fiscal pela consulta do dia', async () => {
    const gateway = createMockPatientAppGateway();
    const appointments = await gateway.listAppointments();
    if (!appointments.ok) throw new Error('listAppointments falhou');
    await renderWith(gateway);

    for (const appointment of appointments.data.filter((item) => item.status === 'completed')) {
      expect(
        await screen.findByText(
          `Nota fiscal referente à consulta do dia ${formatDate(appointment.startsAt)}`
        )
      ).toBeOnTheScreen();
    }
    expect(screen.queryByText('Nota fiscal')).toBeNull();
  });

  it('avisa quando a nota fiscal ainda não foi emitida', async () => {
    await renderWith({
      listAppointments: async () => ok([consult]),
      listDocuments: async () => ok([invoice('pending')]),
    });

    expect(
      await screen.findByLabelText(
        'Nota fiscal referente à consulta do dia 05/10/2026. ' +
          'Será emitida 24 horas depois da realização da consulta.'
      )
    ).toBeOnTheScreen();
  });

  it('mostra quando a nota fiscal já foi entregue', async () => {
    await renderWith({
      listAppointments: async () => ok([consult]),
      listDocuments: async () => ok([invoice('available')]),
    });

    expect(
      await screen.findByLabelText(
        'Nota fiscal referente à consulta do dia 05/10/2026. Entregue em 05/10/2026'
      )
    ).toBeOnTheScreen();
  });

  it('mostra a mensagem de erro do contrato', async () => {
    await renderWith({
      listDocuments: async () => ({
        ok: false,
        requestId: 'test',
        error: { code: 'not_available', message: 'Documentos indisponíveis no momento.' },
      }),
    });

    expect(await screen.findByText('Documentos indisponíveis no momento.')).toBeOnTheScreen();
  });

  it('mostra estado vazio quando não há documentos', async () => {
    await renderWith({ listDocuments: async () => ok([]) });

    expect(await screen.findByText('Nenhum documento por aqui ainda.')).toBeOnTheScreen();
  });
});
