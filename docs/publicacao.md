# Publicação do aplicativo

Passo a passo para gerar o aplicativo instalável pela conta Expo (EAS Build) e,
depois, publicar nas lojas. Decisões do Dr. Aldo (12/10/2026):

- começar pela conta Expo;
- o identificador permanente do app é `br.com.ipsiquiatra.paciente`;
- o nome embaixo do ícone é **iPsiquiatra**.

## O que já está configurado

| Onde | O quê |
|---|---|
| `app.json` | nome `iPsiquiatra`; `android.package` e `ios.bundleIdentifier` `br.com.ipsiquiatra.paciente` (não muda depois da loja); `owner` `aldoparaujos-team`, a conta da Expo dona do projeto |
| `eas.json`, perfil `preview` | APK para instalar direto no Android, sem loja (`distribution: internal`) |
| `eas.json`, perfil `production` | pacote para as lojas, com o número da versão contado pela Expo (`appVersionSource: remote`, `autoIncrement`) |
| `eas.json`, `image: latest` | máquina de build mais nova da Expo; a Expo exige esse campo para build disparado pelo GitHub |

O `eas.json` foi conferido com o leitor oficial da Expo (`@expo/eas-json`).

## Passo 1: conta Expo (feito em 12/10/2026)

O Dr. Aldo criou a conta em [expo.dev](https://expo.dev) e o projeto com o slug
`ipsiquiatra-aplicativo`, o mesmo do `app.json`. O ID do projeto
(`d091bdf1-3474-49cb-8c92-840c49849d17`) está em `extra.eas.projectId`, no
`app.json`. O ID não é segredo: só identifica o projeto, e quem gera build
precisa entrar na conta.

O projeto fica na organização `aldoparaujos-team` da Expo, e não na conta
pessoal. Por isso o `app.json` tem `"owner": "aldoparaujos-team"`. Sem esse
campo, o `eas build` para logo no começo com
`Owner of project identified by "extra.eas.projectId" (aldoparaujos-team) does
not match the logged in user`.

Os comandos que o site da Expo mostra depois de criar o projeto
(`npx create-expo-app` e `npx eas-cli init --id ...`) servem para começar um
app do zero e **não devem ser rodados aqui**. O primeiro cria um app novo e
vazio; o segundo mudaria o `app.json` no computador e atrapalharia o próximo
`git pull`.

## GitHub ligado à Expo (feito em 12/10/2026)

O Dr. Aldo ligou o repositório do GitHub ao projeto na Expo. Com isso, o build
pode sair direto do site da Expo, sem o computador.

## Passo 2: primeiro build para Android

### Pelo site da Expo (sem computador)

1. Em [expo.dev](https://expo.dev), abra o projeto `ipsiquiatra-aplicativo`
   da organização `aldoparaujos-team` e vá em **Builds**.
2. Clique em **Build from GitHub**.
3. Escolha:
   - **Git ref:** `main`;
   - **Platform:** **Android**, só ele (o iPhone ainda não dá; ver abaixo);
   - **Build profile:** **preview**, que gera o APK para instalar no celular.
     O `production` gera o pacote do Google Play, que não instala direto.
4. Espere terminar. No fim aparecem um link e um QR Code, como no build pelo
   computador.

- **Chave do Android:** no build pelo site, a Expo gera a chave de assinatura
  sozinha, sem perguntar, e a guarda na conta. Isso foi conferido no código do
  EAS CLI 24.12.1.
- **Se falhar por credenciais:** a Expo recomenda um primeiro build pelo
  computador. Nesse caso, siga o caminho do PowerShell abaixo uma vez. Os
  builds seguintes podem sair pelo site.
- **Etiqueta em PR:** também dá para pedir build pondo a etiqueta
  `eas-build-android:preview` num pull request. Sem o perfil (por exemplo,
  `eas-build-android`), a Expo usa o `production`; sem a plataforma, pede
  iPhone e Android.

### Pelo computador (Dr. Aldo, no PowerShell)

Rode um comando de cada vez:

```
cd C:\Users\aldo_\ipsiquiatra-aplicativo
```
```
git checkout app.json
```
```
git pull
```
```
npm ci
```
```
npx eas-cli@latest login
```
```
npx eas-cli@latest build --platform android --profile preview
```

- **`git checkout app.json`:** desfaz qualquer mudança feita no `app.json` do
  computador (por exemplo, por um `eas init`). Se não houver mudança, não faz
  nada.
- **`npm ci`:** instala no computador os pacotes do app na versão certa.
  - Antes, pare o Expo, se estiver rodando (Ctrl + C na janela dele).
  - Espere aparecer "added ... packages".
  - Sem ele, o build falha logo no começo com
    `expo\bin\cli config --json exited with non-zero code: 1`. O motivo é que
    o `app.json` usa o plugin do `expo-secure-store`, e esse pacote ainda não
    está no computador.
- **Chave do Android:** na primeira vez, a Expo pergunta se gera a chave de
  assinatura do Android ("Generate a new Android Keystore?"). Responda que sim.
  Ela fica guardada na conta Expo e serve também para enviar o app ao Google
  Play.
- **Tempo:** o build roda na nuvem da Expo, e o computador pode até ser
  desligado. No plano gratuito há fila e um limite de builds por mês. No fim
  aparecem um link e um QR Code.
- **Instalação:** abra o link no celular Android, baixe e instale o APK. O
  Android pede para permitir a instalação de fora da loja.

## Build do iPhone (ainda não)

O primeiro build de iPhone (perfil `production`, 12/10/2026) falhou. Sem a
conta de desenvolvedor da Apple, ele não tem como dar certo:

- todo app de iPhone precisa de um certificado e de um perfil de distribuição
  da Apple, e só a conta de desenvolvedor (US$ 99 por ano) gera os dois;
- no build pelo site, a Expo não pode perguntar nada. Sem esses dois arquivos
  guardados na conta Expo, ela para com
  `Credentials are not set up. Run this command again in interactive mode.`

Quando a conta Apple existir:

1. No computador, rode
   `npx eas-cli@latest build --platform ios --profile production` uma vez. A
   Expo pede o login da Apple, cria o certificado e o perfil e os guarda na
   conta. Isso não precisa de Mac.
2. Depois disso, o build de iPhone também sai pelo site.

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
