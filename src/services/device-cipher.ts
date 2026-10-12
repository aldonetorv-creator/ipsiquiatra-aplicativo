import { Platform } from 'react-native';

import { StoreCipher } from '@/services/encrypted-store';

type CryptoModule = typeof import('expo-crypto');
type SecureStoreModule = typeof import('expo-secure-store');

// Nome da chave do histórico no armazenamento seguro do aparelho (Keychain no
// iPhone, Keystore no Android). Ela nunca sai do aparelho nem vai para o
// histórico.
export const HISTORY_KEY_NAME = 'ipsiquiatra.history-key';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Modules = { crypto: CryptoModule; secureStore: SecureStoreModule };

// Os módulos nativos carregam na primeira vez que forem usados, e só no
// celular. Na web (sem armazenamento seguro), o histórico fica como antes.
function loadModules(): Modules | null {
  if (Platform.OS === 'web') return null;
  try {
    return {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      crypto: require('expo-crypto') as CryptoModule,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      secureStore: require('expo-secure-store') as SecureStoreModule,
    };
  } catch {
    return null;
  }
}

async function openCipher({ crypto, secureStore }: Modules): Promise<StoreCipher> {
  const { AESEncryptionKey, AESKeySize, AESSealedData, aesDecryptAsync, aesEncryptAsync } = crypto;
  // getItemAsync devolve null só quando a chave não existe; erro de leitura
  // sobe, e aí nada é gravado (encrypted-store.ts) em vez de criar outra chave.
  const saved = await secureStore.getItemAsync(HISTORY_KEY_NAME);
  const key = saved
    ? await AESEncryptionKey.import(saved, 'base64')
    : await AESEncryptionKey.generate(AESKeySize.AES256);
  if (!saved) await secureStore.setItemAsync(HISTORY_KEY_NAME, await key.encoded('base64'));
  return {
    async encrypt(plain, storageKey) {
      const sealed = await aesEncryptAsync(encoder.encode(plain), key, {
        additionalData: encoder.encode(storageKey),
      });
      return sealed.combined('base64');
    },
    async decrypt(sealed, storageKey) {
      const bytes = await aesDecryptAsync(AESSealedData.fromCombined(sealed), key, {
        additionalData: encoder.encode(storageKey),
      });
      return decoder.decode(bytes);
    },
  };
}

// Uma só chave por aparelho, criada na primeira gravação. Pedidos ao mesmo
// tempo esperam a mesma chave; se a leitura falhar, a próxima tenta de novo.
export function createDeviceCipher(load: () => Modules | null = loadModules) {
  let pending: Promise<StoreCipher | null> | null = null;
  return (): Promise<StoreCipher | null> => {
    if (!pending) {
      const modules = load();
      pending = modules ? openCipher(modules) : Promise.resolve(null);
      pending.catch(() => {
        pending = null;
      });
    }
    return pending;
  };
}
