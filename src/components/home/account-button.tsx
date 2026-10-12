import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { BiometricIcon } from '@/components/auth/biometric-icon';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { usePatientSession } from '@/services/patient-session';

// Inicial do paciente no topo da Início. Abre a conta: entrar com biometria
// (liga e desliga) e sair.
export function AccountButton() {
  const { state, biometricKind, biometricUnlock, enableBiometrics, disableBiometrics, logout } =
    usePatientSession();
  const [open, setOpen] = useState(false);

  if (state.status !== 'signed_in') return null;
  const { firstName } = state.session.patient;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sua conta"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
        <ThemedText style={styles.initial}>{firstName.charAt(0).toUpperCase()}</ThemedText>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <ThemedText accessibilityRole="header" style={styles.name}>
          {firstName}
        </ThemedText>
        {biometricKind ? (
          <View style={styles.row}>
            <BiometricIcon kind={biometricKind} size={24} tint={Tokens.color.brand} />
            <View style={styles.rowCopy}>
              <ThemedText type="smallBold" style={styles.rowTitle}>
                Entrar com biometria
              </ThemedText>
              <ThemedText type="small" style={styles.muted}>
                Pedida ao abrir o app, no lugar do SMS.
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel="Entrar com biometria"
              value={biometricUnlock}
              onValueChange={(on) => {
                // Ligar pede a biometria uma vez; se não confirmar, continua desligada.
                if (on) enableBiometrics();
                else disableBiometrics();
              }}
              trackColor={{ true: Tokens.color.brand, false: Tokens.color.border }}
              thumbColor={Tokens.color.surface}
            />
          </View>
        ) : null}
        <OutlineButton
          label="Sair"
          accessibilityLabel="Sair da conta"
          onPress={() => {
            setOpen(false);
            logout();
          }}
        />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Tokens.color.brandBorder,
    backgroundColor: Tokens.color.brandSoft,
  },
  pressed: {
    opacity: 0.7,
  },
  initial: {
    color: Tokens.color.brandDeep,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: 700,
  },
  name: {
    color: Tokens.color.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 700,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Tokens.color.background,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: Tokens.color.text,
    fontSize: 16,
    lineHeight: 22,
  },
  muted: {
    color: Tokens.color.muted,
  },
});
