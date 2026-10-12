# Login do paciente: o que a plataforma precisa ter

Especificação para a plataforma do iPsiquiatra (repositório
`aldonetorv-creator/ipsiquiatra`), para depois da pausa de produto do beta.
Decisões do Dr. Aldo (12/10/2026):

- a fase 2 começa pelo app, e a plataforma vem depois;
- o paciente entra com **CPF + código por SMS**.

No app, o login já existe em versão simulada (`src/mocks/patient-auth.ts`),
com as mesmas regras desta página. Quando as rotas existirem, só troca a
implementação de `PatientAuthApi` (`src/contracts/patient-auth.ts`), sem mudar
as telas.

Na classificação da plataforma (`CLAUDE.md`, §2), isto é **VERMELHO**:
autenticação, identidade do paciente, PHI e SMS.

## Por que CPF + código

- **O CPF diz qual cadastro.** Um celular pode estar em mais de um cadastro (a
  plataforma já trata o celular dividido entre pacientes); o CPF separa mãe e
  filho que usam o mesmo número.
- **O código prova que o celular é do paciente.** Ele vai só para o celular
  que já está no cadastro da clínica, nunca para um número digitado no app.

## Rotas

Todas por médico, como a Patrícia: o cadastro do paciente é da conta do médico
(`<slug>` é o mesmo de `/patricia/<slug>`).

| Rota | Corpo | Resposta |
|---|---|---|
| `POST /api/patient-app/<slug>/auth/start` | `{cpf}` | `200 {ok, challengeId, expiresInSec, resendInSec}` |
| `POST /api/patient-app/<slug>/auth/resend` | `{challengeId}` | igual à `start`; `429 {retryInSec}` antes da hora |
| `POST /api/patient-app/<slug>/auth/verify` | `{challengeId, code}` | `200 {ok, token, expiresAt, patient: {firstName}}` |
| `POST /api/patient-app/<slug>/auth/logout` | — (token no cabeçalho) | `200 {ok}` |
| `GET /api/patient-app/<slug>/me` | — (token no cabeçalho) | `200 {patient: {firstName}}`; `401` se a sessão não vale |

Erros da `verify`:

| Situação | Resposta | O app mostra |
|---|---|---|
| código errado | `401 {reason: 'wrong_code', attemptsLeft}` | "Código incorreto. Restam N tentativas." |
| código vencido ou já usado | `410 {reason: 'expired'}` | "Este código expirou. Peça um novo código." |
| tentativas esgotadas | `423 {reason: 'locked'}` | "Muitas tentativas com este código. Peça um novo código." |
| limite de pedidos | `429 {reason: 'rate_limited', retryInSec}` | "Muitos pedidos seguidos..." |

O token vai em `Authorization: Bearer <token>`. O app nativo não manda o
cabeçalho `Origin`. Como a autenticação é por token, e não por cookie, não há
risco de CSRF; o CORS pode continuar fechado para outros sites.

## Regras de segurança

- **Sem revelar quem é paciente.** A `start` responde igual para CPF que não
  está no cadastro, com um `challengeId` que nunca valida. O app sempre mostra
  "Se o CPF estiver no cadastro da clínica, você vai receber o código por SMS."
- **Código:** 6 números, gerados por fonte criptográfica, guardados só como
  hash, válidos por 10 minutos, com 5 tentativas. Pedir de novo (depois de 60
  segundos) troca o código e zera as tentativas. Um desafio usado não vale de
  novo.
- **Limites:** por CPF, por celular e por IP, como os da Patrícia (por exemplo,
  5 códigos por CPF por hora e 20 por IP por hora). Isso protege o paciente de
  SMS em excesso e a clínica do custo.
- **SMS sem dado de saúde:** só o código e o nome da clínica, por exemplo:
  "iPsiquiatra: seu código de acesso é 123456. Não compartilhe."
  - O texto não leva o nome do médico nem da especialidade, porque o celular
    pode ser dividido.
  - Vale a regra de opt-out que a plataforma já tem para SMS (`SAIR`). O código
    de login foi pedido pelo próprio paciente e não é envio automático.
- **Sessão:**
  - token aleatório de 256 bits, guardado só como hash;
  - vale 30 dias;
  - pode ser encerrada pelo paciente ("Sair") e pelo médico (por exemplo, ao
    anonimizar o paciente ou trocar o celular do cadastro);
  - todo pedido confere se o token é do paciente daquele médico.
