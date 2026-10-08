import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Gradients, Tokens } from '@/constants/theme';
import { Doctor } from '@/contracts/platform';

// Foto do médico (a mesma do "Perfil médico" na plataforma) ou, sem foto, as
// iniciais no degradê da marca.
export function DoctorAvatar({ doctor, size = 48 }: { doctor: Doctor; size?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (doctor.photoUrl) {
    return (
      <Image
        source={{ uri: doctor.photoUrl }}
        style={[styles.photo, shape]}
        contentFit="cover"
        accessibilityLabel={`Foto de ${doctor.name}`}
      />
    );
  }
  const initials = doctor.name
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
      style={[styles.initialsBox, shape]}>
      <ThemedText
        type="smallBold"
        style={[styles.initials, { fontSize: size * 0.36, lineHeight: size * 0.46 }]}>
        {initials}
      </ThemedText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: Tokens.color.surfaceMuted,
  },
  initialsBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Tokens.color.onBrand,
  },
});
