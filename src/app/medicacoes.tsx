import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MedicationReminderCard } from '@/components/care/medication-reminder-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientBadge } from '@/components/ui/gradient-badge';
import { OutlineButton } from '@/components/ui/outline-button';
import { PageScreen, SectionLabel } from '@/components/ui/page-screen';
import { Gradients, Shadows, Tokens } from '@/constants/theme';
import { Medication, MedicationPeriod, MedicationPlan } from '@/contracts/platform';
import { useMedicationPlan } from '@/hooks/use-care';
import { medicationSlots, MedicationSlot, nextSlotKey, periodLabels } from '@/utils/medications';
import { formatDate } from '@/utils/time';

const periodIcons: Record<MedicationPeriod, SymbolViewProps['name']> = {
  morning: { ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' },
  midday: { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' },
  afternoon: { ios: 'sun.haze.fill', android: 'wb_sunny', web: 'wb_sunny' },
  evening: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  bedtime: { ios: 'bed.double.fill', android: 'bedtime', web: 'bedtime' },
};

// Minhas medicações (pedido do Dr. Aldo, 12/10/2026): os remédios da última
// receita validada pelo médico, por horário do dia.
export default function MedicacoesScreen() {
  const state = useMedicationPlan();

  return (
    <PageScreen title="Minhas medicações" subtitle="Seus remédios por horário do dia.">
      {state.status === 'loading' ? (
        <ThemedText type="small" style={styles.muted}>
          Carregando medicações…
        </ThemedText>
      ) : state.status === 'error' ? (
        <ThemedText type="default" style={styles.muted}>
          {state.error}
        </ThemedText>
      ) : !state.data ? (
        <Card>
          <ThemedText type="default" style={styles.text}>
            Sua lista aparece aqui quando houver uma receita do Dr. Aldo.
          </ThemedText>
        </Card>
      ) : (
        <Plan plan={state.data} />
      )}
    </PageScreen>
  );
}

function Plan({ plan }: { plan: MedicationPlan }) {
  // A lista só aparece depois de carregar, já no aparelho: o relógio daqui
  // não diverge do HTML pré-renderizado da web.
  const [now] = useState(() => new Date());
  const { slots, asNeeded } = medicationSlots(plan);
  const next = nextSlotKey(slots, now);
  const source = plan.sources[0];
  return (
    <>
      <LinearGradient
        colors={Gradients.ai}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 0.8 }}
        style={styles.source}>
        <SymbolView
          name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
          tintColor={Tokens.color.onBrand}
          size={22}
        />
        <ThemedText type="small" style={styles.sourceText}>
          {`Conforme a receita de ${formatDate(source.issuedAt)}, validada por ${source.validatedBy}.`}
        </ThemedText>
      </LinearGradient>

      <MedicationReminderCard plan={plan} />

      {slots.map((slot) => (
        <Slot key={slot.key} slot={slot} next={slot.key === next} />
      ))}

      {asNeeded.length > 0 ? (
        <View style={styles.slot}>
          <SectionLabel>Se precisar</SectionLabel>
          <Card style={styles.slotCard}>
            {asNeeded.map((medication) => (
              <MedicationRow key={medication.id} medication={medication} />
            ))}
          </Card>
        </View>
      ) : null}

      <Card style={styles.warning}>
        <ThemedText type="smallBold" style={styles.warningTitle}>
          Não pare nem mude a dose por conta própria.
        </ThemedText>
        <ThemedText type="small" style={styles.warningText}>
          Em caso de dúvida ou de algum efeito que incomode, fale com a Patrícia ou com o Dr. Aldo.
        </ThemedText>
      </Card>

      <OutlineButton label="Ver a receita no Cofre" onPress={() => router.push('/cofre')} />
    </>
  );
}

function Slot({ slot, next }: { slot: MedicationSlot; next: boolean }) {
  const label = periodLabels[slot.period];
  const heading = slot.time ? `${label} · ${slot.time}` : label;
  return (
    <View style={styles.slot}>
      <View
        style={styles.slotHeader}
        accessible
        accessibilityRole="header"
        accessibilityLabel={next ? `${heading}. Próximo horário` : heading}>
        <GradientBadge size={40}>
          <SymbolView name={periodIcons[slot.period]} tintColor={Tokens.color.onBrand} size={20} />
        </GradientBadge>
        <ThemedText type="smallBold" style={styles.slotTitle}>
          {heading}
        </ThemedText>
        {next ? (
          <LinearGradient
            colors={Gradients.ai}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.nextChip}>
            <ThemedText type="smallBold" style={styles.nextText}>
              Próximo
            </ThemedText>
          </LinearGradient>
        ) : null}
      </View>
      <Card style={next ? { ...styles.slotCard, ...styles.slotCardNext } : styles.slotCard}>
        {slot.medications.map((medication) => (
          <MedicationRow key={medication.id} medication={medication} />
        ))}
      </Card>
    </View>
  );
}

function MedicationRow({ medication }: { medication: Medication }) {
  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <SymbolView
          name={{ ios: 'pills.fill', android: 'medication', web: 'medication' }}
          tintColor={Tokens.color.blue}
          size={20}
        />
      </View>
      <View style={styles.rowCopy}>
        <ThemedText type="default" style={styles.name}>
          {medication.name}
        </ThemedText>
        <ThemedText type="small" style={styles.text}>
          {medication.dose}
        </ThemedText>
        {medication.instructions ? (
          <ThemedText type="small" style={styles.muted}>
            {medication.instructions}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: Tokens.color.muted,
  },
  text: {
    color: Tokens.color.text,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    boxShadow: Shadows.floating,
  },
  sourceText: {
    flex: 1,
    color: Tokens.color.onBrand,
  },
  slot: {
    gap: 10,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotTitle: {
    flex: 1,
    color: Tokens.color.text,
    fontSize: 17,
    lineHeight: 24,
  },
  nextChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  nextText: {
    color: Tokens.color.onBrand,
    fontSize: 12,
    lineHeight: 16,
  },
  slotCard: {
    gap: 16,
  },
  slotCardNext: {
    borderColor: Tokens.color.brandBorder,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.blueSoft,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Tokens.color.text,
    fontWeight: 700,
  },
  warning: {
    gap: 6,
    backgroundColor: Tokens.color.surface,
  },
  warningTitle: {
    color: Tokens.color.text,
  },
  warningText: {
    color: Tokens.color.muted,
  },
});
