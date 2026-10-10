/// <reference types="jest" />

import { MoodEntry, MoodLevel } from '@/contracts/platform';
import { careContactsAfter, isHardDay } from '@/utils/care-contacts';

const mood = (level: MoodLevel, at: Date): MoodEntry => ({
  id: `mood-${at.getTime()}`,
  checkId: 'check',
  level,
  note: null,
  recordedAt: at.toISOString(),
});

describe('contatos de cuidado', () => {
  it('"Mal" e "Muito mal" contam como dia difícil', () => {
    expect([1, 2, 3, 4, 5].map((level) => isHardDay(level as MoodLevel))).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it('seguem o registro mais recente, mesmo fora de ordem', () => {
    const entries = [mood(4, new Date(2026, 2, 9, 21, 0)), mood(1, new Date(2026, 2, 8, 21, 0))];

    expect(careContactsAfter(entries)).toEqual([
      { reason: 'quiet_days', at: new Date(2026, 2, 12, 10, 0) },
    ]);
  });

  it('depois de um dia difícil, procura no dia seguinte e depois de 3 dias', () => {
    expect(careContactsAfter([mood(2, new Date(2026, 2, 31, 23, 30))])).toEqual([
      { reason: 'hard_day', at: new Date(2026, 3, 1, 10, 0) },
      { reason: 'quiet_days', at: new Date(2026, 3, 3, 10, 0) },
    ]);
  });

  it('sem registro, não há contato', () => {
    expect(careContactsAfter([])).toEqual([]);
  });
});
