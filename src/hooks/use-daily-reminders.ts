import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { scheduleDailyReminders } from '@/services/daily-reminders';
import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { onReminderChange } from '@/services/reminder-events';

// Com o app aberto, a notificação também aparece no topo da tela.
Notifications.setNotificationHandler({
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
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const refresh = async () => {
      try {
        const [settings, moods] = await Promise.all([
          gateway.getReminderSettings(),
          gateway.listMoodEntries(),
        ]);
        if (!settings.ok) return;
        await scheduleDailyReminders(settings.data, moods.ok ? moods.data : []);
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
