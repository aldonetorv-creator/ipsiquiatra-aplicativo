import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PatriciaAvatar } from './patricia-avatar';

import { EmergencyCard } from '@/components/questionnaires/emergency-card';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { TextMessage } from '@/contracts/platform';
import { formatTime } from '@/utils/time';

type Props = {
  message: TextMessage;
  // Toque num horário oferecido pela Patrícia real.
  onPickSlot?: (slotId: string) => void;
  // Toque numa das consultas do paciente identificado (qual remarcar ou cancelar).
  onPickAppointment?: (appointmentId: string) => void;
  busy?: boolean;
};

export function MessageBubble({ message, onPickSlot, onPickAppointment, busy = false }: Props) {
  const fromPatient = message.author === 'patient';
  const slots = !fromPatient && onPickSlot ? (message.slots ?? []) : [];
  const appointments = !fromPatient && onPickAppointment ? (message.appointments ?? []) : [];

  const bubble = (
    <View style={[styles.bubble, fromPatient ? styles.bubblePatient : styles.bubblePatricia]}>
      <ThemedText type="default" style={styles.text}>
        {message.text}
      </ThemedText>
      <ThemedText type="small" style={styles.time}>
        {formatTime(message.sentAt)}
      </ThemedText>
    </View>
  );

  if (fromPatient) return <View style={[styles.row, styles.rowPatient]}>{bubble}</View>;
  if (!slots.length && !appointments.length && !message.crisis) {
    return (
      <View style={styles.row}>
        <PatriciaAvatar size={36} zoomable />
        {bubble}
      </View>
    );
  }
  return (
    <PatriciaRow>
      <View style={styles.stack}>
        {bubble}
        {slots.length ? (
          <View style={styles.slots}>
            {slots.map((slot) => (
              <Pressable
                key={slot.id}
                accessibilityRole="button"
                accessibilityLabel={`Escolher ${slot.label}`}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => onPickSlot?.(slot.id)}
                style={({ pressed }) => [styles.slot, (pressed || busy) && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.slotText}>
                  {slot.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
        {appointments.length ? (
          <View style={styles.slots}>
            {appointments.map((appointment) => (
              <Pressable
                key={appointment.id}
                accessibilityRole="button"
                accessibilityLabel={`Escolher a consulta de ${appointment.label}`}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => onPickAppointment?.(appointment.id)}
                style={({ pressed }) => [styles.slot, (pressed || busy) && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.slotText}>
                  {appointment.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
        {message.crisis ? <EmergencyCard demo={false} /> : null}
      </View>
    </PatriciaRow>
  );
}

export function PatriciaRow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.row}>
      <PatriciaAvatar size={36} zoomable />
      <View style={styles.fill}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowPatient: {
    justifyContent: 'flex-end',
  },
  fill: {
    flex: 1,
  },
  stack: {
    gap: 8,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubblePatricia: {
    backgroundColor: Tokens.color.surface,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: Tokens.color.border,
  },
  bubblePatient: {
    backgroundColor: Tokens.color.blueSoft,
    borderTopRightRadius: 6,
  },
  text: {
    color: Tokens.color.text,
  },
  time: {
    alignSelf: 'flex-end',
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Tokens.color.brandBorder,
    backgroundColor: Tokens.color.brandSoft,
  },
  slotText: {
    color: Tokens.color.brandDeep,
  },
  pressed: {
    opacity: 0.6,
  },
});
