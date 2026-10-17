/// <reference types="jest" />

import { render, screen } from '@testing-library/react-native';

import CofreScreen from '@/app/cofre';
import MedicacoesScreen from '@/app/medicacoes';
import { NextAppointmentCard } from '@/components/appointments/next-appointment-card';
import { Appointment, Medication, MedicationPlan, PatientAppGateway } from '@/contracts/platform';
import { createMockPatientAppGateway, mockDoctor } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import { followUpFor } from '@/utils/appointments';
import { medicationSlots } from '@/utils/medications';
import { reminderTimes } from '@/utils/medication-reminders';

// O que a plataforma ainda não manda (docs/api-paciente.md): data do retorno,
// forma de atendimento em algumas consultas, horário escrito na receita e o
// arquivo dos documentos.

jest.mock('@/components/care/medication-reminder-card', () => ({
  MedicationReminderCard: () => null,
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

const ok = <T,>(data: T) => ({ ok: true as const, requestId: 'test', data });

function renderWith(element: React.ReactElement, overrides: Partial<PatientAppGateway> = {}) {
  const gateway = { ...createMockPatientAppGateway(), ...overrides };
  return render(<PatientAppGatewayProvider gateway={gateway}>{element}</PatientAppGatewayProvider>);
}

const appointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'a1',
  startsAt: '2026-10-01T13:00:00.000Z',
  durationMinutes: 50,
  modality: null,
  status: 'completed',
  doctor: mockDoctor,
  returnDueAt: null,
  ...overrides,
});

const medication = (overrides: Partial<Medication>): Medication => ({
  id: 'm',
  name: 'Remédio',
  dose: '1 comprimido',
  schedule: [],
  asNeeded: false,
  instructions: null,
  prescriptionId: 'doc-1',
  ...overrides,
});

const plan: MedicationPlan = {
  sources: [
    { prescriptionId: 'doc-1', issuedAt: '2026-10-01T12:00:00Z', validatedBy: 'Dr. Teste' },
  ],
  medications: [
    medication({
      id: 'a',
      name: 'Sertralina 50 mg',
      schedule: [{ period: 'morning', time: null }],
    }),
    medication({ id: 'b', name: 'Lamotrigina 25 mg', dose: '1 comprimido de 12/12h' }),
    medication({ id: 'c', name: 'Hidroxizina 25 mg', asNeeded: true }),
  ],
};

describe('remédio sem horário na receita', () => {
  it('fica em "Sem horário definido" e não tem lembrete', () => {
    const { slots, asNeeded, unscheduled } = medicationSlots(plan);

    expect(slots.map((slot) => slot.medications.map((item) => item.id))).toEqual([['a']]);
    expect(asNeeded.map((item) => item.id)).toEqual(['c']);
    expect(unscheduled.map((item) => item.id)).toEqual(['b']);
    expect(reminderTimes(plan)).toEqual(['08:00']);
  });

  it('aparece em Minhas medicações', async () => {
    await renderWith(<MedicacoesScreen />, { getMedicationPlan: async () => ok(plan) });

    expect(await screen.findByText('Sem horário definido')).toBeOnTheScreen();
    expect(screen.getByText('Lamotrigina 25 mg')).toBeOnTheScreen();
    expect(screen.getByText('Confira na receita como tomar.')).toBeOnTheScreen();
  });

  it('sem nenhum, o grupo não aparece', async () => {
    const scheduled = { ...plan, medications: [plan.medications[0]] };
    await renderWith(<MedicacoesScreen />, { getMedicationPlan: async () => ok(scheduled) });

    expect(await screen.findByText('Sertralina 50 mg')).toBeOnTheScreen();
    expect(screen.queryByText('Sem horário definido')).toBeNull();
  });
});

describe('consultas sem os dados que faltam', () => {
  it('sem a data do retorno, o "Agora" fica em acompanhamento, nunca atrasado', () => {
    const now = new Date('2026-12-20T12:00:00Z');
    expect(followUpFor([appointment()], now)).toMatchObject({ kind: 'following' });
  });

  it('sem a forma de atendimento, a próxima consulta não mostra o selo', async () => {
    await render(
      <NextAppointmentCard
        appointment={appointment({ status: 'scheduled' })}
        onReschedule={() => undefined}
      />
    );

    expect(screen.getByText(mockDoctor.name)).toBeOnTheScreen();
    expect(screen.queryByText('Teleconsulta')).toBeNull();
    expect(screen.queryByText('Presencial')).toBeNull();
  });
});

describe('Cofre com os documentos de verdade', () => {
  it('diz que o documento chega por link no SMS e mostra a lista', async () => {
    await renderWith(<CofreScreen />, {
      dataMode: () => 'real',
      listAppointments: async () => ok([appointment()]),
      listDocuments: async () =>
        ok([
          {
            id: 'doc-1',
            displayName: 'Receita',
            kind: 'prescription' as const,
            createdAt: '2026-10-01T15:00:00.000Z',
            appointmentId: 'a1',
            availability: 'available' as const,
          },
        ]),
    });

    expect(
      await screen.findByText(
        'Cada documento chega a você por link no SMS. Por enquanto, os arquivos não abrem pelo app.'
      )
    ).toBeOnTheScreen();
    expect(screen.getByText('Receita')).toBeOnTheScreen();
    expect(screen.queryByText(/Documentos de exemplo/)).toBeNull();
  });
});
