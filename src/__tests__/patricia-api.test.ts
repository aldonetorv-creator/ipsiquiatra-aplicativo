/// <reference types="jest" />

import { createPatriciaHttpApi } from '@/services/patricia-api';

function fakeFetch(status: number, body: unknown) {
  return jest.fn(async () => ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  })) as unknown as jest.MockedFunction<typeof fetch>;
}

const sentBody = (doFetch: jest.MockedFunction<typeof fetch>) =>
  JSON.parse(String(doFetch.mock.calls[0][1]?.body));

describe('rotas públicas da Patrícia', () => {
  it('fala com o endereço da Patrícia do médico, como o chat do site', async () => {
    const doFetch = fakeFetch(200, { ok: true, session: 'tok' });
    const api = createPatriciaHttpApi({
      baseUrl: 'https://ipsiquiatra.com.br/',
      slug: 'aldo-araujo',
      fetch: doFetch,
    });

    const result = await api.startSession();

    expect(doFetch).toHaveBeenCalledWith(
      'https://ipsiquiatra.com.br/api/public/patricia/aldo-araujo/session',
      expect.objectContaining({ method: 'POST' })
    );
    expect(sentBody(doFetch)).toEqual({ consent: true });
    expect(result).toEqual({ status: 200, ok: true, data: { ok: true, session: 'tok' } });
  });

  it('manda a mensagem, o horário tocado ou a continuação na mesma rota', async () => {
    const doFetch = fakeFetch(200, { ok: true, reply: 'Oi' });
    const api = createPatriciaHttpApi({ baseUrl: '', slug: 'aldo-araujo', fetch: doFetch });

    await api.message('tok', { slot: '2026-10-13|08:00' });

    expect(doFetch.mock.calls[0][0]).toBe('/api/public/patricia/aldo-araujo/message');
    expect(sentBody(doFetch)).toEqual({ session: 'tok', slot: '2026-10-13|08:00' });
  });

  it('confirma a reserva com o caminho declarado e os dados do cartão', async () => {
    const doFetch = fakeFetch(200, { ok: true, message: 'Pronto' });
    const api = createPatriciaHttpApi({ baseUrl: '', slug: 'aldo-araujo', fetch: doFetch });

    await api.confirm('tok', 'hold-1', {
      declared: 'paciente',
      data: { cpf: '1', birthDate: '1988-04-12' },
    });

    expect(sentBody(doFetch)).toEqual({
      session: 'tok',
      holdId: 'hold-1',
      declared: 'paciente',
      data: { cpf: '1', birthDate: '1988-04-12' },
    });
  });

  it('trata "ok: false" no corpo como recusa, mesmo com status 200', async () => {
    const api = createPatriciaHttpApi({
      baseUrl: '',
      slug: 'aldo-araujo',
      fetch: fakeFetch(200, { ok: false, notFound: true, message: 'Não encontrei' }),
    });

    expect(await api.confirm('tok', 'hold-1')).toEqual({
      status: 200,
      ok: false,
      data: { ok: false, notFound: true, message: 'Não encontrei' },
    });
  });

  it('sem conexão, devolve null', async () => {
    const offline = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;
    const api = createPatriciaHttpApi({ baseUrl: '', slug: 'aldo-araujo', fetch: offline });

    expect(await api.info()).toBeNull();
  });

  it('sem resposta a tempo, desiste e devolve null em vez de deixar a conversa presa', async () => {
    const hanging = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        )
    ) as unknown as typeof fetch;
    const api = createPatriciaHttpApi({
      baseUrl: '',
      slug: 'aldo-araujo',
      fetch: hanging,
      timeoutMs: 20,
    });

    expect(await api.message('tok', { text: 'Oi' })).toBeNull();
  });
});
