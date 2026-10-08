import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Appointment, PatientService } from '@/contracts/platform';
import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { splitAppointments } from '@/utils/appointments';

export type AppointmentsState =
  | { status: 'loading' }
  | { status: 'ready'; next: Appointment | null; past: Appointment[] }
  | { status: 'error'; error: string };

const unavailable = 'Não foi possível carregar suas consultas agora.';

export function useAppointments() {
  const gateway = usePatientAppGateway();
  const [state, setState] = useState<AppointmentsState>({ status: 'loading' });

  const load = useCallback(() => {
    let active = true;
    gateway
      .listAppointments()
      .then((result) => {
        if (!active) return;
        // Depende do relógio: calculado depois de montar (ver use-home).
        setState(
          result.ok
            ? { status: 'ready', ...splitAppointments(result.data, new Date()) }
            : { status: 'error', error: result.error.message }
        );
      })
      .catch(() => {
        if (active) setState({ status: 'error', error: unavailable });
      });
    return () => {
      active = false;
    };
  }, [gateway]);
  useFocusEffect(load);

  // Agendar e remarcar acontecem na conversa com a Patrícia. Devolve a
  // mensagem de erro, ou null se deu certo.
  const requestService = useCallback(
    async (service: PatientService): Promise<string | null> => {
      try {
        const result = await gateway.requestService(service);
        return result.ok ? null : result.error.message;
      } catch {
        return 'Não foi possível falar com a Patrícia agora. Tente de novo em instantes.';
      }
    },
    [gateway]
  );

  return { state, requestService };
}
