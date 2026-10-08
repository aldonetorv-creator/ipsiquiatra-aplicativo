import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmergencyCard } from '@/components/questionnaires/emergency-card';
import { QuestionnaireRunner } from '@/components/questionnaires/questionnaire-runner';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientButton } from '@/components/ui/gradient-button';
import { IconBadge } from '@/components/ui/icon-badge';
import { OutlineButton } from '@/components/ui/outline-button';
import { PageScreen, SectionLabel } from '@/components/ui/page-screen';
import { Tokens } from '@/constants/theme';
import { Questionnaire } from '@/contracts/platform';
import { useQuestionnaires } from '@/hooks/use-questionnaires';
import { formatDate } from '@/utils/time';

type Mode =
  | { kind: 'list' }
  | { kind: 'answering'; id: string }
  | { kind: 'done'; id: string; safetyTriggered: boolean };

const minutesLabel = (minutes: number) => (minutes === 1 ? '1 minuto' : `${minutes} minutos`);

export default function QuestionariosScreen() {
  const { state, submit } = useQuestionnaires();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

  const questionnaires = state.status === 'ready' ? state.questionnaires : [];
  const pending = questionnaires.filter((item) => item.answeredAt === null);
  const answered = questionnaires.filter((item) => item.answeredAt !== null);
  const current =
    mode.kind === 'list' ? null : questionnaires.find((item) => item.id === mode.id) ?? null;

  return (
    <PageScreen title="Questionários" subtitle="O que o Dr. Aldo pediu antes da sua consulta.">
      <View style={styles.notice}>
        <SymbolView
          name={{ ios: 'info.circle', android: 'info', web: 'info' }}
          tintColor={Tokens.color.brandDeep}
          size={18}
        />
        <ThemedText type="small" style={styles.noticeText}>
          Versão de demonstração: suas respostas ficam só neste aparelho e ainda não chegam ao Dr.
          Aldo. Em emergência, ligue 188 (CVV) ou 192 (SAMU).
        </ThemedText>
      </View>

      {state.status === 'loading' ? (
        <ThemedText type="small" style={styles.muted}>
          Carregando questionários…
        </ThemedText>
      ) : state.status === 'error' ? (
        <ThemedText type="default" style={styles.muted}>
          {state.error}
        </ThemedText>
      ) : mode.kind === 'answering' && current ? (
        <QuestionnaireRunner
          key={current.id}
          questionnaire={current}
          onExit={() => setMode({ kind: 'list' })}
          onSubmit={async (answers) => {
            const outcome = await submit({ questionnaireId: current.id, answers });
            if (!outcome.ok) return outcome.error;
            setMode({ kind: 'done', id: current.id, safetyTriggered: outcome.safetyTriggered });
            return null;
          }}
        />
      ) : mode.kind === 'done' ? (
        <Done
          safetyTriggered={mode.safetyTriggered}
          next={pending[0] ?? null}
          onNext={(id) => setMode({ kind: 'answering', id })}
          onBack={() => setMode({ kind: 'list' })}
        />
      ) : (
        <>
          <SectionLabel>Para responder</SectionLabel>
          {pending.length === 0 ? (
            <Card>
              <ThemedText type="default" style={styles.muted}>
                Tudo respondido. Obrigada!
              </ThemedText>
            </Card>
          ) : (
            pending.map((item) => (
              <PendingCard
                key={item.id}
                questionnaire={item}
                onStart={() => setMode({ kind: 'answering', id: item.id })}
              />
            ))
          )}

          {answered.length > 0 ? (
            <>
              <SectionLabel>Respondidos</SectionLabel>
              <Card>
                {answered.map((item) => (
                  <View
                    key={item.id}
                    style={styles.answered}
                    accessible
                    accessibilityLabel={`${item.title}. Respondido em ${formatDate(item.answeredAt!)}`}>
                    <SymbolView
                      name={{
                        ios: 'checkmark.circle.fill',
                        android: 'check_circle',
                        web: 'check_circle',
                      }}
                      tintColor={Tokens.color.brand}
                      size={22}
                    />
                    <View style={styles.answeredCopy}>
                      <ThemedText type="smallBold" style={styles.text}>
                        {item.title}
                      </ThemedText>
                      <ThemedText type="small" style={styles.muted}>
                        {`Respondido em ${formatDate(item.answeredAt!)}`}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </PageScreen>
  );
}

function PendingCard({
  questionnaire,
  onStart,
}: {
  questionnaire: Questionnaire;
  onStart: () => void;
}) {
  const count = questionnaire.questions.length;
  return (
    <Card style={styles.row}>
      <IconBadge
        name={{ ios: 'list.bullet.clipboard', android: 'assignment', web: 'assignment' }}
        tone="purple"
        size={46}
      />
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          {questionnaire.title}
        </ThemedText>
        <ThemedText type="small" style={styles.muted}>
          {questionnaire.description}
        </ThemedText>
        <View style={styles.rowAction}>
          <ThemedText type="small" style={styles.muted}>
            {`${count} ${count === 1 ? 'pergunta' : 'perguntas'} · ${minutesLabel(
              questionnaire.estimatedMinutes
            )}`}
          </ThemedText>
          <GradientButton
            label="Responder"
            accessibilityLabel={`Responder ${questionnaire.title}`}
            size="small"
            onPress={onStart}
          />
        </View>
      </View>
    </Card>
  );
}

function Done({
  safetyTriggered,
  next,
  onNext,
  onBack,
}: {
  safetyTriggered: boolean;
  next: Questionnaire | null;
  onNext: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <IconBadge
        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
        tone="green"
        size={52}
      />
      <ThemedText type="subtitle" style={styles.doneTitle}>
        Respostas registradas
      </ThemedText>
      <ThemedText type="default" style={styles.muted}>
        Obrigada por responder. Nesta versão de demonstração, suas respostas ficam só neste
        aparelho e ainda não chegam ao Dr. Aldo.
      </ThemedText>
      {safetyTriggered ? <EmergencyCard /> : null}
      {next ? (
        <GradientButton label={`Próximo: ${next.title}`} onPress={() => onNext(next.id)} />
      ) : null}
      <OutlineButton label="Voltar aos questionários" onPress={onBack} />
    </Card>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: Tokens.color.muted,
  },
  text: {
    color: Tokens.color.text,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 234, 253, 0.9)',
  },
  noticeText: {
    flex: 1,
    color: Tokens.color.brandDeep,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  cardTitle: {
    color: Tokens.color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  answered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  answeredCopy: {
    flex: 1,
    gap: 2,
  },
  doneTitle: {
    color: Tokens.color.text,
    fontSize: 24,
    lineHeight: 30,
  },
});
