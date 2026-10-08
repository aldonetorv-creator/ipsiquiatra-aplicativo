import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Gradients, Tokens } from '@/constants/theme';

// Iniciais do médico no degradê da marca (sem foto nesta fase).
export function DoctorAvatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .replace(/^Dra?\.\s*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <LinearGradient
      colors={Gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <ThemedText
        type="smallBold"
        style={[styles.initials, { fontSize: size * 0.36, lineHeight: size * 0.46 }]}>
        {initials}
      </ThemedText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Tokens.color.onBrand,
  },
});
