/// <reference types="jest" />

import { Appointment, DocumentMetadata } from '@/contracts/platform';
import { mockDoctor } from '@/mocks/patient-app-gateway';
import {
  documentTitle,
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
