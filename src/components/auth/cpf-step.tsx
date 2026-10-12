import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { StepHint, StepLayout, stepColors } from '@/components/auth/step-layout';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { LoginFlow } from '@/hooks/use-login-flow';

// Passo 1 de 2: o CPF.
export function CpfStep({ flow, onBack }: { flow: LoginFlow; onBack: () => void }) {
  const [focused, setFocused] = useState(false);

  return (
    <StepLayout
      step={1}
      steps={2}
      title="Qual é o seu CPF?"
      onBack={onBack}
      next={{
        label: 'Receber código por SMS',
        onPress: flow.requestCode,
        disabled: !flow.cpfComplete,
        loading: flow.sending,
      }}>
      <TextInput
        accessibilityLabel="CPF"
        value={flow.cpf}
        onChangeText={flow.setCpf}
        onSubmitEditing={flow.requestCode}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={14}
        autoFocus
        placeholder="000.000.000-00"
        placeholderTextColor={stepColors.placeholder}
        selectionColor={Tokens.color.brand}
        style={[
          styles.input,
          focused && styles.inputFocused,
          flow.error ? styles.inputError : null,
        ]}
      />
      {flow.error ? (
        <StepHint text={flow.error} tone="error" />
      ) : (
        <StepHint text="Vamos enviar um código por SMS para o celular do seu cadastro na clínica." />
      )}
      <View style={styles.privacy}>
        <SymbolView
          name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          tintColor={Tokens.color.muted}
          size={14}
        />
        <ThemedText type="small" style={styles.privacyText}>
          Seu CPF não fica salvo neste celular.
        </ThemedText>
      </View>
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: Tokens.color.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 2,
    borderBottomColor: stepColors.line,
    outlineWidth: 0,
  },
  inputFocused: {
    borderBottomColor: Tokens.color.brand,
  },
  inputError: {
    borderBottomColor: Tokens.color.danger,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  privacyText: {
    color: Tokens.color.muted,
  },
});
