/// <reference types="jest" />

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import MedicacoesScreen from '@/app/medicacoes';
import PlanoScreen from '@/app/plano';
import { MedicationPlan, PatientAppGateway } from '@/contracts/platform';
import { mockMedicationPlan } from '@/mocks/care';
import { createMockPatientAppGateway, mockAppointments } from '@/mocks/patient-app-gateway';
import { PatientAppGatewayProvider } from '@/services/patient-app-gateway';
import { medicationSlots, nextSlotKey } from '@/utils/medications';
import { boldSegments } from '@/utils/rich-text';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

beforeEach(() => jest.mocked(router.push).mockClear());

async function renderWith(
  screenElement: React.ReactElement,
  overrides: Partial<PatientAppGateway> = {}
) {
  const gateway = { ...createMockPatientAppGateway(), ...overrides };
  return render(
    <PatientAppGatewayProvider gateway={gateway}>{screenElement}</PatientAppGatewayProvider>
  );
}

const ok = <T,>(data: T) => ({ ok: true as const, requestId: 'test', data });
const plan = mockMedicationPlan(mockAppointments(new Date(2026, 9, 12)))!;

describe('remédios por horário', () => {
  it('organiza na ordem do dia; quem toma duas vezes aparece nos dois horários', () => {
    const { slots, asNeeded } = medicationSlots(plan);

    expect(slots.map((slot) => [slot.period, slot.time])).toEqual([
      ['morning', '08:00'],
      ['evening', '20:00'],
      ['bedtime', '22:00'],
    ]);
    expect(slots[0].medications.map((item) => item.name)).toEqual([
      'Sertralina 50 mg',
      'Lamotrigina 50 mg',
    ]);
    expect(slots[1].medications.map((item) => item.name)).toEqual(['Lamotrigina 50 mg']);
    expect(asNeeded.map((item) => item.name)).toEqual(['Hidroxizina 25 mg']);
  });

  it('sem hora na receita, ordena pelo período', () => {
    const onlyPeriods: MedicationPlan = {
      ...plan,
      medications: [
        { ...plan.medications[0], id: 'a', schedule: [{ period: 'bedtime', time: null }] },
        { ...plan.medications[0], id: 'b', schedule: [{ period: 'midday', time: null }] },
      ],
    };
    expect(medicationSlots(onlyPeriods).slots.map((slot) => slot.period)).toEqual([
      'midday',
      'bedtime',
    ]);
  });

  it('o próximo horário é o seguinte do dia; depois do último, o primeiro de amanhã', () => {
    const { slots } = medicationSlots(plan);
    expect(nextSlotKey(slots, new Date(2026, 9, 12, 7, 30))).toBe('morning|08:00');
    expect(nextSlotKey(slots, new Date(2026, 9, 12, 9, 0))).toBe('evening|20:00');
    expect(nextSlotKey(slots, new Date(2026, 9, 12, 23, 0))).toBe('morning|08:00');
  });
});

describe('negrito do plano de cuidados', () => {
  it('separa os trechos entre ** e deixa a marca sem par como texto', () => {
    expect(boldSegments('Ligue **188** já')).toEqual([
      { text: 'Ligue ', bold: false },
      { text: '188', bold: true },
      { text: ' já', bold: false },
    ]);
    expect(boldSegments('a **b')).toEqual([{ text: 'a **b', bold: false }]);
  });
});

describe('Minhas medicações', () => {
  it('mostra a receita validada, os horários, o "se precisar" e o aviso', async () => {
    await renderWith(<MedicacoesScreen />);

    expect(await screen.findByText(/validada por Dr\. Aldo Araújo\./)).toBeOnTheScreen();
    expect(screen.getByText('Manhã · 08:00')).toBeOnTheScreen();
    expect(screen.getByText('Noite · 20:00')).toBeOnTheScreen();
    expect(screen.getByText('Ao deitar · 22:00')).toBeOnTheScreen();
    expect(screen.getAllByText('Lamotrigina 50 mg')).toHaveLength(2);
    expect(screen.getByText('Se precisar')).toBeOnTheScreen();
    expect(screen.getByText('Não pare nem mude a dose por conta própria.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver a receita no Cofre' }));
    expect(router.push).toHaveBeenCalledWith('/cofre');
  });

  it('sem receita, explica quando a lista aparece', async () => {
    await renderWith(<MedicacoesScreen />, { getMedicationPlan: async () => ok(null) });

    expect(
      await screen.findByText('Sua lista aparece aqui quando houver uma receita do Dr. Aldo.')
    ).toBeOnTheScreen();
  });
});

describe('Plano de cuidados', () => {
  it('mostra o acolhimento e as seções do Dr. Aldo, na ordem, com negrito', async () => {
    await renderWith(<PlanoScreen />);

    expect(await screen.findByText(/Cada pequeno passo conta/)).toBeOnTheScreen();
    const titles = screen.getAllByRole('header').map((node) => node.props.children);
    expect(titles).toEqual([
      'O mais importante agora',
      'Seu plano de tratamento',
      'O que observar',
      'Orientações personalizadas',
      'Quando entrar em contato',
      'Próximo passo',
    ]);
    expect(screen.getByText('todas as manhãs')).toHaveStyle({ fontWeight: 700 });
  });

  it('abre o plano do documento escolhido no Cofre', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ documento: 'outro' });
    await renderWith(<PlanoScreen />);

    expect(
      await screen.findByText('O plano de cuidados aparece aqui depois da consulta.')
    ).toBeOnTheScreen();
    jest.mocked(useLocalSearchParams).mockReturnValue({});
  });
});
