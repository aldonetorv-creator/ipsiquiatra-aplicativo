import { MoodEntry } from '@/contracts/platform';

// Contatos de cuidado: além da mensagem diária, a Patrícia procura o paciente
// quando o quadro pede (decisão do Dr. Aldo; ver docs/fases.md). Na fase 2 quem
// decide é a IA da plataforma, a partir do prontuário. Nesta fase, sem IA, duas
// regras fixas simulam a ideia a partir do último registro de humor:
// - depois de um dia difícil ("Mal" ou "Muito mal"), ela procura o paciente no
//   dia seguinte;
// - depois de alguns dias sem registro, ela pergunta se está tudo bem.
// Um registro novo recomeça a contagem.

export type CareReason = 'hard_day' | 'quiet_days';
export type CareContact = { reason: CareReason; at: Date };

// Hora em que a Patrícia procura o paciente.
export const CARE_HOUR = 10;
// Dias sem registro até ela perguntar se está tudo bem.
export const QUIET_DAYS = 3;
const HARD_DAY_MAX_LEVEL = 2;

// Mensagem de conversa, sem o seletor de humor: o paciente responde
// escrevendo, como com uma pessoa (pedido do Dr. Aldo). Na fase 2, quem
// responde é a IA da Patrícia.
export const careMessage: Record<CareReason, string> = {
  hard_day:
    'Bom dia. Ontem você me contou que o dia não estava fácil, e fiquei pensando em você. Como você está hoje?',
  quiet_days:
    'Oi! Faz alguns dias que a gente não conversa, e eu queria saber de você. Como você está? Estou por aqui sempre que precisar.',
};

export const careNotificationBody: Record<CareReason, string> = {
  hard_day: 'Ontem o dia não estava fácil. Fiquei pensando em você: como você está hoje?',
  quiet_days: 'Faz alguns dias que a gente não conversa. Como você está?',
};

// Humor de um dia difícil: "Mal" ou "Muito mal".
export const isHardDay = (level: MoodEntry['level']) => level <= HARD_DAY_MAX_LEVEL;

// Contatos que seguem o último registro de humor, em ordem de horário.
export function careContactsAfter(entries: MoodEntry[]): CareContact[] {
  const last = entries.reduce<MoodEntry | null>(
    (latest, entry) => (!latest || entry.recordedAt > latest.recordedAt ? entry : latest),
    null
  );
  if (!last) return [];
  const recorded = new Date(last.recordedAt);
  const dayAfter = (days: number) =>
    new Date(recorded.getFullYear(), recorded.getMonth(), recorded.getDate() + days, CARE_HOUR);
  const contacts: CareContact[] = [];
  if (isHardDay(last.level)) contacts.push({ reason: 'hard_day', at: dayAfter(1) });
  contacts.push({ reason: 'quiet_days', at: dayAfter(QUIET_DAYS) });
  return contacts;
}
