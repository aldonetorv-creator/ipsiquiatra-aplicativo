import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Tokens } from '@/constants/theme';

type Props = {
  name: SymbolViewProps['name'];
  tone?: 'blue' | 'purple' | 'green';
  size?: number;
};

const tones = {
  blue: { background: Tokens.color.blueSoft, tint: Tokens.color.blue },
  purple: { background: Tokens.color.brandSoft, tint: Tokens.color.brand },
  green: { background: '#E6F4EE', tint: '#2E7D5B' },
};

// Ícone dentro de um círculo colorido, como nos cartões dos mockups.
export function IconBadge({ name, tone = 'blue', size = 48 }: Props) {
  const colors = tones[tone];
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background },
      ]}>
      <SymbolView name={name} tintColor={colors.tint} size={Math.round(size * 0.5)} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
