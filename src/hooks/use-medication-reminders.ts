import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { MedicationPlan } from '@/contracts/platform';
import {
  clearMedicationReminders,
  handleTakenResponse,
  readRemindersEnabled,
  remindersAvailable,
  setMedicationReminders,
  syncMedicationReminders,
} from '@/services/medication-reminders';
import { notifications } from '@/services/notifications-module';
import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { usePatientSession } from '@/services/patient-session';

// Mantém os avisos dos remédios iguais à receita: ao entrar, ao voltar para o
// app e quando a lista muda. "Sair" desliga o lembrete deste aparelho.
export function useMedicationReminderSync() {
  const gateway = usePatientAppGateway();
  const status = usePatientSession().state.status;

  useEffect(() => {
    if (status === 'signed_out') {
      clearMedicationReminders().catch(() => undefined);
      return;
    }
    if (status !== 'signed_in') return;
    const refresh = async () => {
      try {
        const plan = await gateway.getMedicationPlan();
        if (plan.ok) await syncMedicationReminders(plan.data);
      } catch {
        // Tenta de novo na próxima abertura.
      }
    };
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    // Com o app aberto, o "Já tomei" chega por aqui (fechado, pela tarefa em
    // segundo plano de services/medication-task.ts).
    const response = notifications()?.addNotificationResponseReceivedListener((event) => {
      handleTakenResponse(event).catch(() => undefined);
    });
    return () => {
      subscription.remove();
      response?.remove();
    };
  }, [gateway, status]);
}

export type ReminderState = 'loading' | 'unavailable' | 'off' | 'on' | 'denied';

// O cartão de Minhas medicações: sugere o lembrete nos horários da receita.
export function useMedicationReminderChoice(plan: MedicationPlan | null) {
  const [state, setState] = useState<ReminderState>(
    remindersAvailable() ? 'loading' : 'unavailable'
  );

  useEffect(() => {
    if (!remindersAvailable()) return;
    let active = true;
    readRemindersEnabled()
      .then((enabled) => active && setState(enabled ? 'on' : 'off'))
      .catch(() => active && setState('off'));
    return () => {
      active = false;
    };
  }, []);

  const choose = useCallback(
    async (enabled: boolean) => {
      try {
        setState(await setMedicationReminders(enabled, plan));
      } catch {
        setState('off');
      }
    },
    [plan]
  );

  return { state, enable: () => choose(true), disable: () => choose(false) };
}
