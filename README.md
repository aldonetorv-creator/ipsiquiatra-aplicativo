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
npx tsc --noEmit
```

## Princípio de evolução

A base é contract-first: futuras integrações devem nascer a partir dos tipos e mocks locais, passar por revisão estrutural e manter dados sensíveis fora do app até existir arquitetura aprovada.
