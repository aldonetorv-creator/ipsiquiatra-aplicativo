# Fases do aplicativo

Plano do produto combinado com o Dr. Aldo. Uma funcionalidade só entra no
código na fase dela; até lá, fica registrada aqui para que as decisões de
agora não fechem o caminho. Atualizar este arquivo quando o escopo mudar.

## Uma só Patrícia por médico

Regra do Dr. Aldo, que vale para todas as fases: a Patrícia é **uma só**, a
mesma no site e no aplicativo. Mesma lógica, mesmas regras, mesmo contexto e
mesmas instruções: um único "cérebro" atendendo em várias plataformas. Cada
médico tem a sua Patrícia; a do Dr. Aldo é a Patrícia do Dr. Aldo, no site e no
app.

- **Onde ela mora:** na plataforma do iPsiquiatra (repositório
  `aldonetorv-creator/ipsiquiatra`, `patricia-service.mjs` e
  `patricia-core.mjs`). A plataforma já tem uma Patrícia por médico, com
  configuração própria (valor, modalidade, convênios, regras de remarcação) e
  endereço próprio no site (`/patricia/<slug>`).
- **Site e app são portas para a mesma Patrícia.** O app não terá uma Patrícia
  própria: na fase 2, a conversa do app chama o serviço da Patrícia na
  plataforma, pelo contrato `PatientAppGateway`.
- **Regra nova entra uma vez, na plataforma,** e vale no site e no app (por
  exemplo, prazo de remarcação, cobrança e nota fiscal).
- **Na fase 1,** a Patrícia do app é só um roteiro de demonstração, sem IA, e
  não deve ganhar lógica própria além disso.

**A decidir na fase 2 (mesmo contexto):** hoje a plataforma guarda a conversa
só em memória (as últimas mensagens vão junto com a reserva confirmada, para o
médico conferir), e o app guarda o histórico no aparelho. Para a Patrícia
lembrar do paciente no site e no app, e o paciente ver no app o que conversou
no site, a conversa do paciente identificado precisa ficar guardada na
plataforma, com consentimento e as proteções de dado sensível de saúde (LGPD).

## Fase 1 — MVP de demonstração (atual)

