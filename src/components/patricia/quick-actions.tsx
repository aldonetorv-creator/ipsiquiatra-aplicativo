import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';

export type QuickAction = {
  label: string;
  icon: SymbolViewProps['name'];
  onPress: () => void;
};

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled">
      {actions.map((action) => (
        <Pressable
          key={action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
          <SymbolView name={action.icon} tintColor={Tokens.color.blue} size={18} />
          <ThemedText type="small" style={styles.label}>
            {action.label}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Tokens.color.border,
    backgroundColor: Tokens.color.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    color: Tokens.color.blue,
  },
});
