# Clara — caras do avatar

Feita a partir de fotos de referência (prova hip-hop 2), em nov/2026. As fotos não ficam no git.
Visual hip-hop: chapéu bucket creme, jaqueta corta-vento anos 90 (verde-água, roxo e branco), correntinha, argolinhas, cabelo comprido e liso, sem óculos. As provas 1 e 2 (comum) e K-Pop não foram aprovadas.

Gerado no KIE com o modelo `nano-banana-2-1` (1K, JPG de 1024 px), com a cara `neutro` da Nina como guia de estilo.
A cara `neutro` é a base; as outras 11 foram editadas a partir dela, trocando só a expressão.

- Sinais (meio-termo): zap, copas, espadas (olhar de lado), ouros, tres (olhos apertados), lixo.
- Humor: feliz, triste, truco (alegria brava, provocação, nada de susto).
- Vida: piscando, falando.

No jogo (`public/avatars/clara/`) as caras ficam em WebP de 360 px com fundo transparente (recorte do macOS Vision,
`VNGenerateForegroundInstanceMaskRequest`); o fundo vem do CSS, na cor do time.

Piscada: o `piscando.webp` é o `neutro.webp` com só a faixa dos olhos do piscando colada por cima
(`node scripts/piscada-com-boca-neutra.js clara <piscando-recortado.webp>`). O `piscando.jpg` desta pasta é o original.
