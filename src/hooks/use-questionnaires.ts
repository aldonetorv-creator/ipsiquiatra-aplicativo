import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Questionnaire, SubmitQuestionnaireInput } from '@/contracts/platform';
import { usePatientAppGateway } from '@/services/patient-app-gateway';

export type QuestionnairesState =
  | { status: 'loading' }
  | { status: 'ready'; questionnaires: Questionnaire[] }
  | { status: 'error'; error: string };

export type SubmitOutcome = { ok: true; safetyTriggered: boolean } | { ok: false; error: string };

const unavailable = 'Não foi possível carregar os questionários agora.';

export function useQuestionnaires() {
  const gateway = usePatientAppGateway();
  const [state, setState] = useState<QuestionnairesState>({ status: 'loading' });

  const load = useCallback(() => {
    let active = true;
    gateway
      .listQuestionnaires()
      .then((result) => {
        if (!active) return;
        setState(
          result.ok
            ? { status: 'ready', questionnaires: result.data }
            : { status: 'error', error: result.error.message }
        );
      })
      .catch(() => {
        if (active) setState({ status: 'error', error: unavailable });
      });
    return () => {
      active = false;
    };
  }, [gateway]);
  useFocusEffect(load);

  const submit = useCallback(
    async (input: SubmitQuestionnaireInput): Promise<SubmitOutcome> => {
      try {
        const result = await gateway.submitQuestionnaire(input);
        if (!result.ok) return { ok: false, error: result.error.message };
        const updated = result.data.questionnaire;
        setState((current) =>
          current.status === 'ready'
            ? {
                ...current,
                questionnaires: current.questionnaires.map((item) =>
                  item.id === updated.id ? updated : item
                ),
              }
            : current
        );
        return { ok: true, safetyTriggered: result.data.safetyTriggered };
      } catch {
        return { ok: false, error: 'Não foi possível registrar as respostas. Tente de novo.' };
      }
    },
    [gateway]
  );

  return { state, submit };
}
