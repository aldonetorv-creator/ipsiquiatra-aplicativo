import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Tokens } from '@/constants/theme';

export function BrandMark() {
  return (
    <View style={styles.shell} accessibilityLabel="iPsiquiatra">
      <Image
        source={require('@/assets/images/ip-icon.png')}
        style={styles.image}
        contentFit="cover"
        transition={120}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Tokens.color.brandDeep,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
