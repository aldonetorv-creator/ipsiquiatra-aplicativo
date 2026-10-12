import { useCallback, useEffect, useState } from 'react';

import { ApiResult, CarePlan, MedicationPlan } from '@/contracts/platform';
import { usePatientAppGateway } from '@/services/patient-app-gateway';

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: string };

function useLoad<T>(load: () => Promise<ApiResult<T>>, unavailable: string): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        setState(
          result.ok
            ? { status: 'ready', data: result.data }
            : { status: 'error', error: result.error.message }
        );
      })
      .catch(() => {
        if (active) setState({ status: 'error', error: unavailable });
      });
    return () => {
      active = false;
    };
  }, [load, unavailable]);
  return state;
}

// Minhas medicações: a lista conferida pelo médico.
export function useMedicationPlan(): Loadable<MedicationPlan | null> {
  const gateway = usePatientAppGateway();
  const load = useCallback(() => gateway.getMedicationPlan(), [gateway]);
  return useLoad(load, 'Não foi possível carregar as suas medicações.');
}

// Plano de cuidados de um documento do Cofre, ou o mais recente.
export function useCarePlan(documentId?: string): Loadable<CarePlan | null> {
  const gateway = usePatientAppGateway();
  const load = useCallback(() => gateway.getCarePlan(documentId), [gateway, documentId]);
  return useLoad(load, 'Não foi possível carregar o plano de cuidados.');
}
