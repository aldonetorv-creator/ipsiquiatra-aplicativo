import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

// Botão secundário com contorno azul, ao lado do botão em degradê.
export function OutlineButton({ label, onPress, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Tokens.color.blueBorder,
    backgroundColor: Tokens.color.surface,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    color: Tokens.color.blue,
    fontSize: 16,
  },
});
