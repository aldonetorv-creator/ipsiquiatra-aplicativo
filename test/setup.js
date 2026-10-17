// Login e dados simulados nos testes (config/platform.ts): nenhum teste fala
// com a plataforma de verdade. Vem antes de qualquer import do app.
process.env.EXPO_PUBLIC_PATIENT_APP_MODE = 'demo';

// Nos testes, as mensagens da Patrícia entram na hora; o ritmo de verdade tem
// teste próprio (src/__tests__/patricia-pace.test.tsx).
const { patriciaPace } = require('../src/constants/patricia-pace');

patriciaPace.delayFor = () => 0;
