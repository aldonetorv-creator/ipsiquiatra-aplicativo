import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DateBadge } from '@/components/appointments/date-badge';
import { NextAppointmentCard } from '@/components/appointments/next-appointment-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientButton } from '@/components/ui/gradient-button';
import { PageScreen, SectionLabel } from '@/components/ui/page-screen';
import { Shadows, Tokens } from '@/constants/theme';
import { Appointment, PatientService } from '@/contracts/platform';
import { useAppointments } from '@/hooks/use-appointments';
import { modalityLabel } from '@/utils/appointments';
import { formatLongDate, formatTime } from '@/utils/time';

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
            state.past.map((appointment) => (
              <PastAppointmentRow
                key={appointment.id}
                appointment={appointment}
                onPress={() => router.push('/cofre')}
              />
            ))
          )}
        </>
      )}
    </PageScreen>
  );
}

function PastAppointmentRow({
  appointment,
  onPress,
}: {
  appointment: Appointment;
  onPress: () => void;
}) {
  const when = formatLongDate(appointment.startsAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver documentos da consulta de ${when}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <DateBadge iso={appointment.startsAt} />
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={styles.rowTitle}>
          {`Consulta com ${appointment.doctor.name}`}
        </ThemedText>
        <ThemedText type="small" style={styles.muted}>
          {`${when} · ${formatTime(appointment.startsAt)}`}
        </ThemedText>
        <ThemedText type="small" style={styles.link}>
          {`${modalityLabel[appointment.modality]} · Ver documentos`}
        </ThemedText>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        tintColor={Tokens.color.brand}
        size={20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: Tokens.color.muted,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(225, 228, 242, 0.7)',
    backgroundColor: Tokens.color.surface,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.85,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: Tokens.color.text,
  },
  link: {
    color: Tokens.color.brand,
  },
});
