import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { PatriciaAvatar } from '@/components/patricia/patricia-avatar';
import { ThemedText } from '@/components/themed-text';
import { Shadows, Tokens } from '@/constants/theme';
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
      <View style={styles.avatarRing}>
        <PatriciaAvatar size={68} zoomable />
      </View>
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
        <ThemedText type="small" style={styles.role}>
          Assistente do Dr. Aldo
        </ThemedText>
        <ThemedText type="default" style={styles.preview} numberOfLines={2}>
          {lastMessage ? lastMessage.text : 'Estou aqui para ajudar com o seu cuidado.'}
        </ThemedText>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={Tokens.color.brand}
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(225, 228, 242, 0.7)',
    backgroundColor: Tokens.color.surface,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Tokens.color.brandBorder,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    color: Tokens.color.brand,
    fontSize: 20,
    lineHeight: 26,
  },
  time: {
    color: Tokens.color.muted,
    fontSize: 13,
  },
  role: {
    color: Tokens.color.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  preview: {
    marginTop: 4,
    color: Tokens.color.text,
    fontSize: 15,
    lineHeight: 21,
  },
});
