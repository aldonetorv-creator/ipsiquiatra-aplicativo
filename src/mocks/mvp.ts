import { MvpArea } from '@/contracts/mvp';

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
