import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { eveningReminderDates } from '@/utils/evening';

const CHANNEL_ID = 'diario-de-humor';

export const eveningReminderContent = {
  title: 'Patrícia',
  body: 'Boa noite! Como foi o seu dia? Toque para registrar no diário de humor.',
  data: { screen: 'patricia' },
};

// Notificação local às 20h, enquanto não há servidor: na fase 2 quem manda é a
// Patrícia da plataforma (docs/fases.md). Refaz a agenda inteira a cada vez,
// para tirar a de hoje quando o paciente já registrou o humor.
export async function scheduleEveningReminders(recordedToday: boolean, now: Date = new Date()) {
  if (Platform.OS === 'web') return;
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

  // Nesta fase o app só agenda estes lembretes, então pode limpar tudo.
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const date of eveningReminderDates(now, recordedToday)) {
    await Notifications.scheduleNotificationAsync({
      content: eveningReminderContent,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}
