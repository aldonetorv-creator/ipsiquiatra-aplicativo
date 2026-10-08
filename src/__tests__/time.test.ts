/// <reference types="jest" />

import { dayKey, formatDayLabel, formatRelative, greetingFor, lastSevenDays } from '@/utils/time';

// Datas construídas no fuso local, como o app usa.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 2, day, hour, minute);

describe('formatRelative', () => {
  const now = at(9, 18, 30);

  it.each([
    [at(9, 18, 30), 'Agora'],
    [at(9, 18, 25), 'Há 5 min'],
    [at(9, 17, 20), 'Há 1 hora'],
    [at(9, 16, 0), 'Há 2 horas'],
    [at(8, 17, 0), 'Ontem'],
    [at(5, 18, 0), 'Há 4 dias'],
  ])('%s → %s', (date, expected) => {
    expect(formatRelative(date.toISOString(), now)).toBe(expected);
  });
});

describe('greetingFor', () => {
  it.each([
    [at(9, 3), 'Boa noite'],
    [at(9, 8), 'Bom dia'],
    [at(9, 13), 'Boa tarde'],
    [at(9, 21), 'Boa noite'],
  ])('%s → %s', (date, expected) => {
    expect(greetingFor(date)).toBe(expected);
  });
});

describe('lastSevenDays', () => {
  it('termina hoje e atravessa a virada do mês', () => {
    const days = lastSevenDays(new Date(2026, 2, 3, 10));

    expect(days.map((day) => day.label)).toEqual([
      '25 fev',
      '26 fev',
      '27 fev',
      '28 fev',
      '1 mar',
      '2 mar',
      '3 mar',
    ]);
    expect(days[6]).toEqual(
      expect.objectContaining({ weekday: 'HOJE', isToday: true, key: dayKey(at(3, 0)) })
    );
    expect(days[0].weekday).toBe('QUA');
  });
});

describe('formatDayLabel', () => {
  const now = at(9, 10);

  it.each([
    [at(9, 8), 'Hoje'],
    [at(8, 23), 'Ontem'],
    [at(2, 12), '2 de março'],
    [new Date(2025, 11, 25, 12), '25 de dezembro de 2025'],
  ])('%s → %s', (date, expected) => {
    expect(formatDayLabel(date.toISOString(), now)).toBe(expected);
  });
});
