import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ApiResult,
  ConversationMessage,
  PatientService,
  PatriciaCardAction,
  PatriciaCardOutcome,
  RecordMoodInput,
  TextMessage,
} from '@/contracts/platform';
import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { notifyReminderChange } from '@/services/reminder-events';

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
const PENDING_ID = 'pending-message';

export function useConversation() {
  const gateway = usePatientAppGateway();
  const [state, setState] = useState<ConversationState>({ status: 'loading', messages: [] });
  // Esperando a resposta da Patrícia (a tela mostra "digitando").
  const [waiting, setWaiting] = useState(false);

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

  const merge = useCallback((incoming: ConversationMessage[]) => {
    setState((current) => ({ ...current, messages: upsertMessages(current.messages, incoming) }));
  }, []);

  const apply = useCallback(
    async <T>(
      call: () => Promise<ApiResult<T>>,
      pick: (data: T) => ConversationMessage[]
    ): Promise<string | null> => {
      setWaiting(true);
      try {
        const result = await call();
        if (!result.ok) return result.error.message;
        merge(pick(result.data));
        return null;
      } catch {
        return unavailable;
      } finally {
        setWaiting(false);
      }
    },
    [merge]
  );

  // Cada ação devolve a mensagem de erro para a tela, ou null se deu certo.
  // A mensagem do paciente aparece na hora, enquanto a Patrícia responde.
  const sendMessage = useCallback(
    async (text: string) => {
      const pending: TextMessage = {
        id: PENDING_ID,
        kind: 'text',
        author: 'patient',
        text: text.trim(),
        sentAt: new Date().toISOString(),
      };
      merge([pending]);
      const failure = await apply(
        () => gateway.sendMessage(text),
        (messages) => messages
      );
      setState((current) => ({
        ...current,
        messages: current.messages.filter((message) => message.id !== PENDING_ID),
      }));
      return failure;
    },
    [apply, gateway, merge]
  );
  // Registrado o humor, o lembrete de hoje deixa de ser necessário.
  const recordMood = useCallback(
    async (input: RecordMoodInput) => {
      const failure = await apply(
        () => gateway.recordMood(input),
        (data) => data.messages
      );
      if (!failure) notifyReminderChange();
      return failure;
    },
    [apply, gateway]
  );

  const requestService = useCallback(
    (service: PatientService) =>
      apply(
        () => gateway.requestService(service),
        (messages) => messages
      ),
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

  // Patrícia real: termo, horários e cartões (contracts/platform.ts).
  const answerTerms = useCallback(
    (accept: boolean) =>
      apply(
        () => gateway.answerPatriciaTerms(accept),
        (messages) => messages
      ),
    [apply, gateway]
  );
  const pickSlot = useCallback(
    (messageId: string, slotId: string) =>
      apply(
        () => gateway.pickSlot(messageId, slotId),
        (messages) => messages
      ),
    [apply, gateway]
  );
  // Devolve o resultado do cartão (avisos dos campos, quando ele continua
  // aberto) ou a mensagem de erro.
  const submitCard = useCallback(
    async (cardId: string, action: PatriciaCardAction): Promise<PatriciaCardOutcome | string> => {
      setWaiting(true);
      try {
        const result = await gateway.submitPatriciaCard(cardId, action);
        if (!result.ok) return result.error.message;
        merge(result.data.messages);
        return result.data;
      } catch {
        return unavailable;
      } finally {
        setWaiting(false);
      }
    },
    [gateway, merge]
  );

  return {
    state,
    waiting,
    mode: gateway.patriciaMode(),
    sendMessage,
    recordMood,
    requestService,
    clearHistory,
    answerTerms,
    pickSlot,
    submitCard,
  };
}
