import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';

type PanelProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export function Panel({ children, style }: PanelProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'primary' | 'calm' | 'warm';
};

export function StatCard({ label, value, tone = 'primary' }: StatCardProps) {
  return (
    <View style={[styles.stat, styles[tone]]}>
      <ThemedText type="small" style={styles.statLabel}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.statValue}>
        {value}
      </ThemedText>
    </View>
  );
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

export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <View style={styles.pill}>
      <ThemedText type="code" style={styles.pillText}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Tokens.color.border,
    backgroundColor: Tokens.color.surface,
    padding: 18,
    gap: 14,
  },
  stat: {
    flex: 1,
    minWidth: 110,
    borderRadius: 8,
    padding: 14,
    gap: 8,
    borderWidth: 1,
  },
  primary: {
    backgroundColor: '#F3F0FF',
    borderColor: '#DDD2FF',
  },
  calm: {
    backgroundColor: '#EAF7F5',
    borderColor: '#BCE4DF',
  },
  warm: {
    backgroundColor: '#FFF4E2',
    borderColor: '#F1D4A5',
  },
  statLabel: {
    color: Tokens.color.muted,
  },
  statValue: {
    color: Tokens.color.text,
    fontSize: 18,
    lineHeight: 22,
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
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#EEE8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    color: Tokens.color.brandDeep,
    textTransform: 'uppercase',
  },
});
