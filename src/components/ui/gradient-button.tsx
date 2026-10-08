import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Gradients, Shadows, Tokens } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  size?: 'regular' | 'small';
  disabled?: boolean;
  chevron?: boolean;
  accessibilityLabel?: string;
};

// Botão principal em degradê azul → roxo, como nos mockups.
export function GradientButton({
  label,
  onPress,
  size = 'regular',
  disabled = false,
  chevron = true,
  accessibilityLabel,
}: Props) {
  const small = size === 'small';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        small && styles.pressableSmall,
        (pressed || disabled) && styles.dimmed,
      ]}>
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.gradient, small && styles.gradientSmall]}>
        <ThemedText type="smallBold" style={[styles.label, small && styles.labelSmall]}>
          {label}
        </ThemedText>
        {chevron ? (
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={Tokens.color.onBrand}
            size={small ? 16 : 18}
          />
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 16,
    boxShadow: Shadows.floating,
  },
  pressableSmall: {
    alignSelf: 'flex-start',
    borderRadius: 12,
  },
  dimmed: {
    opacity: 0.6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  gradientSmall: {
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  label: {
    color: Tokens.color.onBrand,
    fontSize: 16,
  },
  labelSmall: {
    fontSize: 14,
  },
});
