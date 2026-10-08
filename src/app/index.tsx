import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NextAppointmentCard } from '@/components/appointments/next-appointment-card';
import { CarePlanCard } from '@/components/home/care-plan-card';
import { FollowUpCard } from '@/components/home/follow-up-card';
import { MoodWeekCard } from '@/components/home/mood-week-card';
import { PatriciaCard } from '@/components/home/patricia-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientButton } from '@/components/ui/gradient-button';
import { IconBadge } from '@/components/ui/icon-badge';
import { ScreenBackground } from '@/components/ui/screen-background';
import { MaxContentWidth, Tokens } from '@/constants/theme';
import { useHome } from '@/hooks/use-home';

export default function HomeScreen() {
  const { state, ensureMoodCheck, requestService } = useHome();
  const [actionError, setActionError] = useState<string | null>(null);

  const registerMood = async () => {
    const failure = await ensureMoodCheck();
    setActionError(failure);
    if (!failure) router.push('/patricia');
  };

  // Remarcar acontece na conversa: a Patrícia recebe o pedido e responde lá.
  const reschedule = async () => {
    const failure = await requestService('reschedule_appointment');
    setActionError(failure);
    if (!failure) router.push('/patricia');
  };

  return (
    <ScreenBackground>
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
              Tem alguém acompanhando você.
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
              {actionError ? (
                <ThemedText type="small" style={styles.error}>
                  {actionError}
                </ThemedText>
              ) : null}

              {state.nextAppointment ? (
                <>
                  <NextAppointmentCard
                    appointment={state.nextAppointment}
                    onOpen={() => router.push('/consultas')}
                    onReschedule={reschedule}
                  />
                  <BeforeAppointmentCard />
                </>
              ) : null}

              <MoodWeekCard entries={state.moodEntries} onRegister={registerMood} />

              <CarePlanCard ready={state.carePlanReady} onOpen={() => router.push('/cofre')} />

              {state.daysSinceLastAppointment !== null ? (
                <FollowUpCard
                  daysSinceLast={state.daysSinceLastAppointment}
                  onPress={() => router.push('/consultas')}
                />
              ) : null}
            </>
          ) : null}

          <ThemedText type="small" style={styles.demo}>
            Versão de demonstração: dados fictícios, nada é enviado ao consultório.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

// Pedido de informações antes da próxima consulta.
function BeforeAppointmentCard() {
  return (
    <Card style={styles.row}>
      <IconBadge
        name={{ ios: 'doc.text', android: 'description', web: 'description' }}
        tone="blue"
        size={46}
      />
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={styles.cardTitle}>
          Antes da sua consulta
        </ThemedText>
        <ThemedText type="small" style={styles.muted}>
          O Dr. Aldo pediu algumas informações sobre como você esteve nos últimos dias.
        </ThemedText>
        <View style={styles.rowAction}>
          <View style={styles.duration}>
            <SymbolView
              name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
              tintColor={Tokens.color.muted}
              size={16}
            />
            <ThemedText type="small" style={styles.muted}>
              3 minutos
            </ThemedText>
          </View>
          <GradientButton
            label="Responder agora"
            size="small"
            onPress={() => router.push('/questionarios')}
          />
        </View>
      </View>
    </Card>
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
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  brand: {
    gap: 2,
  },
  brandName: {
    color: Tokens.color.brand,
    fontSize: 24,
    lineHeight: 30,
  },
  muted: {
    color: Tokens.color.muted,
  },
  greeting: {
    gap: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  greetingTitle: {
    color: Tokens.color.text,
    fontSize: 34,
    lineHeight: 40,
  },
  greetingSubtitle: {
    color: Tokens.color.muted,
    fontSize: 18,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  rowAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    color: Tokens.color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  demo: {
    textAlign: 'center',
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
