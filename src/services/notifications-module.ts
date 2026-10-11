import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

// Por que não há notificação local: na web ela não existe; no Expo Go do
// Android (SDK 53+), só carregar o expo-notifications já lança erro e derruba o
// app. Lá as notificações só funcionam no app instalado (development build).
export type NotificationsUnavailable = 'web' | 'expo_go' | null;

export function notificationsUnavailableOn(
  os: string,
  inExpoGo: boolean
): NotificationsUnavailable {
  if (os === 'web') return 'web';
  if (os === 'android' && inExpoGo) return 'expo_go';
  return null;
}

export const notificationsUnavailable = notificationsUnavailableOn(
  Platform.OS,
  isRunningInExpoGo()
);

let loaded: NotificationsModule | null = null;

// Carrega o expo-notifications na primeira vez que for usado, e só onde ele
// funciona. Devolve null onde não há notificação local.
export function notifications(): NotificationsModule | null {
  if (notificationsUnavailable) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  loaded ??= require('expo-notifications') as NotificationsModule;
  return loaded;
}
