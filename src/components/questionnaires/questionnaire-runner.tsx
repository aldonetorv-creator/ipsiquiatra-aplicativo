import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EmergencyCard } from '@/components/questionnaires/emergency-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import {
  QUESTIONNAIRE_TEXT_MAX_LENGTH,
  Questionnaire,
  QuestionnaireAnswers,
  QuestionnaireQuestion,
} from '@/contracts/platform';

type Props = {
  questionnaire: Questionnaire;
  // Devolve a mensagem de erro, ou null se as respostas foram registradas.
  onSubmit: (answers: QuestionnaireAnswers) => Promise<string | null>;
  onExit: () => void;
};

// Item de segurança respondido acima da primeira opção ("Nunca ou quase nunca").
export function needsSafetyHelp(question: QuestionnaireQuestion, answer: string | undefined) {
  return (
    question.type === 'scale' &&
    question.safety === true &&
    answer !== undefined &&
    question.options.indexOf(answer) > 0
  );
}

// Uma pergunta por vez, como no pacote passo a passo da plataforma.
export function QuestionnaireRunner({ questionnaire, onSubmit, onExit }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = questionnaire.questions.length;
  const question = questionnaire.questions[step];
  const answer = answers[question.id] ?? '';
  const isLast = step === total - 1;
  const canAdvance = !question.required || answer.trim().length > 0;

  const choose = (value: string) => {
    setError(null);
    setAnswers((current) => ({ ...current, [question.id]: value }));
  };

  const next = async () => {
    if (!canAdvance || sending) return;
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    setSending(true);
    const failure = await onSubmit(answers);
    setSending(false);
    setError(failure);
  };

  return (
    <Card>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          {questionnaire.title}
        </ThemedText>
        <ThemedText type="small" style={styles.muted}>
          {`Pergunta ${step + 1} de ${total}`}
        </ThemedText>
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: total, now: step + 1 }}>
          <View style={[styles.progress, { width: `${((step + 1) / total) * 100}%` }]} />
        </View>
      </View>

      <ThemedText type="default" style={styles.prompt}>
        {question.prompt}
      </ThemedText>

      {question.type === 'scale' ? (
        <View style={styles.options} accessibilityRole="radiogroup">
          {question.options.map((option) => {
            const selected = answer === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={option}
                accessibilityState={{ selected }}
                onPress={() => choose(option)}
                style={[styles.option, selected && styles.optionSelected]}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <ThemedText type="default" style={styles.optionText}>
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.textBox}>
          <TextInput
            value={answer}
            onChangeText={choose}
            placeholder="Escreva aqui…"
            placeholderTextColor={Tokens.color.muted}
            multiline
            maxLength={QUESTIONNAIRE_TEXT_MAX_LENGTH}
            accessibilityLabel={question.prompt}
            style={styles.input}
          />
          <ThemedText type="small" style={styles.counter}>
            {`${answer.length}/${QUESTIONNAIRE_TEXT_MAX_LENGTH}`}
          </ThemedText>
        </View>
      )}

      {needsSafetyHelp(question, answers[question.id]) ? <EmergencyCard /> : null}

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.action}>
          <OutlineButton
            label={step === 0 ? 'Sair' : 'Voltar'}
            accessibilityLabel={step === 0 ? 'Sair sem enviar' : 'Pergunta anterior'}
            onPress={() => (step === 0 ? onExit() : setStep(step - 1))}
          />
        </View>
        <View style={styles.action}>
          <GradientButton
            label={isLast ? 'Enviar' : 'Próxima'}
            onPress={next}
            disabled={!canAdvance || sending}
            chevron={!isLast}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  title: {
    color: Tokens.color.brand,
  },
  muted: {
    color: Tokens.color.muted,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: Tokens.color.brandSoft,
  },
  progress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Tokens.color.brand,
  },
  prompt: {
    color: Tokens.color.text,
    fontSize: 19,
    lineHeight: 27,
    fontWeight: 600,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Tokens.color.border,
    backgroundColor: Tokens.color.surface,
  },
  optionSelected: {
    borderColor: Tokens.color.brand,
    backgroundColor: Tokens.color.brandSoft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Tokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Tokens.color.brand,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Tokens.color.brand,
  },
  optionText: {
    flex: 1,
    color: Tokens.color.text,
  },
  textBox: {
    gap: 4,
  },
  input: {
    minHeight: 120,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Tokens.color.border,
    backgroundColor: Tokens.color.surface,
    color: Tokens.color.text,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    color: Tokens.color.muted,
    fontSize: 12,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
