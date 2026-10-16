/// <reference types="jest" />

import * as Notifications from 'expo-notifications';

import { MoodEntry, MoodLevel } from '@/contracts/platform';
import { careContent, reminderContent, scheduleDailyReminders } from '@/services/daily-reminders';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => [
    { identifier: 'lembrete-antigo' },
    { identifier: 'med.daily.08:00' },
  ]),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
}));

const mocked = jest.mocked(Notifications);
const morning = new Date(2026, 9, 9, 10, 0);
const mood = (level: MoodLevel, at: Date): MoodEntry => ({
  id: `mood-${at.getTime()}`,
  checkId: 'check',
  level,
  note: null,
  recordedAt: at.toISOString(),
});
const scheduled = () =>
  mocked.scheduleNotificationAsync.mock.calls.map(([request]) => ({
    body: request.content.body,
    date: (request.trigger as { date: Date }).date,
  }));

describe('scheduleDailyReminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pede permissão e agenda os próximos dias às 20h, a partir de hoje', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);

    await scheduleDailyReminders([], morning);

    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    // Refaz só os seus avisos: os dos remédios ficam.
    expect(mocked.cancelScheduledNotificationAsync.mock.calls).toEqual([['lembrete-antigo']]);
    const calls = mocked.scheduleNotificationAsync.mock.calls.map(([request]) => request);
    expect(calls).toHaveLength(14);
    expect(calls[0]).toEqual({
      content: reminderContent(),
      trigger: expect.objectContaining({ type: 'date', date: new Date(2026, 9, 9, 20) }),
    });
  });

  it('pula hoje se o humor já foi registrado', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    await scheduleDailyReminders([mood(4, new Date(2026, 9, 9, 8, 0))], morning);

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    const first = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(first.trigger).toEqual(expect.objectContaining({ date: new Date(2026, 9, 10, 20, 0) }));
  });

  it('sem permissão, não agenda nada', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);

    await scheduleDailyReminders([], morning);

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('depois de um dia difícil, a Patrícia procura o paciente no dia seguinte às 10h', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    await scheduleDailyReminders([mood(2, new Date(2026, 9, 9, 9, 0))], morning);

    const care = scheduled().filter((item) => item.body !== reminderContent().body);
    expect(care).toEqual([
      { body: careContent('hard_day').body, date: new Date(2026, 9, 10, 10) },
      { body: careContent('quiet_days').body, date: new Date(2026, 9, 12, 10) },
    ]);
  });

  it('não agenda contato de cuidado que já passou', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    // Dia difícil anteontem: o contato de ontem já passou; falta o de 3 dias.
    await scheduleDailyReminders([mood(1, new Date(2026, 9, 7, 21, 0))], morning);

    const care = scheduled().filter((item) => item.body !== reminderContent().body);
    expect(care).toEqual([
      { body: careContent('quiet_days').body, date: new Date(2026, 9, 10, 10) },
    ]);
  });
});
