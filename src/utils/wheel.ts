// Geometria da roleta circular: os itens ficam na face de um cilindro que gira
// em torno de um eixo horizontal, como o seletor de horário do celular.

// Ângulo entre dois itens vizinhos no cilindro.
export const WHEEL_STEP_DEGREES = 30;
// Distâncias do centro (em itens) usadas para desenhar a curva da animação.
const SAMPLES = [-4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

export type WheelFrame = {
  // Quanto o item sobe ou desce em relação à posição de lista.
  translateY: number;
  // Inclinação em graus: positivo afasta a borda de cima (item acima do centro).
  rotateX: number;
  scale: number;
  opacity: number;
};

// Como fica um item a `distance` itens do centro (negativo: acima; positivo:
// abaixo). No centro, o item fica inteiro; quanto mais longe, mais inclinado,
// menor, mais apagado e mais perto do vizinho, como na curva de um cilindro.
export function wheelFrame(distance: number, itemHeight: number): WheelFrame {
  const radius = itemHeight / ((WHEEL_STEP_DEGREES * Math.PI) / 180);
  const degrees = Math.max(-90, Math.min(90, distance * WHEEL_STEP_DEGREES));
  const radians = (degrees * Math.PI) / 180;
  const away = Math.abs(distance);
  return {
    translateY: radius * Math.sin(radians) - distance * itemHeight,
    rotateX: -degrees,
    scale: Math.max(0.5, 1 - 0.2 * away),
    opacity: Math.max(0, Math.cos(radians) * (1 - 0.2 * away)),
  };
}

// Pontos para `Animated.interpolate` do item `index`, em função da rolagem.
// A rolagem cresce quando o item sobe, então a distância vai de +4 a -4.
export function wheelInterpolation(index: number, itemHeight: number) {
  const distances = [...SAMPLES].reverse();
  const frames = distances.map((distance) => wheelFrame(distance, itemHeight));
  return {
    inputRange: distances.map((distance) => (index - distance) * itemHeight),
    translateY: frames.map((frame) => frame.translateY),
    rotateX: frames.map((frame) => `${frame.rotateX}deg`),
    scale: frames.map((frame) => frame.scale),
    opacity: frames.map((frame) => frame.opacity),
  };
}

// Índice do item que está no centro para uma rolagem.
export const wheelIndexAt = (offset: number, itemHeight: number, count: number) =>
  Math.max(0, Math.min(count - 1, Math.round(offset / itemHeight)));
