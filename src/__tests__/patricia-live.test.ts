/// <reference types="jest" />

import { PatriciaApi, PatriciaConfirm } from '@/contracts/patricia';
import {
  ConversationMessage,
  PatientAppGateway,
  PatriciaCardMessage,
  TextMessage,
} from '@/contracts/platform';
import { createMockPatientAppGateway, HISTORY_STORAGE_KEY } from '@/mocks/patient-app-gateway';
import { PATRICIA_CONSENT_KEY, patriciaTexts } from '@/services/patricia-live';
import { createMemoryStore, KeyValueStore } from '@/services/storage';

const reply = (data: { ok?: boolean } & Record<string, unknown>, status = 200) => ({
  status,
  ok: status < 300 && data.ok !== false,
  data,
});

// Patrícia da plataforma de mentira: cada rota é um jest.fn com a resposta padrão.
type FakeApi = Record<keyof PatriciaApi, jest.Mock>;

function fakeApi(overrides: Partial<FakeApi> = {}): FakeApi {
  let sessions = 0;
  const api = {
    info: jest.fn(async () =>
      reply({ ok: true, doctor: 'Dr. Aldo', greeting: 'Olá, sou a Patrícia.', available: true })
    ),
    startSession: jest.fn(async () => reply({ ok: true, session: `tok-${++sessions}` })),
    message: jest.fn(async () =>
      reply({ ok: true, reply: 'Oi! Como posso ajudar?', bubbles: ['Oi! Como posso ajudar?'] })
    ),
    confirm: jest.fn(async () =>
      reply({
        ok: true,
        message: 'Pronto, sua consulta está marcada.',
        bubbles: ['Pronto, sua consulta está marcada.'],
        when: 'terça',
      })
    ),
    releaseHold: jest.fn(async () => reply({ ok: true })),
    cancelChange: jest.fn(async () =>
      reply({ ok: true, message: 'Consulta cancelada.', when: 'terça' })
    ),
    identify: jest.fn(async () =>
      reply({ ok: true, when: 'terça, 13/10, às 08:00', continue: true })
    ),
    noAiReport: jest.fn(async () => reply({ ok: true, message: 'Recebido.' })),
    leave: jest.fn(async () => reply({ ok: true })),
    ...overrides,
  };
  return api;
}

const booking = {
  kind: 'booking' as const,
  holdId: 'hold-1',
  when: 'terça-feira, 13/10, às 08:00',
  expiresInSec: 600,
  declared: 'primeira' as const,
};
const withCard = (confirm: PatriciaConfirm) =>
  jest.fn(async () =>
    reply({ ok: true, reply: 'Confira o cartão.', bubbles: ['Confira o cartão.'], confirm })
  );
const withSlots = jest.fn(async () =>
  reply({
    ok: true,
    reply: 'Separei alguns horários.',
    bubbles: ['Separei alguns horários.'],
    slots: [{ id: '2026-10-13|08:00', label: 'terça-feira, 13/10, às 08:00' }],
  })
);

async function setup(api = fakeApi(), store: KeyValueStore = createMemoryStore()) {
  const gateway = createMockPatientAppGateway({ store, patricia: api });
  await gateway.listConversation();
  return { gateway, api, store };
}

const data = <T>(result: { ok: boolean; data?: T }) => {
  if (!result.ok) throw new Error('falhou');
  return result.data as T;
};
const lastOf = (messages: ConversationMessage[]) => messages[messages.length - 1];
const cards = (messages: ConversationMessage[]) =>
  messages.filter((m): m is PatriciaCardMessage => m.kind === 'patricia_card');

async function consented(api = fakeApi(), store?: KeyValueStore) {
  const ctx = await setup(api, store);
  data(await ctx.gateway.answerPatriciaTerms(true));
  return ctx;
}
const conversation = async (gateway: PatientAppGateway) => data(await gateway.listConversation());

