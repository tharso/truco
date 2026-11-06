// Textos e a vez na Mesa (ADR 0001: lógica de tela em arquivo puro).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { manilhaText, seatOnTurn, statusText, fellSeat, roundMarksOf, zapDecidiu } = require('../../public/table-text.js');

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

test('Linha de estado: continuam dando as cartas, truco e Mão de onze', () => {
  assert.strictEqual(statusText(mesa({ phase: 'deal', dealer: 3 })), 'Robô B está dando as cartas…');
  assert.strictEqual(statusText(mesa({ phase: 'truco', pending: { responder: 2 } })), 'Ana: aceita, corre ou aumenta?');
  assert.strictEqual(statusText(mesa({ phase: 'onze', onzeTeam: 0 })), 'Zé: joga ou corre?');
});

test('Quem caiu aparece no Personagem, não no Tampo', () => {
  const caidos = seats.map((s, i) => (i === 2 ? { ...s, connected: false } : s));
  assert.strictEqual(statusText(mesa({ seats: caidos })), '');
  assert.strictEqual(fellSeat(mesa({ seats: caidos }), 2), true);
  assert.strictEqual(fellSeat(mesa({ seats: caidos }), 0), false);
  // Robô não cai; e no saguão ninguém "caiu".
  assert.strictEqual(fellSeat(mesa({ seats: caidos.map((s) => ({ ...s, connected: false })) }), 1), false);
  assert.strictEqual(fellSeat(mesa({ phase: 'lobby', seats: caidos }), 2), false);
});

test('Marca da Rodada: cada Lugar vê as Rodadas que ganhou ou empatou', () => {
  const roundMarks = [
    { n: 1, result: 'tie', seats: [0, 1] },
    { n: 2, result: 1, seats: [3] },
  ];
  assert.deepStrictEqual(roundMarksOf(mesa({ roundMarks }), 0), [{ n: 1, kind: 'tie' }]);
  assert.deepStrictEqual(roundMarksOf(mesa({ roundMarks }), 3), [{ n: 2, kind: 'win' }]);
  assert.deepStrictEqual(roundMarksOf(mesa({ roundMarks }), 2), []);
  assert.deepStrictEqual(roundMarksOf(mesa({}), 2), []);
});

test('Festa do zap: só quando o zap ganha a Rodada que dá a Mão', () => {
  const zap = { r: '5', s: 'paus' };
  const rodada = (card, result = 0) => ({ result, card });
  const fim = (reason = 'jogo', winner = 0) => ({ reason, winner });
  assert.strictEqual(zapDecidiu(rodada(zap), fim(), '5'), true);
  // Zap no meio da Mão (a Mão não acabou nesta Rodada): sem festa.
  assert.strictEqual(zapDecidiu(rodada(zap), null, '5'), false);
  // Outra carta decidiu; ou o zap é de outra Manilha; ou a Mão acabou porque alguém correu.
  assert.strictEqual(zapDecidiu(rodada({ r: '3', s: 'paus' }), fim(), '5'), false);
  assert.strictEqual(zapDecidiu(rodada(zap), fim(), '4'), false);
  assert.strictEqual(zapDecidiu(rodada(zap), fim('correu'), '5'), false);
  // Carta fechada: o evento não traz a carta.
  assert.strictEqual(zapDecidiu(rodada(undefined), fim(), '5'), false);
});
