/// <reference types="jest" />

import { DocumentMetadata, MESSAGE_MAX_LENGTH, MOOD_NOTE_MAX_LENGTH } from '@/contracts/platform';
import {
  createMockPatientAppGateway,
  mockPatientAppGateway,
  patriciaScript,
} from '@/mocks/patient-app-gateway';

const kinds: DocumentMetadata['kind'][] = ['receipt', 'certificate', 'guidance'];

describe('mockPatientAppGateway', () => {
  it('lista documentos fictícios que respeitam o contrato', async () => {
    const result = await mockPatientAppGateway.listDocuments();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.requestId).toEqual(expect.any(String));
    expect(result.data.length).toBeGreaterThan(0);

    const ids = result.data.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const doc of result.data) {
      expect(kinds).toContain(doc.kind);
      expect(doc.displayName).not.toHaveLength(0);
      expect(doc.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      // Sem dados reais nesta fase: todo documento do mock é só exemplo.
      expect(doc.availability).toBe('mock_only');
    }
  });

  it('informa consentimento ainda não solicitado', async () => {
    const result = await mockPatientAppGateway.readConsent();

    expect(result).toEqual({
      ok: true,
      requestId: expect.any(String),
      data: { policyVersion: 'not-published', acceptedAt: null, status: 'not_requested' },
    });
  });
});

describe('conversa simulada com a Patrícia', () => {
  const fixedNow = new Date('2026-03-09T13:30:00.000Z');
  const newGateway = () => createMockPatientAppGateway({ now: () => fixedNow });

  async function firstMoodCheckId(gateway: ReturnType<typeof newGateway>) {
    const result = await gateway.listConversation();
    if (!result.ok) throw new Error('listConversation falhou');
    const check = result.data.find((message) => message.kind === 'mood_check');
    if (!check) throw new Error('sem cartão de humor');
    return check.id;
  }

  it('começa com a saudação e um cartão de humor em aberto', async () => {
    const result = await newGateway().listConversation();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      expect.objectContaining({
        kind: 'text',
        author: 'patricia',
        text: patriciaScript.greeting,
        sentAt: fixedNow.toISOString(),
      }),
      expect.objectContaining({ kind: 'mood_check', author: 'patricia', answer: null }),
    ]);
  });

  it('responde à mensagem do paciente com texto fixo', async () => {
    const gateway = newGateway();
    const result = await gateway.sendMessage('  Oi, Patrícia  ');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      expect.objectContaining({ kind: 'text', author: 'patient', text: 'Oi, Patrícia' }),
      expect.objectContaining({
        kind: 'text',
        author: 'patricia',
        text: patriciaScript.afterMessage,
      }),
    ]);

    const conversation = await gateway.listConversation();
    expect(conversation.ok && conversation.data).toHaveLength(4);
  });

  it('recusa mensagem vazia ou longa demais', async () => {
    const gateway = newGateway();

    const empty = await gateway.sendMessage('   ');
    const tooLong = await gateway.sendMessage('a'.repeat(MESSAGE_MAX_LENGTH + 1));

    expect(empty).toMatchObject({ ok: false, error: { code: 'validation_failed' } });
    expect(tooLong).toMatchObject({ ok: false, error: { code: 'validation_failed' } });
  });

  it('registra o humor uma única vez por cartão', async () => {
    const gateway = newGateway();
    const checkId = await firstMoodCheckId(gateway);

    const result = await gateway.recordMood({ checkId, level: 4, note: '  dia corrido  ' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.entry).toEqual(
      expect.objectContaining({ checkId, level: 4, note: 'dia corrido' })
    );
    expect(result.data.messages).toEqual([
      expect.objectContaining({ id: checkId, kind: 'mood_check', answer: 4 }),
      expect.objectContaining({ author: 'patricia', text: patriciaScript.afterMood }),
    ]);

    const again = await gateway.recordMood({ checkId, level: 2, note: null });
    expect(again).toMatchObject({ ok: false, error: { code: 'validation_failed' } });
  });

  it('trata nota vazia como ausente e recusa nota longa demais', async () => {
    const gateway = newGateway();
    const checkId = await firstMoodCheckId(gateway);

    const tooLong = await gateway.recordMood({
      checkId,
      level: 3,
      note: 'a'.repeat(MOOD_NOTE_MAX_LENGTH + 1),
    });
    expect(tooLong).toMatchObject({ ok: false, error: { code: 'validation_failed' } });

    const blank = await gateway.recordMood({ checkId, level: 3, note: '   ' });
    expect(blank.ok && blank.data.entry.note).toBeNull();
  });

  it('recusa cartão de humor inexistente', async () => {
    const result = await newGateway().recordMood({ checkId: 'nao-existe', level: 1, note: null });

    expect(result).toMatchObject({ ok: false, error: { code: 'validation_failed' } });
  });

  it('lista os humores registrados na sessão, começando vazio', async () => {
    const gateway = newGateway();
    const empty = await gateway.listMoodEntries();
    expect(empty).toEqual({ ok: true, requestId: expect.any(String), data: [] });

    const checkId = await firstMoodCheckId(gateway);
    await gateway.recordMood({ checkId, level: 5, note: null });

    const result = await gateway.listMoodEntries();
    expect(result.ok && result.data).toEqual([
      expect.objectContaining({ checkId, level: 5, recordedAt: fixedNow.toISOString() }),
    ]);
  });

  it('abre um novo cartão de humor quando pedido', async () => {
    const gateway = newGateway();
    const result = await gateway.requestMoodCheck();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([
      expect.objectContaining({
        kind: 'mood_check',
        text: patriciaScript.moodCheckAgain,
        answer: null,
      }),
    ]);
  });
});
