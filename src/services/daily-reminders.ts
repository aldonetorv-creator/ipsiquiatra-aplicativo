import { Platform } from 'react-native';

import { MoodEntry } from '@/contracts/platform';
import { notifications } from '@/services/notifications-module';
import { CareReason, careContactsAfter, careNotificationBody } from '@/utils/care-contacts';
import { reminderDates, reminderNotificationBody } from '@/utils/daily-reminder';
import { isMedicationId } from '@/utils/medication-reminders';
import { dayKey } from '@/utils/time';

const CHANNEL_ID = 'diario-de-humor';

const content = (body: string) => ({
  title: 'Patrícia',
  body,
  data: { screen: 'patricia' },
});

export const reminderContent = () => content(reminderNotificationBody);
export const careContent = (reason: CareReason) => content(careNotificationBody[reason]);

// Notificações locais enquanto não há servidor: o lembrete diário das 20h e os
// contatos de cuidado (utils/care-contacts.ts). Na fase 2 quem manda é a
// Patrícia da plataforma (docs/fases.md). Refaz a agenda inteira a cada vez,
// para seguir o último registro de humor.
export async function scheduleDailyReminders(moodEntries: MoodEntry[], now: Date = new Date()) {
  const Notifications = notifications();
  if (!Notifications) return;
  const recordedToday = moodEntries.some(
    (entry) => dayKey(new Date(entry.recordedAt)) === dayKey(now)
  );
  const planned = [
    ...reminderDates(now, recordedToday).map((date) => ({
      date,
      content: reminderContent(),
    })),
    ...careContactsAfter(moodEntries)
      .filter((contact) => contact.at.getTime() > now.getTime())
      .map((contact) => ({ date: contact.at, content: careContent(contact.reason) })),
  ];
  if (!(await ensurePermission(Notifications))) return;

  // Refaz só as suas: os lembretes dos remédios (medication-reminders.ts)
  // têm agenda própria.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => !isMedicationId(request.identifier))
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
  );
  for (const { date, content } of planned) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  }
}

// Pede a permissão quando o celular ainda deixa pedir. No Android 13+, o pedido
// só aparece depois de existir um canal.
async function ensurePermission(Notifications: NonNullable<ReturnType<typeof notifications>>) {
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
