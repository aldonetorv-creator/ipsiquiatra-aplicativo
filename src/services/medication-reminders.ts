import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import { MedicationPlan } from '@/contracts/platform';
import { notifications } from '@/services/notifications-module';
import { KeyValueStore } from '@/services/storage';
import {
  followUpBody,
  followUpId,
  isMedicationId,
  reminderBody,
  reminderSchedule,
  reminderTimes,
  takenKey,
} from '@/utils/medication-reminders';
import { dayKey } from '@/utils/time';

// Lembrete dos remédios nos horários da receita (utils/medication-reminders.ts).
// Fica só no aparelho: a escolha de receber e os avisos já respondidos.

const CHANNEL_ID = 'medicacoes';
export const CATEGORY_ID = 'medicacao';
export const TAKEN_ACTION = 'ja_tomei';
export const ENABLED_KEY = 'ipsiquiatra:medication-reminders';
const ANSWERED_KEY = 'ipsiquiatra:medication-answered';
// Os "Já tomei" das duas últimas semanas, para a semana do paciente.
const TAKEN_KEY = 'ipsiquiatra:medication-taken';
const TAKEN_DAYS = 14;

// No app, AsyncStorage; os testes passam um armazenamento em memória.
const deviceStore: KeyValueStore = AsyncStorage;

type NotificationsModule = NonNullable<ReturnType<typeof notifications>>;

export const remindersAvailable = () => notifications() !== null;

export async function readRemindersEnabled(store: KeyValueStore = deviceStore) {
  return (await store.getItem(ENABLED_KEY).catch(() => null)) === 'on';
}

async function readAnswered(store: KeyValueStore, today: string): Promise<string[]> {
  try {
    const list = JSON.parse((await store.getItem(ANSWERED_KEY)) ?? '[]');
    // Só os de hoje em diante: os antigos não servem mais.
    return Array.isArray(list)
      ? list.filter((id): id is string => typeof id === 'string' && id.split('.')[2] >= today)
      : [];
  } catch {
    return [];
  }
}

async function cancelScheduled(Notifications: NotificationsModule) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => isMedicationId(request.identifier))
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
  );
}

async function prepare(Notifications: NotificationsModule) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lembrete dos remédios',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  // O botão "Já tomei" responde sem abrir o app.
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: TAKEN_ACTION, buttonTitle: 'Já tomei', options: { opensAppToForeground: false } },
  ]);
}

// O segundo aviso leva o dia do horário: o das 23:45 chega no dia seguinte.
const content = (body: string, time: string, followUp: boolean, day?: string) => ({
  title: 'Patrícia',
  body,
  data: { screen: 'medicacoes', kind: 'medication', time, followUp, ...(day ? { day } : {}) },
  categoryIdentifier: CATEGORY_ID,
});

// Avisa a tela quando um "Já tomei" chega com o app aberto.
type Listener = () => void;
const takenListeners = new Set<Listener>();
export function onTakenChange(listener: Listener) {
  takenListeners.add(listener);
  return () => {
    takenListeners.delete(listener);
  };
}

// Os "Já tomei" guardados no celular ("2026-10-16.08:00"), das últimas semanas.
export async function readTakenLog(
  now: Date = new Date(),
  store: KeyValueStore = deviceStore
): Promise<string[]> {
  const oldest = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - TAKEN_DAYS));
  try {
    const list = JSON.parse((await store.getItem(TAKEN_KEY)) ?? '[]');
    return Array.isArray(list)
      ? list.filter((key): key is string => typeof key === 'string' && key >= oldest)
      : [];
  } catch {
    return [];
  }
}

// Refaz todos os avisos dos remédios: os horários podem ter mudado com uma
// receita nova. Sem a escolha de receber, ou sem permissão, só cancela.
export async function syncMedicationReminders(
  plan: MedicationPlan | null,
  now: Date = new Date(),
  store: KeyValueStore = deviceStore
) {
  const Notifications = notifications();
  if (!Notifications) return;
  await cancelScheduled(Notifications);
  const times = reminderTimes(plan);
  if (times.length === 0 || !(await readRemindersEnabled(store))) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  await prepare(Notifications);
  const answered = await readAnswered(store, dayKey(now));
  await store.setItem(ANSWERED_KEY, JSON.stringify(answered));
  const { daily, followUps } = reminderSchedule(times, now, new Set(answered));
  for (const { id, time, hour, minute } of daily) {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: content(reminderBody(time), time, false),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  }
  for (const { id, day, time, date } of followUps) {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: content(followUpBody(time), time, true, day),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export type ReminderChoice = 'on' | 'off' | 'denied';

// O paciente aceita (ou desliga) o lembrete. Aceitar pede a permissão.
export async function setMedicationReminders(
  enabled: boolean,
  plan: MedicationPlan | null,
  now: Date = new Date(),
  store: KeyValueStore = deviceStore
): Promise<ReminderChoice> {
  const Notifications = notifications();
  if (enabled && Notifications) {
    let { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (!granted && canAskAgain) {
      if (Platform.OS === 'android') await prepare(Notifications);
      ({ granted } = await Notifications.requestPermissionsAsync());
    }
    if (!granted) return 'denied';
  }
  await store.setItem(ENABLED_KEY, enabled ? 'on' : 'off');
  await syncMedicationReminders(plan, now, store);
  return enabled ? 'on' : 'off';
}

// "Já tomei" (na notificação, com o app aberto ou não): fecha o aviso, marca o
// horário na semana do paciente e, se for o primeiro aviso, cancela o segundo.
export async function handleTakenResponse(
  response: NotificationResponse,
  store: KeyValueStore = deviceStore
) {
  const Notifications = notifications();
  if (!Notifications || response.actionIdentifier !== TAKEN_ACTION) return;
  const { request, date } = response.notification;
  const data = request.content.data as {
    kind?: string;
    time?: string;
    followUp?: boolean;
    day?: string;
  };
  await Notifications.dismissNotificationAsync(request.identifier).catch(() => undefined);
  if (data?.kind !== 'medication' || !data.time) return;
  const day = data.day ?? dayKey(new Date(date));
  const taken = await readTakenLog(new Date(date), store);
  const key = takenKey(day, data.time);
  if (!taken.includes(key)) {
    await store.setItem(TAKEN_KEY, JSON.stringify([...taken, key]));
  }
  takenListeners.forEach((listener) => listener());
  if (data.followUp) return;
  const id = followUpId(day, data.time);
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  const answered = await readAnswered(store, day);
  if (!answered.includes(id)) {
    await store.setItem(ANSWERED_KEY, JSON.stringify([...answered, id]));
  }
}

// "Sair" desliga o lembrete deste aparelho.
export async function clearMedicationReminders(store: KeyValueStore = deviceStore) {
  const Notifications = notifications();
  await store.removeItem(ENABLED_KEY).catch(() => undefined);
  await store.removeItem(ANSWERED_KEY).catch(() => undefined);
  await store.removeItem(TAKEN_KEY).catch(() => undefined);
  if (Notifications) await cancelScheduled(Notifications);
}
