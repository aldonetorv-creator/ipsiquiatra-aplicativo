import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Gradients, Tokens } from '@/constants/theme';

type NextButton = {
  label: string;
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
};

type Props = {
  step: number;
  steps: number;
  title: string;
  onBack: () => void;
  next: NextButton;
  children: ReactNode;
};

// Uma pergunta por tela, como nos apps de banco: voltar e progresso no topo, a
// pergunta em destaque e o botão redondo de seguir logo acima do teclado.
export function StepLayout({ step, steps, title, onBack, next, children }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* "padding" nos dois sistemas: no Android com a tela de ponta a ponta o
          teclado não encolhe a janela, e a conta do KeyboardAvoidingView usa a
          posição real da tela, então não soma duas vezes onde ele encolhe. */}
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                tintColor={Tokens.color.text}
                size={24}
              />
            </Pressable>
            <View
              style={styles.progress}
              accessibilityRole="progressbar"
              accessibilityLabel={`Passo ${step} de ${steps}`}
              accessibilityValue={{ min: 0, max: steps, now: step }}>
              {Array.from({ length: steps }, (_, i) => (
                <View key={i} style={[styles.segment, i < step && styles.segmentDone]} />
              ))}
            </View>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <ThemedText accessibilityRole="header" style={styles.title}>
              {title}
            </ThemedText>
            {children}
          </ScrollView>

          <View style={styles.footer}>
            <RoundButton {...next} />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function RoundButton({ label, onPress, disabled, loading }: NextButton) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        !disabled && styles.roundLifted,
        pressed && styles.roundPressed,
      ]}>
      {disabled ? null : (
        <LinearGradient
          colors={Gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.roundFill}
        />
      )}
      {loading ? (
        <ActivityIndicator color={Tokens.color.onBrand} />
      ) : (
        <SymbolView
          name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
          tintColor={disabled ? '#A3A9C7' : Tokens.color.onBrand}
          size={26}
        />
      )}
    </Pressable>
  );
}

// Texto de apoio e aviso de erro das perguntas.
export function StepHint({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }) {
  return (
    <ThemedText
      type="default"
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.hint, tone === 'error' && styles.hintError]}>
      {text}
    </ThemedText>
  );
}

export const stepColors = {
  line: '#E1E4F2',
  placeholder: '#B9BFDA',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Tokens.color.surface,
  },
  flex: {
    flex: 1,
  },
  header: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Tokens.color.surfaceMuted,
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: stepColors.line,
  },
  segmentDone: {
    backgroundColor: Tokens.color.brand,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    color: Tokens.color.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  hint: {
    color: Tokens.color.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  hintError: {
    color: Tokens.color.danger,
  },
  footer: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  round: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0F8',
  },
  roundFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 32,
  },
  roundLifted: {
    boxShadow: '0px 10px 24px rgba(74, 31, 154, 0.32)',
  },
  roundPressed: {
    transform: [{ scale: 0.95 }],
  },
});
