import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { Tokens } from '@/constants/theme';

const HOLD = 120;
const FADE = 300;
// Se o app demorar para ficar pronto, a abertura some assim mesmo.
const MAX_WAIT = 3000;

// `ready`: some só quando o app estiver pronto (ex.: sessão do paciente lida).
export function AnimatedSplashOverlay({ ready = true }: { ready?: boolean }) {
  const [visible, setVisible] = useState(true);
  const [shown, setShown] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT);
    return () => clearTimeout(timer);
  }, [shown]);

  useEffect(() => {
    if (!shown || !(ready || timedOut)) return;
    Animated.timing(opacity, {
      toValue: 0,
      delay: HOLD,
      duration: FADE,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [shown, ready, timedOut, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => setShown(true));
      }}
      style={[styles.splashOverlay, { opacity }]}>
      <StatusBar style="light" />
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
  // Mesmo roxo do splash nativo (backgroundColor em app.json) e da história de
  // boas-vindas: a abertura continua no roxo até a tela de entrar.
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Tokens.color.brandDeep,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
