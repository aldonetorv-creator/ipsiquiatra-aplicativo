import { MoodLevel } from '@/contracts/platform';

export type MoodOption = { level: MoodLevel; label: string; face: string; tint: string };

export const moodOptions: MoodOption[] = [
  { level: 1, label: 'Muito mal', face: '😣', tint: '#FDE7EC' },
  { level: 2, label: 'Mal', face: '🙁', tint: '#FDEFE4' },
  { level: 3, label: 'Mais ou menos', face: '😐', tint: '#EEF0F6' },
  { level: 4, label: 'Bem', face: '🙂', tint: '#E8ECFB' },
  { level: 5, label: 'Muito bem', face: '😄', tint: '#EFEAFD' },
];

export const moodOption = (level: MoodLevel) =>
  moodOptions.find((option) => option.level === level)!;
