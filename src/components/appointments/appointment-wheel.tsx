import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { DateBadge } from '@/components/appointments/date-badge';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { Appointment } from '@/contracts/platform';
import { modalityLabel } from '@/utils/appointments';
import { formatLongDate } from '@/utils/time';
import { wheelIndexAt, wheelInterpolation } from '@/utils/wheel';

const ITEM_HEIGHT = 72;
// Altura da janela: o item do centro e dois de cada lado, espremidos na curva
// do cilindro.
const FRAME_HEIGHT = 300;
// Espaço para o primeiro e o último item também poderem ficar no centro.
const EDGE = (FRAME_HEIGHT - ITEM_HEIGHT) / 2;

type Props = {
  appointments: Appointment[];
  onSelect: (appointment: Appointment) => void;
};

// Roleta circular com as consultas já realizadas: gira com o dedo, a consulta
// do centro fica grande e em destaque, e as de cima e de baixo diminuem e se
// inclinam como na face de um cilindro. Tocar numa consulta abre os documentos.
export function AppointmentWheel({ appointments, onSelect }: Props) {
  const [scrollY] = useState(() => new Animated.Value(0));
  const [selected, setSelected] = useState(0);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: Platform.OS !== 'web',
    listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = wheelIndexAt(
        event.nativeEvent.contentOffset.y,
        ITEM_HEIGHT,
        appointments.length
      );
      setSelected((current) => (current === index ? current : index));
    },
  });

  return (
    <View style={styles.frame}>
      {/* Faixa de destaque do item do centro. */}
      <View pointerEvents="none" style={styles.highlight} />
      <Animated.ScrollView
        testID="appointment-wheel"
        style={styles.wheel}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}>
        {appointments.map((appointment, index) => {
          const curve = wheelInterpolation(index, ITEM_HEIGHT);
          const along = (outputRange: number[] | string[]) =>
            scrollY.interpolate({
              inputRange: curve.inputRange,
              outputRange,
              extrapolate: 'clamp',
            });
          const when = formatLongDate(appointment.startsAt);
          const isSelected = index === selected;
          return (
            <Animated.View
              key={appointment.id}
              style={[
                styles.item,
                {
                  opacity: along(curve.opacity),
                  transform: [
                    { perspective: 400 },
                    { translateY: along(curve.translateY) },
                    { rotateX: along(curve.rotateX) },
                    { scale: along(curve.scale) },
                  ],
                },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ver documentos da consulta de ${when}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelect(appointment)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <DateBadge iso={appointment.startsAt} />
                <View style={styles.copy}>
                  <ThemedText
                    type="smallBold"
                    style={[styles.title, isSelected && styles.titleSelected]}
                    numberOfLines={1}>
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
    height: FRAME_HEIGHT,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(225, 228, 242, 0.7)',
    backgroundColor: Tokens.color.surface,
  },
  wheel: {
    flex: 1,
  },
  content: {
    paddingVertical: EDGE,
  },
  highlight: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: EDGE,
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
  titleSelected: {
    color: Tokens.color.brand,
  },
  muted: {
    color: Tokens.color.muted,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
});
