import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ScreenBackground } from '@/components/ui/screen-background';
import { MaxContentWidth, Tokens } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

// Tela com rolagem, título grande e o fundo em degradê (Consultas, Cofre).
export function PageScreen({ title, subtitle, children }: Props) {
  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {title}
            </ThemedText>
            <ThemedText type="default" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          </View>
          {children}
          <ThemedText type="small" style={styles.demo}>
            Versão de demonstração: dados fictícios, nada é enviado ao consultório.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

// Rótulo de seção ("Próxima consulta", "Consultas anteriores").
export function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" style={styles.section}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  header: {
    gap: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    color: Tokens.color.muted,
    fontSize: 18,
  },
  section: {
    marginTop: 6,
    color: Tokens.color.brand,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  demo: {
    textAlign: 'center',
    color: Tokens.color.muted,
    fontSize: 12,
    lineHeight: 16,
  },
});
