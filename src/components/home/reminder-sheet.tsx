import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { ReminderSettings } from '@/contracts/platform';
import { formatReminderTime } from '@/utils/daily-reminder';

const STEP_MINUTES = 30;
const EARLIEST = 6 * 60;
const LATEST = 23 * 60 + 30;

type Props = {
  visible: boolean;
  settings: ReminderSettings;
  // Devolve a mensagem de erro, ou null se salvou.
  onSave: (settings: ReminderSettings) => Promise<string | null>;
  onClose: () => void;
};

// O paciente escolhe o horário do lembrete diário ou desliga (decisão do
// Dr. Aldo; ver docs/fases.md).
export function ReminderSheet({ visible, settings, onSave, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible ? <Sheet settings={settings} onSave={onSave} onClose={onClose} /> : null}
    </Modal>
  );
}

function Sheet({ settings, onSave, onClose }: Omit<Props, 'visible'>) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [minutes, setMinutes] = useState(settings.hour * 60 + settings.minute);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const time = { hour: Math.floor(minutes / 60), minute: minutes % 60 };
  const shift = (delta: number) =>
    setMinutes((current) => Math.min(LATEST, Math.max(EARLIEST, current + delta)));

  const save = async () => {
    setSaving(true);
    const failure = await onSave({ enabled, ...time });
    setSaving(false);
    if (failure) setError(failure);
    else onClose();
  };

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar sem salvar"
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ThemedText type="smallBold" style={styles.title}>
          Lembrete da Patrícia
        </ThemedText>
        <ThemedText type="small" style={styles.muted}>
          Todo dia, a Patrícia pergunta como você está e oferece o diário de humor.
        </ThemedText>

        <View style={styles.row}>
          <ThemedText type="default" style={styles.label}>
            Receber o lembrete
          </ThemedText>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            accessibilityLabel="Receber o lembrete diário"
            trackColor={{ true: Tokens.color.brand, false: Tokens.color.border }}
          />
        </View>

        <View style={[styles.row, !enabled && styles.disabled]}>
          <ThemedText type="default" style={styles.label}>
            Horário
          </ThemedText>
          <View style={styles.stepper}>
            <StepButton
              icon="minus"
              label="30 minutos mais cedo"
              disabled={!enabled || minutes <= EARLIEST}
              onPress={() => shift(-STEP_MINUTES)}
            />
            <ThemedText
              type="subtitle"
              style={styles.time}
              accessibilityLabel={`Horário do lembrete: ${formatReminderTime(time)}`}>
              {formatReminderTime(time)}
            </ThemedText>
            <StepButton
              icon="plus"
              label="30 minutos mais tarde"
              disabled={!enabled || minutes >= LATEST}
              onPress={() => shift(STEP_MINUTES)}
            />
          </View>
        </View>

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.action}>
            <OutlineButton label="Cancelar" onPress={onClose} />
          </View>
          <View style={styles.action}>
            <GradientButton label="Salvar" chevron={false} disabled={saving} onPress={save} />
          </View>
        </View>
      </View>
    </View>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'minus' | 'plus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.step, (pressed || disabled) && styles.dimmed]}>
      <SymbolView
        name={
          icon === 'plus'
            ? { ios: 'plus', android: 'add', web: 'add' }
            : { ios: 'minus', android: 'remove', web: 'remove' }
        }
        tintColor={Tokens.color.brand}
        size={20}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(22, 16, 48, 0.45)',
  },
  sheet: {
    gap: 14,
    padding: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Tokens.color.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Tokens.color.border,
  },
  title: {
    color: Tokens.color.brand,
    fontSize: 18,
    lineHeight: 24,
  },
  muted: {
    color: Tokens.color.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: Tokens.color.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Tokens.color.brandSoft,
  },
  dimmed: {
    opacity: 0.5,
  },
  time: {
    minWidth: 76,
    textAlign: 'center',
    color: Tokens.color.text,
    fontSize: 26,
    lineHeight: 32,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
