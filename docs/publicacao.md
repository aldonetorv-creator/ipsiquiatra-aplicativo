# Publicação do aplicativo

Passo a passo para gerar o aplicativo instalável pela conta Expo (EAS Build) e,
depois, publicar nas lojas. Decisões do Dr. Aldo (12/10/2026):

- começar pela conta Expo;
- o identificador permanente do app é `br.com.ipsiquiatra.paciente`;
- o nome embaixo do ícone é **iPsiquiatra**.

## O que já está configurado

| Onde | O quê |
|---|---|
| `app.json` | nome `iPsiquiatra`; `android.package` e `ios.bundleIdentifier` `br.com.ipsiquiatra.paciente` (não muda depois da loja) |
| `eas.json`, perfil `preview` | APK para instalar direto no Android, sem loja (`distribution: internal`) |
| `eas.json`, perfil `production` | pacote para as lojas, com o número da versão contado pela Expo (`appVersionSource: remote`, `autoIncrement`) |

O `eas.json` foi conferido com o leitor oficial da Expo (`@expo/eas-json`).

## Passo 1: conta Expo (Dr. Aldo)

1. Em [expo.dev](https://expo.dev), crie uma conta gratuita ("Sign up"). O nome de usuário aparece nos links dos builds.
2. Ainda no site, crie o projeto ("Create a project"):
   - nome: `iPsiquiatra`;
   - slug: `ipsiquiatra-aplicativo`, igual ao do `app.json`.
3. Mande ao Claude o **nome de usuário** e o **ID do projeto** (um código como `1a2b3c4d-...`). Ele coloca os dois no `app.json` (`owner` e `extra.eas.projectId`) por PR.

Se o site não oferecer a criação do projeto, dá para criar pelo PowerShell, na
pasta do app:

```
npx eas-cli@latest login
```
```
npx eas-cli@latest init
```

Nesse caso, mande ao Claude o ID que aparecer e desfaça a mudança local antes
do próximo `git pull`, com `git checkout app.json`.

## Passo 2: primeiro build para Android (Dr. Aldo, no PowerShell)

Depois do PR com o ID do projeto, rode um comando de cada vez:

```
cd C:\Users\aldo_\ipsiquiatra-aplicativo
```
```
git pull
```
```
npx eas-cli@latest login
```
```
npx eas-cli@latest build --platform android --profile preview
```

- **Chave do Android:** na primeira vez, a Expo pergunta se gera a chave de
  assinatura do Android ("Generate a new Android Keystore?"). Responda que sim.
  Ela fica guardada na conta Expo, e é a mesma chave que vai para o Google
  Play.
- **Tempo:** o build roda na nuvem da Expo, e o computador pode até ser
  desligado. No plano gratuito há fila e um limite de builds por mês. No fim
  aparecem um link e um QR Code.
- **Instalação:** abra o link no celular Android, baixe e instale o APK. O
  Android pede para permitir a instalação de fora da loja.

## O que muda com o app instalado

- **Não precisa do computador ligado:** o app abre sozinho, sem Expo Go e sem
  QR Code.
- **Notificações:** a mensagem das 20h e os contatos de cuidado passam a
  aparecer como notificação no Android. No Expo Go do Android elas não
  funcionam.
- **Atualizações:** cada mudança no código precisa de um novo build. Mais
  adiante, o EAS Update pode mandar mudanças sem build novo.
- **Dados reais:** o app instalado conversa com a Patrícia de verdade. Uma
  consulta marcada nele entra na agenda real.

## Antes das lojas

Para entregar o app a pacientes:

- **Google Play:** conta de desenvolvedor (US$ 25, uma vez). O perfil
  `production` gera o pacote da loja, e o `eas submit` envia.
- **Apple:**
  - conta de desenvolvedor (US$ 99 por ano);
  - o build do iPhone pede os dados dessa conta;
  - o TestFlight serve para testar antes da publicação.
- **Política de privacidade:** um endereço público, exigido pelas duas lojas.
  Ela precisa dizer o que o app guarda no celular (cifrado) e o que vai para a
  plataforma (conversa com a Patrícia, dados dos cartões, login).
- **Formulários de privacidade das lojas** ("Segurança dos dados" no Google
  Play, "Privacidade do app" na Apple): dados de saúde, identificação e
  contato.
- **Pendências do produto:**
  - o login real (`docs/api-paciente.md`);
  - consultas e documentos reais, para que o app não mostre dados de
    demonstração a pacientes;
  - a revisão independente de segurança e privacidade (`docs/fases.md`,
    pré-requisitos da fase 2).
