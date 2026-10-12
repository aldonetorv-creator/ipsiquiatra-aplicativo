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

## Passo 1: conta Expo (feito em 12/10/2026)

O Dr. Aldo criou a conta em [expo.dev](https://expo.dev) e o projeto com o slug
`ipsiquiatra-aplicativo`, o mesmo do `app.json`. O ID do projeto
(`d091bdf1-3474-49cb-8c92-840c49849d17`) está em `extra.eas.projectId`, no
`app.json`. O ID não é segredo: só identifica o projeto, e quem gera build
precisa entrar na conta.

O campo `owner` ficou de fora. Sem ele, a Expo usa a conta de quem está
logado, e o projeto é dessa mesma conta.

Os comandos que o site da Expo mostra depois de criar o projeto
(`npx create-expo-app` e `npx eas-cli init --id ...`) servem para começar um
app do zero e **não devem ser rodados aqui**. O primeiro cria um app novo e
vazio; o segundo mudaria o `app.json` no computador e atrapalharia o próximo
`git pull`.

## Passo 2: primeiro build para Android (Dr. Aldo, no PowerShell)

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

## O que muda com o app instalado

- **Não precisa do computador ligado:** o app abre sozinho, sem Expo Go e sem
  QR Code.
- **Notificações:** a mensagem das 20h e os contatos de cuidado passam a
  aparecer como notificação no Android. No Expo Go do Android elas não
  funcionam.
- **Biometria:** a entrada pela digital funciona no Expo Go do Android e no
  app instalado. Um APK feito antes dela não a tem: é preciso um build novo.
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
