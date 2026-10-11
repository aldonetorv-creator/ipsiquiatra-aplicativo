/// <reference types="jest" />

import { DEFAULT_REMINDER_SETTINGS } from '@/contracts/platform';
import { notificationsUnavailableOn } from '@/services/notifications-module';

// No Expo Go do Android (SDK 53+), só carregar o expo-notifications já lança
// erro e o app não abre. O app precisa abrir mesmo assim, sem notificações.
describe('Expo Go no Android', () => {
  type Loaded = {
    service: typeof import('@/services/daily-reminders');
    loadedNotifications: () => boolean;
  };

  function loadOnExpoGoAndroid(): Loaded {
    let loaded: Loaded | null = null;
    jest.isolateModules(() => {
      let notificationsLoaded = false;
      jest.doMock('expo', () => ({ isRunningInExpoGo: () => true }));
      jest.doMock('expo-router', () => ({ router: { push: jest.fn() } }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      jest.replaceProperty(require('react-native').Platform, 'OS', 'android');
      jest.doMock('expo-notifications', () => {
        notificationsLoaded = true;
        throw new Error(
          'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53.'
        );
      });
      // O hook do lembrete, carregado pelo app ao abrir, também não pode falhar.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/hooks/use-daily-reminders');
      loaded = {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        service: require('@/services/daily-reminders'),
        loadedNotifications: () => notificationsLoaded,
      };
    });
    return loaded!;
  }

  it('abre sem carregar as notificações e avisa que elas não funcionam ali', async () => {
    const { service, loadedNotifications } = loadOnExpoGoAndroid();

    await service.scheduleDailyReminders(DEFAULT_REMINDER_SETTINGS, []);
    expect(await service.notificationAccess()).toBe('expo_go');
    expect(await service.sendTestReminder(20)).toBe(false);
    expect(loadedNotifications()).toBe(false);
  });

  it('só o Expo Go do Android e a web ficam sem notificação local', () => {
    expect(notificationsUnavailableOn('android', true)).toBe('expo_go');
    expect(notificationsUnavailableOn('android', false)).toBeNull();
    expect(notificationsUnavailableOn('ios', true)).toBeNull();
    expect(notificationsUnavailableOn('web', false)).toBe('web');
  });
});
