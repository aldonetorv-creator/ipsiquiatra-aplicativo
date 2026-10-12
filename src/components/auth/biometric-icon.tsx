import { SymbolView } from 'expo-symbols';

import { BiometricKind } from '@/services/biometrics';

// Rosto para Face ID e reconhecimento facial; digital para o resto.
export function BiometricIcon({
  kind,
  size,
  tint,
}: {
  kind: BiometricKind | null;
  size: number;
  tint: string;
}) {
  return (
    <SymbolView
      name={
        kind === 'face'
          ? { ios: 'faceid', android: 'face', web: 'face' }
          : { ios: 'touchid', android: 'fingerprint', web: 'fingerprint' }
      }
      tintColor={tint}
      size={size}
    />
  );
}
