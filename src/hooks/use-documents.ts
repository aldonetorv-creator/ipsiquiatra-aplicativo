import { useEffect, useState } from 'react';

import { ApiFailure, DocumentMetadata } from '@/contracts/platform';
import { usePatientAppGateway } from '@/services/patient-app-gateway';

export type DocumentsState =
  | { status: 'loading' }
  | { status: 'ready'; documents: DocumentMetadata[] }
  | { status: 'error'; error: ApiFailure['error'] };

export function useDocuments(): DocumentsState {
  const gateway = usePatientAppGateway();
  const [state, setState] = useState<DocumentsState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    gateway
      .listDocuments()
      .then((result) => {
        if (!active) return;
        setState(
          result.ok
            ? { status: 'ready', documents: result.data }
            : { status: 'error', error: result.error }
        );
      })
      .catch(() => {
        if (!active) return;
        setState({
          status: 'error',
          error: { code: 'not_available', message: 'Não foi possível carregar os documentos.' },
        });
      });
    return () => {
      active = false;
    };
  }, [gateway]);

  return state;
}
