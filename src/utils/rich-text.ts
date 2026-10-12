// Trechos de um texto com **negrito** (plano de cuidados). Um "**" sem par
// fica como texto comum.
export function boldSegments(text: string): { text: string; bold: boolean }[] {
  const parts = text.split('**');
  if (parts.length % 2 === 0) {
    // Número ímpar de marcas: a última não fecha.
    parts[parts.length - 2] += `**${parts.pop()}`;
  }
  return parts
    .map((part, index) => ({ text: part, bold: index % 2 === 1 }))
    .filter((segment) => segment.text.length > 0);
}
