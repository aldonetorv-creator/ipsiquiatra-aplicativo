import { Appointment, DocumentMetadata } from '@/contracts/platform';
import { formatDate } from '@/utils/time';

export const modalityLabel: Record<Appointment['modality'], string> = {
  telemedicine: 'Teleconsulta',
  in_person: 'Presencial',
};

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
  const past = appointments.filter((item) => item.status === 'completed').sort(byStart).reverse();
  return { next, past };
}

// Toda nota fiscal diz a qual consulta se refere (decisão do Dr. Aldo,
// docs/fases.md).
export function documentTitle(document: DocumentMetadata, appointment: Appointment | null) {
  if (document.kind === 'invoice' && appointment) {
    return `Nota fiscal referente à consulta do dia ${formatDate(appointment.startsAt)}`;
  }
  return document.displayName;
}

export const INVOICE_PENDING_TEXT =
  'Será emitida 24 horas depois da realização da consulta.';

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
