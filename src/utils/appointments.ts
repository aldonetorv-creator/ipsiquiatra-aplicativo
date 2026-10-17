import { Appointment, AppointmentModality, DocumentMetadata } from '@/contracts/platform';
import { calendarDaysBetween, formatDate } from '@/utils/time';

export const modalityLabel: Record<AppointmentModality, string> = {
  telemedicine: 'Teleconsulta',
  in_person: 'Presencial',
};

// A forma de atendimento, ou nada quando a plataforma não sabe qual é.
export const modalityText = (appointment: Appointment) =>
  appointment.modality ? modalityLabel[appointment.modality] : null;

const endOf = (appointment: Appointment) =>
  new Date(appointment.startsAt).getTime() + appointment.durationMinutes * 60000;

const byStart = (a: Appointment, b: Appointment) =>
  new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

// Próxima consulta marcada que ainda não terminou e as já realizadas, da mais
// recente para a mais antiga.
export function splitAppointments(appointments: Appointment[], now: Date = new Date()) {
  const next =
    appointments
      .filter((item) => item.status === 'scheduled' && endOf(item) > now.getTime())
      .sort(byStart)[0] ?? null;
  const past = appointments
    .filter((item) => item.status === 'completed')
    .sort(byStart)
    .reverse();
  return { next, past };
}

// Cartão "Agora" da Início (pedido do Dr. Aldo, 12/10/2026):
// - "Consulta próxima": a próxima consulta marcada está a 7 dias ou menos;
// - "Retorno atrasado": passou a data do retorno pedido na última consulta sem
//   outra consulta, ou a consulta marcada ficou para depois dela;
// - "Em acompanhamento": os outros casos.
export type FollowUp =
  | { kind: 'soon'; daysUntil: number }
  | { kind: 'following' | 'late'; daysSince: number; daysUntil: number | null };

export const SOON_DAYS = 7;

export function followUpFor(appointments: Appointment[], now: Date = new Date()): FollowUp | null {
  const { next, past } = splitAppointments(appointments, now);
  const last = past[0];
  if (!last) return null;
  const daysUntil = next ? Math.max(0, calendarDaysBetween(now, new Date(next.startsAt))) : null;
  if (daysUntil !== null && daysUntil <= SOON_DAYS) return { kind: 'soon', daysUntil };
  const daysSince = calendarDaysBetween(new Date(last.startsAt), now);
  const late =
    !!last.returnDueAt &&
    calendarDaysBetween(new Date(last.returnDueAt), next ? new Date(next.startsAt) : now) > 0;
  return { kind: late ? 'late' : 'following', daysSince, daysUntil };
}

// Toda nota fiscal diz a qual consulta se refere (decisão do Dr. Aldo,
// docs/fases.md).
export function documentTitle(document: DocumentMetadata, appointment: Appointment | null) {
  if (document.kind === 'invoice' && appointment) {
    return `Nota fiscal referente à consulta do dia ${formatDate(appointment.startsAt)}`;
  }
  return document.displayName;
}

export const INVOICE_PENDING_TEXT = 'Será emitida 24 horas depois da realização da consulta.';

export type DocumentGroup = {
  appointment: Appointment | null;
  documents: DocumentMetadata[];
};

// Cofre: um grupo por consulta, da mais recente para a mais antiga; os
// documentos sem consulta (ou de uma consulta desconhecida) vão para o fim.
export function groupDocumentsByAppointment(
  documents: DocumentMetadata[],
  appointments: Appointment[]
): DocumentGroup[] {
  const byId = new Map(appointments.map((item) => [item.id, item]));
  const groups = new Map<string, DocumentGroup>();
  const loose: DocumentMetadata[] = [];
  for (const document of documents) {
    const appointment = document.appointmentId ? byId.get(document.appointmentId) : undefined;
    if (!appointment) {
      loose.push(document);
      continue;
    }
    const group = groups.get(appointment.id) ?? { appointment, documents: [] };
    group.documents.push(document);
    groups.set(appointment.id, group);
  }
  const sorted = [...groups.values()].sort((a, b) => byStart(b.appointment!, a.appointment!));
  return loose.length > 0 ? [...sorted, { appointment: null, documents: loose }] : sorted;
}
