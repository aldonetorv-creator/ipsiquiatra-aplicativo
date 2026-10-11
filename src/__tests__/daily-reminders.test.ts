/// <reference types="jest" />

import * as Notifications from 'expo-notifications';

import { DEFAULT_REMINDER_SETTINGS, MoodEntry, MoodLevel } from '@/contracts/platform';
import { careContent, reminderContent, scheduleDailyReminders } from '@/services/daily-reminders';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 6 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
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

    await scheduleDailyReminders(DEFAULT_REMINDER_SETTINGS, [], morning);

    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    const calls = mocked.scheduleNotificationAsync.mock.calls.map(([request]) => request);
    expect(calls).toHaveLength(14);
    expect(calls[0]).toEqual({
      content: reminderContent(20),
      trigger: expect.objectContaining({ type: 'date', date: new Date(2026, 9, 9, 20) }),
    });
  });

  it('usa o horário escolhido e pula hoje se o humor já foi registrado', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    await scheduleDailyReminders(
      { enabled: true, hour: 21, minute: 30 },
      [mood(4, new Date(2026, 9, 9, 8, 0))],
      morning
    );

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    const first = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(first.trigger).toEqual(expect.objectContaining({ date: new Date(2026, 9, 10, 21, 30) }));
  });

  it('desligado e sem contatos de cuidado, cancela tudo sem pedir permissão', async () => {
    await scheduleDailyReminders({ ...DEFAULT_REMINDER_SETTINGS, enabled: false }, [], morning);

    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('sem permissão, não agenda nada', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);

    await scheduleDailyReminders(DEFAULT_REMINDER_SETTINGS, [], morning);

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('depois de um dia difícil, a Patrícia procura o paciente no dia seguinte às 10h', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    await scheduleDailyReminders(
      DEFAULT_REMINDER_SETTINGS,
      [mood(2, new Date(2026, 9, 9, 9, 0))],
      morning
    );

    const care = scheduled().filter((item) => item.body !== reminderContent(20).body);
    expect(care).toEqual([
      { body: careContent('hard_day').body, date: new Date(2026, 9, 10, 10) },
      { body: careContent('quiet_days').body, date: new Date(2026, 9, 12, 10) },
    ]);
  });

  it('com o lembrete diário desligado, mantém só os contatos de cuidado', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    await scheduleDailyReminders(
      { ...DEFAULT_REMINDER_SETTINGS, enabled: false },
      [mood(4, new Date(2026, 9, 8, 21, 0))],
      morning
    );

    expect(scheduled()).toEqual([
      { body: careContent('quiet_days').body, date: new Date(2026, 9, 11, 10) },
    ]);
  });

  it('não agenda contato de cuidado que já passou', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    // Dia difícil anteontem: o contato de ontem já passou; falta o de 3 dias.
    await scheduleDailyReminders(
      { ...DEFAULT_REMINDER_SETTINGS, enabled: false },
      [mood(1, new Date(2026, 9, 7, 21, 0))],
      morning
    );

    expect(scheduled()).toEqual([
      { body: careContent('quiet_days').body, date: new Date(2026, 9, 10, 10) },
    ]);
  });
});
