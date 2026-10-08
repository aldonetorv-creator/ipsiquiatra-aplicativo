import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { ConversationMessage, MoodEntry } from '@/contracts/platform';
import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { greetingFor } from '@/utils/time';

export type HomeState =
  | { status: 'loading' }
  | {
      status: 'ready';
      greeting: string;
      lastFromPatricia: ConversationMessage | null;
      moodEntries: MoodEntry[];
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
    Promise.all([gateway.listConversation(), gateway.listMoodEntries()])
      .then(([conversation, moods]) => {
        if (!active) return;
        if (!conversation.ok) return setState({ status: 'error', error: conversation.error.message });
        if (!moods.ok) return setState({ status: 'error', error: moods.error.message });
        const fromPatricia = conversation.data.filter((message) => message.author === 'patricia');
        setPendingMoodCheck(
          conversation.data.some((message) => message.kind === 'mood_check' && message.answer === null)
        );
        setState({
          status: 'ready',
          // Depende do relógio do aparelho: só é calculada depois de montar, para
          // o HTML pré-renderizado da web não divergir do app.
          greeting: greetingFor(),
          lastFromPatricia: fromPatricia[fromPatricia.length - 1] ?? null,
          moodEntries: moods.data,
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

  return { state, ensureMoodCheck };
}
