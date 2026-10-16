# Identidade visual — referência do produto

Material de referência da direção visual do aplicativo do paciente iPsiquiatra.
**Não é especificação para implementar agora**: as pendências técnicas da
[issue #1](https://github.com/aldonetorv-creator/ipsiquiatra-aplicativo/issues/1)
vêm antes. O objetivo é manter o produto evoluindo em direção a esta proposta.

As imagens ficam em `docs/` (e não em `assets/`) de propósito: não entram no
bundle do app e não devem ser confundidas com ativos sem uso na limpeza do
template.

Os nomes de pacientes nos mockups (João, Aldo) e as datas são fictícios.

## Logo

O logo oficial do aplicativo é `assets/images/ip-icon.png` (monograma `iP` roxo,
1254×1254, fundo transparente). Derivados gerados a partir dele:

- `assets/images/favicon.png`: favicon web, recortado no contorno do logo.
- `assets/images/android-icon-foreground.png`: primeiro plano do ícone
  adaptativo do Android. Decisão do Dr. Aldo (12/10/2026): no celular aparece
  só o logo, sem a parte branca em volta.
  - O logo, sem nenhuma alteração, ocupa 73dp dos 108dp, um pouco mais que a
    área visível (72dp).
  - O recorte do celular (quadrado arredondado, círculo) fica todo dentro do
    logo.
  - O "iP", com o contorno, vai até 33,5dp do centro e continua inteiro no
    recorte redondo (36dp de raio).
  - O fundo do ícone (`app.json`) é `#561F8A`, o roxo da borda do logo.
  - Antes o logo ficava em 54% sobre fundo branco, e por isso aparecia a borda
    branca. Usar o `ip-icon.png` inteiro (100%) cortava o "i".
- `assets/images/icon.png`: ícone do iPhone e ícone padrão. É o logo recortado
  na borda, sobre o mesmo roxo, sem transparência (exigência da Apple); o
  iPhone arredonda os cantos.
- Os dois ícones saem de `scripts/gerar-icones.py` (Python com Pillow).

## Patrícia — foto oficial

![Patrícia](./05-patricia-foto-oficial.webp)

A Patrícia é a assistente do Dr. Aldo e o centro da experiência: o produto deve
ser desenvolvido ao redor dela. **Esta é a foto oficial.** O app usa uma cópia
reduzida, `assets/images/patricia.webp` (512×512). Os rostos usados para
a Patrícia nos mockups abaixo são provisórios e devem ser substituídos por esta
imagem.

Elementos da foto que reforçam a marca: fundo roxo com o monograma `iP`, moldura
circular roxa e livros com os temas "Saúde mental", "Bem-estar", "Ciência" e
"Vidas reais".

## Telas de referência

| Arquivo | Tela | Destaques |
|---|---|---|
| [01-inicio-diario-de-humor](./01-inicio-diario-de-humor.webp) | Início | Saudação, última mensagem da Patrícia, Diário de humor com gráfico dos últimos 7 dias, check-in da Patrícia, plano de cuidados |
| [02-patricia-chat-humor](./02-patricia-chat-humor.webp) | Patrícia (chat) | Conversa com registro de humor embutido (5 níveis + texto opcional de até 300 caracteres), atalhos "Registrar humor", "Falar com Patrícia", "Ver plano" |
| [03-patricia-atalhos-e-cofre](./03-patricia-atalhos-e-cofre.webp) | Patrícia (chat) e Cofre | Atalhos "Agendar consulta", "Remarcar", "Pedir nota fiscal", "Encontrar documento"; Cofre com busca, filtro e documentos agrupados por consulta (plano de cuidados, receita, exames, nota fiscal, relatório) |
| [04-inicio-proxima-consulta](./04-inicio-proxima-consulta.webp) | Início (variação) | Próxima consulta com "Ver consulta" e "Remarcar", questionário pré-consulta ("Responder agora", 3 minutos), plano de cuidados, dias desde a última consulta |

## Entrada do app

Pedido do Dr. Aldo (12/10/2026): pouco texto, uma progressão até o login e
acabamento no estilo do Nubank e da Apple. Implementado em `src/app/entrar.tsx`
e `src/components/auth/`.

- **Abertura e história de boas-vindas no roxo da marca** (degradê
  `Gradients.story`, com brilhos suaves). O splash nativo e a abertura animada
  usam o mesmo roxo (`#4A1F9A`, `brandDeep`), para não piscar branco antes da
  história.
- **Três quadros, como stories**: barras de progresso no topo, uma ilustração,
  um título e uma linha. Passam sozinhos (cerca de 5 segundos cada), com toque
  ou deslize; com leitor de tela, só quando a pessoa pede.
  1. "Tem alguém cuidando de você." (círculos que respiram devagar);
  2. "Conheça a Patrícia." (foto e começo de conversa);
  3. "Tudo num só lugar." (consultas, documentos com cadeado, questionários).
- **"Entrar com CPF" sempre visível**: quem já conhece não precisa esperar.
- **Uma pergunta por tela** (como no Nubank), em fundo branco: voltar e
  progresso de 2 passos no topo, a pergunta em destaque, o campo grande e o
  botão redondo de seguir acima do teclado. O código tem uma caixa por número.

## Princípios observados

- **Tom acolhedor**: "Tem alguém cuidando de você.", "Como você está hoje?",
  "Estou aqui com você." A Patrícia toma a iniciativa do contato.
- **Navegação em 5 abas**: Início, Patrícia, Medicações, Consultas, Cofre.
  "Questionários" e o plano de cuidados abrem por cartões, fora da barra.
- **Cofre** = "Tudo o que foi entregue a você": documentos organizados por
  consulta.
- **Visual**: fundo claro com gradiente lavanda/azul suave, cartões brancos com
  cantos bem arredondados, títulos em azul-marinho, botões principais em
  gradiente azul → roxo, ícones de linha dentro de círculos claros.
- **Cores aproximadas** (estimadas a olho, a validar antes de virar token):
  azul-marinho dos títulos ~`#1E2F7A`, roxo da marca ~`#6B4FD8`, lavanda de fundo
  ~`#EEF0FB`, verde do plano de cuidados ~`#2E7D5B`. Os tokens atuais em
  `src/constants/theme.ts` usam fundo bege (`#F7F5F2`) e roxo `#7B42F6`, o que
  diverge desta proposta e deve ser revisto quando a interface for retomada.

- **Direção do Dr. Aldo (12/10/2026):** roxo, branco, azul e degradês de
  roxo para azul, "bem futurista, bem moderno, bem IA". A referência é o
  botão "Transcrever consulta" da plataforma: roxo vivo à esquerda, azul à
  direita, e não só roxo. O token é `Gradients.ai` (`#A152F9` → `#7F58FE` →
  `#3A7BEF`), com as pontas um pouco mais escuras que as da referência
  (`#B34FF7` → `#4194F8`) para o texto branco continuar legível. Os ícones
  das seções alternam roxo e azul, como pontos de cor. Destaques em degradê: cartões de abertura
  (acolhimento do plano de cuidados, receita das medicações), números e
  ícones em círculo. O verde e dourado ficam só no PDF
  do plano pós-consulta, fora do app.

## Fora de escopo por enquanto

Vários fluxos dos mockups dependem de itens que a issue #1 ainda proíbe nesta
etapa: chat com IA, agendamento real, nota fiscal (NFS-e), documentos clínicos
reais e qualquer dado de paciente. Até lá, só podem existir como telas com
dados simulados, sem PHI. O que entra em cada fase (agenda real, cobrança e
pagamento, teleconsulta e NFS-e na fase 2) está em [`docs/fases.md`](../fases.md).
