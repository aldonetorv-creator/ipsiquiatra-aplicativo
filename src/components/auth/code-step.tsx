import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { StepHint, StepLayout, stepColors } from '@/components/auth/step-layout';
import { ThemedText } from '@/components/themed-text';
import { Tokens } from '@/constants/theme';
import { authTexts } from '@/contracts/patient-auth';
import { CODE_LENGTH, LoginFlow } from '@/hooks/use-login-flow';

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// Passo 2 de 2: o código do SMS, uma caixa por número.
export function CodeStep({ flow, onBack }: { flow: LoginFlow; onBack: () => void }) {
  // Depois de 1 minuto sem o código, o aviso do celular desatualizado aparece
  // sozinho e fica, mesmo depois de reenviar.
  const [waited, setWaited] = useState(false);
  if (flow.resendIn === 0 && !waited) setWaited(true);

  return (
    <StepLayout
      step={2}
      steps={2}
      title="Digite o código"
      onBack={onBack}
      next={{
        label: 'Entrar',
        onPress: () => flow.confirm(),
        disabled: flow.code.length !== CODE_LENGTH,
        loading: flow.sending,
      }}>
      <StepHint text={authTexts.sent} />
      <CodeBoxes value={flow.code} onChange={flow.setCode} invalid={!!flow.error} />
      {flow.error ? <StepHint text={flow.error} tone="error" /> : null}

      <View style={styles.links}>
        {flow.resendIn > 0 ? (
          <ThemedText type="small" style={styles.muted}>
            Reenviar código em {clock(flow.resendIn)}
          </ThemedText>
        ) : (
          <LinkButton label="Reenviar código" onPress={flow.resend} />
        )}
      </View>

      {waited ? (
        <View style={styles.notice} accessible accessibilityRole="text">
          <SymbolView
            name={{ ios: 'iphone', android: 'smartphone', web: 'smartphone' }}
            tintColor={Tokens.color.brand}
            size={22}
          />
          <View style={styles.noticeCopy}>
            <ThemedText type="smallBold" style={styles.noticeTitle}>
              Não recebeu o código?
            </ThemedText>
            <ThemedText type="small" style={styles.muted}>
              {authTexts.notReceived}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {flow.demoCode ? (
        <View style={styles.demo}>
          <ThemedText type="small" style={styles.demoText}>
            Demonstração: nenhum SMS é enviado. Use o código {flow.demoCode}.
          </ThemedText>
        </View>
      ) : null}
    </StepLayout>
  );
}

// As caixas só mostram o que está no campo de verdade, invisível por cima
// delas: assim o preenchimento automático do SMS e o colar continuam valendo.
function CodeBoxes({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const current = Math.min(value.length, CODE_LENGTH - 1);

  return (
    <Pressable accessible={false} onPress={() => input.current?.focus()} style={styles.boxes}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <View
          key={i}
          style={[
            styles.box,
            value[i] ? styles.boxFilled : null,
            focused && i === current && styles.boxActive,
            invalid && styles.boxInvalid,
          ]}>
          <ThemedText style={styles.digit}>{value[i] ?? ''}</ThemedText>
        </View>
      ))}
      <TextInput
        ref={input}
        accessibilityLabel="Código de 6 números"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        autoFocus
        caretHidden
        selectionColor="transparent"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}>
      <ThemedText type="smallBold" style={styles.linkText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boxes: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 380,
    marginTop: 8,
  },
  box: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: stepColors.line,
    backgroundColor: Tokens.color.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    backgroundColor: Tokens.color.surface,
    borderColor: Tokens.color.brandBorder,
  },
  boxActive: {
    borderWidth: 2,
    borderColor: Tokens.color.brand,
    backgroundColor: Tokens.color.surface,
  },
  boxInvalid: {
    borderColor: Tokens.color.danger,
  },
  digit: {
    color: Tokens.color.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 700,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 16,
    outlineWidth: 0,
  },
  links: {
    alignItems: 'flex-start',
    marginTop: 8,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Tokens.color.brandBorder,
    backgroundColor: Tokens.color.brandSoft,
  },
  noticeCopy: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    color: Tokens.color.text,
  },
  muted: {
    color: Tokens.color.muted,
  },
  link: {
    borderRadius: 8,
  },
  linkPressed: {
    opacity: 0.6,
  },
  linkText: {
    color: Tokens.color.brand,
  },
  demo: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: Tokens.color.brandSoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  demoText: {
    color: Tokens.color.brandDeep,
  },
});
