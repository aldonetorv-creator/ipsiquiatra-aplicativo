import { useLocalSearchParams } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { RichText } from '@/components/care/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { PageScreen } from '@/components/ui/page-screen';
import { Tokens } from '@/constants/theme';
import { CarePlanSectionId } from '@/contracts/platform';
import { useCarePlan } from '@/hooks/use-care';
import { formatDayMonth } from '@/utils/time';

// As seções do plano pós-consulta do Dr. Aldo, com o ícone de cada uma.
const sections: Record<CarePlanSectionId, { title: string; icon: SymbolViewProps['name'] }> = {
  priorities: {
    title: 'O mais importante agora',
    icon: { ios: 'checklist', android: 'checklist', web: 'checklist' },
  },
  treatment: {
    title: 'Seu plano de tratamento',
    icon: { ios: 'puzzlepiece.fill', android: 'extension', web: 'extension' },
  },
  watch: {
    title: 'O que observar',
    icon: { ios: 'eye.fill', android: 'visibility', web: 'visibility' },
  },
  guidance: {
    title: 'Orientações personalizadas',
    icon: { ios: 'heart.fill', android: 'volunteer_activism', web: 'volunteer_activism' },
  },
  contact: {
    title: 'Quando entrar em contato',
    icon: { ios: 'phone.fill', android: 'call', web: 'call' },
  },
  next: {
    title: 'Próximo passo',
    icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  },
  notes: {
    title: 'Anotações importantes',
    icon: { ios: 'note.text', android: 'description', web: 'description' },
  },
};

// Plano de cuidados em texto para celular, com títulos e negrito, e não em
// PDF (pedido do Dr. Aldo, 12/10/2026). Abre pela Início e pelo Cofre.
export default function PlanoScreen() {
  const { documento } = useLocalSearchParams<{ documento?: string }>();
  const state = useCarePlan(documento);
  const plan = state.status === 'ready' ? state.data : null;

  return (
    <PageScreen
      title="Plano de cuidados"
      subtitle={plan ? `Da consulta de ${formatDayMonth(plan.createdAt)}.` : 'Pós-consulta.'}>
      {state.status === 'loading' ? (
        <ThemedText type="small" style={styles.muted}>
          Carregando o plano…
        </ThemedText>
      ) : state.status === 'error' ? (
        <ThemedText type="default" style={styles.muted}>
          {state.error}
        </ThemedText>
      ) : !plan ? (
        <Card>
          <ThemedText type="default" style={styles.text}>
            O plano de cuidados aparece aqui depois da consulta.
          </ThemedText>
        </Card>
      ) : (
        <>
          {plan.welcome ? (
            <View style={styles.welcome}>
              <ThemedText style={styles.quote}>“</ThemedText>
              <ThemedText type="default" style={styles.welcomeText}>
                {plan.welcome}
              </ThemedText>
              <ThemedText type="smallBold" style={styles.signature}>
                Dr. Aldo Araújo
              </ThemedText>
            </View>
          ) : null}
          {plan.sections.map((section, index) => {
            const { title, icon } = sections[section.id];
            return (
              <Card key={section.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.number}>
                    <ThemedText type="smallBold" style={styles.numberText}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <ThemedText type="default" style={styles.sectionTitle} accessibilityRole="header">
                    {title}
                  </ThemedText>
                  <SymbolView name={icon} tintColor={Tokens.color.brand} size={24} />
                </View>
                <View style={styles.items}>
                  {section.items.map((item, itemIndex) => (
                    <View key={itemIndex} style={styles.item}>
                      <View style={styles.bullet} />
                      <RichText text={item} style={styles.itemText} />
                    </View>
                  ))}
                </View>
              </Card>
            );
          })}
        </>
      )}
    </PageScreen>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: Tokens.color.muted,
  },
  text: {
    color: Tokens.color.text,
  },
  welcome: {
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Tokens.color.brandBorder,
    backgroundColor: Tokens.color.brandSoft,
  },
  quote: {
    color: Tokens.color.brand,
    fontSize: 56,
    lineHeight: 60,
    fontWeight: 700,
  },
  welcomeText: {
    marginTop: -18,
    color: Tokens.color.brandDeep,
    fontSize: 19,
    lineHeight: 28,
    fontStyle: 'italic',
  },
  signature: {
    color: Tokens.color.brand,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  number: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.brand,
  },
  numberText: {
    color: Tokens.color.surface,
  },
  sectionTitle: {
    flex: 1,
    color: Tokens.color.text,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: 700,
  },
  items: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 10,
    backgroundColor: Tokens.color.brand,
  },
  itemText: {
    flex: 1,
  },
});
