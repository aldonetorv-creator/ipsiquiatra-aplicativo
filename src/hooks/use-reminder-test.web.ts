import type { NotificationAccess } from '@/services/daily-reminders';

// Na web não há notificação local: a folha do lembrete não mostra o teste.
export function useReminderTest() {
  return { access: 'unsupported' as NotificationAccess, test: async () => false };
}
