# iPsiquiatra Aplicativo

Aplicativo do paciente iPsiquiatra, iniciado como Sprint 0 em React Native, Expo e TypeScript.

## Escopo desta base

- Projeto Expo com Expo Router e TypeScript.
- Navegação mockada para Home, Patrícia, Consultas, Questionários e Cofre.
- Design system inicial em `src/constants/theme.ts`.
- Componentes visuais reutilizáveis em `src/components/mvp`.
- Contratos e mocks locais em `src/contracts` e `src/mocks`.
- Ícone visual roxo `iP` aplicado como referência de marca inicial.

## Fora do escopo por enquanto

- Autenticação real.
- Dados reais de paciente, PHI ou prontuário.
- Backend, pagamentos, NFS-e, telemedicina e fluxos clínicos reais.
- IA clínica ou tomada de decisão automatizada.

## Fases

O plano está em [`docs/fases.md`](docs/fases.md). A fase 1 é o MVP de
demonstração, com dados simulados. A fase 2 traz a jornada completa da
consulta pelo app: agendamento, cobrança pela Patrícia, pagamento confirmado
pela integração com o Nubank, teleconsulta por videochamada e nota fiscal
(NFS-e) emitida 24 horas depois da consulta. Nada dela está implementado ainda.

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
provider, sem mudar as telas. O Cofre (`useDocuments`) e a conversa com a
Patrícia (`useConversation`) estão ligados ao contrato, com testes em
`src/__tests__`.

## Patrícia nesta versão

A conversa com a Patrícia é **simulada**: as respostas são textos fixos e não
clínicos, e ela não lê nem interpreta o que o paciente escreve (sem IA, conforme
a issue #1). O histórico da conversa e do humor fica salvo **só no aparelho**
(AsyncStorage) e pode ser apagado em "Apagar histórico"; a cada novo dia a
Patrícia abre um novo registro de humor. Ver privacidade em
`docs/dependencias.md`. A tela mostra esse aviso e os
contatos de emergência (CVV 188 e SAMU 192).

Esse roteiro é provisório. A Patrícia é uma só, a mesma do site: na fase 2, o
app conversa com o serviço da Patrícia na plataforma do iPsiquiatra (uma
Patrícia por médico), sem lógica própria no app. A conversa, o diário de humor
e as escalas passam a ser guardados na plataforma e entram no prontuário,
como contexto para a Patrícia e para o médico. Ver `docs/fases.md`.

Os atalhos "Agendar consulta", "Remarcar" e "Pedir nota fiscal" já aparecem e
passam pelo contrato (`requestService`), mas nesta fase a Patrícia só avisa que
o serviço chega em breve: agenda e NFS-e são da fase 2 (ver `docs/fases.md`). "Encontrar documento"
abre o Cofre. Tocar na foto da Patrícia mostra a foto em tamanho grande.

## Princípio de evolução

A base é contract-first: futuras integrações devem nascer a partir dos tipos e mocks locais, passar por revisão estrutural e manter dados sensíveis fora do app até existir arquitetura aprovada.
