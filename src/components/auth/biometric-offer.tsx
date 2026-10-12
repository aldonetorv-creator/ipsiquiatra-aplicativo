import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BiometricIcon } from '@/components/auth/biometric-icon';
import { ThemedText } from '@/components/themed-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { GradientButton } from '@/components/ui/gradient-button';
import { Tokens } from '@/constants/theme';
import { usePatientSession } from '@/services/patient-session';

const how = {
  face: 'entre com o seu rosto',
  fingerprint: 'entre com a sua digital',
  other: 'entre com a biometria',
};

// Logo depois do login por SMS, se o celular tem biometria cadastrada: da
// próxima vez, entrar com ela em vez de esperar outro SMS.
export function BiometricOffer() {
  const { state, offerBiometrics, biometricKind, enableBiometrics, declineBiometrics } =
    usePatientSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const enable = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await enableBiometrics();
    setBusy(false);
    setFailed(!ok);
  };

  return (
    <BottomSheet
      visible={offerBiometrics && state.status === 'signed_in'}
      onClose={declineBiometrics}>
      <View style={styles.badge}>
        <BiometricIcon kind={biometricKind} size={40} tint={Tokens.color.brand} />
      </View>
      <ThemedText accessibilityRole="header" style={styles.title}>
        Entrar com biometria?
      </ThemedText>
      <ThemedText style={styles.body}>
        Da próxima vez, {how[biometricKind ?? 'other']}, sem esperar o SMS.
      </ThemedText>
      {failed ? (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          Não deu para confirmar. Tente de novo.
        </ThemedText>
      ) : null}
      <GradientButton label="Usar biometria" chevron={false} disabled={busy} onPress={enable} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agora não"
        onPress={declineBiometrics}
        style={({ pressed }) => [styles.later, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.laterText}>
          Agora não
        </ThemedText>
      </Pressable>
      <ThemedText type="small" style={styles.note}>
        A biometria fica só no seu celular. O app não tem acesso a ela.
      </ThemedText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: Tokens.color.brandSoft,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 700,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  body: {
    color: Tokens.color.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 6,
  },
  error: {
    color: Tokens.color.danger,
    textAlign: 'center',
  },
  later: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
  },
  pressed: {
    backgroundColor: Tokens.color.surfaceMuted,
  },
  laterText: {
    color: Tokens.color.blue,
    fontSize: 16,
  },
  note: {
    color: Tokens.color.muted,
    textAlign: 'center',
  },
});
