import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ApiResult,
  ConversationMessage,
  PatientService,
  RecordMoodInput,
} from '@/contracts/platform';
import { usePatientAppGateway } from '@/services/patient-app-gateway';

export type ConversationState =
  | { status: 'loading'; messages: ConversationMessage[] }
  | { status: 'ready'; messages: ConversationMessage[] }
  | { status: 'error'; messages: ConversationMessage[]; error: string };

// Substitui mensagens já existentes (mesmo `id`) e acrescenta as novas no fim.
export function upsertMessages(
  current: ConversationMessage[],
  incoming: ConversationMessage[]
): ConversationMessage[] {
  const next = [...current];
  for (const message of incoming) {
    const index = next.findIndex((item) => item.id === message.id);
    if (index === -1) {
      next.push(message);
    } else {
      next[index] = message;
    }
  }
  return next;
}

const unavailable = 'Não foi possível falar com a Patrícia agora. Tente de novo em instantes.';

export function useConversation() {
  const gateway = usePatientAppGateway();
  const [state, setState] = useState<ConversationState>({ status: 'loading', messages: [] });

  // Recarrega sempre que a aba ganha foco: outra tela (ex.: Início) pode ter
  // aberto um novo cartão de humor.
  const load = useCallback(() => {
    let active = true;
    gateway
      .listConversation()
      .then((result) => {
        if (!active) return;
        setState(
          result.ok
            ? { status: 'ready', messages: result.data }
            : { status: 'error', messages: [], error: result.error.message }
        );
      })
      .catch(() => {
        if (active) setState({ status: 'error', messages: [], error: unavailable });
      });
    return () => {
      active = false;
    };
  }, [gateway]);
  useFocusEffect(load);

  const apply = useCallback(
    async <T>(
      call: () => Promise<ApiResult<T>>,
      pick: (data: T) => ConversationMessage[]
    ): Promise<string | null> => {
      try {
        const result = await call();
        if (!result.ok) return result.error.message;
        setState((current) => ({
          ...current,
          messages: upsertMessages(current.messages, pick(result.data)),
        }));
        return null;
      } catch {
        return unavailable;
      }
    },
    []
  );

  // Cada ação devolve a mensagem de erro para a tela, ou null se deu certo.
  const sendMessage = useCallback(
    (text: string) => apply(() => gateway.sendMessage(text), (messages) => messages),
    [apply, gateway]
  );
  const recordMood = useCallback(
    (input: RecordMoodInput) => apply(() => gateway.recordMood(input), (data) => data.messages),
    [apply, gateway]
  );

  const requestService = useCallback(
    (service: PatientService) =>
      apply(() => gateway.requestService(service), (messages) => messages),
    [apply, gateway]
  );

  // Apaga a conversa e os humores deste aparelho; a conversa recomeça.
  const clearHistory = useCallback(async (): Promise<string | null> => {
    try {
      const result = await gateway.clearHistory();
      if (!result.ok) return result.error.message;
      setState({ status: 'ready', messages: result.data });
      return null;
    } catch {
      return unavailable;
    }
  }, [gateway]);

  return { state, sendMessage, recordMood, requestService, clearHistory };
}
