import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { RichText } from '@/components/care/rich-text';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientBadge } from '@/components/ui/gradient-badge';
import { PageScreen } from '@/components/ui/page-screen';
import { Gradients, Shadows, Tokens } from '@/constants/theme';
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
            <LinearGradient
              colors={Gradients.ai}
              start={{ x: 0, y: 0.2 }}
              end={{ x: 1, y: 0.8 }}
              style={styles.welcome}>
              <SymbolView
                name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                tintColor={Tokens.color.onBrand}
                size={26}
              />
              <ThemedText type="default" style={styles.welcomeText}>
                {plan.welcome}
              </ThemedText>
              <ThemedText type="smallBold" style={styles.signature}>
                Dr. Aldo Araújo
              </ThemedText>
            </LinearGradient>
          ) : null}
          {plan.sections.map((section, index) => {
            const { title, icon } = sections[section.id];
            return (
              <Card key={section.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <GradientBadge size={32}>
                    <ThemedText type="smallBold" style={styles.numberText}>
                      {index + 1}
                    </ThemedText>
                  </GradientBadge>
                  <ThemedText type="default" style={styles.sectionTitle} accessibilityRole="header">
                    {title}
                  </ThemedText>
                  {/* Pontos de cor: os ícones alternam roxo e azul. */}
                  <View style={[styles.icon, index % 2 === 1 && styles.iconBlue]}>
                    <SymbolView
                      name={icon}
                      tintColor={index % 2 === 1 ? Tokens.color.blue : Tokens.color.brand}
                      size={22}
                    />
                  </View>
                </View>
                <LinearGradient
                  colors={Gradients.ai}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.accent}
                />
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
    gap: 10,
    padding: 22,
    borderRadius: 24,
    boxShadow: Shadows.floating,
  },
  welcomeText: {
    color: Tokens.color.onBrand,
    fontSize: 19,
    lineHeight: 28,
    fontStyle: 'italic',
  },
  signature: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  section: {
    gap: 12,
  },
  accent: {
    width: 56,
    height: 3,
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberText: {
    color: Tokens.color.onBrand,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.brandSoft,
  },
  iconBlue: {
    backgroundColor: Tokens.color.blueSoft,
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
    backgroundColor: Tokens.color.blue,
  },
  itemText: {
    flex: 1,
  },
});
