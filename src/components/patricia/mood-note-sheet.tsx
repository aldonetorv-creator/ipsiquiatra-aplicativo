import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { moodOption } from './mood-options';

import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { MOOD_NOTE_MAX_LENGTH, MoodLevel } from '@/contracts/platform';

type Props = {
  visible: boolean;
  level: MoodLevel | null;
  note: string;
  // "Concluir" devolve o texto; "Cancelar" descarta o que mudou desde que abriu.
  onDone: (note: string) => void;
  onCancel: () => void;
};

// Diário de humor: o texto é escrito numa janela própria, fora da lista
// invertida da conversa. Dentro dela (desenhada de cabeça para baixo e
// desvirada), o celular atrapalhava o cursor e a correção do texto.
export function MoodNoteSheet({ visible, level, note, onDone, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      {/* Montado só enquanto aberto: cada abertura começa do texto atual. */}
      {visible ? <Sheet level={level} note={note} onDone={onDone} onCancel={onCancel} /> : null}
    </Modal>
  );
}

function Sheet({ level, note, onDone, onCancel }: Omit<Props, 'visible'>) {
  const [draft, setDraft] = useState(note);
  const option = level ? moodOption(level) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Fechar o diário sem salvar"
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          {option ? (
            <View style={[styles.face, { backgroundColor: option.tint }]}>
              <ThemedText style={styles.faceText}>{option.face}</ThemedText>
            </View>
          ) : null}
          <View style={styles.headerCopy}>
            <ThemedText type="smallBold" style={styles.title}>
              Diário de humor
            </ThemedText>
            <ThemedText type="small" style={styles.muted}>
              {option ? `Hoje: ${option.label}` : 'Quer me contar um pouco mais?'}
            </ThemedText>
          </View>
        </View>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Quer me contar um pouco mais? (opcional)"
          placeholderTextColor={Tokens.color.muted}
          maxLength={MOOD_NOTE_MAX_LENGTH}
          multiline
          autoFocus
          style={styles.input}
          accessibilityLabel="Texto do diário de humor"
        />
        <ThemedText type="small" style={styles.counter}>
          {draft.length}/{MOOD_NOTE_MAX_LENGTH}
        </ThemedText>

        <View style={styles.actions}>
          <View style={styles.action}>
            <OutlineButton label="Cancelar" onPress={onCancel} />
          </View>
          <View style={styles.action}>
            <GradientButton label="Concluir" chevron={false} onPress={() => onDone(draft)} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(22, 16, 48, 0.45)',
  },
  sheet: {
    gap: 12,
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Tokens.color.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Tokens.color.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  face: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceText: {
    fontSize: 22,
    lineHeight: 28,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Tokens.color.brand,
    fontSize: 18,
    lineHeight: 24,
  },
  muted: {
    color: Tokens.color.muted,
  },
  input: {
    minHeight: 160,
    maxHeight: 280,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Tokens.color.brandBorder,
    backgroundColor: Tokens.color.surface,
    color: Tokens.color.text,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: -6,
    color: Tokens.color.muted,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
