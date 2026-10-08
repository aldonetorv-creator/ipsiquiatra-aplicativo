import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { MESSAGE_MAX_LENGTH } from '@/contracts/platform';

type Props = {
  onSend: (text: string) => Promise<string | null>;
};

export function Composer({ onSend }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = text.trim().length > 0 && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const failure = await onSend(text);
    setSending(false);
    if (failure) {
      setError(failure);
    } else {
      setText('');
    }
  };

  return (
    <View style={styles.wrapper}>
      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Digite sua mensagem..."
          placeholderTextColor={Tokens.color.muted}
          maxLength={MESSAGE_MAX_LENGTH}
          multiline
          style={styles.input}
          accessibilityLabel="Mensagem para a Patrícia"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={send}
          style={[styles.send, !canSend && styles.sendDisabled]}>
          <SymbolView
            name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
            tintColor={Tokens.color.onBrand}
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: Tokens.color.border,
    backgroundColor: Tokens.color.surface,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    color: Tokens.color.text,
    fontSize: 16,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Tokens.color.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
});
