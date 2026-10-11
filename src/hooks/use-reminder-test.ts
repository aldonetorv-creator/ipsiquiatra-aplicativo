import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  NotificationAccess,
  notificationAccess,
  sendTestReminder,
} from '@/services/daily-reminders';

// Situação das notificações no celular e o teste do lembrete, para a folha do
// lembrete. Volta a conferir quando o paciente retorna das configurações.
export function useReminderTest() {
  const [access, setAccess] = useState<NotificationAccess>('ask');

  const refresh = useCallback(() => {
    notificationAccess()
      .then(setAccess)
      .catch(() => setAccess('ask'));
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const test = useCallback(async () => {
    try {
      return await sendTestReminder();
    } catch {
      return false;
    } finally {
      refresh();
    }
  }, [refresh]);

  return { access, test };
}
