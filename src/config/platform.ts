// Ligação com a plataforma (docs/integracao-plataforma.md). Por padrão, o app
// conversa com a Patrícia do Dr. Aldo, a mesma de
// app.ipsiquiatra.com.br/patricia/dr-aldo-araujo-psiquiatra.
// Para testar contra outra cópia da plataforma, defina EXPO_PUBLIC_PLATFORM_URL
// e EXPO_PUBLIC_PATRICIA_SLUG ao iniciar o Expo; EXPO_PUBLIC_PATRICIA_SLUG
// vazio volta à demonstração, sem IA.
export const platformUrl = process.env.EXPO_PUBLIC_PLATFORM_URL ?? 'https://app.ipsiquiatra.com.br';
export const patriciaSlug = process.env.EXPO_PUBLIC_PATRICIA_SLUG ?? 'dr-aldo-araujo-psiquiatra';
