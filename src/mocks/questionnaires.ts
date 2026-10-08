import { QuestionnaireQuestion } from '@/contracts/platform';

// Mesmos textos e opções da plataforma (repositório aldonetorv-creator/ipsiquiatra:
// `PRECONSULTATION_QUESTIONNAIRES` em server.mjs e `BASELINE_QUESTIONNAIRES` em
// baseline-questionnaires.mjs). Mudou lá? Mude aqui também: a Patrícia é uma só.

const FREQ4 = [
  'Nunca ou quase nunca',
  'Alguns dias',
  'Mais da metade dos dias',
  'Quase todos os dias',
];
const WHO5 = [
  'Nunca',
  'Alguma vez',
  'Menos da metade do tempo',
  'Mais da metade do tempo',
  'A maior parte do tempo',
  'Todo o tempo',
];
const MEDICATION_ADHERENCE = [
  'Não esqueci nenhum dia',
  'Esqueci 1 dia na semana',
  'Esqueci 2 dias na semana',
  'Esqueci 3 dias na semana',
  'Esqueci 4 dias ou mais na semana',
];

const scale = (
  id: string,
  prompt: string,
  options: string[] = FREQ4,
  safety = false
): QuestionnaireQuestion => ({
  id,
  prompt,
  type: 'scale',
  options,
  required: true,
  ...(safety ? { safety: true } : {}),
});

const text = (id: string, prompt: string, required = true): QuestionnaireQuestion => ({
  id,
  prompt,
  type: 'text',
  required,
});

export type QuestionnaireDefinition = {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  questions: QuestionnaireQuestion[];
};

// Ordem da plataforma: a Atualização pré-consulta primeiro, depois as escalas.
export const mockQuestionnaireDefinitions: QuestionnaireDefinition[] = [
  {
    id: 'general',
    title: 'Atualização pré-consulta',
    description: 'Registro breve para preparar o próximo atendimento.',
    estimatedMinutes: 2,
    questions: [
      text('mainChange', 'O que mudou desde a última consulta?'),
      scale(
        'medicationUse',
        'Você está tomando a medicação prescrita todos os dias, sem esquecer?',
        MEDICATION_ADHERENCE
      ),
      text('priority', 'Qual é o principal assunto que você gostaria de discutir na consulta?'),
    ],
  },
  {
    id: 'baseline-who5',
    title: 'Bem-estar geral (WHO-5)',
    description: 'Cinco perguntas breves sobre como você tem se sentido nas últimas duas semanas.',
    estimatedMinutes: 1,
    questions: [
      scale(
        'who5-1',
        'Nas últimas duas semanas, com que frequência você se sentiu alegre e de bom humor?',
        WHO5
      ),
      scale(
        'who5-2',
        'Nas últimas duas semanas, com que frequência você se sentiu calmo(a) e tranquilo(a)?',
        WHO5
      ),
      scale(
        'who5-3',
        'Nas últimas duas semanas, com que frequência você se sentiu ativo(a) e cheio(a) de energia?',
        WHO5
      ),
      scale(
        'who5-4',
        'Nas últimas duas semanas, com que frequência você acordou se sentindo revigorado(a) e descansado(a)?',
        WHO5
      ),
      scale(
        'who5-5',
        'Nas últimas duas semanas, com que frequência sua rotina diária esteve preenchida com coisas que lhe interessam?',
        WHO5
      ),
    ],
  },
  {
    id: 'baseline-phq9',
    title: 'Sintomas depressivos (PHQ-9)',
    description: 'Nove perguntas breves sobre o seu humor e disposição nas últimas duas semanas.',
    estimatedMinutes: 2,
    questions: [
      scale(
        'phq9-1',
        'Nas últimas duas semanas, com que frequência você teve pouco interesse ou prazer em fazer as coisas?'
      ),
      scale(
        'phq9-2',
        'Nas últimas duas semanas, com que frequência você se sentiu para baixo, deprimido(a) ou sem esperança?'
      ),
      scale(
        'phq9-3',
        'Nas últimas duas semanas, com que frequência você teve dificuldade para adormecer, continuar dormindo ou dormiu demais?'
      ),
      scale(
        'phq9-4',
        'Nas últimas duas semanas, com que frequência você se sentiu cansado(a) ou com pouca energia?'
      ),
      scale(
        'phq9-5',
        'Nas últimas duas semanas, com que frequência você teve falta de apetite ou comeu demais?'
      ),
      scale(
        'phq9-6',
        'Nas últimas duas semanas, com que frequência você se sentiu mal consigo mesmo(a) — ou que é um fracasso, ou que decepcionou sua família ou a si mesmo(a)?'
      ),
      scale(
        'phq9-7',
        'Nas últimas duas semanas, com que frequência você teve dificuldade para se concentrar em tarefas como ler ou ver televisão?'
      ),
      scale(
        'phq9-8',
        'Nas últimas duas semanas, com que frequência outras pessoas notaram você mais lento(a) ao se mover ou falar, ou o contrário, mais agitado(a) do que de costume?'
      ),
      scale(
        'phq9-9',
        'Nas últimas duas semanas, com que frequência você teve pensamentos de que seria melhor estar morto(a), ou de se machucar de alguma forma?',
        FREQ4,
        true
      ),
    ],
  },
  {
    id: 'baseline-gad7',
    title: 'Sintomas ansiosos (GAD-7)',
    description: 'Sete perguntas breves sobre ansiedade e preocupação nas últimas duas semanas.',
    estimatedMinutes: 1,
    questions: [
      scale(
        'gad7-1',
        'Nas últimas duas semanas, com que frequência você se sentiu nervoso(a), ansioso(a) ou muito tenso(a)?'
      ),
      scale(
        'gad7-2',
        'Nas últimas duas semanas, com que frequência você não conseguiu impedir ou controlar as preocupações?'
      ),
      scale(
        'gad7-3',
        'Nas últimas duas semanas, com que frequência você se preocupou demais com diferentes coisas?'
      ),
      scale(
        'gad7-4',
        'Nas últimas duas semanas, com que frequência você teve dificuldade para relaxar?'
      ),
      scale(
        'gad7-5',
        'Nas últimas duas semanas, com que frequência você ficou tão agitado(a) que foi difícil permanecer parado(a)?'
      ),
      scale(
        'gad7-6',
        'Nas últimas duas semanas, com que frequência você ficou facilmente aborrecido(a) ou irritado(a)?'
      ),
      scale(
        'gad7-7',
        'Nas últimas duas semanas, com que frequência você sentiu medo como se algo terrível pudesse acontecer?'
      ),
    ],
  },
];
