# Patrícia real no app (frente 1)

Decisão do Dr. Aldo (outubro de 2026): o app passa a conversar com a mesma
Patrícia do site, com IA, para agendar, remarcar e cancelar. É a regra "Uma só
Patrícia por médico" de `docs/fases.md`: o app não tem IA nem regra de agenda
próprias, só mostra o que a plataforma responde.

Esta frente usa as rotas públicas que o chat do site já usa. A plataforma
(repositório `aldonetorv-creator/ipsiquiatra`) não muda.

## Endereço

Por padrão, o app conversa com a Patrícia do Dr. Aldo, a mesma de
`https://app.ipsiquiatra.com.br/patricia/dr-aldo-araujo-psiquiatra`
(endereço confirmado pelo Dr. Aldo). Cada consulta marcada pelo app entra na
agenda real.

| Variável | Para quê | Padrão |
|---|---|---|
| `EXPO_PUBLIC_PATRICIA_SLUG` | Endereço da Patrícia do médico, o mesmo de `/patricia/<slug>` no site. Vazio volta à demonstração, sem IA. | `dr-aldo-araujo-psiquiatra` |
| `EXPO_PUBLIC_PLATFORM_URL` | Endereço da plataforma. | `https://app.ipsiquiatra.com.br` |

As duas ficam em `src/config/platform.ts`. Para abrir a demonstração, sem a
Patrícia real:

```bash
EXPO_PUBLIC_PATRICIA_SLUG= npx expo start --clear
```

No navegador (`npm run web`), a plataforma recusa os pedidos, porque vêm de
outro endereço (cabeçalho `Origin`). A Patrícia real funciona no celular, pelo
Expo Go ou pelo app instalado.

## Rotas usadas

Todas em `/api/public/patricia/<slug>`, chamadas por
`src/services/patricia-api.ts`:

| Rota | Uso no app |
|---|---|
| `GET` | Saudação da Patrícia depois do termo. |
| `POST /session` | Abre a conversa depois que o paciente concorda com o termo. |
| `POST /message` | Mensagem escrita, horário tocado ou continuação depois da identificação. |
| `POST /confirm` | Confirma a consulta (com os dados do formulário) ou a remarcação. |
| `POST /hold/cancel` | "Trocar horário": libera a reserva. |
| `POST /change/cancel` | Confirma o cancelamento. |
| `POST /identify` | Identificação para remarcar ou cancelar. |
| `POST /relato` | Relato ao médico sem IA, para quem não concorda com o termo. |
| `POST /leave` | O paciente marcou a consulta e saiu do app. Se a triagem ou os questionários ficaram pendentes, a plataforma manda na hora, uma vez, o SMS com o link do que falta (o site faz o mesmo ao fechar a página). |

## Como funciona no app

- **Termo:** na primeira conversa aparece o termo do app. Ele é mais curto que
  o do site e não lista nome, celular, CPF e nascimento, porque o paciente já
  entrou com CPF e SMS (pedido do Dr. Aldo, 12/10/2026). Diz também que a
  conversa fica salva no celular. Nada vai para a IA antes do "Concordo e
  continuar". A resposta fica guardada com a versão do termo
  (`ipsiquiatra:patricia-consent`); se o termo mudar, ele aparece de novo.
  Quando a Patrícia tiver a rota com o paciente identificado
  (`docs/api-paciente.md`), os cartões também deixam de pedir esses dados.
- **Quem não concorda** recebe o caminho sem IA: um relato escrito vai para a
  clínica, como no site.
- **Conversa:** a resposta da Patrícia aparece em balões. Horários aparecem como
  botões; tocar num deles reserva o horário e abre o cartão de confirmação.
- **Cartões:** confirmar consulta, confirmar remarcação, cancelar consulta,
  identificação e relato. Os dados pessoais (CPF, nascimento, celular,
  responsável) são preenchidos numa janela própria e vão direto para a
  plataforma. Nada desses formulários fica salvo no celular.
- **Erros da plataforma:** campos com erro aparecem destacados no formulário;
  "cadastro não encontrado" oferece abrir um cadastro novo; sem internet, o
  cartão continua aberto para tentar de novo; reserva vencida ou conversa
  expirada fecham o cartão com o aviso.
- **Crise:** a plataforma detecta por regras fora da IA, responde com as
  orientações e avisa o médico. O app mostra o bloco de emergência (CVV 188 e
  SAMU 192).
- **CPF escrito na conversa** aparece no celular como "[CPF omitido]", com a
  mesma regra da plataforma.

## Limitações conhecidas

- **Só a conversa é real.** Início, Consultas, Cofre e Questionários continuam
  com os dados de demonstração até existir login do paciente (frente 2). O
  diário de humor, a mensagem das 20h e os contatos de cuidado continuam
  locais.
- **A IA não tem o contexto do app.** Quando o paciente responde a um contato
  de cuidado ou ao diário, a Patrícia da plataforma recebe só o texto, sem
  saber qual mensagem do app ele está respondendo. Isso depende da frente 2.
- **A conversa na plataforma dura 4 horas sem uso** e não sobrevive a um
  reinício do servidor. Depois disso o app abre uma conversa nova; os cartões
  que estavam abertos fecham com "Esta etapa expirou".
- **Limite da plataforma:** 8 conversas novas por hora por endereço de
  internet.
- **Origem dos pedidos:** a plataforma aceita pedidos sem o cabeçalho `Origin`,
  que é como o app nativo chama. Se a plataforma passar a exigir esse
  cabeçalho, o app para de falar com a Patrícia. A Opus I precisa saber disso.
- **Histórico no celular:** cifrado desde a fase 2, lote 1 (ver
  `docs/dependencias.md`). Ainda falta definir a retenção.

## Como foi testado

- Testes de unidade: `src/__tests__/patricia-api.test.ts` (rotas) e
  `src/__tests__/patricia-live.test.ts` (termo, conversa, horários, cartões,
  erros, crise e expiração).
- Teste de tela: `src/__tests__/patricia-live-screen.test.tsx` (termo,
  horário, formulário e consulta marcada).
- Ponta a ponta, fora do repositório: o app exportado para a web contra uma
  cópia local do servidor da plataforma, com IA falsa e dados sintéticos.
  Foram conferidos na agenda da plataforma: consulta marcada, remarcada e
  cancelada; crise; CPF omitido; termo lembrado ao reabrir; recusa do termo
  com relato sem IA.
- Ainda não foi testado contra o servidor de produção: a rede do ambiente de
  desenvolvimento bloqueia `app.ipsiquiatra.com.br`. O primeiro teste real é
  o do Dr. Aldo no celular.
