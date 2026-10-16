import type { NotificationResponse } from 'expo-notifications';

import { handleTakenResponse } from '@/services/medication-reminders';
import { notifications } from '@/services/notifications-module';

// No Android, o "Já tomei" com o app fechado chega por esta tarefa em segundo
// plano (expo-task-manager). Ela precisa ser definida logo que o app carrega,
// fora de qualquer tela: por isso este arquivo é importado no _layout.
export const MEDICATION_TASK = 'medicacao-ja-tomei';

const Notifications = notifications();
if (Notifications) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
  if (!TaskManager.isTaskDefined(MEDICATION_TASK)) {
    TaskManager.defineTask<NotificationResponse>(MEDICATION_TASK, async ({ data }) => {
      if (data && 'actionIdentifier' in data) await handleTakenResponse(data);
    });
  }
  Notifications.registerTaskAsync(MEDICATION_TASK).catch(() => undefined);
}
