import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { scheduleDailyReminders } from '@/services/daily-reminders';
import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { onReminderChange } from '@/services/reminder-events';
import { dayKey } from '@/utils/time';

// Com o app aberto, a notificação também aparece no topo da tela.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Mantém os lembretes diários agendados no horário escolhido e, ao tocar num
// deles, abre a conversa com a Patrícia.
export function useDailyReminders() {
  const gateway = usePatientAppGateway();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const refresh = async () => {
      try {
        const [settings, moods] = await Promise.all([
          gateway.getReminderSettings(),
          gateway.listMoodEntries(),
        ]);
        if (!settings.ok) return;
        const today = dayKey(new Date());
        const recordedToday =
          moods.ok && moods.data.some((entry) => dayKey(new Date(entry.recordedAt)) === today);
        await scheduleDailyReminders(settings.data, recordedToday);
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

  useEffect(() => {
    if (
      response &&
      response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
      response.notification.request.content.data?.screen === 'patricia'
    ) {
      router.push('/patricia');
    }
  }, [response]);
}
