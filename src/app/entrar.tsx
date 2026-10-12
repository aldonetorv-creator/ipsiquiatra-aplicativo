import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginForm } from '@/components/auth/login-form';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ScreenBackground } from '@/components/ui/screen-background';
import { MaxContentWidth, Tokens } from '@/constants/theme';

// Primeira tela do app (decisão do Dr. Aldo, 12/10/2026): antes de qualquer
// outra, o paciente entra com o CPF. As abas só existem depois do login
// (components/app-tabs.tsx).
export default function EntrarScreen() {
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <Image
                source={require('@/assets/images/ip-icon.png')}
                style={styles.logo}
                accessibilityLabel="Logo do iPsiquiatra"
              />
              <ThemedText type="subtitle" style={styles.brandName}>
                iPsiquiatra
              </ThemedText>
              <ThemedText type="small" style={styles.muted}>
                Inteligência que amplifica o cuidado.
              </ThemedText>
            </View>

            <View style={styles.greeting}>
              <ThemedText type="title" style={styles.title}>
                Que bom ter você aqui
              </ThemedText>
              <ThemedText type="default" style={styles.muted}>
                Entre com o seu CPF para ver suas consultas, falar com a Patrícia e acompanhar o seu
                dia a dia.
              </ThemedText>
            </View>

            <Card>
              <ThemedText type="smallBold" style={styles.cardTitle}>
                Entrar com CPF
              </ThemedText>
              <LoginForm />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 20,
  },
  brand: {
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: 8,
  },
  brandName: {
    color: Tokens.color.brand,
    fontSize: 24,
    lineHeight: 30,
  },
  greeting: {
    gap: 6,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 30,
    lineHeight: 36,
  },
  muted: {
    color: Tokens.color.muted,
  },
  cardTitle: {
    color: Tokens.color.brand,
    fontSize: 18,
    lineHeight: 24,
  },
});
