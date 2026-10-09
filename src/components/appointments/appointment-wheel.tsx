import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { DateBadge } from '@/components/appointments/date-badge';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { Appointment } from '@/contracts/platform';
import { modalityLabel } from '@/utils/appointments';
import { formatLongDate } from '@/utils/time';

const ITEM_HEIGHT = 72;
// Itens visíveis: o do centro e dois de cada lado, como uma roleta.
const VISIBLE = 5;
const SIDE = (VISIBLE - 1) / 2;

type Props = {
  appointments: Appointment[];
  onSelect: (appointment: Appointment) => void;
};

// Roleta com as consultas já realizadas: gira com o dedo, o item do centro
// fica em destaque e tocar numa consulta abre os documentos dela.
export function AppointmentWheel({ appointments, onSelect }: Props) {
  const [scrollY] = useState(() => new Animated.Value(0));

  return (
    <View style={styles.frame}>
      {/* Faixa de destaque do item do centro. */}
      <View pointerEvents="none" style={styles.highlight} />
      <Animated.ScrollView
        style={styles.wheel}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: Platform.OS !== 'web',
        })}>
        {appointments.map((appointment, index) => {
          const center = index * ITEM_HEIGHT;
          const inputRange = [-2, -1, 0, 1, 2].map((step) => center + step * ITEM_HEIGHT);
          const when = formatLongDate(appointment.startsAt);
          return (
            <Animated.View
              key={appointment.id}
              style={[
                styles.item,
                {
                  opacity: scrollY.interpolate({
                    inputRange,
                    outputRange: [0.3, 0.6, 1, 0.6, 0.3],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    { perspective: 700 },
                    {
                      rotateX: scrollY.interpolate({
                        inputRange,
                        outputRange: ['55deg', '28deg', '0deg', '-28deg', '-55deg'],
                        extrapolate: 'clamp',
                      }),
                    },
                    {
                      scale: scrollY.interpolate({
                        inputRange,
                        outputRange: [0.82, 0.92, 1, 0.92, 0.82],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver documentos da consulta de ${when}`}
                onPress={() => onSelect(appointment)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <DateBadge iso={appointment.startsAt} />
                <View style={styles.copy}>
                  <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
                    {when}
                  </ThemedText>
                  <ThemedText type="small" style={styles.muted} numberOfLines={1}>
                    {`${appointment.doctor.name} · ${modalityLabel[appointment.modality]}`}
                  </ThemedText>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
      {/* Bordas esmaecidas, como o vidro de uma roleta. */}
      <LinearGradient
        pointerEvents="none"
        colors={[Tokens.color.surface, 'rgba(255, 255, 255, 0)']}
        style={[styles.fade, styles.fadeTop]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255, 255, 255, 0)', Tokens.color.surface]}
        style={[styles.fade, styles.fadeBottom]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: ITEM_HEIGHT * VISIBLE,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(225, 228, 242, 0.7)',
    backgroundColor: Tokens.color.surface,
  },
  wheel: {
    flex: 1,
  },
  // Espaço antes do primeiro e depois do último, para os dois poderem ficar no centro.
  content: {
    paddingVertical: ITEM_HEIGHT * SIDE,
  },
  highlight: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: ITEM_HEIGHT * SIDE,
    height: ITEM_HEIGHT,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Tokens.color.brandBorder,
    backgroundColor: Tokens.color.brandSoft,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pressed: {
    opacity: 0.6,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Tokens.color.text,
  },
  muted: {
    color: Tokens.color.muted,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.4,
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
});
