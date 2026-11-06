# Tonhão — caras do avatar

Gerado no KIE com o modelo `nano-banana-2-1` (1K; guardado aqui em JPG de 1024 px), estilo "animação 3D".
A cara `neutro` é a base. As outras foram editadas a partir dela (ou da primeira versão),
pedindo para manter a mesma pessoa e trocar só a expressão.

- Sinais (meio-termo: dá para ver, mas é natural): zap (piscadinha), copas (sobrancelhas),
  espadas (olhar de lado), ouros (bochechas cheias), tres (olhos apertados), lixo (olhar pro céu).
- Humor (pode exagerar): feliz, triste, susto.
- Vida: piscando, falando.

As versões do jogo ficam em `public/avatars/tonhao/*.jpg` (360 px).

No jogo (`public/avatars/tonhao/`) as 12 caras estão espelhadas, para a boca torta ir para o outro lado. Aqui ficam as originais.

- Truco (alegria brava, provocação, nada de susto): `truco.jpg`. Substitui o `susto` no jogo (nov/2026).

No jogo as caras ficam em WebP com fundo transparente (recorte do macOS Vision); o fundo vem do CSS, na cor do time.

Piscada (nov/2026): no jogo, o `piscando.webp` é o `neutro.webp` com só a faixa dos olhos do piscando colada por cima. Assim a piscada não mexe a boca. O `piscando.jpg` desta pasta é o original e não mudou. Se refizer o WebP, rode `node scripts/piscada-com-boca-neutra.js tonhao <piscando-recortado.webp>`; o teste `test/avatares.test.js` confere.
