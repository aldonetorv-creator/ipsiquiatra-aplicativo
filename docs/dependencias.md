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

## Removidas

| Pacote | Motivo |
|---|---|
| `expo-device` | Sem uso; só o projeto o pedia. Levou junto `ua-parser-js`. |
| `expo-web-browser` | Usado apenas pelo `external-link` do template, removido. |

## Atualizações

O Dependabot (`.github/dependabot.yml`) propõe semanalmente atualizações de
patch, agrupando as do SDK. Troca de SDK do Expo é manual e coordenada, com
`npx expo install --fix`, seguindo o guia oficial de migração.
