import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ReminderSettings } from '@/contracts/platform';
import { reminderDates, reminderNotificationBody } from '@/utils/daily-reminder';

const CHANNEL_ID = 'diario-de-humor';

export const reminderContent = (hour: number) => ({
  title: 'Patrícia',
  body: reminderNotificationBody(hour),
  data: { screen: 'patricia' },
});

// Notificação local no horário escolhido pelo paciente, enquanto não há
// servidor: na fase 2 quem manda é a Patrícia da plataforma (docs/fases.md).
// Refaz a agenda inteira a cada vez, para seguir o horário atual e tirar a de
// hoje quando o paciente já registrou o humor.
export async function scheduleDailyReminders(
  settings: ReminderSettings,
  recordedToday: boolean,
  now: Date = new Date()
) {
  if (Platform.OS === 'web') return;
  // Nesta fase o app só agenda estes lembretes, então pode limpar tudo.
  if (!settings.enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  // No Android 13+, o pedido de permissão só aparece depois de existir um canal.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Diário de humor',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  if (!granted && canAskAgain) {
    ({ granted } = await Notifications.requestPermissionsAsync());
  }
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const content = reminderContent(settings.hour);
  for (const date of reminderDates(now, recordedToday, settings)) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}
