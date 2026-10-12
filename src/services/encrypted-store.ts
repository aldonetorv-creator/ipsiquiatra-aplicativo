import { KeyValueStore } from '@/services/storage';

// Valor cifrado guardado no aparelho: prefixo + IV, texto cifrado e tag do
// AES-GCM, em base64. Valor sem o prefixo é de antes da criptografia.
export const ENCRYPTED_PREFIX = 'enc1:';

// Cifra do aparelho. O nome da chave do armazenamento entra como dado
// autenticado: um valor cifrado só abre na mesma chave em que foi gravado.
export interface StoreCipher {
  encrypt(plain: string, storageKey: string): Promise<string>;
  decrypt(sealed: string, storageKey: string): Promise<string>;
}

// Guarda cifrado tudo o que passa por ele (conversa, humor, questionários e
// aceite do termo). `cipher` devolve:
// - a cifra do aparelho;
// - null onde não há cifra (web): aí grava e lê em texto, como antes;
// - erro quando a chave do aparelho não pôde ser lida agora. Nesse caso nada é
//   gravado, para não trocar um histórico cifrado que ainda vale por outro.
export function createEncryptedStore(
  base: KeyValueStore,
  cipher: () => Promise<StoreCipher | null>
): KeyValueStore {
  return {
    async getItem(key) {
      const raw = await base.getItem(key);
      if (raw === null) return null;
      if (!raw.startsWith(ENCRYPTED_PREFIX)) {
        // Histórico de antes da criptografia: continua valendo e passa a ser
        // guardado cifrado. Se a chave falhar agora, fica para a próxima vez.
        try {
          const active = await cipher();
          if (active) await base.setItem(key, ENCRYPTED_PREFIX + (await active.encrypt(raw, key)));
        } catch {
          // Sem a chave agora: o texto antigo continua como estava.
        }
        return raw;
      }
      const active = await cipher();
      if (!active) return null;
      try {
        return await active.decrypt(raw.slice(ENCRYPTED_PREFIX.length), key);
      } catch {
        // Cifrado com outra chave (ex.: backup do Android restaurado sem a
        // chave, que não sai do aparelho). Não dá para ler: começa do zero.
        return null;
      }
    },
    async setItem(key, value) {
      const active = await cipher();
      await base.setItem(
        key,
        active ? ENCRYPTED_PREFIX + (await active.encrypt(value, key)) : value
      );
    },
    removeItem(key) {
      return base.removeItem(key);
    },
  };
}
