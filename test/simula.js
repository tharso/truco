// Roda muitas partidas só com robôs e confere as regras básicas.
// Uso: node test/simula.js [partidas]
'use strict';
const assert = require('assert');
const { Game, decide } = require('../game.js');
const brain = require('../bots.js');

// Regras de desempate.
assert.deepStrictEqual(decide([0, 0]), { done: true, winner: 0 });
assert.deepStrictEqual(decide([0, 1]), { done: false });
assert.deepStrictEqual(decide(['tie', 1]), { done: true, winner: 1 });
assert.deepStrictEqual(decide([1, 'tie']), { done: true, winner: 1 });
assert.deepStrictEqual(decide([0, 1, 'tie']), { done: true, winner: 0 });
assert.deepStrictEqual(decide(['tie', 'tie', 0]), { done: true, winner: 0 });
assert.deepStrictEqual(decide(['tie', 'tie', 'tie']), { done: true, winner: null });

const N = Number(process.argv[2] || 2000);
const stats = { wins: [0, 0], hands: 0, trucos: 0, corridas: 0, onze: 0, ferro: 0, maxValue: 1 };

for (let n = 0; n < N; n++) {
  const g = new Game({ brain });
  g.seats.forEach((s, i) => { if (!s.bot) { s.bot = true; s.persona = i === 0 ? 'blefador' : 'medroso'; } });
  assert.strictEqual(g.start(), null);
  let steps = 0;
  while (g.phase !== 'over') {
    const nx = g.next();
    if (nx.who === 'timer') g.onTimer();
    else if (nx.who === 'bot') {
      const err = brain.act(g, nx.seat);
      assert.ok(!err, `robô fez jogada inválida: ${err} (fase ${g.phase})`);
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
    assert.ok(g.score[0] <= 12 && g.score[1] <= 12);
    assert.ok(++steps < 5000, 'partida infinita');
  }
  stats.wins[g.winner]++;
}
console.log(`OK: ${N} partidas sem erro.`);
console.log(stats);

// Painel de resposta: humano no assento 0 recebe truco do robô e o cochicho do parceiro.
{
  const g = new Game({ brain });
  g.seats[1].bot = true; g.seats[1].persona = 'robo';
  g.start(); g.onTimer();
  // força a vez do assento 1 (robô da dupla vermelha)
  g.turn = 1;
  assert.strictEqual(g.truco(1), null);
  const v = g.seatView(0);
  assert.ok(v.mustRespond, 'humano deveria responder');
  assert.ok(v.advice && v.advice.to === 0 && v.advice.seat === 2, 'faltou o cochicho do Tonhão');
  assert.strictEqual(g.respond(0, 'aumento'), null);
  assert.strictEqual(g.pending.level, 6);
  assert.strictEqual(g.value, 3);
  assert.strictEqual(g.voiceOf(g.pending.respondTeam), 1);
  // mão de onze: humano vê as cartas do parceiro
  const h = new Game({ brain });
  h.seats[1].bot = true;
  h.start(); h.score = [11, 4]; h.startHand(); h.onTimer();
  const w = h.seatView(0);
  assert.ok(w.mustOnze && w.partnerHand.length === 3, 'mão de onze sem cartas do parceiro');
  assert.ok(!w.canTruco, 'não pode trucar na mão de onze');
  console.log('OK: painel de truco e mão de onze.');
}
