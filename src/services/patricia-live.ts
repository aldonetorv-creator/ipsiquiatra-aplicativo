import { PatriciaApi, PatriciaConfirm, PatriciaResponse, PatriciaTurn } from '@/contracts/patricia';
import {
  ApiResult,
  ConversationMessage,
  PatriciaCard,
  PatriciaCardAction,
  PatriciaCardMessage,
  PatriciaCardOutcome,
  TextMessage,
} from '@/contracts/platform';
import { KeyValueStore } from '@/services/storage';
import { maskCpfInText } from '@/utils/patient-data';

// Conversa com a Patrícia real, a mesma do site (docs/fases.md, frente 1): o
// app usa as rotas públicas do chat (contracts/patricia.ts) e mostra os mesmos
// cartões. A conversa fica salva neste aparelho; a sessão com o servidor só
// existe enquanto o app está aberto (no servidor, ela some depois de 4 horas
// parada), e os dados dos cartões (CPF, nascimento, celular) vão direto ao
// servidor, sem ficar no aparelho.

export const PATRICIA_CONSENT_KEY = 'ipsiquiatra:patricia-consent';
// Mudou o texto do termo: o paciente concorda de novo.
export const CONSENT_VERSION = '2026-10-12';

export const patriciaTexts = {
  // O mesmo termo do chat do site, mais a frase sobre o aparelho.
  consent:
    'Antes de começarmos: sou uma secretária virtual e não faço diagnóstico nem oriento tratamento. ' +
    'Ao continuar, você concorda que suas mensagens e os dados que informar (nome, celular, CPF e data de nascimento) sejam usados por esta clínica para agendar, remarcar ou cancelar a sua consulta, ' +
    'com apoio de inteligência artificial na conversa. Os dados dos formulários, como o CPF, vão direto para o cadastro da clínica e não são enviados à inteligência artificial. ' +
    'Na primeira consulta, posso fazer algumas perguntas de saúde para preparar o atendimento: as respostas vão para o médico e são processadas com apoio de inteligência artificial. ' +
    'Fora isso, evite compartilhar detalhes de saúde além do necessário. ' +
    'Neste app, a conversa também fica salva no seu celular.',
  ready: 'Pronto! Em que posso ajudar?',
  refused: 'Não concordo.',
  noAi: 'Tudo bem. Sem o termo, eu não converso por aqui. Se quiser, escreva o motivo da consulta ou o que gostaria de contar ao médico: o texto vai direto para a equipe da clínica, sem passar por inteligência artificial.',
  offline: 'Estou sem conexão neste momento. Verifique a internet e envie novamente, por favor.',
  failed: 'Não consegui responder agora. Tente novamente em instantes.',
  restart: 'A nossa conversa anterior expirou. Pode me dizer de novo o que você precisa?',
  released:
    'Sem problema, liberei esse horário. Quer que eu mostre outras opções de dia ou período?',
  expired: 'Esta etapa expirou. Se precisar, peça de novo à Patrícia.',
  keep: 'Prefiro manter a consulta.',
  notNow: 'Agora não, obrigado(a).',
  slotGone: 'Esse horário não está mais na lista. Peça novos horários à Patrícia.',
  inactive: 'Este cartão não está mais ativo.',
};

const offlineFor = {
  confirm: 'Não consegui confirmar agora por causa da conexão. Toque em Confirmar de novo.',
  identify: 'Não consegui verificar agora por causa da conexão. Tente de novo.',
  report: 'Não consegui enviar agora por causa da conexão. Tente de novo, por favor.',
  cancel: 'Não consegui cancelar agora por causa da conexão. Toque em Cancelar de novo.',
};

const cardTitles: Record<PatriciaCard['type'], string> = {
  consent: 'Termo da conversa com a Patrícia',
  booking: 'Confirmar consulta',
  reschedule: 'Confirmar remarcação',
  cancel: 'Cancelar consulta',
  identify: 'Identificação para mudar a consulta',
  report: 'Relato para o médico',
};

// Cartões que dependem da conversa aberta com o servidor.
const sessionCards: PatriciaCard['type'][] = ['booking', 'reschedule', 'cancel', 'identify'];

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data, requestId: 'patricia' });
const fail = (message: string): ApiResult<never> => ({
  ok: false,
  error: { code: 'not_available', message },
  requestId: 'patricia',
});

type Deps = {
  api: PatriciaApi;
  store: KeyValueStore;
  now: () => Date;
  nextId: (prefix: string) => string;
  // Conversa salva no aparelho: este módulo acrescenta e troca mensagens nela.
  messages: () => ConversationMessage[];
  save: () => Promise<void>;
};

