import { Pressable, StyleSheet, View } from 'react-native';

import { moodOption } from '@/components/patricia/mood-options';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { MoodEntry } from '@/contracts/platform';
import { dayKey, lastSevenDays } from '@/utils/time';

const CHART_HEIGHT = 96;
const FACE_SIZE = 34;
// Distância vertical entre um nível de humor e o seguinte (1 embaixo, 5 em cima).
const LEVEL_STEP = (CHART_HEIGHT - FACE_SIZE) / 4;

type Props = {
  entries: MoodEntry[];
  onRegister: () => void;
};

export function MoodWeekCard({ entries, onRegister }: Props) {
  // Último registro de cada dia.
  const byDay = new Map(entries.map((entry) => [dayKey(new Date(entry.recordedAt)), entry]));
  const days = lastSevenDays();
  const recordedThisWeek = days.some((day) => byDay.has(day.key));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          Diário de humor
        </ThemedText>
        <ThemedText type="small" style={styles.subtitle}>
          {recordedThisWeek
            ? 'Como você se sentiu nos últimos 7 dias.'
            : 'Você ainda não registrou seu humor esta semana.'}
        </ThemedText>
      </View>

      <View style={styles.chart}>
        {days.map((day) => {
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
              <View style={styles.plot}>
                {option && entry ? (
                  <View
                    style={[
                      styles.face,
                      { backgroundColor: option.tint, bottom: (entry.level - 1) * LEVEL_STEP },
                      day.isToday && styles.faceToday,
                    ]}>
                    <ThemedText style={styles.faceText}>{option.face}</ThemedText>
                  </View>
                ) : (
                  <View style={styles.emptyDot} />
                )}
              </View>
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
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onRegister}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.buttonText}>
          Registrar como me senti hoje
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Tokens.color.border,
    backgroundColor: Tokens.color.surface,
  },
  header: {
    gap: 2,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  subtitle: {
    color: Tokens.color.muted,
  },
  chart: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  plot: {
    width: '100%',
    height: CHART_HEIGHT,
    alignItems: 'center',
    marginBottom: 6,
  },
  face: {
    position: 'absolute',
    width: FACE_SIZE,
    height: FACE_SIZE,
    borderRadius: FACE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  faceToday: {
    borderColor: Tokens.color.brand,
  },
  faceText: {
    fontSize: 18,
    lineHeight: 24,
  },
  emptyDot: {
    position: 'absolute',
    bottom: FACE_SIZE / 2 - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Tokens.color.border,
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
    color: Tokens.color.blue,
    fontWeight: 700,
  },
  button: {
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: Tokens.color.blue,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: Tokens.color.onBrand,
  },
});
