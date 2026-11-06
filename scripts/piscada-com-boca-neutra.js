// Refaz a cara `piscando` de um Personagem: a cara `neutro` com só a faixa dos olhos trocada.
// Assim a piscada fecha os olhos e não mexe a boca (nem nada fora dos olhos).
//
// Por quê: na piscada o jogo troca a foto inteira (public/faces.js, blink). Se a foto `piscando`
// tiver a boca diferente da `neutro`, a boca mexe a cada piscada. Foi o caso do Roque, da Neide,
// do Beto e do Juninho (nov/2026). O teste test/avatares.test.js barra a volta do problema.
//
// Uso: node scripts/piscada-com-boca-neutra.js <nome> <piscando-de-origem.webp>
//   <nome>                    pasta em public/avatars (ex.: roque)
//   <piscando-de-origem.webp> foto com os olhos fechados, do mesmo tamanho e recorte da neutra.
//                             As de antes da correção: git show 04c768a:public/avatars/<nome>/piscando.webp
// Grava em public/avatars/<nome>/piscando.webp.
'use strict';
const path = require('path');
const sharp = require('sharp');

const raiz = path.join(__dirname, '..');
const LIMIAR = 60; // soma da diferença em R, G e B para um pixel contar como diferente
const MARGEM = 8; // px a mais acima e abaixo dos olhos
const BORDA = 10; // px de transição suave nas bordas da faixa

async function rgba(arquivo) {
  return sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

// Quantos pixels diferem numa linha, só no miolo do rosto (x de 25% a 75%).
function diferencasNaLinha(a, b, largura, y) {
  let n = 0;
  for (let x = Math.floor(largura * 0.25); x < Math.floor(largura * 0.75); x++) {
    const i = (y * largura + x) * 4;
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (d > LIMIAR) n++;
  }
  return n;
}

// Faixa dos olhos: linhas entre 2/9 e 5/9 da altura onde as duas fotos diferem.
function faixaDosOlhos(a, b, largura, altura) {
  let topo = null;
  let base = null;
  for (let y = Math.round(altura * 2 / 9); y < Math.round(altura * 5 / 9); y++) {
    if (diferencasNaLinha(a, b, largura, y) > 4) {
      if (topo === null) topo = y;
      base = y;
    }
  }
  if (topo === null) throw new Error('as duas fotos não diferem na altura dos olhos');
  return { topo: topo - MARGEM, base: base + MARGEM };
}

async function piscadaComBocaNeutra(nome, origem) {
  const destino = path.join(raiz, 'public/avatars', nome, 'piscando.webp');
  const neutra = await rgba(path.join(raiz, 'public/avatars', nome, 'neutro.webp'));
  const olhos = await rgba(origem);
  const { width: largura, height: altura } = neutra.info;
  if (olhos.info.width !== largura || olhos.info.height !== altura) {
    throw new Error(`tamanhos diferentes: neutro ${largura}x${altura}, origem ${olhos.info.width}x${olhos.info.height}`);
  }
  const { topo, base } = faixaDosOlhos(neutra.data, olhos.data, largura, altura);
  const saida = Buffer.from(neutra.data);
  for (let y = 0; y < altura; y++) {
    let t = 0; // 0 = neutra, 1 = olhos fechados
    if (y >= topo && y <= base) t = 1;
    else if (y < topo && y > topo - BORDA) t = 1 - (topo - y) / BORDA;
    else if (y > base && y < base + BORDA) t = 1 - (y - base) / BORDA;
    if (!t) continue;
    for (let x = 0; x < largura; x++) {
      const i = (y * largura + x) * 4;
      for (let k = 0; k < 4; k++) saida[i + k] = Math.round(neutra.data[i + k] * (1 - t) + olhos.data[i + k] * t);
    }
  }
  await sharp(saida, { raw: { width: largura, height: altura, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(destino);
  return { destino, topo, base };
}

module.exports = { piscadaComBocaNeutra, diferencasNaLinha, rgba, LIMIAR };

if (require.main === module) {
  const [nome, origem] = process.argv.slice(2);
  if (!nome || !origem) {
    console.error('Uso: node scripts/piscada-com-boca-neutra.js <nome> <piscando-de-origem.webp>');
    process.exit(1);
  }
  piscadaComBocaNeutra(nome, path.resolve(origem))
    .then(({ destino, topo, base }) => console.log(`${path.relative(raiz, destino)}: olhos de y=${topo} a y=${base}`))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
