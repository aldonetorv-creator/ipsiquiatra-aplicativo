import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
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

export default function PatriciaScreen() {
  const { state, sendMessage, recordMood, requestService } = useConversation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const list = useRef<FlatList<ConversationMessage>>(null);

  const renderItem = ({ item }: { item: ConversationMessage }) =>
    item.kind === 'mood_check' ? (
      <PatriciaRow>
        <MoodCheckCard
          message={item}
          onSubmit={(level, note) => recordMood({ checkId: item.id, level, note })}
        />
      </PatriciaRow>
    ) : (
      <MessageBubble message={item} />
    );

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
          </View>

          <View style={styles.notice}>
            <SymbolView
              name={{ ios: 'info.circle', android: 'info', web: 'info' }}
              tintColor={Tokens.color.brandDeep}
              size={18}
            />
            <ThemedText type="small" style={styles.noticeText}>
              Versão de demonstração: a Patrícia ainda não lê suas mensagens. Em emergência, ligue
              188 (CVV) ou 192 (SAMU).
            </ThemedText>
          </View>

          {state.status === 'error' ? (
            <View style={styles.centered}>
              <ThemedText type="default" style={styles.role}>
                {state.error}
              </ThemedText>
            </View>
          ) : (
            <FlatList
              ref={list}
              data={state.messages}
              keyExtractor={(message) => message.id}
              renderItem={renderItem}
              contentContainerStyle={styles.messages}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            />
          )}

          <View style={styles.footer}>
            {actionError ? (
              <ThemedText type="small" style={styles.actionError}>
                {actionError}
              </ThemedText>
            ) : null}
            {/* Recolhido enquanto o paciente digita, para sobrar espaço à conversa. */}
            {composing ? null : (
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
                    onPress: async () =>
                      setActionError(await requestService('schedule_appointment')),
                  },
                  {
                    label: 'Remarcar',
                    icon: {
                      ios: 'arrow.triangle.2.circlepath',
                      android: 'event_repeat',
                      web: 'event_repeat',
                    },
                    tone: 'purple',
                    onPress: async () =>
                      setActionError(await requestService('reschedule_appointment')),
                  },
                  {
                    label: 'Pedir nota fiscal',
                    icon: { ios: 'doc.plaintext', android: 'receipt_long', web: 'receipt_long' },
                    tone: 'purple',
                    onPress: async () => setActionError(await requestService('request_invoice')),
                  },
                  {
                    label: 'Encontrar documento',
                    icon: { ios: 'folder', android: 'folder_open', web: 'folder_open' },
                    tone: 'blue',
                    onPress: () => router.push('/cofre'),
                  },
                ]}
              />
            )}
            <Composer onSend={sendMessage} onFocusChange={setComposing} />
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
    gap: 2,
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
