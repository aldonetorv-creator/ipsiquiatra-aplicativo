// Ligação com a plataforma (docs/integracao-plataforma.md). Por padrão, o app
// conversa com a Patrícia do Dr. Aldo, a mesma de
// app.ipsiquiatra.com.br/patricia/dr-aldo-araujo-psiquiatra.
// Para testar contra outra cópia da plataforma, defina EXPO_PUBLIC_PLATFORM_URL
// e EXPO_PUBLIC_PATRICIA_SLUG ao iniciar o Expo; EXPO_PUBLIC_PATRICIA_SLUG
// vazio volta à demonstração, sem IA.
export const platformUrl = process.env.EXPO_PUBLIC_PLATFORM_URL ?? 'https://app.ipsiquiatra.com.br';
export const patriciaSlug = process.env.EXPO_PUBLIC_PATRICIA_SLUG ?? 'dr-aldo-araujo-psiquiatra';

// Login e dados do paciente (docs/api-paciente.md): 'real' usa as rotas
// /api/patient-app/<slug> da plataforma, no mesmo endereço e com o mesmo slug
// da Patrícia; 'demo' usa a versão simulada (código 123456, consultas e
// documentos de exemplo). Escolha com EXPO_PUBLIC_PATIENT_APP_MODE=demo|real;
// sem ela, é 'real' quando há endereço e slug. Os testes usam 'demo'
// (test/setup.js).
export type PatientAppMode = 'demo' | 'real';

export function resolvePatientAppMode(
  value: string | undefined,
  baseUrl: string,
  slug: string
): PatientAppMode {
  const configured = !!baseUrl.trim() && !!slug.trim();
  const wanted = value?.trim().toLowerCase();
  if (wanted === 'demo') return 'demo';
  if (wanted === 'real') return configured ? 'real' : 'demo';
  return configured ? 'real' : 'demo';
}

export const patientAppMode = resolvePatientAppMode(
  process.env.EXPO_PUBLIC_PATIENT_APP_MODE,
  platformUrl,
  patriciaSlug
);
