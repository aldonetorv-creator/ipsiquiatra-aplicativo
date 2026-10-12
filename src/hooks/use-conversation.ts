import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ApiResult,
  ConversationMessage,
  PatientService,
  PatriciaCardAction,
  PatriciaCardOutcome,
  RecordMoodInput,
  TextMessage,
} from '@/contracts/platform';
import { patriciaPace } from '@/constants/patricia-pace';
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

// Mensagens criadas há pouco, ao abrir a conversa (o termo do primeiro acesso,
// o diário das 20h), também entram no ritmo.
const FRESH_MS = 5000;

export function useConversation() {
  const gateway = usePatientAppGateway();
  const [state, setState] = useState<ConversationState>({ status: 'loading', messages: [] });
  // Esperando a resposta da Patrícia (a tela mostra "digitando").
  const [waiting, setWaiting] = useState(false);
  // Mensagens que ainda vão entrar, no ritmo da Patrícia.
  const queue = useRef<ConversationMessage[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = useRef<ConversationMessage[]>([]);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    shown.current = state.messages;
  }, [state.messages]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  // Mostra a próxima da fila depois do "digitando"; as do paciente entram na
  // hora, mas nunca na frente das da Patrícia que ainda estão na fila.
  const reveal = useCallback(() => {
    const step = () => {
      if (timer.current) return;
      const next = queue.current[0];
      if (!next) {
        setRevealing(false);
        return;
      }
      const delay = next.author === 'patricia' ? patriciaPace.delayFor(next) : 0;
      const show = () => {
        timer.current = null;
        const message = queue.current.shift();
        if (message) {
          setState((current) => ({
            ...current,
            messages: upsertMessages(current.messages, [message]),
          }));
        }
        step();
      };
      if (delay <= 0) {
        show();
        return;
      }
      setRevealing(true);
      timer.current = setTimeout(show, delay);
    };
    step();
  }, []);

  const enqueue = useCallback(
    (messages: ConversationMessage[]) => {
      if (messages.length === 0) return;
      queue.current.push(...messages);
      reveal();
    },
    [reveal]
  );

  // Recarrega sempre que a aba ganha foco: outra tela (ex.: Início) pode ter
  // aberto um novo cartão de humor.
  const load = useCallback(() => {
    let active = true;
    const startedAt = Date.now();
    gateway
      .listConversation()
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setState({ status: 'error', messages: [], error: result.error.message });
          return;
        }
        // As mensagens da Patrícia criadas agora, e ainda não mostradas,
        // entram no ritmo; as de antes aparecem de uma vez.
        const known = new Set(shown.current.map((message) => message.id));
        const queued = new Set(queue.current.map((message) => message.id));
        const firstFresh = result.data.findIndex(
          (message) =>
            queued.has(message.id) ||
            (!known.has(message.id) &&
              message.author === 'patricia' &&
              new Date(message.sentAt).getTime() >= startedAt - FRESH_MS)
        );
        const cut = firstFresh === -1 ? result.data.length : firstFresh;
        setState({ status: 'ready', messages: result.data.slice(0, cut) });
        enqueue(result.data.slice(cut).filter((message) => !queued.has(message.id)));
      })
      .catch(() => {
        if (active) setState({ status: 'error', messages: [], error: unavailable });
      });
    return () => {
      active = false;
    };
  }, [enqueue, gateway]);
  useFocusEffect(load);

  // Mensagens já mostradas (ou na fila) são trocadas na hora; as novas da
  // Patrícia entram no ritmo dela.
  const merge = useCallback(
    (incoming: ConversationMessage[]) => {
      const known = new Set(shown.current.map((message) => message.id));
      const now: ConversationMessage[] = [];
      const later: ConversationMessage[] = [];
      for (const message of incoming) {
        const index = queue.current.findIndex((item) => item.id === message.id);
        if (index !== -1) queue.current[index] = message;
        else if (known.has(message.id)) now.push(message);
        else if (message.author === 'patricia' || queue.current.length > 0 || later.length > 0) {
          later.push(message);
        } else now.push(message);
      }
      if (now.length > 0) {
        setState((current) => ({ ...current, messages: upsertMessages(current.messages, now) }));
      }
      enqueue(later);
    },
    [enqueue]
  );

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
      queue.current = [];
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setRevealing(false);
      setState({ status: 'ready', messages: [] });
      enqueue(result.data);
      return null;
    } catch {
      return unavailable;
    }
  }, [enqueue, gateway]);

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
    // "digitando": esperando a resposta ou com mensagens ainda na fila.
    waiting: waiting || revealing,
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
