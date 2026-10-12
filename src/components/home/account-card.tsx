import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { IconBadge } from '@/components/ui/icon-badge';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { usePatientSession } from '@/services/patient-session';

// Conta do paciente na Início: quem entrou e o botão de sair. Sem sessão, a
// Início nem aparece; o app fica na tela de entrar (app/entrar.tsx).
export function AccountCard() {
  const { state, logout } = usePatientSession();

  if (state.status !== 'signed_in') return null;

  return (
    <Card style={styles.row}>
      <IconBadge
        name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
        tone="blue"
        size={46}
      />
      <View style={styles.copy}>
        <ThemedText type="smallBold" style={styles.title}>
          Você entrou como {state.session.patient.firstName}
        </ThemedText>
        <OutlineButton label="Sair" accessibilityLabel="Sair da conta" onPress={logout} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: Tokens.color.text,
  },
});
