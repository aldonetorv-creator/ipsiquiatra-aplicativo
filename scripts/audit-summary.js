#!/usr/bin/env node

/**
 * Converte a saída de `npm audit --json` em um resumo Markdown para o CI.
 * Uso: node scripts/audit-summary.js audit.json
 *
 * Lista apenas os pacotes de origem dos alertas (os que têm advisory próprio),
 * para que a cadeia transitiva não esconda a causa real.
 * Nunca sugere `npm audit fix --force` (ver issue #1).
 */

const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/audit-summary.js <audit.json>');
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const totals = report.metadata?.vulnerabilities ?? {};
const severityOrder = ['critical', 'high', 'moderate', 'low', 'info'];

const advisories = [];
for (const entry of Object.values(report.vulnerabilities ?? {})) {
  for (const via of entry.via) {
    if (typeof via === 'object') {
      advisories.push({
        name: entry.name,
        severity: via.severity,
        title: via.title,
        url: via.url,
        range: via.range,
      });
    }
  }
}
advisories.sort(
  (a, b) =>
    severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity) ||
    a.name.localeCompare(b.name)
);

const lines = [
  '## npm audit (dependências de produção)',
  '',
  `Total: **${totals.total ?? 0}** — ` +
    severityOrder.map((s) => `${s}: ${totals[s] ?? 0}`).join(' · '),
  '',
];

if (advisories.length > 0) {
  lines.push('| Pacote de origem | Severidade | Faixa afetada | Alerta |', '|---|---|---|---|');
  for (const a of advisories) {
    lines.push(`| \`${a.name}\` | ${a.severity} | \`${a.range}\` | [${a.title}](${a.url}) |`);
  }
  lines.push('');
}

lines.push(
  'Este passo não falha o CI: os alertas conhecidos estão registrados na issue #1. ' +
    'Não usar `npm audit fix --force`.'
);

console.log(lines.join('\n'));
