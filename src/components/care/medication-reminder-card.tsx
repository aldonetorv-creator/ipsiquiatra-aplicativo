import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientBadge } from '@/components/ui/gradient-badge';
import { GradientButton } from '@/components/ui/gradient-button';
import { Tokens } from '@/constants/theme';
import { MedicationPlan } from '@/contracts/platform';
import { useMedicationReminderChoice } from '@/hooks/use-medication-reminders';
import { FOLLOW_UP_MINUTES, reminderTimes } from '@/utils/medication-reminders';

// "08:00", "08:00 e 20:00", "08:00, 20:00 e 22:00".
const listTimes = (times: string[]) =>
  times.length < 2 ? times.join('') : `${times.slice(0, -1).join(', ')} e ${times.at(-1)}`;

// Sugere o lembrete nos horários da receita: o paciente só aceita, sem
// cadastrar remédio nem horário (decisão do Dr. Aldo, 16/10/2026).
export function MedicationReminderCard({ plan }: { plan: MedicationPlan }) {
  const times = reminderTimes(plan);
  const { state, enable, disable } = useMedicationReminderChoice(plan);
  if (times.length === 0 || state === 'loading') return null;
  const when = listTimes(times);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <GradientBadge size={40}>
          <SymbolView
            name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
            tintColor={Tokens.color.onBrand}
            size={20}
          />
        </GradientBadge>
        <ThemedText type="smallBold" style={styles.title}>
          {state === 'on' ? 'Lembretes ativos' : 'Lembrete na hora dos remédios'}
        </ThemedText>
      </View>

      {state === 'unavailable' ? (
        <ThemedText type="small" style={styles.text}>
          O lembrete funciona no app instalado no celular.
        </ThemedText>
      ) : state === 'on' ? (
        <>
          <ThemedText type="small" style={styles.text}>
            {`Um aviso às ${when}. Na notificação, toque em "Já tomei".`}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Desativar lembretes"
            hitSlop={8}
            onPress={disable}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.linkText}>
              Desativar
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <ThemedText type="small" style={styles.text}>
            {`Um aviso às ${when}, nos horários da sua receita. O nome dos remédios não aparece na notificação. Se você não responder, a Patrícia lembra de novo ${FOLLOW_UP_MINUTES} minutos depois.`}
          </ThemedText>
          {state === 'denied' ? (
            <ThemedText type="small" style={styles.denied}>
              As notificações do iPsiquiatra estão desligadas. Ative nos ajustes do celular e tente
              de novo.
            </ThemedText>
          ) : null}
          <GradientButton label="Ativar lembretes" chevron={false} onPress={enable} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    color: Tokens.color.text,
    fontSize: 17,
    lineHeight: 24,
  },
  text: {
    color: Tokens.color.muted,
  },
  denied: {
    color: Tokens.color.danger,
  },
  link: {
    alignSelf: 'flex-start',
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  linkText: {
    color: Tokens.color.brand,
  },
});
