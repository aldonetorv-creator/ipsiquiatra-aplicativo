# Dependências: decisões e riscos conhecidos

Registro do saneamento feito a partir da
[issue #1](https://github.com/aldonetorv-creator/ipsiquiatra-aplicativo/issues/1).
Atualizar este arquivo a cada mudança relevante de dependência.

## Como auditar

```bash
npm audit --omit=dev --omit=optional   # produção: o que vai para o app
npm audit                              # completo: inclui ferramentas de teste e build
```

O `--omit=optional` é necessário porque `react-native` e `expo-router` declaram
Jest e Testing Library como peers opcionais; sem a flag, o npm conta essas
ferramentas de teste como produção. O CI publica as duas visões no resumo da
execução. **Nunca usar `npm audit fix --force`** (propõe downgrade para Expo 44).

## Evolução do audit de produção

| Momento | Alertas | Origens |
|---|---|---|
| Commit inicial do Codex | 30 (19 altos, 11 moderados) | `braces`, `node-forge`, `decode-uri-component`, `uuid` |
| Patches do SDK 57 (expo 57.0.27, etapa 1) | 29 (18 altos, 11 moderados) | as mesmas quatro |
| Após override de `uuid` (etapa 4) | 21 (18 altos, 3 moderados) | `braces`, `node-forge`, `decode-uri-component` |

## Alertas ainda abertos

| Pacote | Chega por | Situação | Ação |
|---|---|---|---|
| `braces` ≤ 3.0.3 | ferramentas do Metro/Expo CLI | Sem versão corrigida publicada (última: 3.0.3) | Monitorar (etapa 6). Afeta ferramentas de desenvolvimento, não o bundle do app; não expor o servidor de desenvolvimento à internet. |
| `node-forge` ≤ 1.4.0 | `@expo/code-signing-certificates` (Expo CLI) | Sem versão corrigida publicada (última: 1.4.0) | Monitorar (etapa 6). |
| `decode-uri-component` ≤ 0.4.2 | `expo-router` → `query-string@7` | Versões corrigidas (0.5.x) são só ESM; `query-string@7` usa `require()`, então override quebraria o app | Migração coordenada para Expo 58 estável (etapa 7). Em out/2026 o Expo 58 ainda está em `next`. |

## Overrides

| Override | Motivo | Validação |
|---|---|---|
| `xcode` → `uuid ^11.1.1` | Corrige GHSA-w5hq-g745-h8pq. O `xcode` só usa `require('uuid').v4()`, mantido em CommonJS no uuid 11. | `expo prebuild --clean` em cópia descartável: projeto Xcode gerado e lido sem erro, com UUIDs novos do plugin de splash. |

## Dependências mantidas de propósito

Removê-las do `package.json` não as tiraria da árvore (critério da issue #1):

| Pacote | Por que fica |
|---|---|
| `@expo/ui`, `expo-glass-effect`, `expo-symbols` | Dependências diretas do próprio `expo-router`. |
| `react-native-reanimated` | Peer **obrigatório** de `react-native-drawer-layout`, dependência do `expo-router`. Fora do `package.json`, o npm instalaria uma versão qualquer (≥ 2.0.0) e o autolinking a embutiria no app mesmo assim. Fica fixado na versão do SDK. O app não o importa mais. |
| `react-native-worklets` | Peer obrigatório do `react-native-reanimated` 4. |

## Adicionadas

| Pacote | Para quê | Observação |
|---|---|---|
| `expo-notifications` | Lembrete local da Patrícia às 20h para o diário de humor (fase 1). | Versão do SDK 57, instalada com `npx expo install`. No Expo Go do iPhone, os lembretes locais funcionam. No Expo Go do Android (SDK 53+), só carregar o pacote já dá erro e o app não abre; por isso o app carrega o pacote só onde ele funciona (`src/services/notifications-module.ts`) e, no Expo Go do Android, abre sem notificações (a mensagem diária continua na conversa). Para ver as notificações no Android é preciso o app instalado (build de desenvolvimento). Na fase 2 o lembrete passa a vir da plataforma por push. |
| `expo-crypto` | Cifra AES-GCM de 256 bits do histórico guardado no aparelho (fase 2, lote 1). | Versão do SDK 57 (`npx expo install`; aqui com `EXPO_OFFLINE=1`, porque a rede do ambiente bloqueia a API do Expo). Vem no Expo Go. Carregado só no celular (`src/services/device-cipher.ts`). |
| `expo-secure-store` | Guarda no Keychain (iPhone) ou no Keystore (Android) a chave do histórico, a sessão do paciente depois do login e a escolha de entrar pela biometria. | Versão do SDK 57, vem no Expo Go. Pelo padrão do plugin, a chave fica fora do backup automático do Android. O plugin entra no `app.json` com o mesmo texto do Face ID do `expo-local-authentication`: com `faceIDPermission: false`, como era antes, ele apagaria a permissão do Face ID. |
| `expo-local-authentication` | Entrar com a biometria (digital ou rosto) depois do primeiro login por SMS. | Versão do SDK 57 (`EXPO_OFFLINE=1 npx expo install`), vem no Expo Go. O app só recebe do sistema se deu certo; a digital e o rosto não saem do celular. O plugin no `app.json` traz o texto do Face ID no iPhone e as permissões `USE_BIOMETRIC` e `USE_FINGERPRINT` no Android. |

## Removidas

| Pacote | Motivo |
|---|---|
| `expo-device` | Sem uso; só o projeto o pedia. Levou junto `ua-parser-js`. |
| `expo-web-browser` | Usado apenas pelo `external-link` do template, removido. |

## Armazenamento local e privacidade

`@react-native-async-storage/async-storage` (versão fixada pelo SDK 57, no Expo
Go) guarda no aparelho o histórico da conversa com a Patrícia e os registros
de humor (chave `ipsiquiatra:patient-history`; na web, `localStorage`). O
paciente pode apagar tudo pelo botão "Apagar histórico".

Na demonstração, nada vai para a nuvem. Com a Patrícia real ligada
(`docs/integracao-plataforma.md`), o que o paciente escreve na conversa e os
dados dos cartões vão para a plataforma do iPsiquiatra, como no chat do site.
No celular ficam a conversa (com o CPF escrito trocado por "[CPF omitido]") e
o aceite do termo, com a versão (chave `ipsiquiatra:patricia-consent`), que
continua valendo depois de "Apagar histórico". Os
dados dos formulários (CPF, nascimento, celular, responsável) não ficam no
celular. A integração não acrescenta pacotes: usa o `fetch` do React
Native.

Foi escolhido em vez de `expo-sqlite` porque funciona igual em iOS, Android e
web; o suporte web do `expo-sqlite` ainda é experimental.

**Criptografia em repouso (fase 2, lote 1).** No celular, tudo o que o app
guarda (conversa, humor, questionários e aceite do termo) é gravado cifrado com
AES-GCM de 256 bits (`expo-crypto`). A chave é criada no aparelho na primeira
gravação e fica no armazenamento seguro do sistema (`expo-secure-store`): ela
nunca vai para o AsyncStorage nem para a plataforma.

- **Dados de antes da criptografia:** continuam valendo e passam a ser
  gravados cifrados na primeira leitura.
- **Cada valor só abre na chave em que foi gravado:** o nome da chave entra
  como dado autenticado.
- **Chave ilegível no momento:** se o sistema não entregar a chave (erro, não
  "chave inexistente"), o app não grava nada nem cria outra chave, para não
  perder o histórico que ainda vale.
- **Backup do Android:** a chave não vai no backup automático. Se o
  AsyncStorage for restaurado em outro aparelho sem a chave, o histórico não
  abre e o app começa do zero.
- **Web:** sem armazenamento seguro, o `localStorage` continua sem cifra. A web
  não é usada por pacientes (a Patrícia real só funciona no celular).

Código em `src/services/encrypted-store.ts` e `src/services/device-cipher.ts`;
testes em `src/__tests__/encrypted-store.test.ts`. Eles usam a versão web do
AES do `expo-crypto` (WebCrypto), que tem a mesma interface da nativa.

**Ainda antes de pacientes reais** (conversa e humor são dados sensíveis de
saúde, LGPD art. 11):

- consentimento explícito para guardar o histórico: o termo da Patrícia já
  diz que a conversa fica no celular; falta o mesmo para o diário e os
  questionários, quando forem para a plataforma (login, fase 2);
- definir retenção e o que acontece ao trocar de aparelho ou sair da conta.

## Atualizações

O Dependabot (`.github/dependabot.yml`) propõe semanalmente atualizações das
GitHub Actions e das ferramentas de desenvolvimento (ESLint, TypeScript, Jest,
Testing Library), sem saltos de versão principal.

Ele **não** mexe nos pacotes controlados pelo SDK do Expo (`expo`, `expo-*`,
`@expo/*`, `react`, `react-dom`, `react-native`, `react-native-*`,
`jest-expo`, `eslint-config-expo`): o SDK fixa a versão exata de cada um e o
Expo Doctor reprova qualquer divergência. Quando o Expo publica correções do
SDK, o Expo Doctor no CI acusa; aí se roda `npx expo install --fix`. Troca de
SDK é manual e coordenada, seguindo o guia oficial de migração.
