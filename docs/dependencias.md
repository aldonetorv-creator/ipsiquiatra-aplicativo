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
| `expo-notifications` | Lembrete local da Patrícia às 20h para o diário de humor (fase 1). | Versão do SDK 57, instalada com `npx expo install`. Lembretes locais funcionam no Expo Go; notificação push no Android exige build de desenvolvimento, e por isso o Expo Go mostra um aviso ao abrir. Na fase 2 o lembrete passa a vir da plataforma por push. |

## Removidas

| Pacote | Motivo |
|---|---|
| `expo-device` | Sem uso; só o projeto o pedia. Levou junto `ua-parser-js`. |
| `expo-web-browser` | Usado apenas pelo `external-link` do template, removido. |

## Armazenamento local e privacidade

`@react-native-async-storage/async-storage` (versão fixada pelo SDK 57, no Expo
Go) guarda no aparelho o histórico da conversa com a Patrícia e os registros
de humor (chave `ipsiquiatra:patient-history`; na web, `localStorage`). Nada vai
para a nuvem. O paciente pode apagar tudo pelo botão "Apagar histórico".

Foi escolhido em vez de `expo-sqlite` porque funciona igual em iOS, Android e
web; o suporte web do `expo-sqlite` ainda é experimental.

**Antes de pacientes reais** (conversa e humor são dados sensíveis de saúde,
LGPD art. 11):

- criptografar o histórico em repouso (ex.: `expo-sqlite` com SQLCipher ou
  chave guardada no `expo-secure-store`);
- pedir consentimento explícito para guardar o histórico;
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
