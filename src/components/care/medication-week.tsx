import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GradientBadge } from '@/components/ui/gradient-badge';
import { Tokens } from '@/constants/theme';
import { useTakenLog } from '@/hooks/use-medication-reminders';
import { takenKey, weekDays } from '@/utils/medication-reminders';
import { dayKey } from '@/utils/time';

const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// A semana do paciente, de segunda a domingo: cada "Já tomei" da notificação
// marca o horário. Fica só no celular, para ele conferir se tomou; um horário
// sem marca fica neutro, porque não responder não quer dizer que não tomou.
export function MedicationWeek({ times }: { times: string[] }) {
  const { taken, now } = useTakenLog();
  const days = weekDays(now);
  const today = dayKey(now);
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <View style={styles.week}>
      <ThemedText type="smallBold" style={styles.title}>
        Sua semana
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.label} />
        {days.map((day, index) => {
          const isToday = dayKey(day) === today;
          return (
            <View key={index} style={styles.cell}>
              <ThemedText type="smallBold" style={[styles.day, isToday && styles.today]}>
                {LETTERS[index]}
              </ThemedText>
              <ThemedText type="small" style={[styles.date, isToday && styles.today]}>
                {day.getDate()}
              </ThemedText>
            </View>
          );
        })}
      </View>
      {times.map((time) => (
        <View key={time} style={styles.row}>
          <ThemedText type="small" style={styles.label}>
            {time}
          </ThemedText>
          {days.map((day, index) => {
            const key = dayKey(day);
            const done = taken.has(takenKey(key, time));
            const future = key > today || (key === today && time > nowTime);
            return (
              <View
                key={index}
                style={styles.cell}
                accessible
                accessibilityLabel={`${NAMES[index]}, ${time}: ${
                  done ? 'tomei' : future ? 'ainda não chegou' : 'sem resposta'
                }`}>
                {done ? (
                  <GradientBadge size={26}>
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      tintColor={Tokens.color.onBrand}
                      size={14}
                    />
                  </GradientBadge>
                ) : (
                  <View style={[styles.empty, future && styles.future]} />
                )}
              </View>
            );
          })}
        </View>
      ))}
      <ThemedText type="small" style={styles.legend}>
        Marcado pelo &quot;Já tomei&quot; da notificação. Fica só no seu celular.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    gap: 8,
    paddingTop: 4,
  },
  title: {
    color: Tokens.color.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    width: 48,
    color: Tokens.color.muted,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    minHeight: 30,
    justifyContent: 'center',
  },
  day: {
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  date: {
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  today: {
    color: Tokens.color.brand,
  },
  empty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Tokens.color.border,
  },
  future: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Tokens.color.border,
  },
  legend: {
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
