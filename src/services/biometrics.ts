import { Platform } from 'react-native';

type LocalAuthenticationModule = typeof import('expo-local-authentication');

// Rosto (Face ID e afins) ou digital; `other` para íris e o que mais vier.
export type BiometricKind = 'face' | 'fingerprint' | 'other';

// Biometria do aparelho para entrar no app depois do primeiro login por SMS
// (pedido do Dr. Aldo, 12/10/2026). O app só recebe do sistema se deu certo ou
// não: a digital e o rosto nunca saem do celular e não vão para a plataforma.
export interface BiometricAuth {
  // A biometria cadastrada no aparelho; null se não há nenhuma.
  check(): Promise<BiometricKind | null>;
  authenticate(prompt: string): Promise<boolean>;
}

export const noBiometrics: BiometricAuth = {
  check: async () => null,
  authenticate: async () => false,
};

export function createDeviceBiometrics(): BiometricAuth {
  if (Platform.OS === 'web') return noBiometrics;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth = require('expo-local-authentication') as LocalAuthenticationModule;
  return {
    async check() {
      try {
        if (!(await auth.hasHardwareAsync()) || !(await auth.isEnrolledAsync())) return null;
        const types = await auth.supportedAuthenticationTypesAsync();
        if (types.includes(auth.AuthenticationType.FINGERPRINT)) return 'fingerprint';
        if (types.includes(auth.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
        return 'other';
      } catch {
        return null;
      }
    },
    async authenticate(prompt) {
      try {
        // Se a biometria falhar, o sistema oferece a senha do próprio celular.
        const result = await auth.authenticateAsync({
          promptMessage: prompt,
          cancelLabel: 'Cancelar',
          fallbackLabel: 'Usar a senha do celular',
        });
        return result.success;
      } catch {
        return false;
      }
    },
  };
}
