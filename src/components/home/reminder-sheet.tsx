import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { ReminderSettings } from '@/contracts/platform';
import type { NotificationAccess } from '@/services/daily-reminders';
import { formatReminderTime, TEST_DELAY_SECONDS } from '@/utils/daily-reminder';

const STEP_MINUTES = 30;
const EARLIEST = 6 * 60;
const LATEST = 23 * 60 + 30;

type Props = {
  visible: boolean;
  settings: ReminderSettings;
  // Devolve a mensagem de erro, ou null se salvou.
  onSave: (settings: ReminderSettings) => Promise<string | null>;
  onClose: () => void;
  // Situação das notificações no celular e o envio de um lembrete de teste.
  access: NotificationAccess;
  onTest: (hour: number) => Promise<boolean>;
};

// O paciente escolhe o horário do lembrete diário ou desliga (decisão do
// Dr. Aldo; ver docs/fases.md).
export function ReminderSheet({ visible, ...props }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={props.onClose}>
      {visible ? <Sheet {...props} /> : null}
    </Modal>
  );
}

function Sheet({ settings, onSave, onClose, access, onTest }: Omit<Props, 'visible'>) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [minutes, setMinutes] = useState(settings.hour * 60 + settings.minute);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const time = { hour: Math.floor(minutes / 60), minute: minutes % 60 };
  const shift = (delta: number) =>
    setMinutes((current) => Math.min(LATEST, Math.max(EARLIEST, current + delta)));

  const test = async () => {
    const sent = await onTest(time.hour);
    setTestResult(
      sent
        ? `Pronto! Em ${TEST_DELAY_SECONDS} segundos chega um lembrete de teste.`
        : 'Não deu para testar: as notificações do app estão bloqueadas neste celular.'
    );
  };

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

        {access === 'blocked' ? (
          <View style={styles.warning}>
            <ThemedText type="small" style={styles.warningText}>
              As notificações do app estão bloqueadas neste celular. Sem elas, o lembrete não
              aparece.
            </ThemedText>
            <OutlineButton label="Abrir configurações" onPress={() => Linking.openSettings()} />
          </View>
        ) : null}

        {access === 'expo_go' ? (
          <ThemedText type="small" style={styles.muted}>
            No Expo Go do Android, as notificações não funcionam. O lembrete aparece na conversa com
            a Patrícia, e a notificação vai funcionar no app instalado.
          </ThemedText>
        ) : null}

        {access !== 'unsupported' && access !== 'expo_go' ? (
          <OutlineButton label="Testar agora" onPress={test} />
        ) : null}
        {testResult ? (
          <ThemedText type="small" style={styles.muted}>
            {testResult}
          </ThemedText>
        ) : null}

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
  warning: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Tokens.color.brandSoft,
  },
  warningText: {
    color: Tokens.color.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
});