describe('Patrícia real: termo', () => {
  it('pede o termo na primeira vez e não manda nada à IA antes dele', async () => {
    const { gateway, api } = await setup();

    expect(gateway.patriciaMode()).toBe('live');
    const consent = cards(await conversation(gateway)).filter(
      (card) => card.card.type === 'consent'
    );
    expect(consent).toHaveLength(1);
    expect(consent[0].status).toBe('open');

    const sent = data(await gateway.sendMessage('Oi'));
    expect(sent).toEqual([
      expect.objectContaining({ kind: 'patricia_card', card: { type: 'consent' } }),
    ]);
    expect(api.startSession).not.toHaveBeenCalled();
    expect(api.message).not.toHaveBeenCalled();
  });

  it('concordar abre a conversa, guarda o aceite e traz a saudação da plataforma', async () => {
    const { gateway, api, store } = await setup();

    const messages = data(await gateway.answerPatriciaTerms(true));

    expect(api.startSession).toHaveBeenCalledTimes(1);
    expect(messages[0]).toEqual(
      expect.objectContaining({ status: 'done', note: 'Você concordou com o termo.' })
    );
    expect(lastOf(messages)).toEqual(
      expect.objectContaining({ author: 'patricia', text: 'Olá, sou a Patrícia.' })
    );
    expect(JSON.parse((await store.getItem(PATRICIA_CONSENT_KEY))!)).toEqual(
      expect.objectContaining({ acceptedAt: expect.any(String) })
    );
  });

  it('recusar oferece o relato sem IA, que vai direto à clínica', async () => {
    const { gateway, api } = await setup();

    const messages = data(await gateway.answerPatriciaTerms(false));
    expect(messages.map((m) => m.text)).toEqual([
      'Termo da conversa com a Patrícia',
      patriciaTexts.refused,
      patriciaTexts.noAi,
      'Relato para o médico',
    ]);
    expect(api.startSession).not.toHaveBeenCalled();

    const report = lastOf(messages);
    api.noAiReport.mockResolvedValueOnce(
      reply({ ok: false, errors: { name: 'Informe seu nome.' } }, 422)
    );
    expect(
      data(
        await gateway.submitPatriciaCard(report.id, {
          type: 'report',
          data: { name: '', phone: '', text: '' },
        })
      )
    ).toEqual({ messages: [], fieldErrors: { name: 'Informe seu nome.' } });

    const sent = data(
      await gateway.submitPatriciaCard(report.id, {
        type: 'report',
        data: { name: 'Ana', phone: '19999998888', text: 'Quero uma consulta.' },
      })
    );
    expect(api.noAiReport).toHaveBeenLastCalledWith({
      name: 'Ana',
      phone: '19999998888',
      text: 'Quero uma consulta.',
    });
    expect(sent.messages[0]).toEqual(
      expect.objectContaining({ status: 'done', note: 'Relato enviado à clínica.' })
    );
    expect(lastOf(sent.messages)).toEqual(expect.objectContaining({ text: 'Recebido.' }));
  });

  it('o termo aceito vale ao reabrir o app, e não aparece de novo', async () => {
    const store = createMemoryStore();
    await consented(fakeApi(), store);

    const reopened = createMockPatientAppGateway({ store, patricia: fakeApi() });
    const consent = cards(await conversation(reopened)).filter(
      (card) => card.card.type === 'consent'
    );
    expect(consent.map((card) => card.status)).toEqual(['done']);
  });
});

describe('Patrícia real: conversa', () => {
  it('manda a mensagem e mostra a resposta, com os balões seguintes', async () => {
    const api = fakeApi({
      message: jest.fn(async () =>
        reply({ ok: true, reply: 'Primeiro.', bubbles: ['Primeiro.', 'Segundo.'] })
      ),
    });
    const { gateway } = await consented(api);

    const messages = data(await gateway.sendMessage('Quero marcar'));

    expect(api.message).toHaveBeenCalledWith('tok-1', { text: 'Quero marcar' });
    expect(messages.map((m) => [m.author, m.text])).toEqual([
      ['patient', 'Quero marcar'],
      ['patricia', 'Primeiro.'],
      ['patricia', 'Segundo.'],
    ]);
  });

  it('não guarda no aparelho um CPF digitado na conversa', async () => {
    const store = createMemoryStore();
    const { gateway } = await consented(fakeApi(), store);

    await gateway.sendMessage('Meu CPF é 529.982.247-25');

    expect(await store.getItem(HISTORY_STORAGE_KEY)).not.toContain('529.982.247-25');
    expect(await store.getItem(HISTORY_STORAGE_KEY)).toContain('Meu CPF é [CPF omitido]');
  });

  it('mostra os horários; tocar num deles manda o horário e tira os botões', async () => {
    const api = fakeApi({ message: withSlots });
    const { gateway } = await consented(api);
    const offered = data(await gateway.sendMessage('Quero marcar'))[1] as TextMessage;
    expect(offered.slots).toEqual([
      { id: '2026-10-13|08:00', label: 'terça-feira, 13/10, às 08:00' },
    ]);

    api.message = withCard(booking);
    const picked = data(await gateway.pickSlot(offered.id, '2026-10-13|08:00'));

    expect(api.message).toHaveBeenLastCalledWith('tok-1', { slot: '2026-10-13|08:00' });
    expect(picked[0]).toEqual(expect.objectContaining({ id: offered.id, slots: undefined }));
    expect(picked[1]).toEqual(
      expect.objectContaining({ author: 'patient', text: 'Escolho terça-feira, 13/10, às 08:00.' })
    );
    expect(lastOf(picked)).toEqual(
      expect.objectContaining({
        kind: 'patricia_card',
        card: { type: 'booking', confirm: booking },
        status: 'open',
      })
    );
  });

  it('mostra o bloco de emergência quando o servidor detecta crise', async () => {
    const api = fakeApi({
      message: jest.fn(async () =>
        reply({ ok: true, reply: 'Ligue 188 ou 192.', slots: [], crisis: true })
      ),
    });
    const { gateway } = await consented(api);

    const messages = data(await gateway.sendMessage('não aguento mais'));

    expect(lastOf(messages)).toEqual(
      expect.objectContaining({ text: 'Ligue 188 ou 192.', crisis: true })
    );
  });

  it('conversa expirada no servidor: abre outra e reenvia a mensagem', async () => {
    const api = fakeApi();
    api.message
      .mockResolvedValueOnce(reply({ ok: false, expired: true, error: 'A conversa expirou.' }, 401))
      .mockResolvedValueOnce(reply({ ok: true, reply: 'Oi de novo.' }));
    const { gateway } = await consented(api);

    const messages = data(await gateway.sendMessage('Olá'));

    expect(api.startSession).toHaveBeenCalledTimes(2);
    expect(api.message).toHaveBeenLastCalledWith('tok-2', { text: 'Olá' });
    expect(lastOf(messages).text).toBe('Oi de novo.');
  });

  it('sem conexão ou com recusa do servidor, a Patrícia explica', async () => {
    const api = fakeApi();
    api.message
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        reply({ ok: false, error: 'Você está enviando mensagens rápido demais.' }, 429)
      );
    const { gateway } = await consented(api);

    expect(lastOf(data(await gateway.sendMessage('Oi'))).text).toBe(patriciaTexts.offline);
    expect(lastOf(data(await gateway.sendMessage('Oi'))).text).toBe(
      'Você está enviando mensagens rápido demais.'
    );
  });

  it('os atalhos viram o pedido na conversa com a Patrícia', async () => {
    const api = fakeApi();
    const { gateway } = await consented(api);

    await gateway.requestService('reschedule_appointment');

    expect(api.message).toHaveBeenCalledWith('tok-1', { text: 'Preciso remarcar minha consulta.' });
  });
});

