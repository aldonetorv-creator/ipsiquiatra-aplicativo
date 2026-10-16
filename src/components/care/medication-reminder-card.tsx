import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { MedicationWeek } from '@/components/care/medication-week';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientBadge } from '@/components/ui/gradient-badge';
import { GradientButton } from '@/components/ui/gradient-button';
import { Gradients, Tokens } from '@/constants/theme';
import { MedicationPlan } from '@/contracts/platform';
import { useMedicationReminderChoice } from '@/hooks/use-medication-reminders';
import { reminderTimes } from '@/utils/medication-reminders';

// Sugere o lembrete nos horários da receita: o paciente só aceita, sem
// cadastrar remédio nem horário (decisão do Dr. Aldo, 16/10/2026). Pouco
// texto: título, de onde vêm os horários, os horários e o botão.
export function MedicationReminderCard({ plan }: { plan: MedicationPlan }) {
  const times = reminderTimes(plan);
  const { state, enable, disable } = useMedicationReminderChoice(plan);
  if (times.length === 0 || state === 'loading') return null;

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
          {state === 'on' ? 'Lembretes ativos' : 'Lembrete da hora dos remédios'}
        </ThemedText>
      </View>
      {/* A IA só organiza os horários da receita do médico; não recomenda remédio. */}
      <View style={styles.source}>
        <SymbolView
          name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
          tintColor={Tokens.color.brand}
          size={16}
        />
        <ThemedText type="small" style={styles.sourceText}>
          Horários sugeridos pela IA a partir da sua última receita.
        </ThemedText>
      </View>
      <ThemedText type="default" style={styles.times}>
        {times.join(' · ')}
      </ThemedText>

      {state === 'unavailable' ? (
        <ThemedText type="small" style={styles.text}>
          O lembrete funciona no app instalado no celular.
        </ThemedText>
      ) : state === 'on' ? (
        <>
          <MedicationWeek times={times} />
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
          {state === 'denied' ? (
            <ThemedText type="small" style={styles.denied}>
              As notificações do iPsiquiatra estão desligadas. Ative nos ajustes do celular e tente
              de novo.
            </ThemedText>
          ) : null}
          <GradientButton
            label="Ativar lembretes"
            chevron={false}
            colors={Gradients.ai}
            onPress={enable}
          />
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
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    flex: 1,
    color: Tokens.color.brandDeep,
  },
  times: {
    color: Tokens.color.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 700,
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
