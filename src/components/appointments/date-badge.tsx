import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { dateBadge } from '@/utils/time';

// Dia e mês da consulta ("05" / "OUT"), como no Cofre dos mockups.
export function DateBadge({ iso }: { iso: string }) {
  const { day, month } = dateBadge(iso);
  return (
    <View style={styles.badge}>
      <ThemedText type="smallBold" style={styles.day}>
        {day}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.month}>
        {month}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 52,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: Tokens.color.blueSoft,
  },
  day: {
    color: Tokens.color.blue,
    fontSize: 20,
    lineHeight: 24,
  },
  month: {
    color: Tokens.color.blue,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
  },
});
