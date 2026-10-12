export type MvpAreaId =
  | 'home'
  | 'patricia'
  | 'medicacoes'
  | 'consultas'
  | 'questionarios'
  | 'cofre'
  | 'plano';

export type MvpAreaStatus = 'mock' | 'planned' | 'blocked';

export type MvpArea = {
  id: MvpAreaId;
  route: '/' | '/patricia' | '/medicacoes' | '/consultas' | '/questionarios' | '/cofre' | '/plano';
  title: string;
  label: string;
  eyebrow: string;
  description: string;
  status: MvpAreaStatus;
};
