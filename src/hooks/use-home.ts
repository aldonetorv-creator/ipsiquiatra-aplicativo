import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Appointment, ConversationMessage, MoodEntry, PatientService } from '@/contracts/platform';
import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { splitAppointments } from '@/utils/appointments';
import { calendarDaysBetween, greetingFor } from '@/utils/time';

export type HomeState =
  | { status: 'loading' }
  | {
      status: 'ready';
      greeting: string;
      lastFromPatricia: ConversationMessage | null;
      moodEntries: MoodEntry[];
      nextAppointment: Appointment | null;
      // Dias de calendário desde a última consulta realizada.
      daysSinceLastAppointment: number | null;
      carePlanReady: boolean;
    }
  | { status: 'error'; error: string };

const unavailable = 'Não foi possível carregar o seu resumo agora.';

export function useHome() {
  const gateway = usePatientAppGateway();
  const [state, setState] = useState<HomeState>({ status: 'loading' });
  const [pendingMoodCheck, setPendingMoodCheck] = useState(false);

  // Recarrega ao voltar para a aba: a conversa e o humor mudam em outra tela.
  const load = useCallback(() => {
    let active = true;
    Promise.all([
      gateway.listConversation(),
      gateway.listMoodEntries(),
      gateway.listAppointments(),
      gateway.listDocuments(),
    ])
      .then(([conversation, moods, appointments, documents]) => {
        if (!active) return;
        if (!conversation.ok) return setState({ status: 'error', error: conversation.error.message });
        if (!moods.ok) return setState({ status: 'error', error: moods.error.message });
        if (!appointments.ok) return setState({ status: 'error', error: appointments.error.message });
        if (!documents.ok) return setState({ status: 'error', error: documents.error.message });
        const fromPatricia = conversation.data.filter((message) => message.author === 'patricia');
        setPendingMoodCheck(
          conversation.data.some((message) => message.kind === 'mood_check' && message.answer === null)
        );
        // Datas e saudação dependem do relógio do aparelho: só são calculadas
        // depois de montar, para o HTML pré-renderizado da web não divergir do app.
        const now = new Date();
        const { next, past } = splitAppointments(appointments.data, now);
        const last = past[0] ?? null;
        setState({
          status: 'ready',
          greeting: greetingFor(now),
          lastFromPatricia: fromPatricia[fromPatricia.length - 1] ?? null,
          moodEntries: moods.data,
          nextAppointment: next,
          daysSinceLastAppointment: last
            ? calendarDaysBetween(new Date(last.startsAt), now)
            : null,
          carePlanReady:
            last !== null &&
            documents.data.some(
              (doc) =>
                doc.kind === 'care_plan' &&
                doc.appointmentId === last.id &&
                (doc.availability === 'available' || doc.availability === 'mock_only')
            ),
        });
      })
      .catch(() => {
        if (active) setState({ status: 'error', error: unavailable });
      });
    return () => {
      active = false;
    };
  }, [gateway]);
  useFocusEffect(load);

  // Garante um cartão de humor em aberto na conversa antes de levar o paciente
  // até lá. Devolve a mensagem de erro, ou null se deu certo.
  const ensureMoodCheck = useCallback(async (): Promise<string | null> => {
    if (pendingMoodCheck) return null;
    try {
      const result = await gateway.requestMoodCheck();
      return result.ok ? null : result.error.message;
    } catch {
      return unavailable;
    }
  }, [gateway, pendingMoodCheck]);

  // Leva o pedido (ex.: remarcar) para a conversa com a Patrícia. Devolve a
  // mensagem de erro, ou null se deu certo.
  const requestService = useCallback(
    async (service: PatientService): Promise<string | null> => {
      try {
        const result = await gateway.requestService(service);
        return result.ok ? null : result.error.message;
      } catch {
        return unavailable;
      }
    },
    [gateway]
  );

  return { state, ensureMoodCheck, requestService };
}
