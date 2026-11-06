# Blurp — caras do avatar

Ornitorrinco beatboxer, excêntrico (prova 3: moletom tie-dye, boné magenta, óculos de mergulho laranja).
Mesmo processo dos outros (nano-banana-2-1, estilo 3D, fundo roxo). Versões do jogo: `public/avatars/blurp/*.jpg`.

- Truco (alegria brava, provocação, nada de susto): `truco.jpg`. Substitui o `susto` no jogo (nov/2026).

No jogo as caras ficam em WebP com fundo transparente (recorte do macOS Vision); o fundo vem do CSS, na cor do time.

Piscada (nov/2026): no jogo, o `piscando.webp` é o `neutro.webp` com só a faixa dos olhos do piscando colada por cima. Assim a piscada não mexe a boca. O `piscando.jpg` desta pasta é o original e não mudou. Se refizer o WebP, rode `node scripts/piscada-com-boca-neutra.js blurp <piscando-recortado.webp>`; o teste `test/avatares.test.js` confere.
