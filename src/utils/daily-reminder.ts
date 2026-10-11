import { ReminderSettings } from '@/contracts/platform';

// Lembrete diário da Patrícia para o diário de humor. O horário é do produto,
// não do paciente (decisão do Dr. Aldo; ver docs/fases.md): todo dia às 20h.
// Depois de um dia difícil, ela volta às 10h do dia seguinte
// (utils/care-contacts.ts).
export const DAILY_REMINDER_HOUR = 20;

// Momento do lembrete no dia de `date`.
export const reminderTimeOn = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), DAILY_REMINDER_HOUR);

// Mensagem na conversa e texto da notificação.
export const dailyCheckText =
  'Boa noite! Como foi o seu dia? Se quiser, me conte no diário de humor como você está.';
export const reminderNotificationBody =
  'Boa noite! Como foi o seu dia? Toque para registrar no diário de humor.';

// O lembrete de teste chega alguns segundos depois de pedido.
export const TEST_DELAY_SECONDS = 5;

// Próximos lembretes. Hoje só entra se ainda não deu 20h e o paciente ainda
// não registrou o humor.
export function reminderDates(
  now: Date,
  recordedToday: boolean,
  settings: ReminderSettings,
  count = 14
): Date[] {
  if (!settings.enabled) return [];
  const dates: Date[] = [];
  for (let offset = 0; dates.length < count; offset++) {
    const date = reminderTimeOn(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    );
    if (offset === 0 && (recordedToday || date.getTime() <= now.getTime())) continue;
    dates.push(date);
  }
  return dates;
}
