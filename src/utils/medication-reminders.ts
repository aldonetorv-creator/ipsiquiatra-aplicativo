import { MedicationPlan } from '@/contracts/platform';
import { medicationSlots, timeOf } from '@/utils/medications';
import { dayKey } from '@/utils/time';

// Lembrete dos remédios (decisões do Dr. Aldo, 16/10/2026):
// - os horários vêm da receita validada (a lista de Minhas medicações); o
//   paciente não cadastra remédio nem horário, só aceita o lembrete;
// - a notificação não diz o nome dos remédios (a tela bloqueada fica à vista);
// - "Já tomei" na própria notificação fecha o aviso e cancela o segundo aviso,
//   30 minutos depois, que só vem se ele não responder. Nada vira registro de
//   adesão: não responder não quer dizer que não tomou.

export const FOLLOW_UP_MINUTES = 30;
// Dias à frente com o segundo aviso agendado; o app renova ao abrir e a cada
// "Já tomei".
export const FOLLOW_UP_DAYS = 3;

export const reminderBody = (time: string) => `Hora dos seus remédios das ${time}.`;
export const followUpBody = (time: string) =>
  `Lembrete dos remédios das ${time}. Se já tomou, toque em "Já tomei".`;

export const dailyId = (time: string) => `med.daily.${time}`;
export const followUpId = (day: string, time: string) => `med.followup.${day}.${time}`;
export const isMedicationId = (id: string) => id.startsWith('med.');

// Os horários do dia com algum remédio, sem repetir e em ordem ("08:00").
// Os de "se precisar" não têm lembrete.
export function reminderTimes(plan: MedicationPlan | null): string[] {
  if (!plan) return [];
  return [...new Set(medicationSlots(plan).slots.map(timeOf))].sort();
}

export type ReminderSchedule = {
  daily: { id: string; time: string; hour: number; minute: number }[];
  followUps: { id: string; day: string; time: string; date: Date }[];
};

// O que agendar: um aviso diário por horário e o segundo aviso dos próximos
// dias, menos os que já passaram e os já respondidos com "Já tomei".
export function reminderSchedule(
  times: string[],
  now: Date,
  answered: Set<string> = new Set()
): ReminderSchedule {
  const daily = times.map((time) => {
    const [hour, minute] = time.split(':').map(Number);
    return { id: dailyId(time), time, hour, minute };
  });
  const followUps: ReminderSchedule['followUps'] = [];
  for (let offset = 0; offset < FOLLOW_UP_DAYS; offset++) {
    for (const { time, hour, minute } of daily) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
        hour,
        minute + FOLLOW_UP_MINUTES
      );
      const day = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset));
      const id = followUpId(day, time);
      if (date.getTime() > now.getTime() && !answered.has(id)) {
        followUps.push({ id, day, time, date });
      }
    }
  }
  return { daily, followUps };
}
