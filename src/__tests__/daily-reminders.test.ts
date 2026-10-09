/// <reference types="jest" />

import * as Notifications from 'expo-notifications';

import { DEFAULT_REMINDER_SETTINGS } from '@/contracts/platform';
import { reminderContent, scheduleDailyReminders } from '@/services/daily-reminders';

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

describe('scheduleDailyReminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pede permissão e agenda os próximos dias às 20h, a partir de hoje', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);

    await scheduleDailyReminders(DEFAULT_REMINDER_SETTINGS, false, morning);

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

    await scheduleDailyReminders({ enabled: true, hour: 21, minute: 30 }, true, morning);

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    const first = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(first.trigger).toEqual(expect.objectContaining({ date: new Date(2026, 9, 10, 21, 30) }));
  });

  it('desligado, cancela os lembretes sem pedir permissão', async () => {
    await scheduleDailyReminders({ ...DEFAULT_REMINDER_SETTINGS, enabled: false }, false, morning);

    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('sem permissão, não agenda nada', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);

    await scheduleDailyReminders(DEFAULT_REMINDER_SETTINGS, false, morning);

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
