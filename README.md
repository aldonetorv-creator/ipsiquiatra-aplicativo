# iPsiquiatra Aplicativo

Aplicativo do paciente iPsiquiatra, iniciado como Sprint 0 em React Native, Expo e TypeScript.

## Escopo desta base

- Projeto Expo com Expo Router e TypeScript.
- Navegação mockada para Home, Patrícia, Consultas, Questionários e Cofre.
- Design system inicial em `src/constants/theme.ts`.
- Componentes visuais reutilizáveis em `src/components`.
- Contratos e mocks locais em `src/contracts` e `src/mocks`.
- Ícone visual roxo `iP` aplicado como referência de marca inicial.

## Fora do escopo por enquanto

- Autenticação real.
- Dados reais de paciente, PHI ou prontuário guardados pelo app. A única
  exceção é a conversa com a Patrícia real, que vai para a plataforma do
  iPsiquiatra como no chat do site (ver `docs/integracao-plataforma.md`).
- Backend próprio, pagamentos, NFS-e, telemedicina e fluxos clínicos reais.
- IA clínica ou tomada de decisão automatizada.

## Fases

O plano está em [`docs/fases.md`](docs/fases.md). A fase 1 é o MVP de
demonstração, com dados simulados. A fase 2 traz a jornada completa da
consulta pelo app: agendamento, cobrança pela Patrícia, pagamento confirmado
pela integração com o Nubank, teleconsulta por videochamada e nota fiscal
(NFS-e) emitida 24 horas depois da consulta. Dela, só a conversa com a
Patrícia real (agendar, remarcar e cancelar) já existe.

## Comandos

```bash
npm install
npm run web
npm run lint
npm run typecheck
npm test
```

## Integração contínua

O workflow `.github/workflows/ci.yml` roda em todo PR e em push na `main`:
instalação limpa, TypeScript, lint, testes (Jest com `jest-expo`), Expo Doctor e
exportação web. Um job
separado registra o `npm audit` no resumo da execução e como artefato, sem
falhar o CI (alertas conhecidos na issue #1). O Dependabot
(`.github/dependabot.yml`) acompanha npm e GitHub Actions; trocas de SDK do
Expo continuam manuais, com `npx expo install --fix`.

## Contrato com a fonte de dados

As telas não importam mocks de dados: leem pela interface `PatientAppGateway`
(`src/contracts/platform.ts`), entregue pelo `PatientAppGatewayProvider`
(`src/services/patient-app-gateway.tsx`). Hoje a implementação padrão é o mock
local (`src/mocks/patient-app-gateway.ts`); uma API real substitui o mock nesse
provider, sem mudar as telas. A Início (`useHome`), as Consultas
(`useAppointments`), o Cofre (`useDocuments`, agrupado por consulta), os
Questionários (`useQuestionnaires`) e a conversa com a Patrícia
(`useConversation`) estão ligados ao contrato, com testes em `src/__tests__`.

## Patrícia nesta versão

A Patrícia é uma só, a mesma do site. Por padrão, o app conversa com a
Patrícia do Dr. Aldo na plataforma do iPsiquiatra
(`app.ipsiquiatra.com.br/patricia/dr-aldo-araujo-psiquiatra`), com IA, pelas
mesmas rotas públicas do chat do site: termo, agendamento, remarcação,
cancelamento e orientações de crise (ver
[`docs/integracao-plataforma.md`](docs/integracao-plataforma.md)). A conversa
fica salva no aparelho, cifrada (AsyncStorage com chave no armazenamento seguro
do celular), e pode ser apagada em "Apagar histórico"; ver privacidade em
`docs/dependencias.md`. A tela mostra o aviso
de que a Patrícia tem apoio de IA e os contatos de emergência (CVV 188 e SAMU
192).

Com `EXPO_PUBLIC_PATRICIA_SLUG` vazio, o app volta ao roteiro de demonstração:
as respostas são textos fixos e não clínicos, e a Patrícia não lê nem
interpreta o que o paciente escreve (sem IA).

O diário de humor, a mensagem das 20h e os contatos de cuidado continuam no
aparelho. Com o login do paciente (fase 2), a conversa, o diário de humor e as
escalas passam a ser guardados na plataforma e entram no prontuário, como
contexto para a Patrícia e para o médico. Ver `docs/fases.md`.

Os atalhos "Agendar consulta", "Remarcar" e "Pedir nota fiscal" passam pelo
contrato (`requestService`) e vão para a Patrícia como mensagem; na
demonstração, ela só avisa que o serviço chega em breve. "Encontrar documento"
abre o Cofre. Tocar na foto da Patrícia mostra a foto em tamanho grande.

## Princípio de evolução

A base é contract-first: futuras integrações devem nascer a partir dos tipos e mocks locais, passar por revisão estrutural e manter dados sensíveis fora do app até existir arquitetura aprovada.
