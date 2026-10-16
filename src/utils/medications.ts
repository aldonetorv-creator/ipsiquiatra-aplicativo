import { Medication, MedicationPeriod, MedicationPlan } from '@/contracts/platform';

export const periodLabels: Record<MedicationPeriod, string> = {
  morning: 'Manhã',
  midday: 'Almoço',
  afternoon: 'Tarde',
  evening: 'Noite',
  bedtime: 'Ao deitar',
};

// Hora usada para ordenar quando a receita só diz o período.
const periodTimes: Record<MedicationPeriod, string> = {
  morning: '08:00',
  midday: '12:00',
  afternoon: '16:00',
  evening: '20:00',
  bedtime: '22:00',
};

export type MedicationSlot = {
  key: string;
  period: MedicationPeriod;
  // Hora da receita; null quando ela só diz o período.
  time: string | null;
  medications: Medication[];
};

export const timeOf = (slot: Pick<MedicationSlot, 'period' | 'time'>) =>
  slot.time ?? periodTimes[slot.period];

// Os remédios por horário do dia, na ordem do dia, e os de "se precisar".
// Um remédio de duas tomadas aparece nos dois horários.
export function medicationSlots(plan: MedicationPlan): {
  slots: MedicationSlot[];
  asNeeded: Medication[];
} {
  const slots = new Map<string, MedicationSlot>();
  for (const medication of plan.medications) {
    for (const { period, time } of medication.schedule) {
      const key = `${period}|${time ?? ''}`;
      const slot = slots.get(key) ?? { key, period, time, medications: [] };
      slot.medications.push(medication);
      slots.set(key, slot);
    }
  }
  return {
    slots: [...slots.values()].sort((a, b) => timeOf(a).localeCompare(timeOf(b))),
    asNeeded: plan.medications.filter((medication) => medication.asNeeded),
  };
}
