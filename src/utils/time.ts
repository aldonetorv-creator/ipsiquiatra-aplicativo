// Datas no fuso local do aparelho, sem depender de Intl.

const pad = (value: number) => String(value).padStart(2, '0');

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Hora local no formato 24h (ex.: 09:05).
export function formatTime(iso: string) {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "Agora", "Há 5 min", "Há 2 horas", "Ontem", "Há 3 dias".
export function formatRelative(iso: string, now: Date = new Date()) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? 'Há 1 hora' : `Há ${hours} horas`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Ontem' : `Há ${days} dias`;
}

export function greetingFor(now: Date = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return 'Boa noite';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Chave do dia local (ex.: 2026-03-09), para agrupar registros por dia.
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type CalendarDay = {
  key: string;
  weekday: string;
  label: string;
  isToday: boolean;
};

// Os últimos 7 dias, terminando hoje.
export function lastSevenDays(now: Date = new Date()): CalendarDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    return {
      key: dayKey(date),
      weekday: index === 6 ? 'HOJE' : WEEKDAYS[date.getDay()],
      label: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
      isToday: index === 6,
    };
  });
}
