import { useEffect, useState } from 'react';

import { usePatientAppGateway } from '@/services/patient-app-gateway';
import { DocumentGroup, groupDocumentsByAppointment } from '@/utils/appointments';

export type DocumentsState =
  | { status: 'loading' }
  | { status: 'ready'; groups: DocumentGroup[] }
  | { status: 'error'; error: string };

const unavailable = 'Não foi possível carregar os documentos.';

// Documentos do Cofre, agrupados pela consulta a que pertencem.
export function useDocuments(): DocumentsState {
  const gateway = usePatientAppGateway();
  const [state, setState] = useState<DocumentsState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    Promise.all([gateway.listDocuments(), gateway.listAppointments()])
      .then(([documents, appointments]) => {
        if (!active) return;
        if (!documents.ok) return setState({ status: 'error', error: documents.error.message });
        if (!appointments.ok) {
          return setState({ status: 'error', error: appointments.error.message });
        }
        setState({
          status: 'ready',
          groups: groupDocumentsByAppointment(documents.data, appointments.data),
        });
      })
      .catch(() => {
        if (active) setState({ status: 'error', error: unavailable });
      });
    return () => {
      active = false;
    };
  }, [gateway]);

  return state;
}
