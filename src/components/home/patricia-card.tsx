import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { PatriciaAvatar } from '@/components/patricia/patricia-avatar';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { ConversationMessage } from '@/contracts/platform';
import { formatRelative } from '@/utils/time';

type Props = {
  lastMessage: ConversationMessage | null;
  onPress: () => void;
};

export function PatriciaCard({ lastMessage, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir conversa com a Patrícia"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <PatriciaAvatar size={60} />
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold" style={styles.name}>
            Patrícia
          </ThemedText>
          {lastMessage ? (
            <ThemedText type="small" style={styles.time}>
              {formatRelative(lastMessage.sentAt)}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="small" style={styles.preview} numberOfLines={2}>
          {lastMessage ? lastMessage.text : 'Assistente do Dr. Aldo'}
        </ThemedText>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={Tokens.color.muted}
        size={20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Tokens.color.border,
    backgroundColor: Tokens.color.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    color: Tokens.color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  time: {
    color: Tokens.color.muted,
    fontSize: 13,
  },
  preview: {
    color: Tokens.color.muted,
    fontSize: 15,
    lineHeight: 21,
  },
});
