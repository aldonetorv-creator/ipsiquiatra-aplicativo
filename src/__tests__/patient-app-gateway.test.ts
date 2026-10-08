/// <reference types="jest" />

import {
  DocumentMetadata,
  MESSAGE_MAX_LENGTH,
  MOOD_NOTE_MAX_LENGTH,
  MoodLevel,
  PatientAppGateway,
  QUESTIONNAIRE_TEXT_MAX_LENGTH,
  Questionnaire,
} from '@/contracts/platform';
import {
  createMockPatientAppGateway,
  HISTORY_STORAGE_KEY,
  invoiceIsDue,
  mockDoctor,
  mockPatientAppGateway,
  patriciaScript,
  QUESTIONNAIRES_STORAGE_KEY,
} from '@/mocks/patient-app-gateway';
import { createMemoryStore } from '@/services/storage';

const kinds: DocumentMetadata['kind'][] = [
  'care_plan',
  'prescription',
  'exam_request',
  'report',
  'invoice',
  'certificate',
  'guidance',
];

describe('mockPatientAppGateway', () => {
  it('lista documentos fictícios que respeitam o contrato', async () => {
    const result = await mockPatientAppGateway.listDocuments();
    const appointments = await mockPatientAppGateway.listAppointments();

    expect(result.ok).toBe(true);
    if (!result.ok || !appointments.ok) return;
    expect(result.requestId).toEqual(expect.any(String));
    expect(result.data.length).toBeGreaterThan(0);

    const ids = result.data.map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);

    const appointmentIds = appointments.data.map((item) => item.id);
    for (const doc of result.data) {
      expect(kinds).toContain(doc.kind);
      expect(doc.displayName).not.toHaveLength(0);
      expect(doc.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      // Sem dados reais nesta fase: todo documento do mock é só exemplo
      // (ou uma nota fiscal ainda não emitida).
      expect(['mock_only', 'pending']).toContain(doc.availability);
      if (doc.appointmentId !== null) expect(appointmentIds).toContain(doc.appointmentId);
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

  it.each(['schedule_appointment', 'reschedule_appointment', 'request_invoice'] as const)(
    'responde ao pedido de %s avisando que chega em breve',
    async (service) => {
      const result = await newGateway().requestService(service);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual([
        expect.objectContaining({
          author: 'patient',
          text: patriciaScript.services[service].request,
        }),
        expect.objectContaining({
          author: 'patricia',
          text: expect.stringMatching(/^Em breve/),
        }),
      ]);
    }
  );

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

describe('histórico salvo no aparelho', () => {
  const day1 = new Date(2026, 2, 9, 20, 0);
  const day2 = new Date(2026, 2, 10, 9, 0);

  async function answerOpenCheck(gateway: PatientAppGateway, level: MoodLevel) {
    const result = await gateway.listConversation();
    if (!result.ok) throw new Error('listConversation falhou');
    const open = result.data.find(
      (message) => message.kind === 'mood_check' && message.answer === null
    )!;
    await gateway.recordMood({ checkId: open.id, level, note: null });
  }

  it('mantém conversa e humores ao reabrir o app', async () => {
    const store = createMemoryStore();
    const first = createMockPatientAppGateway({ store, now: () => day1 });
    await first.sendMessage('Mensagem de ontem');
    await answerOpenCheck(first, 4);

    const reopened = createMockPatientAppGateway({ store, now: () => day1 });
    const conversation = await reopened.listConversation();
    const moods = await reopened.listMoodEntries();

    expect(conversation.ok && conversation.data.map((message) => message.text)).toContain(
      'Mensagem de ontem'
    );
    expect(moods.ok && moods.data).toEqual([expect.objectContaining({ level: 4 })]);
  });

  it('não repete ids depois de reabrir', async () => {
    const store = createMemoryStore();
    await createMockPatientAppGateway({ store, now: () => day1 }).sendMessage('Primeira');
    await createMockPatientAppGateway({ store, now: () => day1 }).sendMessage('Segunda');

    const result = await createMockPatientAppGateway({ store }).listConversation();
    const ids = result.ok ? result.data.map((message) => message.id) : [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('abre um novo cartão de humor a cada dia, mantendo os anteriores', async () => {
    const store = createMemoryStore();
    await answerOpenCheck(createMockPatientAppGateway({ store, now: () => day1 }), 2);

    const nextDay = createMockPatientAppGateway({ store, now: () => day2 });
    const result = await nextDay.listConversation();

    const checks = result.ok ? result.data.filter((message) => message.kind === 'mood_check') : [];
    expect(checks).toEqual([
      expect.objectContaining({ answer: 2, sentAt: day1.toISOString() }),
      expect.objectContaining({ answer: null, sentAt: day2.toISOString() }),
    ]);
    const again = await nextDay.listConversation();
    expect(again.ok && again.data).toHaveLength(result.ok ? result.data.length : -1);
  });

  it('recomeça do zero se o histórico salvo estiver corrompido ou noutro formato', async () => {
    for (const raw of ['{isso não é json', JSON.stringify({ version: 99, conversation: [] })]) {
      const store = createMemoryStore({ [HISTORY_STORAGE_KEY]: raw });
      const result = await createMockPatientAppGateway({ store }).listConversation();

      expect(result.ok && result.data[0]).toEqual(
        expect.objectContaining({ text: patriciaScript.greeting })
      );
    }
  });

  it('continua funcionando se a leitura do aparelho falhar', async () => {
    const store = {
      ...createMemoryStore(),
      getItem: () => Promise.reject(new Error('falha de leitura')),
    };
    const result = await createMockPatientAppGateway({ store }).listConversation();

    expect(result.ok).toBe(true);
  });

  it('apaga conversa e humores e recomeça a conversa', async () => {
    const store = createMemoryStore();
    const gateway = createMockPatientAppGateway({ store, now: () => day1 });
    await gateway.sendMessage('Algo pessoal');
    await answerOpenCheck(gateway, 1);

    const cleared = await gateway.clearHistory();

    expect(cleared.ok && cleared.data.map((message) => message.kind)).toEqual([
      'text',
      'mood_check',
    ]);
    const moods = await gateway.listMoodEntries();
    expect(moods.ok && moods.data).toEqual([]);
    const reopened = await createMockPatientAppGateway({ store, now: () => day1 }).listConversation();
    expect(reopened.ok && reopened.data.map((message) => message.text)).not.toContain(
      'Algo pessoal'
    );
  });
});

describe('consultas simuladas', () => {
  const fixedNow = new Date(2026, 9, 8, 9, 0);

  it('tem consultas realizadas e uma próxima, com o Dr. Aldo', async () => {
    const result = await createMockPatientAppGateway({ now: () => fixedNow }).listAppointments();
    if (!result.ok) throw new Error('listAppointments falhou');

    const starts = result.data.map((item) => new Date(item.startsAt).getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    for (const appointment of result.data) {
      expect(appointment.doctor).toEqual(mockDoctor);
      expect(['telemedicine', 'in_person']).toContain(appointment.modality);
      const isFuture = new Date(appointment.startsAt) > fixedNow;
      expect(appointment.status).toBe(isFuture ? 'scheduled' : 'completed');
    }
    expect(result.data.filter((item) => item.status === 'scheduled')).toHaveLength(1);
    expect(result.data.filter((item) => item.status === 'completed').length).toBeGreaterThan(0);
  });

  it('agrupa os documentos por consulta, com a nota fiscal de cada consulta', async () => {
    const gateway = createMockPatientAppGateway({ now: () => fixedNow });
    const appointments = await gateway.listAppointments();
    const documents = await gateway.listDocuments();
    if (!appointments.ok || !documents.ok) throw new Error('falhou');

    for (const appointment of appointments.data.filter((item) => item.status === 'completed')) {
      const invoices = documents.data.filter(
        (doc) => doc.kind === 'invoice' && doc.appointmentId === appointment.id
      );
      expect(invoices).toHaveLength(1);
    }
    expect(documents.data.some((doc) => doc.kind === 'care_plan')).toBe(true);
  });

  it('deixa a nota fiscal pendente até 24 horas depois da consulta', async () => {
    let current = fixedNow;
    const gateway = createMockPatientAppGateway({ now: () => current });
    const appointments = await gateway.listAppointments();
    if (!appointments.ok) throw new Error('listAppointments falhou');
    const last = appointments.data.filter((item) => item.status === 'completed').pop()!;
    const end = new Date(last.startsAt).getTime() + last.durationMinutes * 60000;
    const invoiceOf = async () => {
      const result = await gateway.listDocuments();
      if (!result.ok) throw new Error('listDocuments falhou');
      return result.data.find((doc) => doc.id === `doc-invoice-${last.id}`)!;
    };

    current = new Date(end + 23 * 60 * 60 * 1000);
    expect((await invoiceOf()).availability).toBe('pending');
    expect(invoiceIsDue(last, current)).toBe(false);

    current = new Date(end + 24 * 60 * 60 * 1000);
    expect((await invoiceOf()).availability).toBe('mock_only');
    expect(invoiceIsDue(last, current)).toBe(true);
  });
});

describe('questionários simulados', () => {
  const fixedNow = new Date(2026, 9, 8, 9, 0);

  const answersFor = (questionnaire: Questionnaire, scaleIndex = 0) =>
    Object.fromEntries(
      questionnaire.questions.map((question) => [
        question.id,
        question.type === 'scale' ? question.options[scaleIndex] : 'Texto de teste',
      ])
    );

  async function listed(gateway: PatientAppGateway) {
    const result = await gateway.listQuestionnaires();
    if (!result.ok) throw new Error('listQuestionnaires falhou');
    return result.data;
  }

  it('pede a Atualização pré-consulta e as escalas para a próxima consulta', async () => {
    const gateway = createMockPatientAppGateway({ now: () => fixedNow });
    const appointments = await gateway.listAppointments();
    if (!appointments.ok) throw new Error('listAppointments falhou');
    const next = appointments.data.find((item) => item.status === 'scheduled')!;

    const questionnaires = await listed(gateway);

    expect(questionnaires.map((item) => item.id)).toEqual([
      'general',
      'baseline-who5',
      'baseline-phq9',
      'baseline-gad7',
    ]);
    for (const item of questionnaires) {
      expect(item.appointmentId).toBe(next.id);
      expect(item.answeredAt).toBeNull();
    }
    const safety = questionnaires.flatMap((item) =>
      item.questions.filter((question) => question.type === 'scale' && question.safety)
    );
    expect(safety.map((question) => question.id)).toEqual(['phq9-9']);
  });

  it('registra as respostas no aparelho e não aceita responder de novo', async () => {
    const store = createMemoryStore();
    const gateway = createMockPatientAppGateway({ now: () => fixedNow, store });
    const [general] = await listed(gateway);

    const result = await gateway.submitQuestionnaire({
      questionnaireId: general.id,
      answers: answersFor(general),
    });

    expect(result).toEqual({
      ok: true,
      requestId: expect.any(String),
      data: {
        questionnaire: expect.objectContaining({ id: 'general', answeredAt: fixedNow.toISOString() }),
        safetyTriggered: false,
      },
    });
    // Outra abertura do app lê o que ficou salvo.
    const reopened = createMockPatientAppGateway({ now: () => fixedNow, store });
    expect((await listed(reopened))[0].answeredAt).toBe(fixedNow.toISOString());
    expect(
      await reopened.submitQuestionnaire({ questionnaireId: 'general', answers: answersFor(general) })
    ).toMatchObject({ ok: false, error: { message: 'Este questionário já foi respondido.' } });
  });

  it('aciona a segurança com qualquer resposta além de "Nunca ou quase nunca" no item 9', async () => {
    for (const [index, expected] of [
      [0, false],
      [1, true],
      [3, true],
    ] as const) {
      const gateway = createMockPatientAppGateway({ now: () => fixedNow });
      const phq9 = (await listed(gateway)).find((item) => item.id === 'baseline-phq9')!;
      const answers = { ...answersFor(phq9, 0), 'phq9-9': answersFor(phq9, index)['phq9-9'] };

      const result = await gateway.submitQuestionnaire({ questionnaireId: phq9.id, answers });

      expect(result.ok && result.data.safetyTriggered).toBe(expected);
    }
  });

  it.each([
    ['pergunta obrigatória em branco', { mainChange: '' }, 'Responda todas as perguntas.'],
    [
      'opção que não existe',
      { medicationUse: 'Talvez' },
      'Escolha uma das opções em cada pergunta.',
    ],
    [
      'texto longo demais',
      { priority: 'a'.repeat(QUESTIONNAIRE_TEXT_MAX_LENGTH + 1) },
      `Cada resposta pode ter até ${QUESTIONNAIRE_TEXT_MAX_LENGTH} caracteres.`,
    ],
  ])('recusa %s', async (_case, override, message) => {
    const gateway = createMockPatientAppGateway({ now: () => fixedNow });
    const [general] = await listed(gateway);

    const result = await gateway.submitQuestionnaire({
      questionnaireId: general.id,
      answers: { ...answersFor(general), ...override },
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'validation_failed', message } });
    expect((await listed(gateway))[0].answeredAt).toBeNull();
  });

  it('recusa questionário desconhecido', async () => {
    const result = await createMockPatientAppGateway().submitQuestionnaire({
      questionnaireId: 'nao-existe',
      answers: {},
    });

    expect(result).toMatchObject({ ok: false, error: { message: 'Questionário não encontrado.' } });
  });

  it('começa sem respostas quando o que está salvo está corrompido', async () => {
    const store = createMemoryStore({ [QUESTIONNAIRES_STORAGE_KEY]: '{corrompido' });
    const gateway = createMockPatientAppGateway({ now: () => fixedNow, store });

    expect((await listed(gateway)).every((item) => item.answeredAt === null)).toBe(true);
  });
});
