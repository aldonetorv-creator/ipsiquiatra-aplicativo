import { StyleSheet } from 'react-native';

import { ListItem, Panel } from '@/components/mvp/cards';
import { ScreenShell } from '@/components/mvp/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { mvpAreas, patriciaActions } from '@/mocks/mvp';

const area = mvpAreas.find((item) => item.id === 'patricia')!;

export default function PatriciaScreen() {
  return (
    <ScreenShell eyebrow={area.eyebrow} title={area.title} description={area.description}>
      <Panel>
        <ThemedText type="subtitle" style={styles.title}>
          Conversa simulada
        </ThemedText>
        <ThemedText type="default" style={styles.message}>
          Olá, sou a Patrícia. Nesta versão eu ainda não envio mensagens nem faço triagem. Posso
          mostrar os caminhos administrativos que serão conectados depois.
        </ThemedText>
      </Panel>

      <Panel>
        {patriciaActions.map((action) => (
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
  message: {
    color: Tokens.color.muted,
  },
});
