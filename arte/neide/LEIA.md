# neide — caras do avatar

Mesmo processo do Tonhão e da Cida (nano-banana-2-1, estilo animação 3D, fundo madeira neutro).
A cara `neutro` é a base. Versões do jogo: `public/avatars/neide/*.jpg`.

Boca reta: neutro, piscando, zap, copas, espadas e tres foram editadas no KIE (seedream/5-pro-image-to-image, nov/2026). Só a boca da edição foi colada sobre a original; o resto da foto é o original.

- Truco (alegria brava, provocação, nada de susto): `truco.jpg`. Substitui o `susto` no jogo (nov/2026).

No jogo as caras ficam em WebP com fundo transparente (recorte do macOS Vision); o fundo vem do CSS, na cor do time.

Piscada (nov/2026): no jogo, o `piscando.webp` é o `neutro.webp` com só a faixa dos olhos do piscando colada por cima. Assim a piscada não mexe a boca. O `piscando.jpg` desta pasta é o original e não mudou. Se refizer o WebP, rode `node scripts/piscada-com-boca-neutra.js neide <piscando-recortado.webp>`; o teste `test/avatares.test.js` confere.
