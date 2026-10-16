# Passagem — app do paciente iPsiquiatra (12/10/2026)

## Objetivo
App do paciente (Expo SDK 57, Expo Router, React Native 0.86, TypeScript) do
iPsiquiatra, ao redor da Patrícia (assistente do Dr. Aldo). Estratégia: "app
agora, plataforma depois". A plataforma (`aldonetorv-creator/ipsiquiatra`,
branch `correcoes`) está em pausa de produto até o beta: **não mexer nela**.

## Estado
- **Pronto e mesclado na `main`** (`ba133b4`):
  - Patrícia real;
  - histórico cifrado;
  - login simulado por CPF + SMS (código 123456) como primeira tela;
  - entrada em história + uma pergunta por tela (PR #39);
  - biometria (PR #39);
  - saudação "Boa noite, {nome}!" e botão da conta (PR #39);
  - aviso do celular desatualizado (PR #41);
  - ícone só com o logo;
  - EAS, com build também pelo site da Expo (PR #40, de outra sessão).
- **Em andamento:** nada. Nenhum PR aberto desta frente.
- **Falta:**
  1. O Dr. Aldo testar no celular (Expo Go e um APK novo) e dar retorno visual.
  2. Parte da plataforma (rotas do paciente, `docs/api-paciente.md`): fica com a
     Opus I depois do beta. Inclui a Patrícia com o paciente identificado, para
     os cartões pararem de pedir nome, celular, CPF e nascimento.
  3. Lojas: conta Apple (US$ 99/ano), política de privacidade, Google Play.

## Branch, PRs e arquivos
- **Branch:** `claude/adoring-mendel-xq8vl9`, base `main`.
  - Depois de cada merge, recriar a partir de `origin/main`.
  - Cada mudança vai num PR novo para `main`.
- **Entrada:**
  - `src/app/entrar.tsx` (história → CPF → código; bloqueio da biometria);
  - `src/components/auth/*`;
  - `src/hooks/use-login-flow.ts`;
  - `src/hooks/use-motion.ts`.
- **Sessão e biometria:**
  - `src/services/patient-session.tsx` (estados `loading | signed_out | locked | signed_in`; bloqueia após 5 min fora);
  - `src/services/biometrics.ts`.
- **Abas protegidas:** `src/components/app-tabs.tsx` (`Tabs.Protected`).
- **Início:**
  - `src/app/index.tsx`;
  - `src/components/home/account-button.tsx`, que leva à biometria e ao Sair.
- **Contrato e mock:** `src/contracts/patient-auth.ts`, `src/mocks/patient-auth.ts`.
- **Cores e abertura:**
  - `src/constants/theme.ts` (`Gradients.story`, `danger`);
  - `app.json` (splash `#4A1F9A`, plugins).
- **Testes:**
  - `src/__tests__/login-gate.test.tsx` (23);
  - `src/__tests__/notification-tap.test.tsx` (3).
  - Total: 239.
- **Docs:**
  - `docs/api-paciente.md` (rotas e decisões);
  - `docs/publicacao.md`;
  - `docs/dependencias.md`;
  - `docs/identidade-visual/README.md`;
  - `docs/fases.md`.

## Decisões do Dr. Aldo
- **Login:** CPF + código por SMS, primeira tela; a Início só depois do login.
- **Entrada:** pouco texto, progressão, estilo Nubank/Apple (aprovada no #39).
- **Biometria:**
  - oferecida logo após o SMS;
  - pedida ao abrir o app e após 5 min fora;
  - plano B: "Entrar com CPF e SMS";
  - "Sair" desliga.
- **Início:** saudação com o nome, sem "Você entrou como".
- **Cartão "Agora" da Início:** "Em acompanhamento", "Retorno atrasado" (pela
  data do retorno pedido na consulta, `returnDueAt`) ou "Consulta próxima" (7
  dias ou menos). Regra em `followUpFor` (`src/utils/appointments.ts`).
- **Minhas medicações** (aba nova): a lista sai das últimas receitas
  validadas pelo médico (extraída com IA na plataforma), por horário do dia.
- **Plano de cuidados em texto para celular** (`src/app/plano.tsx`), com as
  seções do prompt do Dr. Aldo para o plano pós-consulta. O prompt não fica
  no repositório.
- **Lembrete dos remédios:** só com os horários da receita (o paciente não
  cadastra nada), sem o nome dos remédios na notificação, com "Já tomei" na
  própria notificação e um segundo aviso 30 min depois se não responder.
  Cartão com pouco texto. Cada "Já tomei" marca a semana do paciente (segunda
  a domingo), só no celular; nada vai para o prontuário, e horário sem marca
  fica neutro.
- **Plano de cuidados no app:** negrito autorizado; cores do app (roxo,
  branco, azul, degradês de azul para roxo, "futurista, moderno, IA"), e não
  o verde e dourado do PDF.
- **Primeiro acesso à Patrícia:** termo sozinho → "Concordo" → apresentação →
  diário de humor, uma mensagem de cada vez, com "digitando…".
- **Termo da Patrícia no app:** curto, sem listar os dados do site (o login já
  identifica o paciente).
- **Fora do app:**
  - sem botão "Ainda não é paciente?";
  - menor de idade não usa o app (na plataforma, CPF de menor recebe a resposta genérica, sem SMS);
  - paciente sem CPF também não.
- **Celular desatualizado:** depois de 1 min sem código, aviso para atualizar o
  cadastro **diretamente com a clínica**. O app não troca celular.
- **Merge:** só com autorização explícita do Dr. Aldo para cada PR ("Merge
  autorizado no N").
  - Antes: conferir o head, o CI verde e `mergeable_state` clean.
  - Mesclar com o SHA esperado.
  - Depois: tirar a inscrição do PR e apagar o check-in automático.
- **Não usar dados reais nem fotos reais do Dr. Aldo** no repositório.
- **Nunca** `npm audit fix --force`.

## Pendentes que dependem do Dr. Aldo
- Testar no celular e dar retorno.
- Fazer o APK novo pelo site.
- Conta Apple, quando quiser publicar no iPhone.

## Comandos (ambiente de nuvem)
```
npx tsc --noEmit
npx expo lint
npx jest
npx expo export --platform all --clear --output-dir <scratchpad>/export
```
- **Prettier:** `npx prettier --single-quote --print-width 100 --bracket-same-line --trailing-comma es5`.
  - Rodar só nos arquivos mudados.
  - Um glob largo já reformatou arquivo alheio.
- **Instalar pacote:** `EXPO_OFFLINE=1 npx expo install <pacote>`, porque a API da Expo é
  bloqueada aqui.
  - Depois, `git checkout package-lock.json && npx -y npm@11 install`.
  - Isso preserva os campos `libc`, que o npm 10 apaga.
- **Capturas:**
  - exportar a web e abrir no Playwright (Chromium em
    `/opt/pw-browsers`, `NODE_PATH=$(npm root -g)`), em 390×844 e 360×780;
  - `page.clock` adianta o tempo.

## Comandos do Dr. Aldo (Windows PowerShell, um por linha)
Pasta `C:\Users\aldo_\ipsiquiatra-aplicativo`, nesta ordem:
- `git checkout app.json`
- `git checkout main`
- `git pull`
- `npm ci` (quando entrar pacote)
- `npx expo start --clear`

APK: expo.dev → Builds → Build from GitHub → `main`, Android, `preview`.

## Armadilhas
- **`renderRouter`** (expo-router/testing-library):
  - é preciso `await` no resultado;
  - ele liga relógios falsos: usar `afterEach(jest.useRealTimers)`.
- **Ritmo da Patrícia nos testes:** `test/setup.js` zera o ritmo; o teste
  `src/__tests__/patricia-pace.test.tsx` liga um ritmo curto para ver a ordem.
- **Código do SMS no Android:** o campo invisível sobre as casinhas precisa de
  `opacity: 0.01` (o Android ignora `color: 'transparent'` e mostrava os
  números de novo na primeira casinha).
- **Web (RN-web):**
  - `useWindowDimensions` dá 0 no export estático: medir com `onLayout`;
  - `AccessibilityInfo.isScreenReaderEnabled` sempre diz `true`.
- **Plugins do `app.json`:** com `faceIDPermission: false`, o `expo-secure-store` apaga a permissão do Face ID.
  Os dois plugins usam o mesmo texto.
- **Barra de status:** a base é `dark` no `_layout`; o roxo usa `light`. Uma `StatusBar` sem base
  volta para `default`, que no Android tem ícones claros.
- **Expo Go:**
  - não mostra o splash roxo;
  - a biometria com digital funciona no Android;
  - módulo nativo novo exige APK novo.
- **Mutações antes do PR:** fazer backup de arquivos não rastreados antes de mutar; `git checkout`
  não os restaura.
- **Outras sessões** mexem neste repositório (ex.: PR #40): conferir a `main` antes de abrir PR.
