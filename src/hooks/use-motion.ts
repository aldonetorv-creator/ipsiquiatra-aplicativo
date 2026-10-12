import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

// Preferências do sistema que mudam as animações (história de boas-vindas,
// folhas que sobem de baixo).
function useSystemFlag(
  read: () => Promise<boolean>,
  event: 'reduceMotionChanged' | 'screenReaderChanged'
) {
  const [value, setValue] = useState(false);
  useEffect(() => {
    let active = true;
    read()
      .then((enabled) => active && setValue(enabled))
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(event, setValue);
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [read, event]);
  return value;
}

const readReduceMotion = () => AccessibilityInfo.isReduceMotionEnabled();
// Na web não dá para saber se há leitor de tela (a função sempre diz que sim).
const readScreenReader = () =>
  Platform.OS === 'web' ? Promise.resolve(false) : AccessibilityInfo.isScreenReaderEnabled();

export const useReduceMotion = () => useSystemFlag(readReduceMotion, 'reduceMotionChanged');
export const useScreenReader = () => useSystemFlag(readScreenReader, 'screenReaderChanged');

// Valor de 0 a 1 que anda uma vez ao montar (entrada de um elemento).
export function useEntrance(duration = 700, delay = 0) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [value, duration, delay]);
  return value;
}

// Vai e volta de 0 a 1 sem parar, como uma respiração. Parado com "reduzir
// movimento" ligado.
export function useBreathing(period = 4200) {
  const reduceMotion = useReduceMotion();
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) return;
    const half = { duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true };
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, ...half }),
        Animated.timing(value, { toValue: 0, ...half }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value, period, reduceMotion]);
  return value;
}

// Trecho de uma entrada: de `from` a `to` do caminho total, sem passar de 0 e 1.
export const segment = (value: Animated.Value, from: number, to: number) =>
  value.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' });
