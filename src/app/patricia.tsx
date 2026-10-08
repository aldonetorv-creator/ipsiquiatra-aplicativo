import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Composer } from '@/components/patricia/composer';
import { MessageBubble, PatriciaRow } from '@/components/patricia/message-bubble';
import { MoodCheckCard } from '@/components/patricia/mood-check-card';
import { PatriciaAvatar } from '@/components/patricia/patricia-avatar';
import { QuickActions } from '@/components/patricia/quick-actions';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Tokens } from '@/constants/theme';
import { ConversationMessage } from '@/contracts/platform';
import { useConversation } from '@/hooks/use-conversation';

export default function PatriciaScreen() {
  const { state, sendMessage, requestMoodCheck, recordMood } = useConversation();
  const [actionError, setActionError] = useState<string | null>(null);
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
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView behavior="padding" style={styles.column}>
          <View style={styles.header}>
            <PatriciaAvatar size={56} />
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
            <QuickActions
              actions={[
                {
                  label: 'Registrar humor',
                  icon: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
                  onPress: async () => setActionError(await requestMoodCheck()),
                },
                {
                  label: 'Minhas consultas',
                  icon: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
                  onPress: () => router.push('/consultas'),
                },
                {
                  label: 'Meus documentos',
                  icon: { ios: 'doc.text', android: 'description', web: 'description' },
                  onPress: () => router.push('/cofre'),
                },
              ]}
            />
            <Composer onSend={sendMessage} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Tokens.color.background,
  },
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
  headerCopy: {
    gap: 2,
  },
  name: {
    color: Tokens.color.text,
    fontSize: 24,
    lineHeight: 30,
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
    borderRadius: 12,
    backgroundColor: Tokens.color.brandSoft,
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
    borderTopWidth: 1,
    borderTopColor: Tokens.color.border,
    backgroundColor: Tokens.color.background,
  },
  actionError: {
    color: Tokens.color.brandDeep,
  },
});
