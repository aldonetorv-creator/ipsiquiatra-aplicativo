import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoodWeekCard } from '@/components/home/mood-week-card';
import { PatriciaCard } from '@/components/home/patricia-card';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Tokens } from '@/constants/theme';
import { useHome } from '@/hooks/use-home';

export default function HomeScreen() {
  const { state, ensureMoodCheck } = useHome();
  const [moodError, setMoodError] = useState<string | null>(null);

  const registerMood = async () => {
    const failure = await ensureMoodCheck();
    setMoodError(failure);
    if (!failure) router.push('/patricia');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <ThemedText type="subtitle" style={styles.brandName}>
              iPsiquiatra
            </ThemedText>
            <ThemedText type="small" style={styles.muted}>
              Inteligência que amplifica o cuidado.
            </ThemedText>
          </View>

          <View style={styles.greeting}>
            <ThemedText type="title" style={styles.greetingTitle}>
              {state.status === 'ready' ? `${state.greeting}!` : 'Olá!'}
            </ThemedText>
            <ThemedText type="default" style={styles.greetingSubtitle}>
              Como você está hoje?
            </ThemedText>
          </View>

          {state.status === 'error' ? (
            <ThemedText type="default" style={styles.muted}>
              {state.error}
            </ThemedText>
          ) : state.status === 'ready' ? (
            <>
              <PatriciaCard
                lastMessage={state.lastFromPatricia}
                onPress={() => router.push('/patricia')}
              />
              <MoodWeekCard entries={state.moodEntries} onRegister={registerMood} />
              {moodError ? (
                <ThemedText type="small" style={styles.error}>
                  {moodError}
                </ThemedText>
              ) : null}
            </>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <SymbolView
                name={{ ios: 'doc.text', android: 'description', web: 'description' }}
                tintColor={Tokens.color.blue}
                size={22}
              />
            </View>
            <View style={styles.cardCopy}>
              <ThemedText type="smallBold" style={styles.cardTitle}>
                Antes da sua consulta
              </ThemedText>
              <ThemedText type="small" style={styles.muted}>
                Questionários curtos sobre como você esteve nos últimos dias.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/questionarios')}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.secondaryButtonText}>
                  Responder agora
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <ThemedText type="small" style={styles.demo}>
            Versão de demonstração: dados fictícios, nada é enviado ao consultório.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Tokens.color.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  brand: {
    gap: 2,
  },
  brandName: {
    color: Tokens.color.text,
    fontSize: 22,
    lineHeight: 28,
  },
  muted: {
    color: Tokens.color.muted,
  },
  greeting: {
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  greetingTitle: {
    color: Tokens.color.text,
    fontSize: 32,
    lineHeight: 38,
  },
  greetingSubtitle: {
    color: Tokens.color.muted,
    fontSize: 18,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Tokens.color.border,
    backgroundColor: Tokens.color.surface,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.blueSoft,
  },
  cardCopy: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: Tokens.color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: Tokens.color.brand,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: Tokens.color.onBrand,
  },
  pressed: {
    opacity: 0.85,
  },
  demo: {
    textAlign: 'center',
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
