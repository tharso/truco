// Vozes gravadas dos Personagens (public/audio/<personagem>/<fala>.m4a, issue #25).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { VOZES, FALAS, falaDe } = require('../../public/table-text.js');

const audio = path.join(__dirname, '../../public/audio');

test('cada Personagem com voz tem as 6 falas gravadas', () => {
  const faltando = [];
  for (const id of VOZES) for (const f of FALAS) if (!fs.existsSync(path.join(audio, id, `${f}.m4a`))) faltando.push(`${id}/${f}`);
  assert.deepStrictEqual(faltando, []);
});

test('toda pasta de voz em public/audio está na lista VOZES', () => {
  const pastas = fs.readdirSync(audio).filter((n) => fs.statSync(path.join(audio, n)).isDirectory());
  assert.deepStrictEqual(pastas.sort(), [...VOZES].sort());
});

test('o Personagem fala com a própria voz', () => {
  assert.strictEqual(falaDe('tonhao', 'truco'), 'tonhao/truco');
  assert.strictEqual(falaDe('nina', 'mostra'), 'nina/mostra');
  assert.strictEqual(falaDe('blurp', 'fora'), 'blurp/fora');
});

test('sem voz gravada, o pedido de truco usa a voz antiga; Mostra e Tô fora ficam mudos', () => {
  assert.strictEqual(falaDe('juninho', 'seis'), 'seis');
  assert.strictEqual(falaDe(undefined, 'doze'), 'doze');
  assert.strictEqual(falaDe('juninho', 'mostra'), null);
  assert.strictEqual(falaDe(undefined, 'fora'), null);
});
