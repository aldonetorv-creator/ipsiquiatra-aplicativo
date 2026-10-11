import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { ReminderSettings } from '@/contracts/platform';
import type { NotificationAccess } from '@/services/daily-reminders';
import { CARE_HOUR } from '@/utils/care-contacts';
import { DAILY_REMINDER_HOUR, TEST_DELAY_SECONDS } from '@/utils/daily-reminder';

type Props = {
  visible: boolean;
  settings: ReminderSettings;
  // Devolve a mensagem de erro, ou null se salvou.
  onSave: (settings: ReminderSettings) => Promise<string | null>;
  onClose: () => void;
  // Situação das notificações no celular e o envio de um lembrete de teste.
  access: NotificationAccess;
  onTest: () => Promise<boolean>;
};

// O horário é do produto (decisão do Dr. Aldo; ver docs/fases.md): o paciente
// só liga ou desliga o lembrete diário e pode testar como ele chega.
export function ReminderSheet({ visible, ...props }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={props.onClose}>
      {visible ? <Sheet {...props} /> : null}
    </Modal>
  );
}

function Sheet({ settings, onSave, onClose, access, onTest }: Omit<Props, 'visible'>) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const test = async () => {
    const sent = await onTest();
    setTestResult(
      sent
        ? `Pronto! Em ${TEST_DELAY_SECONDS} segundos chega um lembrete de teste.`
        : 'Não deu para testar: as notificações do app estão bloqueadas neste celular.'
    );
  };

  const save = async () => {
    setSaving(true);
    const failure = await onSave({ enabled });
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
          Todo dia às {DAILY_REMINDER_HOUR}h, a Patrícia pergunta como você está e oferece o diário
          de humor. Se o dia não estiver fácil, ela volta a falar com você às {CARE_HOUR}h do dia
          seguinte.
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
  label: {
    color: Tokens.color.text,
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
