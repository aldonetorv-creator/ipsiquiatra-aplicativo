import { StyleSheet, View } from 'react-native';

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
});