describe('Patrícia real: cartões', () => {
  async function withBooking(api = fakeApi()) {
    const ctx = await consented(api);
    api.message = withCard(booking);
    const card = lastOf(data(await ctx.gateway.sendMessage('Quero marcar'))) as PatriciaCardMessage;
    return { ...ctx, card };
  }
  const firstVisit = {
    type: 'confirm_booking' as const,
    declared: 'primeira' as const,
    data: { name: 'Ana' },
  };

  it('confirma a consulta com os dados do cartão', async () => {
    const { gateway, api, card } = await withBooking();

    const outcome = data(await gateway.submitPatriciaCard(card.id, firstVisit));

    expect(api.confirm).toHaveBeenCalledWith('tok-1', 'hold-1', {
      declared: 'primeira',
      data: { name: 'Ana' },
    });
    expect(outcome.messages[0]).toEqual(
      expect.objectContaining({ status: 'done', note: 'Consulta marcada.' })
    );
    expect(lastOf(outcome.messages).text).toBe('Pronto, sua consulta está marcada.');
  });

  it('dados com erro: o cartão continua aberto com os avisos de cada campo', async () => {
    const api = fakeApi({
      confirm: jest.fn(async () =>
        reply(
          { ok: false, errors: { cpf: 'CPF inválido.' }, message: 'Confira os campos destacados.' },
          422
        )
      ),
    });
    const { gateway, card } = await withBooking(api);

    expect(data(await gateway.submitPatriciaCard(card.id, firstVisit))).toEqual({
      messages: [],
      fieldErrors: { cpf: 'CPF inválido.' },
      notice: 'Confira os campos destacados.',
    });
    expect(cards(await conversation(gateway)).find((c) => c.id === card.id)?.status).toBe('open');
  });

  it('"já sou paciente" sem cadastro encontrado: oferece um cadastro novo', async () => {
    const api = fakeApi({
      confirm: jest.fn(async () =>
        reply({ ok: false, notFound: true, message: 'Não encontrei seu cadastro.' })
      ),
    });
    const { gateway, card } = await withBooking(api);

    const outcome = data(
      await gateway.submitPatriciaCard(card.id, {
        type: 'confirm_booking',
        declared: 'paciente',
        data: { cpf: '1' },
      })
    );

    expect(outcome).toEqual({
      messages: [],
      notice: 'Não encontrei seu cadastro.',
      offerNewRecord: true,
    });
  });

  it('reserva que acabou: o cartão fecha e a Patrícia explica', async () => {
    const api = fakeApi({
      confirm: jest.fn(async () =>
        reply({ ok: false, gone: true, error: 'Essa reserva não está mais ativa.' }, 409)
      ),
    });
    const { gateway, card } = await withBooking(api);

    const outcome = data(await gateway.submitPatriciaCard(card.id, firstVisit));

    expect(outcome.messages[0]).toEqual(expect.objectContaining({ status: 'closed' }));
    expect(lastOf(outcome.messages).text).toBe('Essa reserva não está mais ativa.');
  });

  it('sem conexão, o cartão continua e pede para tocar de novo', async () => {
    const api = fakeApi({ confirm: jest.fn(async () => null) });
    const { gateway, card } = await withBooking(api);

    const result = await gateway.submitPatriciaCard(card.id, firstVisit);

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ message: expect.stringMatching(/conexão/) }),
      })
    );
  });

  it('"Trocar horário" libera a reserva', async () => {
    const { gateway, api, card } = await withBooking();

    const outcome = data(await gateway.submitPatriciaCard(card.id, { type: 'release' }));

    expect(api.releaseHold).toHaveBeenCalledWith('tok-1');
    expect(lastOf(outcome.messages).text).toBe(patriciaTexts.released);
  });

  it('identificação: encontrou a consulta e a Patrícia continua sozinha', async () => {
    const api = fakeApi();
    const { gateway } = await consented(api);
    api.message = jest.fn(async () =>
      reply({ ok: true, reply: 'Preencha o cartão.', identify: { action: 'remarcar' } })
    );
    const card = lastOf(data(await gateway.sendMessage('Preciso remarcar'))) as PatriciaCardMessage;
    api.message = withSlots;
    const identifyData = {
      noCpf: false,
      cpf: '529.982.247-25',
      name: '',
      birthDate: '',
      date: '2026-10-13',
      time: '08:00',
    };

    const outcome = data(
      await gateway.submitPatriciaCard(card.id, { type: 'identify', data: identifyData })
    );

    expect(api.identify).toHaveBeenCalledWith('tok-1', identifyData);
    expect(api.message).toHaveBeenLastCalledWith('tok-1', { continue: true });
    expect(outcome.messages.map((m) => m.text)).toEqual([
      'Identificação para mudar a consulta',
      'Encontrei a sua consulta de terça, 13/10, às 08:00.',
      'Separei alguns horários.',
    ]);
  });

  it('cancelar e manter a consulta', async () => {
    const api = fakeApi();
    const { gateway } = await consented(api);
    api.message = withCard({ kind: 'cancel', when: 'terça' });
    const first = lastOf(data(await gateway.sendMessage('cancelar'))) as PatriciaCardMessage;
    const kept = data(await gateway.submitPatriciaCard(first.id, { type: 'keep' }));
    expect(api.message).toHaveBeenLastCalledWith('tok-1', { text: patriciaTexts.keep });
    expect(kept.messages[0]).toEqual(
      expect.objectContaining({ status: 'closed', note: 'Consulta mantida.' })
    );

    const second = lastOf(data(await gateway.sendMessage('cancelar'))) as PatriciaCardMessage;
    const done = data(await gateway.submitPatriciaCard(second.id, { type: 'confirm' }));
    expect(api.cancelChange).toHaveBeenCalledWith('tok-1');
    expect(done.messages[0]).toEqual(
      expect.objectContaining({ status: 'done', note: 'Consulta cancelada.' })
    );
  });

  it('ao reabrir o app, cartões de agenda e horários antigos não valem mais', async () => {
    const store = createMemoryStore();
    const api = fakeApi({ message: withSlots });
    const { gateway } = await consented(api, store);
    await gateway.sendMessage('horários');
    api.message = withCard(booking);
    await gateway.sendMessage('quero esse');

    const reopened = createMockPatientAppGateway({ store, patricia: fakeApi() });
    const messages = await conversation(reopened);

    expect(messages.some((m) => m.kind === 'text' && m.slots?.length)).toBe(false);
    expect(cards(messages).find((c) => c.card.type === 'booking')).toEqual(
      expect.objectContaining({ status: 'closed', note: patriciaTexts.expired })
    );
  });

  it('avisa a plataforma ao sair do app só depois de marcar', async () => {
    const { gateway, api, card } = await withBooking();
    await gateway.leavePatricia();
    expect(api.leave).not.toHaveBeenCalled();

    await gateway.submitPatriciaCard(card.id, firstVisit);
    await gateway.leavePatricia();
    await gateway.leavePatricia();
    expect(api.leave).toHaveBeenCalledTimes(1);
  });
});

describe('demonstração', () => {
  it('sem a Patrícia real, os cartões não existem e a resposta é fixa', async () => {
    const gateway = createMockPatientAppGateway();

    expect(gateway.patriciaMode()).toBe('demo');
    expect(await gateway.answerPatriciaTerms(true)).toEqual(expect.objectContaining({ ok: false }));
    expect(cards(await conversation(gateway))).toEqual([]);
  });
});
