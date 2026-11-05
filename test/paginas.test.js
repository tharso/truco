// As páginas da Mesa e do Celular, lidas como texto.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function idsRepetidos(arquivo) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', arquivo), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '');
  const ids = [...html.matchAll(/(?<![\w-])id\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  assert.ok(ids.length > 0, `nenhum id achado em ${arquivo}`);
  return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
}

test('a página do Celular não repete nenhum id', () => {
  assert.deepStrictEqual(idsRepetidos('hand.html'), []);
});

test('a página da Mesa não repete nenhum id', { todo: 'o lobby da Mesa está duplicado' }, () => {
  assert.deepStrictEqual(idsRepetidos('table.html'), []);
});
