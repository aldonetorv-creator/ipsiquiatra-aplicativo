/// <reference types="jest" />

import { createMockPatientAppGateway, HISTORY_STORAGE_KEY } from '@/mocks/patient-app-gateway';
import { createDeviceCipher, HISTORY_KEY_NAME } from '@/services/device-cipher';
import { createEncryptedStore, ENCRYPTED_PREFIX } from '@/services/encrypted-store';
import { createMemoryStore, KeyValueStore } from '@/services/storage';

// O AES do expo-crypto nativo não roda no Jest; a versão web dele (WebCrypto)
// tem a mesma interface e roda no Node.
jest.mock('expo-crypto/build/aes/ExpoCryptoAES', () =>
  jest.requireActual('expo-crypto/build/aes/ExpoCryptoAES.web')
);

type SecureStoreModule = typeof import('expo-secure-store');

function fakeSecureStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItemAsync: jest.fn(async (key: string) => data.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    data,
  };
}

function deviceCipher(secureStore = fakeSecureStore()) {
  return createDeviceCipher(() => ({
    crypto: jest.requireActual('expo-crypto'),
    secureStore: secureStore as unknown as SecureStoreModule,
  }));
}

const SECRET = 'Hoje tive uma crise de ansiedade no trabalho.';

describe('histórico cifrado no aparelho', () => {
  it('grava cifrado e lê de volta o mesmo texto', async () => {
    const base = createMemoryStore();
    const store = createEncryptedStore(base, deviceCipher());

    await store.setItem(HISTORY_STORAGE_KEY, SECRET);

    const raw = (await base.getItem(HISTORY_STORAGE_KEY))!;
    expect(raw.startsWith(ENCRYPTED_PREFIX)).toBe(true);
    expect(raw).not.toContain('ansiedade');
    expect(await store.getItem(HISTORY_STORAGE_KEY)).toBe(SECRET);
  });

  it('a conversa salva pelo app não fica legível no armazenamento e volta ao reabrir', async () => {
    const base = createMemoryStore();
    const secureStore = fakeSecureStore();
    const first = createMockPatientAppGateway({
      store: createEncryptedStore(base, deviceCipher(secureStore)),
    });
    await first.listConversation();
    await first.sendMessage(SECRET);

    expect(await base.getItem(HISTORY_STORAGE_KEY)).not.toContain('ansiedade');

    // Reabrir o app: outra instância, mesma chave do aparelho.
    const reopened = createMockPatientAppGateway({
      store: createEncryptedStore(base, deviceCipher(secureStore)),
    });
    const result = await reopened.listConversation();
    expect(result.ok && result.data.some((m) => m.kind === 'text' && m.text === SECRET)).toBe(true);
  });

  it('o histórico de antes da criptografia continua e passa a ser guardado cifrado', async () => {
    const base = createMemoryStore({ [HISTORY_STORAGE_KEY]: SECRET });
    const store = createEncryptedStore(base, deviceCipher());

    expect(await store.getItem(HISTORY_STORAGE_KEY)).toBe(SECRET);
    expect(await base.getItem(HISTORY_STORAGE_KEY)).toMatch(new RegExp(`^${ENCRYPTED_PREFIX}`));
    expect(await store.getItem(HISTORY_STORAGE_KEY)).toBe(SECRET);
  });

  it('cria uma chave só por aparelho, mesmo com pedidos ao mesmo tempo, e a reaproveita', async () => {
    const secureStore = fakeSecureStore();
    const cipher = deviceCipher(secureStore);

    await Promise.all([cipher(), cipher(), cipher()]);
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    const key = secureStore.data.get(HISTORY_KEY_NAME);

    const base = createMemoryStore();
    await createEncryptedStore(base, cipher).setItem('k', SECRET);
    // Outra abertura do app lê a chave guardada, sem criar outra.
    expect(await createEncryptedStore(base, deviceCipher(secureStore)).getItem('k')).toBe(SECRET);
    expect(secureStore.data.get(HISTORY_KEY_NAME)).toBe(key);
  });

  it('sem conseguir ler a chave agora, não grava nada e não cria outra chave', async () => {
    const secureStore = fakeSecureStore();
    const base = createMemoryStore();
    await createEncryptedStore(base, deviceCipher(secureStore)).setItem(
      HISTORY_STORAGE_KEY,
      SECRET
    );
    const saved = await base.getItem(HISTORY_STORAGE_KEY);

    secureStore.getItemAsync.mockRejectedValueOnce(new Error('Keychain indisponível'));
    const store = createEncryptedStore(base, deviceCipher(secureStore));

    await expect(store.setItem(HISTORY_STORAGE_KEY, 'outro histórico')).rejects.toThrow();
    expect(await base.getItem(HISTORY_STORAGE_KEY)).toBe(saved);
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    // Na tentativa seguinte, a chave volta e o histórico continua lá.
    expect(await store.getItem(HISTORY_STORAGE_KEY)).toBe(SECRET);
  });

  it('valor cifrado com outra chave (backup restaurado sem a chave) começa do zero', async () => {
    const base = createMemoryStore();
    await createEncryptedStore(base, deviceCipher()).setItem(HISTORY_STORAGE_KEY, SECRET);

    expect(
      await createEncryptedStore(base, deviceCipher()).getItem(HISTORY_STORAGE_KEY)
    ).toBeNull();
  });

  it('um valor cifrado só abre na chave do armazenamento em que foi gravado', async () => {
    const base = createMemoryStore();
    const store = createEncryptedStore(base, deviceCipher());
    await store.setItem('ipsiquiatra:a', SECRET);

    await base.setItem('ipsiquiatra:b', (await base.getItem('ipsiquiatra:a'))!);

    expect(await store.getItem('ipsiquiatra:b')).toBeNull();
  });

  it('onde não há cifra (web), guarda como antes', async () => {
    const base: KeyValueStore = createMemoryStore();
    const store = createEncryptedStore(base, async () => null);

    await store.setItem('k', SECRET);

    expect(await base.getItem('k')).toBe(SECRET);
    expect(await store.getItem('k')).toBe(SECRET);
  });
});
