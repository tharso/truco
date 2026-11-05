// Partidas só com Robôs, mais as regras de desempate e o painel de Truco.
// Uso: npm test (ou PARTIDAS=2000 node --test test/partidas-de-robos.test.js)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Game, decide } = require('../game.js');
const brain = require('../bots.js');

const PARTIDAS = Number(process.env.PARTIDAS || 500);

test('regras de desempate entre Rodadas', () => {
  assert.deepStrictEqual(decide([0, 0]), { done: true, winner: 0 });
  assert.deepStrictEqual(decide([0, 1]), { done: false });
  assert.deepStrictEqual(decide(['tie', 1]), { done: true, winner: 1 });
  assert.deepStrictEqual(decide([1, 'tie']), { done: true, winner: 1 });
  assert.deepStrictEqual(decide([0, 1, 'tie']), { done: true, winner: 0 });
  assert.deepStrictEqual(decide(['tie', 'tie', 0]), { done: true, winner: 0 });
  assert.deepStrictEqual(decide(['tie', 'tie', 'tie']), { done: true, winner: null });
});

test(`${PARTIDAS} Partidas de Robôs terminam sem quebrar as regras`, (t) => {
  const stats = { wins: [0, 0], hands: 0, trucos: 0, corridas: 0, onze: 0, ferro: 0, maxValue: 1 };

  for (let n = 0; n < PARTIDAS; n++) {
    const g = new Game({ brain });
    g.seats.forEach((s, i) => { if (!s.bot) { s.bot = true; s.persona = i === 0 ? 'blefador' : 'medroso'; } });
    assert.strictEqual(g.start(), null);
    let steps = 0;
    while (g.phase !== 'over') {
      const nx = g.next();
      if (nx.who === 'timer') g.onTimer();
      else if (nx.who === 'bot') {
        const err = brain.act(g, nx.seat);
        assert.ok(!err, `Robô fez jogada inválida: ${err} (fase ${g.phase})`);
      } else throw new Error('travou na fase ' + g.phase);
      for (const ev of g.drain()) {
        if (ev.t === 'deal') {
          stats.hands++;
          const all = g.hands.flat().concat([g.vira]);
          assert.strictEqual(new Set(all.map((c) => c.r + c.s)).size, 13, 'carta repetida');
        }
        if (ev.t === 'truco') stats.trucos++;
        if (ev.t === 'corro') stats.corridas++;
        if (ev.t === 'onze') stats.onze++;
        if (ev.t === 'ferro') stats.ferro++;
      }
      stats.maxValue = Math.max(stats.maxValue, g.value);
      assert.ok(g.score[0] <= 12 && g.score[1] <= 12, `placar passou de 12: ${g.score}`);
      assert.ok(++steps < 5000, 'Partida infinita');
    }
    stats.wins[g.winner]++;
  }
  t.diagnostic(JSON.stringify(stats));
});

test('painel de Truco: Jogador responde ao Robô e recebe o cochicho do parceiro', () => {
  const g = new Game({ brain });
  g.seats[1].bot = true; g.seats[1].persona = 'robo';
  g.start(); g.onTimer();
  // força a vez do Lugar 1 (Robô da Dupla Vermelha)
  g.turn = 1;
  assert.strictEqual(g.truco(1), null);
  const v = g.seatView(0);
  assert.ok(v.mustRespond, 'Jogador deveria responder');
  assert.ok(v.advice && v.advice.to === 0 && v.advice.seat === 2, 'faltou o cochicho do Tonhão');
  assert.strictEqual(g.respond(0, 'aumento'), null);
  assert.strictEqual(g.pending.level, 6);
  assert.strictEqual(g.value, 3);
  assert.strictEqual(g.voiceOf(g.pending.respondTeam), 1);
});

test('Mão de onze: Jogador vê as cartas do parceiro e não pode trucar', () => {
  const g = new Game({ brain });
  g.seats[1].bot = true;
  g.start(); g.score = [11, 4]; g.startHand(); g.onTimer();
  const v = g.seatView(0);
  assert.ok(v.mustOnze && v.partnerHand.length === 3, 'Mão de onze sem cartas do parceiro');
  assert.ok(!v.canTruco, 'não pode trucar na Mão de onze');
});
