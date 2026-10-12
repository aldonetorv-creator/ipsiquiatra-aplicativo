import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BiometricIcon } from '@/components/auth/biometric-icon';
import { StoryBackground } from '@/components/auth/story-visuals';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { usePatientSession } from '@/services/patient-session';

// Espera a tela aparecer (e a abertura sumir) antes de pedir a biometria.
const PROMPT_DELAY_MS = 350;

// Quem ligou a biometria entra por aqui ao abrir o app (e depois de um tempo
// fora dele). O pedido da biometria aparece sozinho; se não der, o botão pede
// de novo, ou o paciente entra pelo CPF e SMS.
export function UnlockScreen({ firstName, onUseSms }: { firstName: string; onUseSms: () => void }) {
  const { unlock, biometricKind } = usePatientSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryUnlock = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    // Deu certo: esta tela some (rota protegida), nada mais a fazer aqui.
    if (await unlock()) return;
    setBusy(false);
    setFailed(true);
  }, [unlock]);

  useEffect(() => {
    const timer = setTimeout(tryUnlock, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [tryUnlock]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <StoryBackground />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Image
            source={require('@/assets/images/ip-icon.png')}
            style={styles.logo}
            accessibilityLabel="Logo do iPsiquiatra"
          />
          <ThemedText accessibilityRole="header" style={styles.title}>
            Olá, {firstName}!
          </ThemedText>
          <ThemedText style={styles.subtitle}>Que bom ter você de volta.</ThemedText>
        </View>

        <View style={styles.footer}>
          {failed ? (
            <ThemedText accessibilityRole="alert" style={styles.hint}>
              Não deu para confirmar. Tente de novo.
            </ThemedText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entrar com biometria"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={tryUnlock}
            style={({ pressed }) => [styles.cta, (pressed || busy) && styles.ctaPressed]}>
            <BiometricIcon kind={biometricKind} size={24} tint={Tokens.color.brandDeep} />
            <ThemedText style={styles.ctaLabel}>Entrar com biometria</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entrar com CPF e SMS"
            hitSlop={8}
            onPress={onUseSms}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}>
            <ThemedText type="smallBold" style={styles.linkText}>
              Entrar com CPF e SMS
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Tokens.color.brandDeep,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  logo: {
    width: 104,
    height: 104,
    marginBottom: 14,
  },
  title: {
    color: Tokens.color.onBrand,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 700,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  hint: {
    color: Tokens.color.onBrand,
    textAlign: 'center',
  },
  cta: {
    height: 58,
    borderRadius: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Tokens.color.surface,
    boxShadow: '0px 12px 30px rgba(20, 6, 60, 0.35)',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    color: Tokens.color.brandDeep,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 700,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  linkPressed: {
    opacity: 0.6,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
  },
});
