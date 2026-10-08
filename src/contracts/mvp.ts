export type MvpAreaId = 'home' | 'patricia' | 'consultas' | 'questionarios' | 'cofre';

export type MvpAreaStatus = 'mock' | 'planned' | 'blocked';

export type MvpArea = {
  id: MvpAreaId;
  route: '/' | '/patricia' | '/consultas' | '/questionarios' | '/cofre';
  title: string;
  label: string;
  eyebrow: string;
  description: string;
  status: MvpAreaStatus;
};
