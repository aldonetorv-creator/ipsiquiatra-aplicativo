import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Composer } from '@/components/patricia/composer';
import { HelpPanel } from '@/components/patricia/help-panel';
import { MessageBubble, PatriciaRow } from '@/components/patricia/message-bubble';
import { MoodCheckCard } from '@/components/patricia/mood-check-card';
import { PatriciaAvatar } from '@/components/patricia/patricia-avatar';
import { ThemedText } from '@/components/themed-text';
import { ScreenBackground } from '@/components/ui/screen-background';
import { MaxContentWidth, Tokens } from '@/constants/theme';
import { ConversationMessage } from '@/contracts/platform';
import { useConversation } from '@/hooks/use-conversation';
import { dayKey, formatDayLabel } from '@/utils/time';

// Linhas da conversa: mensagens com um separador sempre que o dia muda.
type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: ConversationMessage };

function withDaySeparators(messages: ConversationMessage[]): Row[] {
  const rows: Row[] = [];
  let currentDay = '';
  for (const message of messages) {
    const day = dayKey(new Date(message.sentAt));
    if (day !== currentDay) {
      currentDay = day;
      rows.push({ kind: 'day', key: `day-${day}`, label: formatDayLabel(message.sentAt) });
    }
    rows.push({ kind: 'message', key: message.id, message });
  }
  return rows;
}

export default function PatriciaScreen() {
  const { state, sendMessage, recordMood, requestService, clearHistory } = useConversation();
  const [actionError, setActionError] = useState<string | null>(null);
  // Os atalhos ficam escondidos até o paciente tocar no "+".
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const renderItem = ({ item }: { item: Row }) => {
    if (item.kind === 'day') {
      return (
        <View style={styles.day}>
          <ThemedText type="small" style={styles.dayText}>
            {item.label}
          </ThemedText>
        </View>
      );
    }
    const message = item.message;
    return message.kind === 'mood_check' ? (
      <PatriciaRow>
        <MoodCheckCard
          message={message}
          onSubmit={(level, note) => recordMood({ checkId: message.id, level, note })}
        />
      </PatriciaRow>
    ) : (
      <MessageBubble message={message} />
    );
  };

  // Escolhido um atalho, o painel fecha e o pedido aparece na conversa.
  const runShortcut = async (request: () => Promise<string | null>) => {
    setShortcutsOpen(false);
    setActionError(await request());
  };

  const confirmClear = async () => {
    setConfirmingClear(false);
    setActionError(await clearHistory());
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior="padding" style={styles.column}>
          <View style={styles.header}>
            <View style={styles.avatarRing}>
              <PatriciaAvatar size={64} zoomable />
            </View>
            <View style={styles.headerCopy}>
              <ThemedText type="subtitle" style={styles.name}>
                Patrícia
              </ThemedText>
              <ThemedText type="small" style={styles.role}>
                Assistente do Dr. Aldo
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apagar histórico"
              onPress={() => setConfirmingClear(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                tintColor={Tokens.color.muted}
                size={20}
              />
            </Pressable>
          </View>

          {confirmingClear ? (
            <View style={styles.confirm}>
              <ThemedText type="small" style={styles.confirmText}>
                Apagar toda a conversa e os registros de humor deste aparelho? Não dá para desfazer.
              </ThemedText>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmingClear(false)}
                  style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={styles.cancelText}>
                    Cancelar
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar: apagar histórico"
                  onPress={confirmClear}
                  style={({ pressed }) => [
                    styles.confirmButton,
                    styles.deleteButton,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold" style={styles.deleteText}>
                    Apagar
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.notice}>
            <SymbolView
              name={{ ios: 'info.circle', android: 'info', web: 'info' }}
              tintColor={Tokens.color.brandDeep}
              size={18}
            />
            <ThemedText type="small" style={styles.noticeText}>
              Versão de demonstração: a Patrícia ainda não lê suas mensagens. O histórico fica salvo
              só neste aparelho. Em emergência, ligue 188 (CVV) ou 192 (SAMU).
            </ThemedText>
          </View>

          {state.status === 'error' ? (
            <View style={styles.centered}>
              <ThemedText type="default" style={styles.role}>
                {state.error}
              </ThemedText>
            </View>
          ) : (
            // Lista invertida (padrão de chat): abre já nas mensagens mais
            // recentes, e as novas entram embaixo sem precisar rolar.
            <FlatList
              inverted
              data={withDaySeparators(state.messages).reverse()}
              keyExtractor={(row) => row.key}
              renderItem={renderItem}
              contentContainerStyle={styles.messages}
              keyboardShouldPersistTaps="handled"
            />
          )}

          <View style={styles.footer}>
            {actionError ? (
              <ThemedText type="small" style={styles.actionError}>
                {actionError}
              </ThemedText>
            ) : null}
            {shortcutsOpen ? (
              <HelpPanel
                items={[
                  {
                    label: 'Agendar consulta',
                    icon: {
                      ios: 'calendar.badge.plus',
                      android: 'calendar_add_on',
                      web: 'calendar_add_on',
                    },
                    tone: 'blue',
                    onPress: () => runShortcut(() => requestService('schedule_appointment')),
                  },
                  {
                    label: 'Remarcar',
                    icon: {
                      ios: 'arrow.triangle.2.circlepath',
                      android: 'event_repeat',
                      web: 'event_repeat',
                    },
                    tone: 'purple',
                    onPress: () => runShortcut(() => requestService('reschedule_appointment')),
                  },
                  {
                    label: 'Pedir nota fiscal',
                    icon: { ios: 'doc.plaintext', android: 'receipt_long', web: 'receipt_long' },
                    tone: 'purple',
                    onPress: () => runShortcut(() => requestService('request_invoice')),
                  },
                  {
                    label: 'Encontrar documento',
                    icon: { ios: 'folder', android: 'folder_open', web: 'folder_open' },
                    tone: 'blue',
                    onPress: () => {
                      setShortcutsOpen(false);
                      router.push('/cofre');
                    },
                  },
                ]}
              />
            ) : null}
            <Composer
              onSend={sendMessage}
              // Ao começar a digitar, os atalhos saem do caminho.
              onFocusChange={(focused) => focused && setShortcutsOpen(false)}
              shortcutsOpen={shortcutsOpen}
              onToggleShortcuts={() => setShortcutsOpen((open) => !open)}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Tokens.color.brandBorder,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  clear: {
    alignSelf: 'flex-start',
    padding: 8,
    borderRadius: 999,
  },
  pressed: {
    opacity: 0.6,
  },
  confirm: {
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Tokens.color.surface,
    borderWidth: 1,
    borderColor: Tokens.color.brandBorder,
  },
  confirmText: {
    color: Tokens.color.text,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Tokens.color.border,
  },
  cancelText: {
    color: Tokens.color.text,
  },
  deleteButton: {
    borderColor: Tokens.color.brandDeep,
    backgroundColor: Tokens.color.brandDeep,
  },
  deleteText: {
    color: Tokens.color.onBrand,
  },
  day: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  dayText: {
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  name: {
    color: Tokens.color.brand,
    fontSize: 26,
    lineHeight: 32,
  },
  role: {
    color: Tokens.color.muted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 234, 253, 0.9)',
  },
  noticeText: {
    flex: 1,
    color: Tokens.color.brandDeep,
    fontSize: 13,
    lineHeight: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  messages: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  footer: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  actionError: {
    color: Tokens.color.brandDeep,
  },
});
