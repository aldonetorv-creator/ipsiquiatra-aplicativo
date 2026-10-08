// Hora local no formato 24h (ex.: 09:05), sem depender de Intl.
export function formatTime(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
