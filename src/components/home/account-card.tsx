import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LoginSheet } from '@/components/auth/login-sheet';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientButton } from '@/components/ui/gradient-button';
import { IconBadge } from '@/components/ui/icon-badge';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { usePatientSession } from '@/services/patient-session';

// Conta do paciente na Início: entrar com CPF ou, já dentro, sair.
export function AccountCard() {
  const { state, logout } = usePatientSession();
  const [open, setOpen] = useState(false);

  if (state.status === 'loading') return null;

  return (
    <Card style={styles.row}>
      <IconBadge
        name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
        tone="blue"
        size={46}
      />
      {state.status === 'signed_in' ? (
        <View style={styles.copy}>
          <ThemedText type="smallBold" style={styles.title}>
            Você entrou como {state.session.patient.firstName}
          </ThemedText>
          <OutlineButton label="Sair" accessibilityLabel="Sair da conta" onPress={logout} />
        </View>
      ) : (
        <View style={styles.copy}>
          <ThemedText type="smallBold" style={styles.title}>
            Sua conta
          </ThemedText>
          <ThemedText type="small" style={styles.muted}>
            Entre com o CPF e um código por SMS. Em breve, suas consultas e documentos aparecem
            aqui.
          </ThemedText>
          <GradientButton label="Entrar com CPF" size="small" onPress={() => setOpen(true)} />
        </View>
      )}
      <LoginSheet visible={open} onClose={() => setOpen(false)} />
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
  muted: {
    color: Tokens.color.muted,
  },
});
