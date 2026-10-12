import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GradientButton } from '@/components/ui/gradient-button';
import { OutlineButton } from '@/components/ui/outline-button';
import { Tokens } from '@/constants/theme';
import { authTexts, AuthFailure, LoginChallenge } from '@/contracts/patient-auth';
import { usePatientSession } from '@/services/patient-session';
import { isValidCpf, maskCpf } from '@/utils/patient-data';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// Entrar com CPF e código por SMS, numa janela própria (como os formulários
// da Patrícia). O CPF vai só para a plataforma; o app guarda apenas a sessão.
export function LoginSheet({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {visible ? <Sheet onClose={onClose} /> : null}
    </Modal>
  );
}

function failureText(failure: AuthFailure) {
  if (failure.reason === 'wrong_code' && failure.attemptsLeft !== undefined) {
    return `${failure.message} ${
      failure.attemptsLeft === 1
        ? 'Resta 1 tentativa.'
        : `Restam ${failure.attemptsLeft} tentativas.`
    }`;
  }
  return failure.message;
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function Sheet({ onClose }: { onClose: () => void }) {
  const { startLogin, resendCode, verifyCode, demoCode } = usePatientSession();
  const [cpf, setCpf] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!challenge) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  const received = (next: LoginChallenge) => {
    setChallenge(next);
    setCode('');
    setResendAt(Date.now() + next.resendInSec * 1000);
    setNowMs(Date.now());
  };

  const requestCode = async () => {
    if (!isValidCpf(cpf)) {
      setError(authTexts.invalidCpf);
      return;
    }
    setSending(true);
    setError(null);
    const result = await startLogin(cpf);
    setSending(false);
    if (result.ok) received(result.data);
    else setError(failureText(result));
  };

  const resend = async () => {
    if (!challenge) return;
    setSending(true);
    setError(null);
    const result = await resendCode(challenge.challengeId);
    setSending(false);
    if (result.ok) received(result.data);
    else setError(failureText(result));
  };

  const confirm = async () => {
    if (!challenge) return;
    setSending(true);
    setError(null);
    const result = await verifyCode(challenge.challengeId, code);
    setSending(false);
    if (result.ok) onClose();
    else setError(failureText(result));
  };

  const resendIn = Math.max(0, Math.ceil((resendAt - nowMs) / 1000));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Fechar sem entrar"
      />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="smallBold" style={styles.title}>
            Entrar com CPF
          </ThemedText>
          {challenge ? (
            <>
              <ThemedText type="small" style={styles.muted}>
                {authTexts.sent} O código vale por {Math.round(challenge.expiresInSec / 60)}{' '}
                minutos.
              </ThemedText>
              <Field
                label="Código de 6 números"
                value={code}
                onChangeText={(value) => {
                  setCode(value.replace(/\D/g, '').slice(0, 6));
                  setError(null);
                }}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                maxLength={6}
                placeholder="000000"
              />
              {demoCode ? (
                <ThemedText type="small" style={styles.demo}>
                  Demonstração: o login ainda não está ligado à plataforma e nenhum SMS é enviado.
                  Use o código {demoCode}.
                </ThemedText>
              ) : null}
              {error ? <Alert text={error} /> : null}
              <GradientButton
                label="Entrar"
                chevron={false}
                disabled={sending || code.length !== 6}
                onPress={confirm}
              />
              {resendIn > 0 ? (
                <ThemedText type="small" style={styles.muted}>
                  Você pode pedir outro código em {clock(resendIn)}.
                </ThemedText>
              ) : (
                <OutlineButton label="Reenviar código" onPress={resend} />
              )}
              <ThemedText type="small" style={styles.muted}>
                {authTexts.notReceived}
              </ThemedText>
              <OutlineButton
                label="Trocar CPF"
                onPress={() => {
                  setChallenge(null);
                  setError(null);
                }}
              />
            </>
          ) : (
            <>
              <ThemedText type="small" style={styles.muted}>
                Informe o seu CPF. Vamos mandar um código por SMS para o celular do seu cadastro na
                clínica.
              </ThemedText>
              <Field
                label="CPF"
                value={cpf}
                onChangeText={(value) => {
                  setCpf(maskCpf(value));
                  setError(null);
                }}
                keyboardType="number-pad"
                placeholder="000.000.000-00"
              />
              {error ? <Alert text={error} /> : null}
              <GradientButton
                label="Receber código por SMS"
                chevron={false}
                disabled={sending}
                onPress={requestCode}
              />
              <ThemedText type="small" style={styles.privacy}>
                O CPF vai só para o cadastro da clínica, para encontrar você. Ele não fica salvo
                neste celular.
              </ThemedText>
            </>
          )}
          <OutlineButton label="Cancelar" onPress={onClose} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <ThemedText type="small" style={styles.error} accessibilityRole="alert">
      {text}
    </ThemedText>
  );
}

function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={Tokens.color.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(22, 16, 48, 0.45)',
  },
  sheet: {
    maxHeight: '90%',
    paddingTop: 12,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: Tokens.color.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Tokens.color.border,
  },
  content: {
    gap: 12,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    color: Tokens.color.brand,
    fontSize: 18,
    lineHeight: 24,
  },
  muted: {
    color: Tokens.color.muted,
  },
  demo: {
    color: Tokens.color.brandDeep,
  },
  privacy: {
    color: Tokens.color.muted,
    fontStyle: 'italic',
  },
  field: {
    gap: 6,
  },
  label: {
    color: Tokens.color.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Tokens.color.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: Tokens.color.text,
    backgroundColor: Tokens.color.background,
  },
  error: {
    color: Tokens.color.brandDeep,
  },
});
