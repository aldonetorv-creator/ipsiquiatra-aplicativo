import { ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tokens } from '@/constants/theme';
import { useEntrance } from '@/hooks/use-motion';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

// Folha branca que sobe de baixo sobre a tela escurecida. Tocar fora, ou no
// voltar do Android, fecha.
export function BottomSheet({ visible, onClose, children }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
        />
        <Sheet>{children}</Sheet>
      </View>
    </Modal>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  const enter = useEntrance(360);
  const { bottom } = useSafeAreaInsets();

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[
        styles.sheet,
        {
          paddingBottom: 24 + bottom,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [96, 0] }) },
          ],
        },
      ]}>
      <View style={styles.grabber} />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16, 10, 40, 0.45)',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 14,
    paddingTop: 10,
    paddingHorizontal: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Tokens.color.surface,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 6,
    backgroundColor: Tokens.color.border,
  },
});
