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
  tone?: 'purple' | 'blue' | 'white';
};

export function StatCard({ label, value, tone = 'purple' }: StatCardProps) {
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
  purple: {
    backgroundColor: Tokens.color.brandSoft,
    borderColor: Tokens.color.brandBorder,
  },
  blue: {
    backgroundColor: Tokens.color.blueSoft,
    borderColor: Tokens.color.blueBorder,
  },
  white: {
    backgroundColor: Tokens.color.surface,
    borderColor: Tokens.color.border,
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
    backgroundColor: Tokens.color.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    color: Tokens.color.brandDeep,
    textTransform: 'uppercase',
  },
});
