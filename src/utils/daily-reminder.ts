import { ReminderSettings } from '@/contracts/platform';

// Lembrete diário da Patrícia para o diário de humor (pedido do Dr. Aldo; ver
// docs/fases.md). Por padrão às 20h; o paciente pode mudar o horário ou desligar.

const pad = (value: number) => String(value).padStart(2, '0');

// "20:00".
export const formatReminderTime = ({ hour, minute }: Pick<ReminderSettings, 'hour' | 'minute'>) =>
  `${pad(hour)}:${pad(minute)}`;

// Momento do lembrete no dia de `date`.
export const reminderTimeOn = (date: Date, { hour, minute }: ReminderSettings) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);

// Pergunta da Patrícia de acordo com a hora do lembrete.
function dailyQuestion(hour: number) {
  if (hour < 12) return 'Bom dia! Como você está hoje?';
  if (hour < 18) return 'Boa tarde! Como está o seu dia?';
  return 'Boa noite! Como foi o seu dia?';
}

// Mensagem na conversa e texto da notificação.
export const dailyCheckText = (hour: number) =>
  `${dailyQuestion(hour)} Se quiser, me conte no diário de humor como você está.`;
export const reminderNotificationBody = (hour: number) =>
  `${dailyQuestion(hour)} Toque para registrar no diário de humor.`;

// Próximos lembretes no horário escolhido. Hoje só entra se o horário ainda
// não passou e o paciente ainda não registrou o humor.
export function reminderDates(
  now: Date,
  recordedToday: boolean,
  settings: ReminderSettings,
  count = 14
): Date[] {
  if (!settings.enabled) return [];
  const dates: Date[] = [];
  for (let offset = 0; dates.length < count; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const date = reminderTimeOn(day, settings);
    if (offset === 0 && (recordedToday || date.getTime() <= now.getTime())) continue;
    dates.push(date);
  }
  return dates;
}
