# Cida — caras do avatar

Gerado no KIE com o modelo `nano-banana-2-1` (1K; guardado aqui em JPG de 1024 px), estilo "animação 3D",
com a mesma receita de estilo do Tonhão. A cara `neutro` é a base; as outras foram editadas a partir dela.

- Sinais (meio-termo): zap, copas, espadas (olhar de lado), ouros, tres (olhos apertados), lixo.
- Humor (pode exagerar): feliz, triste, susto.
- Vida: piscando, falando.

Versões do jogo: `public/avatars/cida/*.jpg` (360 px).

- Truco (alegria brava, provocação, nada de susto): `truco.jpg`. Substitui o `susto` no jogo (nov/2026).

No jogo as caras ficam em WebP com fundo transparente (recorte do macOS Vision); o fundo vem do CSS, na cor do time.

Piscada (nov/2026): no jogo, o `piscando.webp` é o `neutro.webp` com só a faixa dos olhos do piscando colada por cima. Assim a piscada não mexe a boca. O `piscando.jpg` desta pasta é o original e não mudou. Se refizer o WebP, rode `node scripts/piscada-com-boca-neutra.js cida <piscando-recortado.webp>`; o teste `test/avatares.test.js` confere.
