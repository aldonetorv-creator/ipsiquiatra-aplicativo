// Mensagem diária da Patrícia, por volta das 20h, convidando para o diário de
// humor (pedido do Dr. Aldo; ver docs/fases.md).
export const EVENING_HOUR = 20;

// Próximas noites às 20h. Hoje só entra se ainda não passou das 20h e o
// paciente ainda não registrou o humor.
export function eveningReminderDates(now: Date, recordedToday: boolean, count = 14): Date[] {
  const dates: Date[] = [];
  for (let offset = 0; dates.length < count; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, EVENING_HOUR);
    if (offset === 0 && (recordedToday || date.getTime() <= now.getTime())) continue;
    dates.push(date);
  }
  return dates;
}