- **Registro:** cada login (pedido, sucesso, bloqueio) entra na trilha da
  plataforma sem o CPF em claro (hash ou só os 4 últimos dígitos, como os
  links já fazem).
- **Cadastro ambíguo:** se o CPF bater com mais de um cadastro ativo do mesmo
  médico, não entra ninguém. O app mostra a mesma mensagem genérica, e o
  médico recebe um alerta para corrigir o cadastro.

## No app

- **O login é a primeira tela** (decisão do Dr. Aldo, 12/10/2026).
  - Sem sessão, o app só mostra a tela de entrar (`src/app/entrar.tsx`): uma
    história curta de boas-vindas, em três quadros que passam sozinhos, com o
    botão "Entrar com CPF" sempre à mão; depois uma pergunta por tela, o CPF e
    o código do SMS (que é conferido sozinho com os 6 números).
  - As abas (Início, Patrícia, Consultas, Cofre, Questionários) nem existem até
    o login. São rotas protegidas do Expo Router (`Tabs.Protected` em
    `src/components/app-tabs.tsx`).
  - Abrir uma tela direto, por exemplo pela notificação da Patrícia, também
    cai na tela de entrar.
  - "Sair" volta para ela.
  - A abertura animada só some depois que o app lê a sessão salva, para quem
    já entrou não ver o login piscar.
- O CPF só é usado para pedir o código e não fica salvo no celular.
- A sessão (token, validade e primeiro nome) fica no armazenamento seguro do
  sistema (`expo-secure-store`), em `src/services/patient-session.tsx`.
- Sessão vencida, ou `401` da plataforma, pede para entrar de novo.
- "Sair" apaga a sessão do celular e chama a `logout`. Fica no botão da conta
  (a inicial do paciente, no topo da Início), que também liga e desliga a
  biometria.
- **Biometria** (pedido do Dr. Aldo, 12/10/2026), só no celular, sem rota
  nova na plataforma (`src/services/biometrics.ts`, `expo-local-authentication`):
  - logo depois do login por SMS, se o celular tem digital ou rosto
    cadastrado, o app oferece "Entrar com biometria?". Ligar pede a biometria
    uma vez, para confirmar;
  - com ela ligada, ao abrir o app, e ao voltar depois de 5 minutos fora dele,
    a sessão salva só abre com a biometria (ou com a senha do celular, que o
    sistema oferece se ela falhar). O pedido aparece sozinho, com "Olá,
    {nome}!";
  - se não der, o paciente pode tentar de novo ou "Entrar com CPF e SMS", que
    apaga a sessão e vai direto ao CPF;
  - se o celular deixar de ter biometria cadastrada, a entrada volta a ser pelo
    SMS;
  - o app só recebe do sistema se deu certo ou não: a digital e o rosto nunca
    saem do celular. A escolha fica no armazenamento seguro, ao lado da
    sessão, e "Sair" a apaga.

## A definir com o Dr. Aldo

- **Paciente menor de idade:** entra com o CPF do responsável e a data de
  nascimento do paciente, como no TCLE (`minor-responsible-cpf`)? Ou só o
  responsável entra?
- **Paciente sem CPF** (a Patrícia aceita cadastro sem CPF): qual outro
  caminho? Por exemplo, nome, nascimento e código.
- **Celular desatualizado:** hoje o app manda falar com a clínica ou com a
  Patrícia pelo site, porque a Patrícia do app só aparece depois do login.
  Precisa de um caminho para o paciente pedir a troca?
- **Quem ainda não é paciente:** com o login real, só entra quem já tem
  cadastro na clínica. A primeira consulta fica com a Patrícia do site. Vale
  pôr na tela de entrar um botão "Ainda não é paciente?" para a Patrícia do
  site?

## Próximas rotas (depois do login)

Com o paciente identificado, as telas do app passam a ler a plataforma em vez
dos dados simulados. Ordem sugerida:

1. **Consultas:** próxima e anteriores (`listAppointments`).
2. **Documentos liberados pelo médico** (Cofre, `listDocuments`): só o que o
   médico liberou, nunca o prontuário interno.
3. **Questionários pedidos para a próxima consulta** (`listQuestionnaires` e
   `submitQuestionnaire`), com o alerta do item 9 do PHQ-9 indo para o médico.
4. **Diário de humor e conversa no prontuário:** entram marcados como relato
   do paciente, com consentimento próprio (`docs/fases.md`, "Contexto e
   prontuário").
5. **Push:** o lembrete das 20h e os contatos de cuidado passam a vir da
   plataforma.
