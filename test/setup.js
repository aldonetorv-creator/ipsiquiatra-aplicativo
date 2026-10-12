// Nos testes, as mensagens da Patrícia entram na hora; o ritmo de verdade tem
// teste próprio (src/__tests__/patricia-pace.test.tsx).
const { patriciaPace } = require('../src/constants/patricia-pace');

patriciaPace.delayFor = () => 0;
