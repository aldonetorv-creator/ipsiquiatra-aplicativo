import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';

type Props = {
  size?: number;
  // Tocar na foto abre a Patrícia em tamanho grande.
  zoomable?: boolean;
};

export function PatriciaAvatar({ size = 40, zoomable = false }: Props) {
  const [open, setOpen] = useState(false);
  const image = (
    <Image
      source={require('@/assets/images/patricia.webp')}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      contentFit="cover"
      accessibilityLabel={zoomable ? undefined : 'Foto da Patrícia'}
    />
  );

  if (!zoomable) return image;

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Ver foto da Patrícia"
        onPress={() => setOpen(true)}
        hitSlop={6}>
        {image}
      </Pressable>
      <PatriciaPhotoViewer visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function PatriciaPhotoViewer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar foto da Patrícia">
        <View style={styles.frame}>
          <Image
            source={require('@/assets/images/patricia-large.webp')}
            style={styles.photo}
            contentFit="contain"
            accessibilityLabel="Foto da Patrícia, assistente do Dr. Aldo"
          />
          <ThemedText type="subtitle" style={styles.name}>
            Patrícia
          </ThemedText>
          <ThemedText type="default" style={styles.role}>
            Assistente do Dr. Aldo
          </ThemedText>
        </View>
        <View style={styles.close}>
          <ThemedText type="smallBold" style={styles.closeText}>
            Fechar
          </ThemedText>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 24,
    backgroundColor: 'rgba(22, 16, 48, 0.88)',
  },
  frame: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 4,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    marginBottom: 16,
  },
  name: {
    color: Tokens.color.onBrand,
    fontSize: 28,
    lineHeight: 34,
  },
  role: {
    color: '#D9CCFA',
  },
  close: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  closeText: {
    color: Tokens.color.onBrand,
  },
});
