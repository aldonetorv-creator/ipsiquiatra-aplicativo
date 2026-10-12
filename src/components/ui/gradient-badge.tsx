import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { Gradients } from '@/constants/theme';

// Círculo em degradê azul → roxo (identidade do app), para números e ícones.
export function GradientBadge({ size = 40, children }: { size?: number; children: ReactNode }) {
  return (
    <LinearGradient
      colors={Gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
