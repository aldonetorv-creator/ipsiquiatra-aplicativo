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
provider, sem mudar as telas. O Cofre é a primeira tela ligada ao contrato
(`useDocuments`), coberta por testes em `src/__tests__`.

## Princípio de evolução

A base é contract-first: futuras integrações devem nascer a partir dos tipos e mocks locais, passar por revisão estrutural e manter dados sensíveis fora do app até existir arquitetura aprovada.
