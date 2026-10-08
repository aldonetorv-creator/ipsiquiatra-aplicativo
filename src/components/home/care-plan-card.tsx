import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { Tokens } from '@/constants/theme';

// Paisagem do mockup: céu lilás, sol e montanhas em azul e roxo.
function Landscape() {
  return (
    <Svg width={132} height={96} viewBox="0 0 132 96">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EFEAFD" />
          <Stop offset="1" stopColor="#E8ECFB" />
        </LinearGradient>
        <LinearGradient id="back" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B9A4F5" />
          <Stop offset="1" stopColor="#9C84E8" />
        </LinearGradient>
        <LinearGradient id="front" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7C93E6" />
          <Stop offset="1" stopColor="#2F45B5" />
        </LinearGradient>
      </Defs>
      <Path d="M24 0 H120 Q132 0 132 12 V96 H0 Q24 70 24 0 Z" fill="url(#sky)" />
      <Circle cx={98} cy={38} r={13} fill="#F6C65B" opacity={0.9} />
      <Path d="M8 96 C30 64 52 50 74 58 C92 64 108 46 132 40 V96 Z" fill="url(#back)" />
      <Path d="M28 96 C52 74 74 70 96 78 C110 83 122 74 132 70 V96 Z" fill="url(#front)" />
    </Svg>
  );
}

type Props = {
  // Pronto quando a última consulta já tem o plano de cuidados no Cofre.
  ready: boolean;
  onOpen: () => void;
};

export function CarePlanCard({ ready, onOpen }: Props) {
  return (
    <Card style={styles.card}>
      {/* Paisagem no canto, atrás do texto, como no mockup. */}
      <View style={styles.art} pointerEvents="none">
        <Landscape />
      </View>
      <View style={styles.row}>
        <IconBadge
          name={{ ios: 'leaf.fill', android: 'eco', web: 'eco' }}
          tone="green"
          size={44}
        />
        <View style={styles.copy}>
          <ThemedText type="smallBold" style={styles.title}>
            {ready ? 'Seu plano de cuidados está pronto' : 'Seu plano de cuidados'}
          </ThemedText>
          <ThemedText type="small" style={styles.text}>
            {ready
              ? 'Um plano personalizado para a sua continuidade de tratamento.'
              : 'Vai aparecer aqui depois da sua consulta com o Dr. Aldo, personalizado para você.'}
          </ThemedText>
          {ready ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir plano de cuidados"
              onPress={onOpen}
              style={({ pressed }) => [styles.open, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.openText}>
                Abrir plano
              </ThemedText>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={Tokens.color.brand}
                size={16}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  text: {
    color: Tokens.color.muted,
    // Deixa a paisagem do canto à vista.
    marginRight: 56,
  },
  art: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  open: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Tokens.color.brandSoft,
  },
  openText: {
    color: Tokens.color.brand,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.6,
  },
});
