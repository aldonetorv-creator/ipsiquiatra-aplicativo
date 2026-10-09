/// <reference types="jest" />

import { DEFAULT_REMINDER_SETTINGS } from '@/contracts/platform';
import {
  dailyCheckText,
  formatReminderTime,
  reminderDates,
  reminderNotificationBody,
} from '@/utils/daily-reminder';

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
const at20 = DEFAULT_REMINDER_SETTINGS;

describe('reminderDates', () => {
  it('agenda os próximos dias às 20h, começando hoje se ainda der tempo', () => {
    expect(reminderDates(at(9, 10), false, at20, 3)).toEqual([at(9, 20), at(10, 20), at(11, 20)]);
  });

  it('pula hoje se o horário já passou', () => {
    expect(reminderDates(at(9, 20, 30), false, at20, 2)).toEqual([at(10, 20), at(11, 20)]);
  });

  it('pula hoje se o paciente já registrou o humor', () => {
    expect(reminderDates(at(9, 10), true, at20, 2)).toEqual([at(10, 20), at(11, 20)]);
  });

  it('usa o horário escolhido pelo paciente', () => {
    const settings = { enabled: true, hour: 7, minute: 30 };

    expect(reminderDates(at(9, 7, 0), false, settings, 2)).toEqual([at(9, 7, 30), at(10, 7, 30)]);
  });

  it('desligado, não agenda nada', () => {
    expect(reminderDates(at(9, 10), false, { ...at20, enabled: false })).toEqual([]);
  });

  it('atravessa a virada do mês', () => {
    expect(reminderDates(new Date(2026, 9, 31, 21), false, at20, 2)).toEqual([
      new Date(2026, 10, 1, 20),
      new Date(2026, 10, 2, 20),
    ]);
  });
});

describe('textos do lembrete', () => {
  it('cumprimenta de acordo com a hora', () => {
    expect(dailyCheckText(8)).toMatch(/^Bom dia! Como você está hoje\?/);
    expect(dailyCheckText(15)).toMatch(/^Boa tarde! Como está o seu dia\?/);
    expect(dailyCheckText(20)).toMatch(/^Boa noite! Como foi o seu dia\?/);
    expect(reminderNotificationBody(20)).toBe(
      'Boa noite! Como foi o seu dia? Toque para registrar no diário de humor.'
    );
  });

  it('formata o horário com dois dígitos', () => {
    expect(formatReminderTime({ hour: 7, minute: 5 })).toBe('07:05');
  });
});
