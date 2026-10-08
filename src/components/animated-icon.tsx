import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { Tokens } from '@/constants/theme';

const HOLD = 120;
const FADE = 300;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [opacity] = useState(() => new Animated.Value(1));

  if (!visible) return null;

  return (
    <Animated.View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          Animated.timing(opacity, {
            toValue: 0,
            delay: HOLD,
            duration: FADE,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }).start(() => setVisible(false));
        });
      }}
      style={[styles.splashOverlay, { opacity }]}>
      <Image source={require('@/assets/images/ip-icon.png')} style={styles.brandMark} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Mesmo tamanho da imagem do splash nativo (imageWidth em app.json).
  brandMark: {
    width: 96,
    height: 96,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
