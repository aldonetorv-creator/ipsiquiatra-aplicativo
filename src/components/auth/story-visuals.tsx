import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { segment, useBreathing, useEntrance } from '@/components/auth/story-motion';
import { ThemedText } from '@/components/themed-text';
import { Gradients, Tokens } from '@/constants/theme';

// Ilustrações da história de boas-vindas. Cada uma tem 300 x 280 e entra com
// a própria animação quando o quadro aparece.
export const VISUAL_WIDTH = 300;
export const VISUAL_HEIGHT = 280;

// Fundo roxo com dois brilhos suaves, para dar profundidade.
export function StoryBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={Gradients.story}
        locations={[0, 0.55, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow-top" cx="88%" cy="8%" r="62%">
            <Stop offset="0" stopColor="#A78BFF" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#A78BFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow-bottom" cx="0%" cy="92%" r="70%">
            <Stop offset="0" stopColor={Tokens.color.blue} stopOpacity={0.7} />
            <Stop offset="1" stopColor={Tokens.color.blue} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow-top)" />
        <Rect width="100%" height="100%" fill="url(#glow-bottom)" />
      </Svg>
    </View>
  );
}

// 1. Cuidado: círculos que respiram devagar em volta da mão com o coração.
export function CareVisual() {
  const enter = useEntrance(900);
  const breath = useBreathing();
  const rings = [
    { size: 264, border: 0.12, fill: 0.03 },
    { size: 200, border: 0.2, fill: 0.05 },
    { size: 140, border: 0.3, fill: 0.08 },
  ];

  return (
    <Animated.View
      style={[
        styles.visual,
        styles.center,
        {
          opacity: segment(enter, 0, 0.6),
          transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        },
      ]}>
      {rings.map((ring, i) => (
        <Animated.View
          key={ring.size}
          style={[
            styles.ring,
            {
              width: ring.size,
              height: ring.size,
              borderRadius: ring.size / 2,
              borderColor: `rgba(255, 255, 255, ${ring.border})`,
              backgroundColor: `rgba(255, 255, 255, ${ring.fill})`,
              transform: [
                {
                  scale: breath.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1 - 0.03 * (3 - i), 1 + 0.02 * (3 - i)],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      <View style={styles.core}>
        <SymbolView
          name={{ ios: 'heart.fill', android: 'volunteer_activism', web: 'volunteer_activism' }}
          tintColor={Tokens.color.brand}
          size={44}
        />
      </View>
    </Animated.View>
  );
}

// 2. Patrícia: a foto e um começo de conversa, como ela faz todo dia.
export function PatriciaVisual() {
  const enter = useEntrance(1600);
  const pop = (from: number, to: number) => ({
    opacity: segment(enter, from, to),
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [from, to],
          outputRange: [10, 0],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: enter.interpolate({
          inputRange: [from, to],
          outputRange: [0.86, 1],
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  return (
    <View style={styles.visual}>
      <Animated.View style={[styles.photoRing, pop(0, 0.35)]}>
        <Image
          source={require('@/assets/images/patricia.webp')}
          style={styles.photo}
          accessibilityLabel="Foto da Patrícia"
        />
        <View style={styles.online} />
      </Animated.View>
      <Animated.View style={[styles.bubble, styles.bubbleFromPatricia, pop(0.3, 0.55)]}>
        <ThemedText style={styles.bubbleText}>Oi! Como você está hoje?</ThemedText>
      </Animated.View>
      <Animated.View style={[styles.bubble, styles.bubbleFromPatient, pop(0.7, 0.95)]}>
        <ThemedText style={[styles.bubbleText, styles.bubbleTextLight]}>
          Bem melhor hoje.
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const places: { icon: SymbolViewProps['name']; label: string; main?: boolean }[] = [
  {
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
    label: 'Consultas',
  },
  {
    icon: { ios: 'doc.text.fill', android: 'description', web: 'description' },
    label: 'Documentos',
    main: true,
  },
  { icon: { ios: 'checklist', android: 'checklist', web: 'checklist' }, label: 'Questionários' },
];

// 3. Tudo num só lugar: consultas, documentos (com cadeado) e questionários.
export function PlacesVisual() {
  const enter = useEntrance(1200);

  return (
    <View style={[styles.visual, styles.places]}>
      {places.map((place, i) => {
        const from = i * 0.18;
        // O do meio fica um pouco acima dos outros.
        const lift = place.main ? -22 : 0;
        return (
          <Animated.View
            key={place.label}
            style={[
              styles.place,
              place.main && styles.placeMain,
              {
                opacity: segment(enter, from, from + 0.45),
                transform: [
                  {
                    translateY: enter.interpolate({
                      inputRange: [from, from + 0.45],
                      outputRange: [lift + 18, lift],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}>
            <View style={[styles.tile, place.main && styles.tileMain]}>
              <SymbolView
                name={place.icon}
                tintColor={Tokens.color.onBrand}
                size={place.main ? 44 : 34}
              />
              {place.main ? (
                <View style={styles.lock}>
                  <SymbolView
                    name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                    tintColor={Tokens.color.brand}
                    size={15}
                  />
                </View>
              ) : null}
            </View>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.placeLabel}>
              {place.label}
            </ThemedText>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  visual: {
    width: VISUAL_WIDTH,
    height: VISUAL_HEIGHT,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  core: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.surface,
    boxShadow: '0px 0px 48px rgba(196, 176, 255, 0.65)',
  },
  photoRing: {
    position: 'absolute',
    left: (VISUAL_WIDTH - 168) / 2,
    top: (VISUAL_HEIGHT - 168) / 2,
    width: 168,
    height: 168,
    borderRadius: 84,
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    boxShadow: '0px 18px 40px rgba(20, 6, 60, 0.45)',
  },
  photo: {
    width: 156,
    height: 156,
    borderRadius: 78,
  },
  online: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#4C22A6',
    backgroundColor: '#3DDC84',
  },
  bubble: {
    position: 'absolute',
    maxWidth: 250,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  bubbleFromPatricia: {
    top: 6,
    left: 0,
    borderBottomLeftRadius: 6,
    backgroundColor: Tokens.color.surface,
    boxShadow: '0px 10px 24px rgba(20, 6, 60, 0.35)',
  },
  bubbleFromPatient: {
    right: 0,
    bottom: 10,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  bubbleText: {
    color: Tokens.color.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 600,
  },
  bubbleTextLight: {
    color: Tokens.color.onBrand,
  },
  // 94 + 104 + 94 e os espaços: cabe nos 300 da ilustração.
  places: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  place: {
    width: 94,
    alignItems: 'center',
    gap: 10,
  },
  placeMain: {
    width: 104,
  },
  tile: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  tileMain: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    boxShadow: '0px 16px 36px rgba(20, 6, 60, 0.4)',
  },
  lock: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.surface,
  },
  placeLabel: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 13,
  },
});
