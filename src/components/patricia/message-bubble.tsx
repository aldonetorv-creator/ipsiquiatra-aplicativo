import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PatriciaAvatar } from './patricia-avatar';

import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { TextMessage } from '@/contracts/platform';
import { formatTime } from '@/utils/time';

export function MessageBubble({ message }: { message: TextMessage }) {
  const fromPatient = message.author === 'patient';

  return (
    <View style={[styles.row, fromPatient && styles.rowPatient]}>
      {fromPatient ? null : <PatriciaAvatar size={36} />}
      <View style={[styles.bubble, fromPatient ? styles.bubblePatient : styles.bubblePatricia]}>
        <ThemedText type="default" style={styles.text}>
          {message.text}
        </ThemedText>
        <ThemedText type="small" style={styles.time}>
          {formatTime(message.sentAt)}
        </ThemedText>
      </View>
    </View>
  );
}

export function PatriciaRow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.row}>
      <PatriciaAvatar size={36} />
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
});