export function createPatriciaLive({ api, store, now, nextId, messages, save }: Deps) {
  let session: string | null = null;
  let booked = false;
  let leaveSent = false;
  let consent: Promise<boolean> | null = null;

  const hasConsent = () =>
    (consent ??= store
      .getItem(PATRICIA_CONSENT_KEY)
      .catch(() => null)
      .then((raw) => {
        try {
          const data = JSON.parse(raw ?? 'null');
          return data?.version === CONSENT_VERSION && typeof data.acceptedAt === 'string';
        } catch {
          return false;
        }
      }));

  const text = (
    author: TextMessage['author'],
    body: string,
    extras: Pick<TextMessage, 'slots' | 'crisis'> = {}
  ): TextMessage => ({
    id: nextId('msg'),
    kind: 'text',
    author,
    text: author === 'patient' ? maskCpfInText(body) : body,
    sentAt: now().toISOString(),
    ...extras,
  });

  const cardMessage = (card: PatriciaCard): PatriciaCardMessage => ({
    id: nextId('card'),
    kind: 'patricia_card',
    author: 'patricia',
    text: cardTitles[card.type],
    sentAt: now().toISOString(),
    card,
    status: 'open',
  });

  const append = async (...items: ConversationMessage[]) => {
    messages().push(...items);
    await save();
    return items;
  };

  const replace = <M extends ConversationMessage>(message: M): M => {
    const list = messages();
    const index = list.findIndex((item) => item.id === message.id);
    if (index !== -1) list[index] = message;
    return message;
  };

  const isOpenCard = (message: ConversationMessage): message is PatriciaCardMessage =>
    message.kind === 'patricia_card' && message.status === 'open';

  // Só um cartão de agenda por vez, como no site.
  const closeSessionCards = (note: string) =>
    messages()
      .filter(isOpenCard)
      .filter((message) => sessionCards.includes(message.card.type))
      .map((message) => replace({ ...message, status: 'closed' as const, note }));

  async function ensureSession(): Promise<{ session: string } | { error: string }> {
    if (session) return { session };
    const started = await api.startSession();
    if (!started) return { error: patriciaTexts.offline };
    if (!started.ok || !started.data.session) {
      return { error: started.data.error ?? patriciaTexts.failed };
    }
    session = started.data.session;
    booked = false;
    leaveSent = false;
    return { session };
  }

  const confirmCard = (confirm: PatriciaConfirm): PatriciaCard =>
    confirm.kind === 'booking'
      ? { type: 'booking', confirm }
      : confirm.kind === 'reschedule'
        ? { type: 'reschedule', confirm }
        : { type: 'cancel', confirm };

  // Resposta da Patrícia: os balões (o primeiro com os horários e o bloco de
  // emergência) e, se houver, o cartão.
  function replyMessages(data: Partial<PatriciaTurn>): ConversationMessage[] {
    const bubbles = data.bubbles?.length ? data.bubbles : [data.reply ?? ''];
    const out: ConversationMessage[] = bubbles
      .filter((body) => body.trim())
      .map((body, index) =>
        text(
          'patricia',
          body,
          index === 0
            ? {
                ...(data.slots?.length ? { slots: data.slots } : {}),
                ...(data.crisis ? { crisis: true } : {}),
              }
            : {}
        )
      );
    if (data.identify) out.push(cardMessage({ type: 'identify', action: data.identify.action }));
    else if (data.confirm) out.push(cardMessage(confirmCard(data.confirm)));
    return out;
  }

  // Uma rodada de conversa. `shown`: o que aparece como mensagem do paciente.
  async function turn(
    payload: { text?: string; slot?: string; continue?: true },
    shown?: string
  ): Promise<ConversationMessage[]> {
    const out: ConversationMessage[] = [];
    if (shown) out.push(...(await append(text('patient', shown))));
    const started = await ensureSession();
    if ('error' in started) return [...out, ...(await append(text('patricia', started.error)))];

    let result = await api.message(started.session, payload);
    if (result?.status === 401) {
      // A conversa expirou no servidor: abre outra. Só um texto pode ser
      // reenviado; horário e continuação eram da conversa antiga.
      session = null;
      const again = await ensureSession();
      if ('error' in again) return [...out, ...(await append(text('patricia', again.error)))];
      if (!payload.text) {
        return [
          ...out,
          ...closeSessionCards(patriciaTexts.expired),
          ...(await append(text('patricia', patriciaTexts.restart))),
        ];
      }
      result = await api.message(again.session, payload);
    }
    if (!result) return [...out, ...(await append(text('patricia', patriciaTexts.offline)))];
    if (!result.ok) {
      return [
        ...out,
        ...(await append(text('patricia', result.data.error ?? patriciaTexts.failed))),
      ];
    }
    const reply = replyMessages(result.data);
    const closed = reply.some((message) => message.kind === 'patricia_card')
      ? closeSessionCards(patriciaTexts.expired)
      : [];
    return [...out, ...closed, ...(await append(...reply))];
  }

  // Pede o termo de novo: o paciente tentou conversar sem ter concordado.
  async function consentPrompt() {
    const open = messages().find(
      (message) => isOpenCard(message) && message.card.type === 'consent'
    );
    return open ? [open] : append(cardMessage({ type: 'consent' }));
  }

  async function send(body: string): Promise<ApiResult<ConversationMessage[]>> {
    if (!(await hasConsent())) return ok(await consentPrompt());
    return ok(await turn({ text: body }, body));
  }

  // Ao abrir o app: sem a sessão com o servidor, os cartões de agenda e os
  // horários de antes não valem mais. Na primeira vez, aparece o termo.
  async function onLoad() {
    let changed = false;
    if (!session) {
      changed = closeSessionCards(patriciaTexts.expired).length > 0;
      for (const message of messages()) {
        if (message.kind === 'text' && message.slots?.length) {
          replace({ ...message, slots: undefined });
          changed = true;
        }
      }
    }
    const askedBefore = messages().some(
      (message) => message.kind === 'patricia_card' && message.card.type === 'consent'
    );
    if (!askedBefore && !(await hasConsent())) {
      messages().push(cardMessage({ type: 'consent' }));
      changed = true;
    }
    if (changed) await save();
  }

  async function answerTerms(accept: boolean): Promise<ApiResult<ConversationMessage[]>> {
    const card = messages().find(
      (message): message is PatriciaCardMessage =>
        isOpenCard(message) && message.card.type === 'consent'
    );
    if (!accept) {
      const updated = card
        ? [replace({ ...card, status: 'closed' as const, note: 'Você não concordou.' })]
        : [];
      const added = await append(
        text('patient', patriciaTexts.refused),
        text('patricia', patriciaTexts.noAi),
        cardMessage({ type: 'report' })
      );
      return ok([...updated, ...added]);
    }
    const started = await ensureSession();
    if ('error' in started) return fail(started.error);
    await store.setItem(
      PATRICIA_CONSENT_KEY,
      JSON.stringify({ version: CONSENT_VERSION, acceptedAt: now().toISOString() })
    );
    consent = Promise.resolve(true);
    const updated = card
      ? [replace({ ...card, status: 'done' as const, note: 'Você concordou com o termo.' })]
      : [];
    const info = await api.info();
    const greeting = info?.ok && info.data.greeting ? info.data.greeting : patriciaTexts.ready;
    return ok([...updated, ...(await append(text('patricia', greeting)))]);
  }

  async function pickSlot(messageId: string, slotId: string) {
    const message = messages().find(
      (item): item is TextMessage => item.id === messageId && item.kind === 'text'
    );
    const slot = message?.slots?.find((item) => item.id === slotId);
    if (!message || !slot) return fail(patriciaTexts.slotGone);
    // Os horários somem depois do toque, como no site.
    const used = replace({ ...message, slots: undefined });
    await save();
    return ok([used, ...(await turn({ slot: slotId }, `Escolho ${slot.label}.`))]);
  }

  // Termina o cartão: `done` com o resumo, ou `closed`, e as mensagens da Patrícia.
  async function finish(
    card: PatriciaCardMessage,
    status: 'done' | 'closed',
    note: string,
    bubbles: string[],
    extras: Pick<TextMessage, 'crisis'> = {}
  ): Promise<PatriciaCardOutcome> {
    const updated = replace({ ...card, status, note });
    const added = await append(
      ...bubbles
        .filter(Boolean)
        .map((body, index) => text('patricia', body, index === 0 ? extras : {}))
    );
    return { messages: [updated, ...added] };
  }

  const expire = async (card: PatriciaCardMessage) => {
    session = null;
    return finish(card, 'closed', 'A conversa expirou. Se precisar, peça de novo à Patrícia.', []);
  };

  // Conclusão de agendar, remarcar ou cancelar.
  async function conclude(
    card: PatriciaCardMessage,
    result: PatriciaResponse<{ message: string; bubbles: string[]; when: string }> | null,
    offline: string,
    doneNote: string
  ): Promise<ApiResult<PatriciaCardOutcome>> {
    if (!result) return fail(offline);
    if (result.status === 401) return ok(await expire(card));
    if (result.status === 429) return fail(result.data.error ?? patriciaTexts.failed);
    if (result.ok) {
      const bubbles = result.data.bubbles?.length
        ? result.data.bubbles
        : [result.data.message ?? ''];
      return ok(await finish(card, 'done', doneNote, bubbles));
    }
    const reason = result.data.message ?? result.data.error ?? patriciaTexts.failed;
    return ok(await finish(card, 'closed', 'Não foi possível concluir.', [reason]));
  }

  async function submitCard(
    cardId: string,
    action: PatriciaCardAction
  ): Promise<ApiResult<PatriciaCardOutcome>> {
    const card = messages().find(
      (message): message is PatriciaCardMessage => message.id === cardId && isOpenCard(message)
    );
    if (!card) return fail(patriciaTexts.inactive);
    const type = card.card.type;

    if (action.type === 'report' && type === 'report') {
      const result = await api.noAiReport(action.data);
      if (!result) return fail(offlineFor.report);
      if (result.status === 422) return ok({ messages: [], fieldErrors: result.data.errors ?? {} });
      if (!result.ok) return fail(result.data.error ?? patriciaTexts.failed);
      return ok(
        await finish(card, 'done', 'Relato enviado à clínica.', [result.data.message ?? ''], {
          ...(result.data.crisis ? { crisis: true } : {}),
        })
      );
    }

    if (action.type === 'keep' && (type === 'cancel' || type === 'identify')) {
      const said = type === 'cancel' ? patriciaTexts.keep : patriciaTexts.notNow;
      const updated = replace({
        ...card,
        status: 'closed' as const,
        note: type === 'cancel' ? 'Consulta mantida.' : 'Deixado para depois.',
      });
      return ok({ messages: [updated, ...(await turn({ text: said }, said))] });
    }

    if (!session) return ok(await expire(card));
    const current = session;

    if (action.type === 'release' && (type === 'booking' || type === 'reschedule')) {
      await api.releaseHold(current);
      return ok(await finish(card, 'closed', 'Horário liberado.', [patriciaTexts.released]));
    }

    if (action.type === 'confirm_booking' && card.card.type === 'booking') {
      const result = await api.confirm(current, card.card.confirm.holdId, {
        declared: action.declared,
        data: action.data,
      });
      if (result?.status === 422) {
        return ok({
          messages: [],
          fieldErrors: result.data.errors ?? {},
          notice: result.data.message,
        });
      }
      // "Já sou paciente" sem cadastro com esses dados: o cartão e a reserva continuam.
      if (result?.data.notFound) {
        return ok({ messages: [], notice: result.data.message, offerNewRecord: true });
      }
      const outcome = await conclude(card, result, offlineFor.confirm, 'Consulta marcada.');
      if (outcome.ok && outcome.data.messages[0]?.kind === 'patricia_card') {
        booked = booked || (outcome.data.messages[0] as PatriciaCardMessage).status === 'done';
      }
      return outcome;
    }

    if (action.type === 'confirm' && card.card.type === 'reschedule') {
      return conclude(
        card,
        await api.confirm(current, card.card.confirm.holdId),
        offlineFor.confirm,
        'Consulta remarcada.'
      );
    }

    if (action.type === 'confirm' && type === 'cancel') {
      return conclude(
        card,
        await api.cancelChange(current),
        offlineFor.cancel,
        'Consulta cancelada.'
      );
    }

    if (action.type === 'identify' && type === 'identify') {
      const result = await api.identify(current, action.data);
      if (!result) return fail(offlineFor.identify);
      if (result.status === 401) return ok(await expire(card));
      if (result.status === 422) return ok({ messages: [], fieldErrors: result.data.errors ?? {} });
      if (result.data.locked) {
        return ok(
          await finish(card, 'closed', 'Não foi possível continuar por aqui.', [
            result.data.error ??
              'Por segurança, não é possível continuar por aqui. Fale diretamente com a clínica.',
          ])
        );
      }
      if (!result.ok) {
        return ok({
          messages: [],
          notice:
            result.data.message ??
            result.data.error ??
            'Não encontrei uma consulta com esses dados.',
        });
      }
      const found = await finish(card, 'done', 'Identificação concluída.', [
        `Encontrei a sua consulta de ${result.data.when}.`,
      ]);
      const next = result.data.continue ? await turn({ continue: true }) : [];
      return ok({ messages: [...found.messages, ...next] });
    }

    return fail(patriciaTexts.inactive);
  }

  async function leave() {
    if (!session || !booked || leaveSent) return;
    leaveSent = true;
    await api.leave(session);
  }

  // Apagado o histórico, a próxima mensagem começa outra conversa.
  const reset = () => {
    session = null;
    booked = false;
    leaveSent = false;
  };

  return { send, onLoad, answerTerms, pickSlot, submitCard, leave, reset };
}

export type PatriciaLive = ReturnType<typeof createPatriciaLive>;
