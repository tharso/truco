// Troca de humor dos Personagens com foto na Mesa (ADR 0001: lógica de tela em arquivo puro).
// Pergunta: o Personagem mostra a foto X agora e pede o humor Y. Qual foto entra?
// null quer dizer "não troca".
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { moodPhoto } = require('../../public/mood.js');

test('Personagem parado (cara neutra) mostra a foto do humor pedido', () => {
  assert.strictEqual(moodPhoto('neutro', 'happy'), 'feliz');
});

test('Sinal em curso não é atropelado por humor', () => {
  assert.strictEqual(moodPhoto('zap', 'sad'), null);
  assert.strictEqual(moodPhoto('lixo', 'happy'), null);
});

test('Personagem falando para de falar e mostra a foto do humor pedido', () => {
  assert.strictEqual(moodPhoto('falando', 'shock'), 'susto');
});

test('Um humor na tela dá lugar a outro humor pedido (estava feliz, fica triste)', () => {
  assert.strictEqual(moodPhoto('feliz', 'sad'), 'triste');
  assert.strictEqual(moodPhoto('susto', 'happy'), 'feliz');
});

test('Humor desconhecido mostra a cara neutra', () => {
  assert.strictEqual(moodPhoto('neutro', 'raiva'), 'neutro');
  assert.strictEqual(moodPhoto('feliz', 'raiva'), 'neutro');
});
