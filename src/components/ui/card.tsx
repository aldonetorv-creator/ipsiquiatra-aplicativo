import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { Shadows, Tokens } from '@/constants/theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(225, 228, 242, 0.7)',
    backgroundColor: Tokens.color.surface,
    boxShadow: Shadows.card,
  },
});
