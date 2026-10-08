import { ContractNotice, HomeInsight, MockAction, MvpArea, TimelineItem } from '@/contracts/mvp';

export const mvpAreas: MvpArea[] = [
  {
    id: 'home',
    route: '/',
    title: 'Início',
    label: 'Início',
    eyebrow: 'Visão do dia',
    description: 'Resumo acolhedor do cuidado, com próximos passos e alertas leves.',
    status: 'mock',
  },
  {
    id: 'patricia',
    route: '/patricia',
    title: 'Patrícia',
    label: 'Patrícia',
    eyebrow: 'Assistente do consultório',
    description: 'Canal conversacional ainda sem IA real, preparado para orientação administrativa.',
    status: 'mock',
  },
  {
    id: 'consultas',
    route: '/consultas',
    title: 'Consultas',
    label: 'Consultas',
    eyebrow: 'Agenda do paciente',
    description: 'Lista mockada de encontros, retornos e orientações gerais.',
    status: 'mock',
  },
  {
    id: 'questionarios',
    route: '/questionarios',
    title: 'Questionários',
    label: 'Questionários',
    eyebrow: 'Check-ins estruturados',
    description: 'Espaço para instrumentos e formulários, sem coleta real nesta fase.',
    status: 'mock',
  },
  {
    id: 'cofre',
    route: '/cofre',
    title: 'Cofre',
    label: 'Cofre',
    eyebrow: 'Documentos protegidos',
    description: 'Organização visual de arquivos e recibos, sem upload ou armazenamento real.',
    status: 'mock',
  },
];

export const homeInsights: HomeInsight[] = [
  { label: 'Próximo retorno', value: 'Qui, 15:30', tone: 'purple' },
  { label: 'Check-in aberto', value: '2 min', tone: 'blue' },
  { label: 'Cofre', value: '3 itens', tone: 'white' },
];

export const homeTimeline: TimelineItem[] = [
  {
    title: 'Consulta de acompanhamento',
    meta: 'Dados fictícios',
    description: 'Card reservado para mostrar uma consulta futura quando a API existir.',
  },
  {
    title: 'Questionário de rotina',
    meta: 'Mock local',
    description: 'Entrada visual para um check-in breve, sem persistência de respostas.',
  },
];

export const patriciaActions: MockAction[] = [
  {
    label: 'Confirmar horário',
    detail: 'Fluxo planejado para mensagens administrativas, sem envio real.',
  },
  {
    label: 'Dúvida sobre preparo',
    detail: 'Resposta simulada com conteúdo genérico e não clínico.',
  },
  {
    label: 'Falar com a equipe',
    detail: 'Reserva visual para handoff humano quando houver integração.',
  },
];

export const appointmentTimeline: TimelineItem[] = [
  {
    title: 'Consulta presencial',
    meta: 'Quinta, 15:30',
    description: 'Endereço e confirmação serão lidos por contrato futuro.',
  },
  {
    title: 'Retorno breve',
    meta: 'A definir',
    description: 'Espaço para reagendamento e lembretes quando a agenda real existir.',
  },
];

export const questionnaireActions: MockAction[] = [
  {
    label: 'Check-in semanal',
    detail: 'Rascunho visual para questionário curto de acompanhamento.',
  },
  {
    label: 'Escala de humor',
    detail: 'Placeholder sem pontuação, interpretação ou recomendação clínica.',
  },
  {
    label: 'Sono e rotina',
    detail: 'Contrato futuro deve separar resposta, consentimento e auditoria.',
  },
];

export const contractNotices: ContractNotice[] = [
  {
    title: 'Sem dados reais',
    description: 'As telas usam mocks locais e não coletam PHI, prontuário ou documentos.',
  },
  {
    title: 'Contrato primeiro',
    description: 'Tipos e mocks ficam separados para orientar futuras APIs com revisão.',
  },
  {
    title: 'Escopo protegido',
    description: 'Autenticação real, pagamentos, NFS-e, telemedicina e IA clínica ficam fora.',
  },
];
