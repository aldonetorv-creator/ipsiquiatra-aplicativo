import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { MoodEntry, ReminderSettings } from '@/contracts/platform';
import { CareReason, careContactsAfter, careNotificationBody } from '@/utils/care-contacts';
import {
  reminderDates,
  reminderNotificationBody,
  TEST_DELAY_SECONDS,
} from '@/utils/daily-reminder';
import { dayKey } from '@/utils/time';

const CHANNEL_ID = 'diario-de-humor';

const content = (body: string) => ({
  title: 'Patrícia',
  body,
  data: { screen: 'patricia' },
});

export const reminderContent = (hour: number) => content(reminderNotificationBody(hour));
export const careContent = (reason: CareReason) => content(careNotificationBody[reason]);

// Notificações locais enquanto não há servidor: o lembrete diário no horário
// escolhido pelo paciente e os contatos de cuidado (utils/care-contacts.ts). Na
// fase 2 quem manda é a Patrícia da plataforma (docs/fases.md). Refaz a agenda
// inteira a cada vez, para seguir o horário atual e o último registro de humor.
// Desligar o lembrete diário não desliga os contatos de cuidado.
export async function scheduleDailyReminders(
  settings: ReminderSettings,
  moodEntries: MoodEntry[],
  now: Date = new Date()
) {
  if (Platform.OS === 'web') return;
  const recordedToday = moodEntries.some(
    (entry) => dayKey(new Date(entry.recordedAt)) === dayKey(now)
  );
  const planned = [
    ...reminderDates(now, recordedToday, settings).map((date) => ({
      date,
      content: reminderContent(settings.hour),
    })),
    ...careContactsAfter(moodEntries)
      .filter((contact) => contact.at.getTime() > now.getTime())
      .map((contact) => ({ date: contact.at, content: careContent(contact.reason) })),
  ];
  // Nesta fase o app só agenda estas notificações, então pode limpar tudo.
  if (planned.length === 0) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  if (!(await ensurePermission())) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const { date, content } of planned) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}

// Pede a permissão quando o celular ainda deixa pedir. No Android 13+, o pedido
// só aparece depois de existir um canal.
async function ensurePermission() {
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
  return granted;
}

// "blocked": o paciente negou e o celular não deixa pedir de novo; só nas
// configurações do celular. "unsupported": na web não há notificação local.
export type NotificationAccess = 'granted' | 'ask' | 'blocked' | 'unsupported';

export async function notificationAccess(): Promise<NotificationAccess> {
  if (Platform.OS === 'web') return 'unsupported';
  const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  if (granted) return 'granted';
  return canAskAgain ? 'ask' : 'blocked';
}

// Lembrete de teste em alguns segundos, para o paciente ver como chega sem
// esperar o horário. Devolve false se não houver permissão.
export async function sendTestReminder(hour: number) {
  if (Platform.OS === 'web' || !(await ensurePermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: reminderContent(hour),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: TEST_DELAY_SECONDS,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}
