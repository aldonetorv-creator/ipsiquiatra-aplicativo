/// <reference types="jest" />

import * as Notifications from 'expo-notifications';

import { eveningReminderContent, scheduleEveningReminders } from '@/services/evening-reminders';
import { EVENING_HOUR } from '@/utils/evening';

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

describe('scheduleEveningReminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pede permissão e agenda as próximas noites às 20h, a partir de hoje', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);

    await scheduleEveningReminders(false, morning);

    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    const calls = mocked.scheduleNotificationAsync.mock.calls.map(([request]) => request);
    expect(calls).toHaveLength(14);
    expect(calls[0]).toEqual({
      content: eveningReminderContent,
      trigger: expect.objectContaining({
        type: 'date',
        date: new Date(2026, 9, 9, EVENING_HOUR),
      }),
    });
  });

  it('não agenda a de hoje se o humor já foi registrado', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);

    await scheduleEveningReminders(true, morning);

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    const first = mocked.scheduleNotificationAsync.mock.calls[0][0];
    expect(first.trigger).toEqual(
      expect.objectContaining({ date: new Date(2026, 9, 10, EVENING_HOUR) })
    );
  });

  it('sem permissão, não agenda nada', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);

    await scheduleEveningReminders(false, morning);

    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mocked.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
