// Fotos dos Personagens (public/avatars/<nome>/*.webp).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { rgba, diferencasNaLinha } = require('../scripts/piscada-com-boca-neutra.js');

const pasta = path.join(__dirname, '..', 'public/avatars');
const personagens = fs.readdirSync(pasta).filter((n) => fs.existsSync(path.join(pasta, n, 'piscando.webp')));

// Na piscada o jogo troca a foto `neutro` pela `piscando` (public/faces.js, blink).
// Da boca para baixo as duas têm que ser iguais; senão a boca mexe a cada piscada.
// "Da boca para baixo" = de 60% da altura até 83% (fim do queixo), no miolo do rosto.
// Antes da correção (nov/2026), o Roque tinha ~5% de pixels diferentes aí; hoje todos ficam abaixo de 0,1%.
test('a piscada não mexe a boca de nenhum Personagem', async () => {
  assert.ok(personagens.length >= 8, `achei só ${personagens.length} Personagens com foto`);
  const problemas = [];
  for (const nome of personagens) {
    const neutra = await rgba(path.join(pasta, nome, 'neutro.webp'));
    const piscando = await rgba(path.join(pasta, nome, 'piscando.webp'));
    const { width: largura, height: altura } = neutra.info;
    assert.deepStrictEqual([piscando.info.width, piscando.info.height], [largura, altura], `${nome}: tamanhos diferentes`);
    let diferentes = 0;
    let total = 0;
    for (let y = Math.floor(altura * 0.6); y < Math.floor(altura * 0.83); y++) {
      diferentes += diferencasNaLinha(neutra.data, piscando.data, largura, y);
      total += Math.floor(largura * 0.75) - Math.floor(largura * 0.25);
    }
    const fracao = diferentes / total;
    if (fracao >= 0.003) problemas.push(`${nome} (${(fracao * 100).toFixed(2)}%)`);
  }
  assert.deepStrictEqual(problemas, [], `a boca muda na piscada (limite 0,3%): ${problemas.join(', ')}. Refaça com scripts/piscada-com-boca-neutra.js`);
});
