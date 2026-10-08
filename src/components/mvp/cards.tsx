import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Shadows, Tokens } from '@/constants/theme';

type PanelProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function Panel({ children, style }: PanelProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

type ListItemProps = {
  title: string;
  meta?: string;
  children: ReactNode;
};

export function ListItem({ title, meta, children }: ListItemProps) {
  return (
    <View style={styles.listItem}>
      <View style={styles.listHeader}>
        <ThemedText type="smallBold" style={styles.listTitle}>
          {title}
        </ThemedText>
        {meta ? (
          <ThemedText type="small" style={styles.meta}>
            {meta}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="small" style={styles.body}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(225, 228, 242, 0.7)',
    backgroundColor: Tokens.color.surface,
    boxShadow: Shadows.card,
    padding: 18,
    gap: 14,
  },
  listItem: {
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Tokens.color.border,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  listTitle: {
    color: Tokens.color.text,
    flex: 1,
  },
  meta: {
    color: Tokens.color.muted,
  },
  body: {
    color: Tokens.color.muted,
  },
});
