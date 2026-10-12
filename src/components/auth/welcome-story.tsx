import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { segment, useEntrance, useScreenReader } from '@/components/auth/story-motion';
import {
  CareVisual,
  PatriciaVisual,
  PlacesVisual,
  StoryBackground,
  VISUAL_HEIGHT,
  VISUAL_WIDTH,
} from '@/components/auth/story-visuals';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';

export const STORY_SLIDE_MS = 5200;
const FADE_OUT_MS = 180;
const SWIPE = 40;

export const storySlides = [
  {
    key: 'cuidado',
    title: 'Tem alguém cuidando de você.',
    subtitle: 'Também entre uma consulta e outra.',
    Visual: CareVisual,
  },
  {
    key: 'patricia',
    title: 'Conheça a Patrícia.',
    subtitle: 'Ela cuida da agenda, dos lembretes e do seu diário de humor.',
    Visual: PatriciaVisual,
  },
  {
    key: 'lugar',
    title: 'Tudo num só lugar.',
    subtitle: 'Consultas, documentos e questionários, com privacidade.',
    Visual: PlacesVisual,
  },
];

// O que o paciente vê antes de entrar: uma história curta, em três quadros que
// passam sozinhos (ou com toque e deslize), e o botão de entrar sempre à mão,
// para quem já conhece não precisar esperar.
export function WelcomeStory({ onEnter }: { onEnter: () => void }) {
  const last = storySlides.length - 1;
  // `index` é o quadro da vez (barras de progresso); `shown` é o que está na
  // tela, que troca depois de o anterior sumir.
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const [fade] = useState(() => new Animated.Value(1));
  // Onde a história está, de 0 a 3: o quadro da vez mais o quanto dele já passou.
  // Cada barra lê o seu trecho, sem trocar de valor animado para fixo.
  const [position] = useState(() => new Animated.Value(0));
  // Medidas da tela e da área da ilustração (a da web só existe depois de montar).
  const [screenWidth, setScreenWidth] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const screenReader = useScreenReader();
  const slide = storySlides[shown];

  const move = useMemo(
    () => (delta: number) => setIndex((current) => Math.max(0, Math.min(last, current + delta))),
    [last]
  );

  // Cada quadro fica alguns segundos e passa para o próximo; o último fica.
  // Com leitor de tela, só passa quando a pessoa pede.
  useEffect(() => {
    if (screenReader) {
      position.setValue(index + 1);
      return;
    }
    position.setValue(index);
    const animation = Animated.timing(position, {
      toValue: index + 1,
      duration: STORY_SLIDE_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) move(1);
    });
    return () => animation.stop();
  }, [index, move, position, screenReader]);

  useEffect(() => {
    if (index === shown) return;
    const animation = Animated.timing(fade, {
      toValue: 0,
      duration: FADE_OUT_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      setShown(index);
      fade.setValue(1);
    });
    return () => animation.stop();
  }, [index, shown, fade]);

  const gestures = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (event, gesture) => {
          if (gesture.dx <= -SWIPE) move(1);
          else if (gesture.dx >= SWIPE) move(-1);
          else if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
            // Toque, como nos stories: no terço da esquerda volta, no resto avança.
            const x = event.nativeEvent.pageX - (screenWidth - area.width) / 2;
            move(x < area.width / 3 ? -1 : 1);
          }
        },
      }),
    [move, screenWidth, area.width]
  );

  // A ilustração se ajusta à tela: diminui para caber e cresce só um pouco.
  const scale =
    area.width > 0 && area.height > 0
      ? Math.min(1.12, (area.width - 32) / VISUAL_WIDTH, area.height / VISUAL_HEIGHT)
      : 1;
  const { Visual } = slide;

  return (
    <View style={styles.root} onLayout={(event) => setScreenWidth(event.nativeEvent.layout.width)}>
      <StatusBar style="light" />
      <StoryBackground />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View
            style={styles.bars}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {storySlides.map((item, i) => (
              <View key={item.key} style={styles.bar}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      transform: [
                        {
                          scaleX: position.interpolate({
                            inputRange: [i, i + 1],
                            outputRange: [0, 1],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.brand}>
            <Image
              source={require('@/assets/images/ip-icon.png')}
              style={styles.brandLogo}
              accessibilityLabel="Logo do iPsiquiatra"
            />
            <ThemedText style={styles.brandName}>iPsiquiatra</ThemedText>
          </View>
        </View>

        <Animated.View
          style={[styles.stage, { opacity: fade }]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${slide.title} ${slide.subtitle}`}
          accessibilityValue={{ text: `${shown + 1} de ${storySlides.length}` }}
          accessibilityActions={[
            { name: 'increment', label: 'Próximo' },
            { name: 'decrement', label: 'Anterior' },
          ]}
          onAccessibilityAction={(event) =>
            move(event.nativeEvent.actionName === 'increment' ? 1 : -1)
          }
          {...gestures.panHandlers}>
          <View
            style={styles.visualArea}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setArea({ width, height });
            }}>
            <View style={{ transform: [{ scale }] }}>
              <Visual key={slide.key} />
            </View>
          </View>
          <SlideCopy key={slide.key} title={slide.title} subtitle={slide.subtitle} />
        </Animated.View>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entrar com CPF"
            onPress={onEnter}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <ThemedText style={styles.ctaLabel}>Entrar com CPF</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function SlideCopy({ title, subtitle }: { title: string; subtitle: string }) {
  const enter = useEntrance(800);
  const rise = (from: number, to: number) => ({
    opacity: segment(enter, from, to),
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [from, to],
          outputRange: [14, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  return (
    <View style={styles.copy}>
      <Animated.View style={rise(0.15, 0.65)}>
        <ThemedText style={styles.title}>{title}</ThemedText>
      </Animated.View>
      <Animated.View style={rise(0.35, 0.9)}>
        <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Tokens.color.brandDeep,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 18,
  },
  bars: {
    flexDirection: 'row',
    gap: 6,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  barFill: {
    flex: 1,
    backgroundColor: Tokens.color.onBrand,
    transformOrigin: 'left',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 30,
    height: 30,
  },
  brandName: {
    color: Tokens.color.onBrand,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 700,
    letterSpacing: -0.2,
  },
  stage: {
    flex: 1,
  },
  visualArea: {
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    // Altura fixa: títulos de uma ou duas linhas não mexem a ilustração.
    height: 156,
    paddingHorizontal: 28,
    gap: 10,
  },
  title: {
    color: Tokens.color.onBrand,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 700,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  cta: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.surface,
    boxShadow: '0px 12px 30px rgba(20, 6, 60, 0.35)',
  },
  ctaPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  ctaLabel: {
    color: Tokens.color.brandDeep,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 700,
  },
});
