// Formatação e conferência de dados digitados nos cartões da Patrícia, iguais
// às do chat do site (patricia-chat.js e patricia-core.mjs da plataforma).

const digits = (value: string) => value.replace(/\D/g, '');

export const maskCpf = (value: string) =>
  digits(value)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');

export const maskPhone = (value: string) =>
  digits(value)
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');

// "DD/MM/AAAA" enquanto digita.
export const maskDate = (value: string) =>
  digits(value)
    .slice(0, 8)
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');

// "HH:MM" enquanto digita.
export const maskTime = (value: string) =>
  digits(value)
    .slice(0, 4)
    .replace(/^(\d{2})(\d)/, '$1:$2');

// "DD/MM/AAAA" -> "AAAA-MM-DD"; o que não estiver completo vai como veio, e o
// servidor aponta o erro no campo.
export function isoDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value.trim();
}

// Idade em anos completos a partir de "DD/MM/AAAA"; null se a data não estiver completa.
export function ageFrom(value: string, now: Date = new Date()) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1;
  return age;
}

export function isValidCpf(value: string) {
  const d = digits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(d[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

// Um CPF digitado na conversa não fica guardado: o mesmo critério da
// plataforma (maskCpfInText).
export const maskCpfInText = (text: string) =>
  text.replace(/\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b/g, (match) =>
    isValidCpf(match) || /[.-]/.test(match) ? '[CPF omitido]' : match
  );
