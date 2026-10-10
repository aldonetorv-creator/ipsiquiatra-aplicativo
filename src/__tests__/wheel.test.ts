/// <reference types="jest" />

import { wheelFrame, wheelIndexAt, wheelInterpolation } from '@/utils/wheel';

const HEIGHT = 72;

describe('roleta circular', () => {
  it('deixa o item do centro inteiro, sem inclinar nem diminuir', () => {
    const frame = wheelFrame(0, HEIGHT);
    expect(frame.translateY).toBeCloseTo(0);
    expect(frame.rotateX).toBeCloseTo(0);
    expect(frame.scale).toBe(1);
    expect(frame.opacity).toBe(1);
  });

  it('diminui, apaga e inclina os itens à medida que se afastam do centro', () => {
    const [center, near, far] = [0, 1, 2].map((distance) => wheelFrame(distance, HEIGHT));
    expect(near.scale).toBeLessThan(center.scale);
    expect(far.scale).toBeLessThan(near.scale);
    expect(near.opacity).toBeLessThan(center.opacity);
    expect(far.opacity).toBeLessThan(near.opacity);
    expect(Math.abs(far.rotateX)).toBeGreaterThan(Math.abs(near.rotateX));
  });

  it('curva como a face de um cilindro: os de cima e os de baixo se inclinam para fora', () => {
    const above = wheelFrame(-1, HEIGHT);
    const below = wheelFrame(1, HEIGHT);
    // Acima do centro, a borda de cima se afasta; abaixo, a de baixo.
    expect(above.rotateX).toBeGreaterThan(0);
    expect(below.rotateX).toBeLessThan(0);
    // Os itens de fora chegam mais perto do centro do que numa lista reta.
    expect(wheelFrame(2, HEIGHT).translateY).toBeLessThan(0);
    expect(wheelFrame(-2, HEIGHT).translateY).toBeGreaterThan(0);
    expect(above.scale).toBe(below.scale);
  });

  it('some no fundo do cilindro', () => {
    expect(wheelFrame(3, HEIGHT).opacity).toBeCloseTo(0);
    expect(wheelFrame(-4, HEIGHT).opacity).toBeCloseTo(0);
  });

  it('monta a animação em ordem crescente de rolagem, com o item no centro na sua posição', () => {
    const curve = wheelInterpolation(3, HEIGHT);
    const increasing = curve.inputRange.every(
      (value, index) => index === 0 || value > curve.inputRange[index - 1]
    );
    expect(increasing).toBe(true);
    const centerAt = curve.inputRange.indexOf(3 * HEIGHT);
    expect(curve.scale[centerAt]).toBe(1);
    expect(curve.rotateX[centerAt]).toBe('0deg');
  });

  it('acha o item do centro pela rolagem, sem sair da lista', () => {
    expect(wheelIndexAt(0, HEIGHT, 6)).toBe(0);
    expect(wheelIndexAt(HEIGHT * 2.4, HEIGHT, 6)).toBe(2);
    expect(wheelIndexAt(HEIGHT * 2.6, HEIGHT, 6)).toBe(3);
    expect(wheelIndexAt(-50, HEIGHT, 6)).toBe(0);
    expect(wheelIndexAt(HEIGHT * 20, HEIGHT, 6)).toBe(5);
  });
});
