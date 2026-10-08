# Identidade visual — referência do produto

Material de referência da direção visual do aplicativo do paciente iPsiquiatra.
**Não é especificação para implementar agora**: as pendências técnicas da
[issue #1](https://github.com/aldonetorv-creator/ipsiquiatra-aplicativo/issues/1)
vêm antes. O objetivo é manter o produto evoluindo em direção a esta proposta.

As imagens ficam em `docs/` (e não em `assets/`) de propósito: não entram no
bundle do app e não devem ser confundidas com ativos sem uso na limpeza do
template.

Os nomes de pacientes nos mockups (João, Aldo) e as datas são fictícios.

## Patrícia — foto oficial

![Patrícia](./05-patricia-foto-oficial.webp)

A Patrícia é a assistente do Dr. Aldo e o centro da experiência: o produto deve
ser desenvolvido ao redor dela. **Esta é a foto oficial.** Os rostos usados para
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

## Princípios observados

- **Tom acolhedor**: "Tem alguém acompanhando você.", "Como você está hoje?",
  "Estou aqui com você." A Patrícia toma a iniciativa do contato.
- **Navegação em 4 abas**: Início, Patrícia, Consultas, Cofre. Hoje o app tem
  também "Questionários"; nos mockups eles aparecem como cartões na Início.
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

## Fora de escopo por enquanto

Vários fluxos dos mockups dependem de itens que a issue #1 ainda proíbe nesta
etapa: chat com IA, agendamento real, nota fiscal (NFS-e), documentos clínicos
reais e qualquer dado de paciente. Até lá, só podem existir como telas com
dados simulados, sem PHI.
