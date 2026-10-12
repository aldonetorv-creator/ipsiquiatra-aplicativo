"""Gera os ícones do app a partir do logo oficial (assets/images/ip-icon.png).

Pedido do Dr. Aldo (12/10/2026): no celular, só o logo, sem a parte branca em
volta. O logo é usado como está, sem redesenhar nada: só muda o tamanho e o fundo.

- assets/images/android-icon-foreground.png: camada da frente do ícone adaptativo
  do Android (1024x1024 = 108dp). O logo ocupa 73dp, um pouco mais que a área
  visível (72dp), então o recorte do celular (quadrado arredondado, círculo...)
  fica todo dentro do logo. O "iP", com o contorno, vai até 33,5dp do centro e
  continua inteiro no recorte em círculo (36dp de raio). O fundo do ícone
  (app.json) é o roxo da borda do logo, BORDER_COLOR, e não aparece por trás do
  logo.
- assets/images/icon.png: ícone do iPhone e ícone padrão (1024x1024, sem
  transparência, como a Apple exige). É o logo recortado na borda; o iPhone
  arredonda os cantos.

Uso: python3 scripts/gerar-icones.py   (precisa de Pillow)
"""

from PIL import Image

SRC = 'assets/images/ip-icon.png'
SIZE = 1024
ANDROID_LOGO_DP = 73  # de 108dp; a área visível tem 72dp
BORDER_COLOR = (86, 31, 138)  # #561F8A, mediana da borda do logo


def logo_box(image):
    """Retângulo do logo opaco (alpha > 200) dentro da imagem transparente."""
    alpha = image.getchannel('A').point(lambda v: 255 if v > 200 else 0)
    return alpha.getbbox()


def main():
    logo = Image.open(SRC).convert('RGBA')
    left, top, right, bottom = logo_box(logo)
    width = right - left
    center = ((left + right) / 2, (top + bottom) / 2)

    # Android: o logo inteiro, ampliado e centrado, sobre fundo transparente.
    scale = ANDROID_LOGO_DP / 108 * SIZE / width
    scaled = logo.resize((round(logo.width * scale), round(logo.height * scale)), Image.LANCZOS)
    foreground = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    offset = (round(SIZE / 2 - center[0] * scale), round(SIZE / 2 - center[1] * scale))
    foreground.alpha_composite(scaled, offset)
    foreground.save('assets/images/android-icon-foreground.png', optimize=True)

    # iPhone e padrão: o logo recortado num quadrado, sem transparência.
    side = max(width, bottom - top)
    crop = logo.crop(
        (
            round(center[0] - side / 2),
            round(center[1] - side / 2),
            round(center[0] + side / 2),
            round(center[1] + side / 2),
        )
    )
    flat = Image.new('RGBA', crop.size, BORDER_COLOR + (255,))
    flat.alpha_composite(crop)
    flat.convert('RGB').resize((SIZE, SIZE), Image.LANCZOS).save('assets/images/icon.png', optimize=True)
    print(f'logo {width}px; Android: escala {scale:.3f}; iPhone: quadrado de {side}px')


if __name__ == '__main__':
    main()
