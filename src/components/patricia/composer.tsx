import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Gradients, Shadows, Tokens } from '@/constants/theme';
import { MESSAGE_MAX_LENGTH } from '@/contracts/platform';

type Props = {
  onSend: (text: string) => Promise<string | null>;
  onFocusChange?: (focused: boolean) => void;
  // Botão "+" à esquerda: mostra ou esconde os atalhos "Posso ajudar você com".
  shortcutsOpen?: boolean;
  onToggleShortcuts?: () => void;
};

export function Composer({
  onSend,
  onFocusChange,
  shortcutsOpen = false,
  onToggleShortcuts,
}: Props) {
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
        {onToggleShortcuts ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shortcutsOpen ? 'Esconder atalhos' : 'Mostrar atalhos'}
            accessibilityState={{ expanded: shortcutsOpen }}
            onPress={onToggleShortcuts}
            hitSlop={6}
            style={({ pressed }) => [
              styles.plus,
              shortcutsOpen && styles.plusOpen,
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={
                shortcutsOpen
                  ? { ios: 'xmark', android: 'close', web: 'close' }
                  : { ios: 'plus', android: 'add', web: 'add' }
              }
              tintColor={shortcutsOpen ? Tokens.color.onBrand : Tokens.color.brand}
              size={22}
            />
          </Pressable>
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Digite sua mensagem..."
          placeholderTextColor={Tokens.color.muted}
          maxLength={MESSAGE_MAX_LENGTH}
          multiline
          style={styles.input}
          accessibilityLabel="Mensagem para a Patrícia"
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={send}
          style={[styles.send, !canSend && styles.sendDisabled]}>
          <LinearGradient
            colors={Gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendGradient}>
            <SymbolView
              name={{ ios: 'paperplane.fill', android: 'send', web: 'send' }}
              tintColor={Tokens.color.onBrand}
              size={20}
            />
          </LinearGradient>
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
  plus: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Tokens.color.brandBorder,
    backgroundColor: Tokens.color.brandSoft,
  },
  plusOpen: {
    borderColor: Tokens.color.brand,
    backgroundColor: Tokens.color.brand,
  },
  pressed: {
    opacity: 0.6,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    boxShadow: Shadows.floating,
  },
  sendGradient: {
    flex: 1,
    borderRadius: 23,
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
