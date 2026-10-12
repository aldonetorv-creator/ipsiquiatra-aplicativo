import type { ConversationMessage } from '@/contracts/platform';

// Ritmo da Patrícia (pedido do Dr. Aldo, 12/10/2026): as mensagens novas dela
// entram uma de cada vez, depois do "digitando", no tempo de quem lê.
export function readingDelay(message: ConversationMessage): number {
  if (message.kind !== 'text') return 1000;
  return Math.min(2200, 700 + message.text.length * 15);
}

// Sem dependências, para os testes zerarem o ritmo (test/setup.js).
export const patriciaPace = { delayFor: readingDelay };
