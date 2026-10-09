import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { MoodNoteSheet } from './mood-note-sheet';
import { moodOptions } from './mood-options';

import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/ui/gradient-button';
import { Tokens } from '@/constants/theme';
import { MoodCheckMessage, MoodLevel } from '@/contracts/platform';
import { formatTime } from '@/utils/time';

type Props = {
  message: MoodCheckMessage;
  onSubmit: (level: MoodLevel, note: string | null) => Promise<string | null>;
};

export function MoodCheckCard({ message, onSubmit }: Props) {
  const [selected, setSelected] = useState<MoodLevel | null>(null);
  const [note, setNote] = useState('');
  const [writing, setWriting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = message.answer !== null;
  const current = message.answer ?? selected;

  const submit = async () => {
    if (selected === null || sending) return;
    setSending(true);
    setError(null);
    const failure = await onSubmit(selected, note.trim() ? note : null);
    setSending(false);
    if (failure) setError(failure);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText type="smallBold" style={styles.title}>
            Diário de humor
          </ThemedText>
          <ThemedText type="small" style={styles.muted}>
            {message.text}
          </ThemedText>
        </View>
        <ThemedText type="small" style={styles.time}>
          {formatTime(message.sentAt)}
        </ThemedText>
      </View>

      <View style={styles.options} accessibilityRole="radiogroup">
        {moodOptions.map((option) => {
          const isSelected = current === option.level;
          return (
            <Pressable
              key={option.level}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isSelected, disabled: answered }}
              disabled={answered}
              onPress={() => setSelected(option.level)}
              style={[styles.option, answered && !isSelected && styles.optionFaded]}>
              <View
                style={[
                  styles.face,
                  { backgroundColor: option.tint },
                  isSelected && styles.faceSelected,
                ]}>
                <ThemedText style={styles.faceText}>{option.face}</ThemedText>
              </View>
              <ThemedText type="small" style={styles.optionLabel}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <ThemedText type="smallBold" style={styles.done}>
          Registrado
        </ThemedText>
      ) : (
        <>
          {/* Abre o diário numa janela própria, onde o texto pode ser corrigido à vontade. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={note ? 'Editar o texto do diário' : 'Escrever no diário de humor'}
            onPress={() => setWriting(true)}
            style={({ pressed }) => [styles.noteBox, pressed && styles.pressed]}>
            <ThemedText
              type="small"
              style={note ? styles.noteText : styles.notePlaceholder}
              numberOfLines={3}>
              {note || 'Quer me contar um pouco mais? (opcional)'}
            </ThemedText>
            <SymbolView
              name={{ ios: 'square.and.pencil', android: 'edit', web: 'edit' }}
              tintColor={Tokens.color.brand}
              size={18}
            />
          </Pressable>
          <MoodNoteSheet
            visible={writing}
            level={selected}
            note={note}
            onCancel={() => setWriting(false)}
            onDone={(text) => {
              setNote(text);
              setWriting(false);
            }}
          />
          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}
          <View style={styles.submit}>
            <GradientButton
              label="Registrar"
              size="small"
              chevron={false}
              disabled={selected === null || sending}
              onPress={submit}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Tokens.color.surface,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: Tokens.color.border,
    padding: 14,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 16,
  },
  muted: {
    color: Tokens.color.muted,
  },
  time: {
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  optionFaded: {
    opacity: 0.35,
  },
  face: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  faceSelected: {
    borderColor: Tokens.color.brand,
  },
  faceText: {
    fontSize: 22,
    lineHeight: 28,
  },
  optionLabel: {
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minHeight: 56,
    borderWidth: 1,
    borderColor: Tokens.color.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  noteText: {
    flex: 1,
    color: Tokens.color.text,
    fontSize: 15,
  },
  notePlaceholder: {
    flex: 1,
    color: Tokens.color.muted,
    fontSize: 15,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
  submit: {
    alignSelf: 'flex-end',
  },
  done: {
    alignSelf: 'flex-end',
    color: Tokens.color.brand,
  },
});
