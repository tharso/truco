// Textos e a vez na Mesa (ADR 0001: lógica de tela em arquivo puro).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { manilhaText, seatOnTurn, statusText } = require('../../public/table-text.js');

const seats = [
  { name: 'Zé', bot: false, connected: true },
  { name: 'Robô A', bot: true, connected: true },
  { name: 'Ana', bot: false, connected: true },
  { name: 'Robô B', bot: true, connected: true },
];
const mesa = (extra) => ({ phase: 'play', turn: -1, dealer: 0, pending: null, seats, ...extra });

test('Manilha de número: só o número', () => {
  assert.strictEqual(manilhaText('5'), 'Manilha: 5');
  assert.strictEqual(manilhaText('2'), 'Manilha: 2');
});

test('Manilha de figura ou ás: por extenso, com maiúscula', () => {
  assert.strictEqual(manilhaText('J'), 'Manilha: Valete');
  assert.strictEqual(manilhaText('Q'), 'Manilha: Dama');
  assert.strictEqual(manilhaText('K'), 'Manilha: Rei');
  assert.strictEqual(manilhaText('A'), 'Manilha: Ás');
});

test('Na vez: quem joga, quem responde ao truco, quem decide a Mão de onze', () => {
  assert.strictEqual(seatOnTurn(mesa({ turn: 1 })), 1);
  assert.strictEqual(seatOnTurn(mesa({ phase: 'truco', pending: { responder: 2 } })), 2);
  // Mão de onze da Dupla 1 (lugares 1 e 3, dois Robôs): decide o lugar 1.
  assert.strictEqual(seatOnTurn(mesa({ phase: 'onze', onzeTeam: 1 })), 1);
  // Dupla 0 com o Jogador no lugar 0: decide o Jogador.
  assert.strictEqual(seatOnTurn(mesa({ phase: 'onze', onzeTeam: 0 })), 0);
  // Jogador no lugar 2 e Robô no lugar 0: decide o Jogador.
  const trocados = [{ ...seats[0], bot: true }, seats[1], seats[2], seats[3]];
  assert.strictEqual(seatOnTurn(mesa({ phase: 'onze', onzeTeam: 0, seats: trocados })), 2);
});

test('Ninguém na vez fora de jogo, truco ou onze', () => {
  assert.strictEqual(seatOnTurn(mesa({ phase: 'deal' })), -1);
  assert.strictEqual(seatOnTurn(mesa({ phase: 'roundEnd', turn: 2 })), -1);
});

test('Linha de estado: sem "pensando" e sem "Vez de" na jogada', () => {
  assert.strictEqual(statusText(mesa({ turn: 1 })), '');
  assert.strictEqual(statusText(mesa({ turn: 0 })), '');
});

test('Linha de estado: continuam dando as cartas, truco, Mão de onze e caiu', () => {
  assert.strictEqual(statusText(mesa({ phase: 'deal', dealer: 3 })), 'Robô B está dando as cartas…');
  assert.strictEqual(statusText(mesa({ phase: 'truco', pending: { responder: 2 } })), 'Ana: aceita, corre ou aumenta?');
  assert.strictEqual(statusText(mesa({ phase: 'onze', onzeTeam: 0 })), 'Zé: joga ou corre?');
  const caiu = seats.map((s, i) => (i === 0 ? { ...s, connected: false } : s));
  assert.strictEqual(statusText(mesa({ turn: 1, seats: caiu })), '📵 Zé caiu. Esperando voltar…');
});
