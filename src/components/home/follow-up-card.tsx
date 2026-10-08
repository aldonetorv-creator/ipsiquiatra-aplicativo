import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconBadge } from '@/components/ui/icon-badge';
import { Shadows, Tokens } from '@/constants/theme';

type Props = {
  daysSinceLast: number;
  onPress: () => void;
};

// "Agora: Acompanhamento · 8 dias desde sua última consulta".
export function FollowUpCard({ daysSinceLast, onPress }: Props) {
  const days = daysSinceLast === 1 ? '1 dia' : `${daysSinceLast} dias`;
  const since =
    daysSinceLast === 0 ? 'Sua última consulta foi hoje' : `${days} desde sua última consulta`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Agora: Acompanhamento. ${since}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <IconBadge
        name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
        tone="purple"
        size={46}
      />
      <View style={styles.copy}>
        <ThemedText type="small" style={styles.title}>
          <ThemedText type="smallBold" style={styles.title}>
            Agora:{' '}
          </ThemedText>
          Acompanhamento
        </ThemedText>
        {daysSinceLast === 0 ? (
          <ThemedText type="small" style={styles.muted}>
            {since}
          </ThemedText>
        ) : (
          <ThemedText type="small" style={styles.muted}>
            <ThemedText type="smallBold" style={styles.days}>
              {days}
            </ThemedText>{' '}
            desde sua última consulta
          </ThemedText>
        )}
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
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 17,
    lineHeight: 23,
  },
  muted: {
    color: Tokens.color.muted,
  },
  days: {
    color: Tokens.color.brand,
  },
});
