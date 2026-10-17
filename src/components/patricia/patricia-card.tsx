import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PatriciaForm, PatriciaFormSheet } from './patricia-form-sheet';

import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { PatriciaCardAction, PatriciaCardMessage, PatriciaCardOutcome } from '@/contracts/platform';
import { patriciaTexts } from '@/services/patricia-live';

type Props = {
  message: PatriciaCardMessage;
  busy: boolean;
  onAnswerTerms: (accept: boolean) => Promise<string | null>;
  onAction: (action: PatriciaCardAction) => Promise<PatriciaCardOutcome | string>;
};

// Cartões da Patrícia real, os mesmos do chat do site: o termo, confirmar a
// consulta, a remarcação ou o cancelamento, a identificação e o relato sem IA.
// Com o paciente identificado pelo login, a consulta se confirma direto no
// cartão, sem formulário (os dados vêm do cadastro).
export function PatriciaCard({ message, busy, onAnswerTerms, onAction }: Props) {
  const [form, setForm] = useState<PatriciaForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const remaining = useHoldCountdown(message);
  const { card } = message;
  const open = message.status === 'open';

  const run = async (action: PatriciaCardAction) => {
    setError(null);
    const result = await onAction(action);
    if (typeof result === 'string') setError(result);
  };
  const answer = async (accept: boolean) => {
    setError(await onAnswerTerms(accept));
  };

  let facts: [string, string][] = [];
  let hint: string | null = null;
  let actions = null;

  if (card.type === 'consent') {
    hint = patriciaTexts.consent;
    actions = (
      <>
        <GradientButton
          label="Concordo e continuar"
          chevron={false}
          disabled={busy}
          onPress={() => answer(true)}
        />
        <OutlineButton label="Não concordo" onPress={() => !busy && answer(false)} />
      </>
    );
  } else if (card.type === 'booking') {
    const { confirm } = card;
    facts = [
      ['Quando', confirm.when],
      ...(confirm.modalityLabel
        ? ([['Atendimento', confirm.modalityLabel]] as [string, string][])
        : []),
      ...(confirm.where ? ([['Local', confirm.where]] as [string, string][]) : []),
    ];
    actions = (
      <>
        {card.identified ? (
          <GradientButton
            label="Confirmar consulta"
            chevron={false}
            disabled={busy || remaining === 0}
            onPress={() => run({ type: 'confirm' })}
          />
        ) : (
          <GradientButton
            label="Preencher e confirmar"
            chevron={false}
            disabled={busy || remaining === 0}
            onPress={() =>
              setForm({
                kind: 'booking',
                path: confirm.declared === 'paciente' ? 'paciente' : 'primeira',
                when: confirm.when,
              })
            }
          />
        )}
        <OutlineButton label="Trocar horário" onPress={() => !busy && run({ type: 'release' })} />
      </>
    );
  } else if (card.type === 'reschedule') {
    facts = [
      ['Consulta atual', card.confirm.from],
      ['Novo horário', card.confirm.when],
    ];
    actions = (
      <>
        <GradientButton
          label="Confirmar remarcação"
          chevron={false}
          disabled={busy || remaining === 0}
          onPress={() => run({ type: 'confirm' })}
        />
        <OutlineButton label="Trocar horário" onPress={() => !busy && run({ type: 'release' })} />
      </>
    );
  } else if (card.type === 'cancel') {
    facts = [['Consulta', card.confirm.when]];
    hint = 'Ao cancelar, o horário volta para a agenda da clínica.';
    actions = (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => run({ type: 'confirm' })}
          style={({ pressed }) => [styles.danger, (pressed || busy) && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.dangerText}>
            Cancelar consulta
          </ThemedText>
        </Pressable>
        <OutlineButton label="Manter consulta" onPress={() => !busy && run({ type: 'keep' })} />
      </>
    );
  } else if (card.type === 'identify') {
    hint = 'Para a sua segurança, confirme os seus dados e informe qual consulta você quer mudar.';
    actions = (
      <>
        <GradientButton
          label="Preencher dados"
          chevron={false}
          disabled={busy}
          onPress={() => setForm({ kind: 'identify', action: card.action })}
        />
        <OutlineButton label="Agora não" onPress={() => !busy && run({ type: 'keep' })} />
      </>
    );
  } else {
    hint = 'O texto vai direto para a equipe da clínica, sem passar por inteligência artificial.';
    actions = (
      <GradientButton
        label="Escrever relato"
        chevron={false}
        disabled={busy}
        onPress={() => setForm({ kind: 'report', identified: card.identified === true })}
      />
    );
  }

  const title = card.type === 'identify' ? `Identificação para ${card.action}` : message.text;

  return (
    <View
      style={[styles.card, !open && styles.cardClosed]}
      accessibilityLabel={`${title}${open ? '' : `. ${message.note ?? ''}`}`}>
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      {facts.map(([term, value]) => (
        <View key={term} style={styles.fact}>
          <ThemedText type="small" style={styles.term}>
            {term}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.value}>
            {value}
          </ThemedText>
        </View>
      ))}
      {open && hint ? (
        <ThemedText type="small" style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
      {open && remaining !== null ? (
        <ThemedText type="small" style={styles.hint}>
          {remaining > 0
            ? `Horário reservado para você por mais ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}.`
            : 'O tempo da reserva terminou. Peça novos horários à Patrícia.'}
        </ThemedText>
      ) : null}
      {open ? <View style={styles.actions}>{actions}</View> : null}
      {!open && message.note ? (
        <ThemedText type="small" style={styles.note}>
          {message.note}
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {error}
        </ThemedText>
      ) : null}
      <PatriciaFormSheet form={form} onSubmit={onAction} onClose={() => setForm(null)} />
    </View>
  );
}

// Segundos que faltam da reserva do horário (10 minutos no servidor); null
// quando o cartão não reserva horário.
function useHoldCountdown(message: PatriciaCardMessage) {
  const { card } = message;
  const seconds =
    (card.type === 'booking' || card.type === 'reschedule') && message.status === 'open'
      ? (card.confirm.expiresInSec ?? 600)
      : null;
  const endsAt = seconds === null ? 0 : new Date(message.sentAt).getTime() + seconds * 1000;
  const left = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(() => (seconds === null ? null : left()));

  useEffect(() => {
    if (seconds === null) return;
    const timer = setInterval(() => setRemaining(left()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, endsAt]);

  return seconds === null ? null : remaining;
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Tokens.color.brandBorder,
    backgroundColor: Tokens.color.surface,
  },
  cardClosed: {
    borderColor: Tokens.color.border,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  title: {
    color: Tokens.color.brand,
  },
  fact: {
    gap: 2,
  },
  term: {
    color: Tokens.color.muted,
  },
  value: {
    color: Tokens.color.text,
  },
  hint: {
    color: Tokens.color.muted,
  },
  note: {
    color: Tokens.color.text,
  },
  actions: {
    gap: 8,
  },
  danger: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#B3263B',
  },
  dangerText: {
    color: Tokens.color.onBrand,
  },
  pressed: {
    opacity: 0.6,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
});
