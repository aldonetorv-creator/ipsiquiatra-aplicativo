import { MockAction, MvpArea, TimelineItem } from '@/contracts/mvp';

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

