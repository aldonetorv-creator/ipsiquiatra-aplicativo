/// <reference types="jest" />

import { Appointment, DocumentMetadata } from '@/contracts/platform';
import { mockDoctor } from '@/mocks/patient-app-gateway';
import {
  documentTitle,
  followUpFor,
  groupDocumentsByAppointment,
  splitAppointments,
} from '@/utils/appointments';
import { calendarDaysBetween, formatDate, formatDaysUntil } from '@/utils/time';

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

const appointment = (
  id: string,
  startsAt: Date,
  status: Appointment['status'] = 'completed'
): Appointment => ({
  id,
  startsAt: startsAt.toISOString(),
  durationMinutes: 60,
  modality: 'telemedicine',
  status,
  doctor: mockDoctor,
});

const document = (
  id: string,
  appointmentId: string | null,
  kind: DocumentMetadata['kind'] = 'prescription'
): DocumentMetadata => ({
  id,
  displayName: kind === 'invoice' ? 'Nota fiscal' : `Documento ${id}`,
  kind,
  createdAt: at(1, 9).toISOString(),
  appointmentId,
  availability: 'mock_only',
});

describe('splitAppointments', () => {
  const now = at(8, 9);

  it('escolhe a próxima consulta marcada e ordena as realizadas da mais recente', () => {
    const { next, past } = splitAppointments(
      [
        appointment('old', at(1, 10)),
        appointment('later', at(20, 10), 'scheduled'),
        appointment('recent', at(5, 14)),
        appointment('soon', at(15, 14), 'scheduled'),
      ],
      now
    );

    expect(next?.id).toBe('soon');
    expect(past.map((item) => item.id)).toEqual(['recent', 'old']);
  });

  it('mantém como próxima a consulta que está acontecendo agora', () => {
    const { next } = splitAppointments([appointment('now', at(8, 8, 30), 'scheduled')], now);

    expect(next?.id).toBe('now');
  });

  it('não tem próxima quando a marcada já terminou', () => {
    const { next } = splitAppointments([appointment('gone', at(8, 7), 'scheduled')], now);

    expect(next).toBeNull();
  });
});

describe('groupDocumentsByAppointment', () => {
  it('agrupa por consulta, da mais recente, com os avulsos no fim', () => {
    const groups = groupDocumentsByAppointment(
      [
        document('a1', 'old'),
        document('loose', null),
        document('b1', 'recent'),
        document('a2', 'old', 'invoice'),
        document('orphan', 'missing'),
      ],
      [appointment('old', at(1, 10)), appointment('recent', at(5, 14))]
    );

    expect(groups.map((group) => group.appointment?.id ?? null)).toEqual(['recent', 'old', null]);
    expect(groups[1].documents.map((doc) => doc.id)).toEqual(['a1', 'a2']);
    expect(groups[2].documents.map((doc) => doc.id)).toEqual(['loose', 'orphan']);
  });
});

describe('documentTitle', () => {
  it('diz a qual consulta a nota fiscal se refere', () => {
    const consult = appointment('c', at(5, 14, 30));

    expect(documentTitle(document('n', 'c', 'invoice'), consult)).toBe(
      'Nota fiscal referente à consulta do dia 05/10/2026'
    );
    expect(documentTitle(document('r', 'c'), consult)).toBe('Documento r');
  });
});

describe('datas das consultas', () => {
  it('conta dias de calendário, não intervalos de 24 horas', () => {
    expect(calendarDaysBetween(at(5, 23), at(6, 1))).toBe(1);
    expect(calendarDaysBetween(at(1, 14), at(8, 9))).toBe(7);
  });

  it.each([
    [at(8, 18), 'Hoje'],
    [at(9, 8), 'Amanhã'],
    [at(15, 14), 'Em 7 dias'],
  ])('%s → %s', (date, expected) => {
    expect(formatDaysUntil(date.toISOString(), at(8, 9))).toBe(expected);
  });

  it('formata a data com dois dígitos', () => {
    expect(formatDate(at(5, 14).toISOString())).toBe('05/10/2026');
  });
});

describe('cartão Agora da Início', () => {
  const now = at(12, 9);
  // Última consulta no dia 4, com retorno pedido para o dia `due`.
  const last = (due: number | null) => ({
    ...appointment('a1', at(4, 14)),
    returnDueAt: due === null ? null : at(due, 0).toISOString(),
  });

  it('sem consulta realizada, não aparece', () => {
    expect(followUpFor([appointment('a2', at(14, 10), 'scheduled')], now)).toBeNull();
  });

  it('em acompanhamento: dias desde a última e até a próxima', () => {
    expect(followUpFor([last(30)], now)).toEqual({
      kind: 'following',
      daysSince: 8,
      daysUntil: null,
    });
    expect(followUpFor([last(30), appointment('a2', at(30, 10), 'scheduled')], now)).toEqual({
      kind: 'following',
      daysSince: 8,
      daysUntil: 18,
    });
  });

  it('consulta próxima a partir de 7 dias antes', () => {
    expect(followUpFor([last(30), appointment('a2', at(20, 10), 'scheduled')], now)?.kind).toBe(
      'following'
    );
    expect(followUpFor([last(30), appointment('a2', at(19, 10), 'scheduled')], now)).toEqual({
      kind: 'soon',
      daysUntil: 7,
    });
    expect(followUpFor([last(30), appointment('a2', at(12, 18), 'scheduled')], now)).toEqual({
      kind: 'soon',
      daysUntil: 0,
    });
  });

  it('retorno atrasado: passou a data pedida sem consulta marcada', () => {
    expect(followUpFor([last(12)], now)?.kind).toBe('following');
    expect(followUpFor([last(11)], now)).toEqual({ kind: 'late', daysSince: 8, daysUntil: null });
  });

  it('retorno atrasado: a consulta marcada ficou para depois da data pedida', () => {
    expect(followUpFor([last(11), appointment('a2', at(25, 10), 'scheduled')], now)).toEqual({
      kind: 'late',
      daysSince: 8,
      daysUntil: 13,
    });
    expect(followUpFor([last(25), appointment('a2', at(25, 10), 'scheduled')], now)?.kind).toBe(
      'following'
    );
  });

  it('retorno atrasado: a consulta marcada passou e não aconteceu', () => {
    const missed = appointment('a2', at(10, 10), 'scheduled');
    expect(followUpFor([last(10), missed], now)?.kind).toBe('late');
  });

  it('a consulta próxima vem antes do atraso', () => {
    expect(followUpFor([last(11), appointment('a2', at(15, 10), 'scheduled')], now)).toEqual({
      kind: 'soon',
      daysUntil: 3,
    });
  });

  it('sem data de retorno, nunca diz que está atrasado', () => {
    expect(followUpFor([last(null)], at(28, 9))?.kind).toBe('following');
  });
});
