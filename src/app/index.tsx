import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ListItem, Panel, StatCard } from '@/components/mvp/cards';
import { ScreenShell } from '@/components/mvp/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { contractNotices, homeInsights, homeTimeline, mvpAreas } from '@/mocks/mvp';

const area = mvpAreas.find((item) => item.id === 'home')!;

export default function HomeScreen() {
  return (
    <ScreenShell eyebrow={area.eyebrow} title="iPsiquiatra" description={area.description}>
      <View style={styles.stats}>
        {homeInsights.map((insight) => (
          <StatCard key={insight.label} {...insight} />
        ))}
      </View>

      <Panel>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Antes da sua consulta
        </ThemedText>
        <ThemedText type="default" style={styles.body}>
          Questionários curtos sobre como você esteve nos últimos dias.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/questionarios')}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.actionText}>
            Ver questionários
          </ThemedText>
        </Pressable>
      </Panel>

      <Panel>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Cuidado em andamento
        </ThemedText>
        {homeTimeline.map((item) => (
          <ListItem key={item.title} title={item.title} meta={item.meta}>
            {item.description}
          </ListItem>
        ))}
      </Panel>

      <Panel>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Guardrails da Sprint 0
        </ThemedText>
        {contractNotices.map((notice) => (
          <ListItem key={notice.title} title={notice.title}>
            {notice.description}
          </ListItem>
        ))}
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionTitle: {
    color: Tokens.color.text,
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    color: Tokens.color.muted,
  },
  action: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: Tokens.color.blue,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  actionText: {
    color: Tokens.color.onBrand,
  },
  pressed: {
    opacity: 0.8,
  },
});
