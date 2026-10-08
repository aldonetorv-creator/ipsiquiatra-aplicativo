import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconBadge } from '@/components/ui/icon-badge';
import { Shadows, Tokens } from '@/constants/theme';

export type HelpItem = {
  label: string;
  icon: SymbolViewProps['name'];
  tone: 'blue' | 'purple';
  onPress: () => void;
};

// "Posso ajudar você com:" — atalhos em grade 2x2, como no mockup.
export function HelpPanel({ items }: { items: HelpItem[] }) {
  return (
    <View style={styles.panel}>
      <ThemedText type="smallBold" style={styles.title}>
        Posso ajudar você com:
      </ThemedText>
      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <IconBadge name={item.icon} tone={item.tone} size={34} />
            <ThemedText type="small" style={styles.label} numberOfLines={2}>
              {item.label}
            </ThemedText>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={Tokens.color.muted}
              size={14}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 10,
    padding: 14,
    borderRadius: 22,
    backgroundColor: Tokens.color.surface,
    boxShadow: Shadows.card,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Tokens.color.border,
  },
  pressed: {
    backgroundColor: Tokens.color.brandSoft,
  },
  label: {
    flex: 1,
    color: Tokens.color.text,
    fontSize: 13,
    lineHeight: 17,
  },
});
