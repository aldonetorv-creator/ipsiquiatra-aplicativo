import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AppointmentWheel } from '@/components/appointments/appointment-wheel';
import { NextAppointmentCard } from '@/components/appointments/next-appointment-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientButton } from '@/components/ui/gradient-button';
import { PageScreen, SectionLabel } from '@/components/ui/page-screen';
import { Tokens } from '@/constants/theme';
import { PatientService } from '@/contracts/platform';
import { useAppointments } from '@/hooks/use-appointments';

export default function ConsultasScreen() {
  const { state, requestService } = useAppointments();
  const [actionError, setActionError] = useState<string | null>(null);

  // O pedido vai para a conversa: a Patrícia recebe e responde lá.
  const askPatricia = async (service: PatientService) => {
    const failure = await requestService(service);
    setActionError(failure);
    if (!failure) router.push('/patricia');
  };

  return (
    <PageScreen title="Consultas" subtitle="Sua agenda com o Dr. Aldo.">
      {state.status === 'loading' ? (
        <ThemedText type="small" style={styles.muted}>
          Carregando consultas…
        </ThemedText>
      ) : state.status === 'error' ? (
        <ThemedText type="default" style={styles.muted}>
          {state.error}
        </ThemedText>
      ) : (
        <>
          {actionError ? (
            <ThemedText type="small" style={styles.error}>
              {actionError}
            </ThemedText>
          ) : null}

          {state.next ? (
            <NextAppointmentCard
              appointment={state.next}
              onReschedule={() => askPatricia('reschedule_appointment')}
            />
          ) : (
            <Card>
              <ThemedText type="default" style={styles.muted}>
                Você não tem consulta marcada.
              </ThemedText>
            </Card>
          )}
          <GradientButton
            label="Agendar nova consulta"
            onPress={() => askPatricia('schedule_appointment')}
          />

          <SectionLabel>Consultas anteriores</SectionLabel>
          {state.past.length === 0 ? (
            <ThemedText type="small" style={styles.muted}>
              Suas consultas realizadas vão aparecer aqui.
            </ThemedText>
          ) : (
            <>
              <AppointmentWheel
                appointments={state.past}
                onSelect={(appointment) =>
                  router.push({ pathname: '/cofre', params: { consulta: appointment.id } })
                }
              />
              <ThemedText type="small" style={styles.hint}>
                {`${state.past.length} ${
                  state.past.length === 1 ? 'consulta' : 'consultas'
                } com o Dr. Aldo. Gire para ver todas e toque numa consulta para abrir os documentos dela no Cofre.`}
              </ThemedText>
            </>
          )}
        </>
      )}
    </PageScreen>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: Tokens.color.muted,
  },
  hint: {
    color: Tokens.color.muted,
    textAlign: 'center',
  },
  error: {
    color: Tokens.color.brandDeep,
  },
});
