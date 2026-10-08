import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { DoctorAvatar } from '@/components/appointments/doctor-avatar';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { GradientButton } from '@/components/ui/gradient-button';
import { IconBadge } from '@/components/ui/icon-badge';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { Appointment } from '@/contracts/platform';
import { modalityLabel } from '@/utils/appointments';
import { formatDayMonth, formatDaysUntil, formatTime } from '@/utils/time';

type Props = {
  appointment: Appointment;
  onReschedule: () => void;
  // Sem `onOpen`, o botão "Ver consulta" não aparece (ex.: já na tela Consultas).
  onOpen?: () => void;
};

export function NextAppointmentCard({ appointment, onReschedule, onOpen }: Props) {
  const isTelemedicine = appointment.modality === 'telemedicine';
  return (
    <Card>
      <View style={styles.header}>
        <IconBadge
          name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
          tone="blue"
          size={46}
        />
        <View style={styles.copy}>
          <ThemedText type="smallBold" style={styles.title}>
            Sua próxima consulta
          </ThemedText>
          <ThemedText type="smallBold" style={styles.when}>
            {`${formatDayMonth(appointment.startsAt)} · ${formatTime(appointment.startsAt)}`}
          </ThemedText>
          <View style={styles.chip}>
            <ThemedText type="smallBold" style={styles.chipText}>
              {formatDaysUntil(appointment.startsAt)}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.doctor}>
        <DoctorAvatar doctor={appointment.doctor} />
        <View style={styles.copy}>
          <ThemedText type="smallBold" style={styles.doctorName}>
            {appointment.doctor.name}
          </ThemedText>
          <ThemedText type="small" style={styles.muted}>
            {appointment.doctor.specialty}
          </ThemedText>
        </View>
        <View style={styles.modality}>
          <SymbolView
            name={
              isTelemedicine
                ? { ios: 'video.fill', android: 'videocam', web: 'videocam' }
                : { ios: 'building.2', android: 'apartment', web: 'apartment' }
            }
            tintColor={Tokens.color.brand}
            size={16}
          />
          <ThemedText type="smallBold" style={styles.modalityText}>
            {modalityLabel[appointment.modality]}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actions}>
        {onOpen ? (
          <View style={styles.action}>
            <GradientButton label="Ver consulta" onPress={onOpen} chevron={false} />
          </View>
        ) : null}
        <View style={styles.action}>
          <OutlineButton
            label="Remarcar"
            accessibilityLabel="Remarcar consulta"
            onPress={onReschedule}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 18,
    lineHeight: 24,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: Tokens.color.brandSoft,
  },
  chipText: {
    color: Tokens.color.brand,
    fontSize: 12,
    lineHeight: 16,
  },
  when: {
    color: Tokens.color.blue,
    fontSize: 17,
    lineHeight: 23,
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: Tokens.color.surfaceMuted,
  },
  doctorName: {
    color: Tokens.color.text,
  },
  muted: {
    color: Tokens.color.muted,
  },
  modality: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalityText: {
    color: Tokens.color.brand,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
