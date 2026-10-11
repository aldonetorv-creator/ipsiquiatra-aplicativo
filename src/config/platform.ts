// Ligação com a plataforma (docs/integracao-plataforma.md). O app usa a
// Patrícia real quando sabe o endereço da Patrícia do médico
// (ipsiquiatra.com.br/patricia/<endereço>); sem ele, fica na demonstração.
// Para testar contra outra cópia da plataforma, defina EXPO_PUBLIC_PLATFORM_URL
// e EXPO_PUBLIC_PATRICIA_SLUG ao iniciar o Expo.
export const platformUrl = process.env.EXPO_PUBLIC_PLATFORM_URL ?? 'https://ipsiquiatra.com.br';
export const patriciaSlug = process.env.EXPO_PUBLIC_PATRICIA_SLUG ?? '';
