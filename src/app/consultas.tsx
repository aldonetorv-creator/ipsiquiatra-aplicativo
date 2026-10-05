import { StyleSheet } from 'react-native';

import { ListItem, Panel } from '@/components/mvp/cards';
import { ScreenShell } from '@/components/mvp/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { appointmentTimeline, mvpAreas } from '@/mocks/mvp';

const area = mvpAreas.find((item) => item.id === 'consultas')!;

export default function ConsultasScreen() {
  return (
    <ScreenShell eyebrow={area.eyebrow} title={area.title} description={area.description}>
      <Panel>
        <ThemedText type="subtitle" style={styles.title}>
          Agenda mockada
        </ThemedText>
        {appointmentTimeline.map((item) => (
          <ListItem key={item.title} title={item.title} meta={item.meta}>
            {item.description}
          </ListItem>
        ))}
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Tokens.color.text,
    fontSize: 22,
    lineHeight: 28,
  },
});
