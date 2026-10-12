import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconBadge } from '@/components/ui/icon-badge';
import { Shadows, Tokens } from '@/constants/theme';
import { FollowUp } from '@/utils/appointments';

type Props = {
  followUp: FollowUp;
  onPress: () => void;
};

const titles: Record<FollowUp['kind'], string> = {
  following: 'Em acompanhamento',
  late: 'Retorno atrasado',
  soon: 'Consulta próxima',
};

const icons: Record<FollowUp['kind'], SymbolViewProps['name']> = {
  following: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  late: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  soon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
};

const dayCount = (days: number) => (days === 1 ? '1 dia' : `${days} dias`);

// Cada linha do cartão: o texto, com o número de dias em destaque.
type Line = { before?: string; strong: string; after?: string };

function linesFor(followUp: FollowUp): Line[] {
  if (followUp.kind === 'soon') {
    const { daysUntil } = followUp;
    if (daysUntil === 0) return [{ before: 'Consulta ', strong: 'hoje' }];
    if (daysUntil === 1) return [{ before: 'Consulta ', strong: 'amanhã' }];
    return [{ before: 'Consulta em ', strong: dayCount(daysUntil) }];
  }
  const { daysSince, daysUntil } = followUp;
  const lines: Line[] = [
    daysSince === 0
      ? { strong: 'Sua última consulta foi hoje' }
      : { strong: dayCount(daysSince), after: ' desde sua última consulta' },
  ];
  if (daysUntil !== null)
    lines.push({ before: 'Próxima consulta em ', strong: dayCount(daysUntil) });
  else if (followUp.kind === 'late') lines.push({ strong: 'Marque o retorno com a Patrícia' });
  return lines;
}

// "Agora: Em acompanhamento · 8 dias desde sua última consulta", "Agora:
// Retorno atrasado" ou "Agora: Consulta próxima · Consulta em 7 dias".
export function FollowUpCard({ followUp, onPress }: Props) {
  const lines = linesFor(followUp);
  const label = [
    `Agora: ${titles[followUp.kind]}`,
    ...lines.map((line) => `${line.before ?? ''}${line.strong}${line.after ?? ''}`),
  ].join('. ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <IconBadge name={icons[followUp.kind]} tone="purple" size={46} />
      <View style={styles.copy}>
        <ThemedText type="small" style={styles.title}>
          <ThemedText type="smallBold" style={styles.title}>
            Agora:{' '}
          </ThemedText>
          {titles[followUp.kind]}
        </ThemedText>
        {lines.map((line) => (
          <ThemedText key={line.strong} type="small" style={styles.muted}>
            {line.before}
            <ThemedText type="smallBold" style={styles.days}>
              {line.strong}
            </ThemedText>
            {line.after}
          </ThemedText>
        ))}
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
