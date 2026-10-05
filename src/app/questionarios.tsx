import { StyleSheet } from 'react-native';

import { ListItem, Panel } from '@/components/mvp/cards';
import { ScreenShell } from '@/components/mvp/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { mvpAreas, questionnaireActions } from '@/mocks/mvp';

const area = mvpAreas.find((item) => item.id === 'questionarios')!;

export default function QuestionariosScreen() {
  return (
    <ScreenShell eyebrow={area.eyebrow} title={area.title} description={area.description}>
      <Panel>
        <ThemedText type="subtitle" style={styles.title}>
          Instrumentos planejados
        </ThemedText>
        {questionnaireActions.map((action) => (
          <ListItem key={action.label} title={action.label}>
            {action.detail}
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
