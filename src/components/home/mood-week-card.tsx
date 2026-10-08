import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { moodOption } from '@/components/patricia/mood-options';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientButton } from '@/components/ui/gradient-button';
import { IconBadge } from '@/components/ui/icon-badge';
import { Tokens } from '@/constants/theme';
import { MoodEntry, MoodLevel } from '@/contracts/platform';
import { dayKey, lastSevenDays } from '@/utils/time';

// Geometria do gráfico: o ponto de cada dia sobe com o humor (1 embaixo,
// 5 em cima) e a carinha fica logo acima do ponto.
const PLOT_HEIGHT = 128;
const FACE_SIZE = 32;
const TOP_DOT = FACE_SIZE + 12;
const BOTTOM_DOT = PLOT_HEIGHT - 8;
const dotY = (level: MoodLevel) => BOTTOM_DOT - ((level - 1) * (BOTTOM_DOT - TOP_DOT)) / 4;

type Props = {
  entries: MoodEntry[];
  onRegister: () => void;
};

export function MoodWeekCard({ entries, onRegister }: Props) {
  const [width, setWidth] = useState(0);
  // Último registro de cada dia.
  const byDay = new Map(entries.map((entry) => [dayKey(new Date(entry.recordedAt)), entry]));
  const days = lastSevenDays();
  const recordedThisWeek = days.some((day) => byDay.has(day.key));
  const column = width / days.length;
  const points = days.flatMap((day, index) => {
    const entry = byDay.get(day.key);
    return entry ? [{ x: column * (index + 0.5), y: dotY(entry.level), isToday: day.isToday }] : [];
  });

  return (
    <Card>
      <View style={styles.header}>
        <IconBadge
          name={{ ios: 'face.smiling', android: 'mood', web: 'mood' }}
          tone="purple"
          size={46}
        />
        <View style={styles.headerCopy}>
          <ThemedText type="smallBold" style={styles.title}>
            Diário de humor
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            {recordedThisWeek
              ? 'Como você se sentiu nos últimos 7 dias.'
              : 'Você ainda não registrou seu humor esta semana.'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.plot} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={PLOT_HEIGHT} style={StyleSheet.absoluteFill}>
            {points.length > 1 ? (
              <Polyline
                points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                fill="none"
                stroke={Tokens.color.brandBorder}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {points.map((point) => (
              <Circle
                key={point.x}
                cx={point.x}
                cy={point.y}
                r={point.isToday ? 7 : 5}
                fill={point.isToday ? Tokens.color.brand : '#9C84E8'}
                stroke={Tokens.color.surface}
                strokeWidth={2}
              />
            ))}
          </Svg>
        ) : null}
        {days.map((day, index) => {
          const entry = byDay.get(day.key);
          const option = entry ? moodOption(entry.level) : null;
          return (
            <View
              key={day.key}
              style={styles.column}
              accessible
              accessibilityLabel={`${day.isToday ? 'Hoje' : `${day.weekday} ${day.label}`}: ${
                option ? option.label : 'sem registro'
              }`}>
              {option && entry ? (
                <View
                  style={[
                    styles.face,
                    { backgroundColor: option.tint, top: dotY(entry.level) - FACE_SIZE - 8 },
                    day.isToday && styles.faceToday,
                  ]}>
                  <ThemedText style={styles.faceText}>{option.face}</ThemedText>
                </View>
              ) : (
                <View style={styles.emptyDot} />
              )}
              {index === days.length - 1 ? null : <View style={styles.gridLine} />}
            </View>
          );
        })}
      </View>

      <View style={styles.labels}>
        {days.map((day) => (
          <View key={day.key} style={styles.labelColumn}>
            <ThemedText
              type="small"
              style={[styles.weekday, day.isToday && styles.today]}
              numberOfLines={1}>
              {day.weekday}
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.date, day.isToday && styles.today]}
              numberOfLines={1}>
              {day.label}
            </ThemedText>
          </View>
        ))}
      </View>

      <GradientButton label="Registrar como me senti hoje" onPress={onRegister} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 19,
    lineHeight: 25,
  },
  subtitle: {
    color: Tokens.color.muted,
  },
  plot: {
    flexDirection: 'row',
    height: PLOT_HEIGHT,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  gridLine: {
    position: 'absolute',
    right: 0,
    top: TOP_DOT - 6,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(225, 228, 242, 0.6)',
  },
  face: {
    position: 'absolute',
    width: FACE_SIZE,
    height: FACE_SIZE,
    borderRadius: FACE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Tokens.color.surface,
  },
  faceToday: {
    borderColor: Tokens.color.brand,
  },
  faceText: {
    fontSize: 17,
    lineHeight: 22,
  },
  emptyDot: {
    position: 'absolute',
    top: BOTTOM_DOT - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Tokens.color.border,
  },
  labels: {
    flexDirection: 'row',
    marginTop: -6,
  },
  labelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  weekday: {
    color: Tokens.color.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  date: {
    color: Tokens.color.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 400,
  },
  today: {
    color: Tokens.color.brand,
    fontWeight: 700,
  },
});
