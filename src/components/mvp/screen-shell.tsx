import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/mvp/brand-mark';
import { StatusPill } from '@/components/mvp/cards';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Tokens } from '@/constants/theme';

type ScreenShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function ScreenShell({ eyebrow, title, description, children }: ScreenShellProps) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}>
          <View style={styles.header}>
            <BrandMark />
            <View style={styles.headerCopy}>
              <StatusPill>Sprint 0 mock</StatusPill>
              <ThemedText type="smallBold" style={styles.eyebrow}>
                {eyebrow}
              </ThemedText>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              <ThemedText type="default" style={styles.description}>
                {description}
              </ThemedText>
            </View>
          </View>
          {children}
        </ScrollView>
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
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: BottomTabInset + 28,
    gap: 18,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    color: Tokens.color.brand,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 34,
    lineHeight: 38,
  },
  description: {
    color: Tokens.color.muted,
  },
});