Aplicativo do paciente com **dados simulados**, sem paciente real, sem PHI e
sem backend, seguindo as regras da
[issue #1](https://github.com/aldonetorv-creator/ipsiquiatra-aplicativo/issues/1).

| Área | Situação |
|---|---|
| Início | Feito: última mensagem da Patrícia, diário de humor da semana, "Antes da sua consulta" e plano de cuidados. |
| Patrícia | Feito: conversa simulada (sem IA) com histórico salvo no aparelho, registro diário de humor e atalhos "Posso ajudar você com". |
| Consultas | Próximo passo: "Sua próxima consulta", "Agora: Acompanhamento · X dias desde sua última consulta" e "Seu plano de cuidados está pronto". |
| Cofre | Próximo passo: documentos agrupados por consulta. |
| Questionários | Tela de demonstração, ainda sem conteúdo. |

Os atalhos "Agendar consulta", "Remarcar" e "Pedir nota fiscal" já existem na
conversa, mas nesta fase a Patrícia só avisa que o serviço chega em breve.

## Fase 2 — atendimento pelo app

**Nada desta fase está implementado.** Ela faz parte do escopo do MVP e entra
depois da fase 1.

### Jornada de uma consulta

1. **Agendamento.** O paciente agenda ou remarca pela Patrícia ou pela tela de
   Consultas. Cada consulta indica se é teleconsulta ou presencial.
2. **Cobrança.** Depois do agendamento, a Patrícia manda no app uma mensagem de
   cobrança para o paciente, que paga com cartão ou Pix.
3. **Pagamento.** O pagamento é confirmado pela integração com o Nubank, e a
   Patrícia avisa o paciente na conversa.
4. **Consulta.** A teleconsulta acontece por videochamada dentro do app:
   - o paciente entra pelo cartão "Sua próxima consulta", na Início ou em
     Consultas;
   - aguarda numa sala de espera até o Dr. Aldo iniciar o atendimento;
   - depois da consulta, os documentos (plano de cuidados, receitas,
     relatórios) aparecem no Cofre, no grupo daquela consulta.
5. **Nota fiscal.** A NFS-e é emitida 24 horas depois da consulta e fica no
   Cofre, no grupo da consulta correspondente.

### Decisões do Dr. Aldo

- **Meio de pagamento:** cartão e Pix.
- **Remarcação de consulta já paga:** o valor pago vira crédito.
- **Cancelamento de consulta já paga:** o valor pago vira crédito, a não ser
  que o paciente peça o reembolso.
- **Atalho "Pedir nota fiscal" vira "Ver nota fiscal":**
  - nota já emitida: abre a nota no Cofre;
  - nota ainda não emitida: avisa que a nota fiscal será emitida 24 horas
    depois da realização da consulta.
- **Toda nota fiscal mostra a consulta a que se refere:** sempre que o
  paciente conferir uma nota (no Cofre, em "Ver nota fiscal" ou na conversa),
  aparece "Nota fiscal referente à consulta do dia" seguido da data da
  consulta, por exemplo "Nota fiscal referente à consulta do dia 15/10/2026".
  O aviso de nota ainda não emitida também diz de qual consulta ela é.
- **Prazo para remarcar ou cancelar:** até 24 horas antes da consulta. É a
  regra que a Patrícia já usa na plataforma do iPsiquiatra (repositório
  `aldonetorv-creator/ipsiquiatra`, `changeMinHours: 24` em
  `patricia-core.mjs`, ajustável nas configurações da Patrícia):
  - faltando menos de 24 horas, a Patrícia não muda a agenda: explica ao
    paciente e avisa o Dr. Aldo para decidir;
  - a plataforma também limita a 2 remarcações por consulta.

  Como a Patrícia é a mesma (ver "Uma só Patrícia por médico"), essa regra
  vale igual no site e no aplicativo.

### Integração com o Nubank

Pesquisa de outubro de 2026, a confirmar com o Nubank antes de decidir. Não
encontrei API pública da conta PJ do Nubank para gerar cobranças ou avisar
automaticamente quando um pagamento cai na conta. Os caminhos encontrados:

- **NuPay for Business**, o produto de pagamentos do Nubank para empresas. Tem
  API e aviso de pagamento, mas exige contrato e é voltado a lojas online.
  Contato técnico informado na documentação: oi-nupay@nubank.com.br.
- **Intermediário de pagamento** que gera a cobrança (cartão ou Pix), avisa
  o servidor do app quando o paciente paga e deposita o valor na conta Nubank
  PJ do consultório.
- **Open Finance**, por agregadores regulados, para ler os recebimentos da
  conta e conferir os pagamentos.

Como o pagamento aceita cartão e Pix, o caminho mais provável é um
intermediário que receba os dois. O NuPay atende quem paga com conta Nubank,
o que não cobre cartões de outros bancos (a confirmar).

Evitar soluções não oficiais, como ler os e-mails de aviso do Nubank, que não
trazem dados suficientes para identificar o pagamento.

Em qualquer caminho, a integração fica **no servidor, nunca no app**: chaves e
credenciais bancárias não podem ir no aplicativo do paciente.

### Pré-requisitos da fase 2

A fase 2 é a primeira com pacientes e dados reais. Antes dela é preciso:

- a API da plataforma do iPsiquiatra no lugar do mock, a mesma que atende o
  site (o contrato `PatientAppGateway` já permite a troca sem mudar as telas);
- login do paciente;
- criptografia em repouso do histórico no aparelho, consentimento explícito e
  política de retenção (ver `docs/dependencias.md`, seção de privacidade);
- revisão independente de segurança e privacidade (LGPD, dados de saúde são
  dados sensíveis, art. 11), incluindo os dados de pagamento;
- builds pelo EAS: a videochamada usa código nativo, então o Expo Go deixa de
  servir para testar e o app passa a precisar de build de desenvolvimento.

### Regras a confirmar antes de implementar

Pontos para validar com assessoria jurídica e contábil, não com este documento:

- **Telemedicina:** Lei 14.510/2022 (telessaúde) e Resolução CFM 2.314/2022.
  Entre os pontos: consentimento do paciente para o atendimento remoto,
  registro em prontuário, requisitos de segurança da plataforma, assinatura
  digital ICP-Brasil em receitas e atestados, e a recomendação de consulta
  presencial periódica no acompanhamento de doenças crônicas.
- **Receitas de medicamentos controlados:** regras próprias da Anvisa
  (Portaria SVS/MS 344/1998). Confirmar o que pode ser emitido e entregue em
  formato digital.
- **NFS-e:**
  - como o município do consultório emite a nota (padrão nacional da NFS-e ou
    sistema próprio);
  - regime tributário;
  - certificado digital para emissão automática;
  - se emitir 24 horas depois da consulta, com o pagamento recebido antes,
    atende às regras do município.

### Como a fase 1 já se prepara

- O contrato já tem os pedidos `schedule_appointment`,
  `reschedule_appointment` e `request_invoice` (`src/contracts/platform.ts`).
  Na fase 2, a implementação real passa a atendê-los sem mudar as telas.
- A conversa já separa tipos de mensagem (texto e registro de humor). A
  cobrança entra como mais um tipo, com valor e situação do pagamento.
- O contrato das consultas, próximo passo da fase 1, vai registrar se a
  consulta é teleconsulta ou presencial. Assim o botão de entrar na
  videochamada pode chegar depois sem mudar o formato dos dados.
- O Cofre agrupado por consulta já reserva o lugar da nota fiscal de cada
  consulta.

## IA

- **Fase 1:** a Patrícia do app não usa IA; ela não lê nem interpreta as
  mensagens.
- **Fase 2:** o app passa a usar a Patrícia da plataforma, que já conversa com
  IA como secretária virtual: agendamento, dúvidas sobre o atendimento e as
  perguntas de preparação para a consulta, sem diagnóstico e sem orientar
  medicamento. Valem as travas da plataforma: a IA não escreve na agenda
  sozinha (o paciente confirma) e a detecção de crise é feita por regras fora
  da IA.
- **IA clínica** (diagnóstico, conduta, interpretação de sintomas) continua
  fora do escopo.
