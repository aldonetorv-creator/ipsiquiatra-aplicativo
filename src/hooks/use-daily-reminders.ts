import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { scheduleDailyReminders } from '@/services/daily-reminders';
import { notifications } from '@/services/notifications-module';
import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { usePatientSession } from '@/services/patient-session';
import { onReminderChange } from '@/services/reminder-events';

// Onde não há notificação local (Expo Go do Android), o app segue sem ela.
const Notifications = notifications();
const noResponse = () => undefined;
const useLastNotificationResponse = Notifications?.useLastNotificationResponse ?? noResponse;

// Com o app aberto, a notificação também aparece no topo da tela.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Mantém agendados o lembrete diário e os contatos de cuidado da Patrícia e, ao
// tocar numa notificação, abre a conversa com ela.
export function useDailyReminders() {
  const gateway = usePatientAppGateway();
  const response = useLastNotificationResponse();

  useEffect(() => {
    const refresh = async () => {
      try {
        const moods = await gateway.listMoodEntries();
        await scheduleDailyReminders(moods.ok ? moods.data : []);
      } catch {
        // Sem lembrete o app continua funcionando; tenta de novo na próxima abertura.
      }
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    const unsubscribe = onReminderChange(refresh);
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [gateway]);

  // A conversa só existe com o paciente dentro (login como primeira tela). Se o
  // toque abriu o app ainda lendo a sessão, ou sem sessão, a conversa abre
  // assim que ele entrar; cada toque abre a conversa uma vez só. O toque no
  // lembrete dos remédios abre Minhas medicações.
  const signedIn = usePatientSession().state.status === 'signed_in';
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (
      !Notifications ||
      !signedIn ||
      !response ||
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }
    const screen = response.notification.request.content.data?.screen;
    const target =
      screen === 'patricia' ? '/patricia' : screen === 'medicacoes' ? '/medicacoes' : null;
    if (!target) return;
    const tap = `${response.notification.request.identifier}@${response.notification.date}`;
    if (opened.current === tap) return;
    opened.current = tap;
    router.push(target);
  }, [response, signedIn]);
}
