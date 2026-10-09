/// <reference types="jest" />

import { EVENING_HOUR, eveningReminderDates } from '@/utils/evening';

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

describe('eveningReminderDates', () => {
  it('agenda as próximas noites às 20h, começando hoje se ainda der tempo', () => {
    const dates = eveningReminderDates(at(9, 10), false, 3);

    expect(dates).toEqual([at(9, EVENING_HOUR), at(10, EVENING_HOUR), at(11, EVENING_HOUR)]);
  });

  it('pula hoje se já passou das 20h', () => {
    expect(eveningReminderDates(at(9, 20, 30), false, 2)).toEqual([
      at(10, EVENING_HOUR),
      at(11, EVENING_HOUR),
    ]);
  });

  it('pula hoje se o paciente já registrou o humor', () => {
    expect(eveningReminderDates(at(9, 10), true, 2)).toEqual([
      at(10, EVENING_HOUR),
      at(11, EVENING_HOUR),
    ]);
  });

  it('atravessa a virada do mês', () => {
    expect(eveningReminderDates(new Date(2026, 9, 31, 21), false, 2)).toEqual([
      new Date(2026, 10, 1, EVENING_HOUR),
      new Date(2026, 10, 2, EVENING_HOUR),
    ]);
  });
});
