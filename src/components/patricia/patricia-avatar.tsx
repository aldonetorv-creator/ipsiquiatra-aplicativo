import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

export function PatriciaAvatar({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/patricia.webp')}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      contentFit="cover"
      accessibilityLabel="Foto da Patrícia"
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
  },
});
