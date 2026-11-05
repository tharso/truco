// Partidas só com Robôs: nenhuma jogada inválida, nenhuma Partida infinita.
// As regras do jogo ficam em regras.test.js.
// Uso: npm test (ou PARTIDAS=2000 node --test test/partidas-de-robos.test.js)
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const brain = require('../bots.js');
const { partidaSoDeRobos } = require('./montagem.js');

const PARTIDAS = Number(process.env.PARTIDAS || 500);

test(`${PARTIDAS} Partidas de Robôs terminam sem quebrar as regras`, (t) => {
  const stats = { wins: [0, 0], hands: 0, trucos: 0, corridas: 0, onze: 0, ferro: 0, maxValue: 1 };

  for (let n = 0; n < PARTIDAS; n++) {
    const g = partidaSoDeRobos({ brain });
    assert.strictEqual(g.start(), null);
    let steps = 0;
    const fase = () => g.publicView().phase;
    while (fase() !== 'over') {
      const nx = g.next();
      if (nx.who === 'timer') g.onTimer();
      else if (nx.who === 'bot') {
        const err = brain.act(g, nx.seat);
        assert.ok(!err, `Robô fez jogada inválida: ${err} (fase ${fase()})`);
      } else throw new Error('travou na fase ' + fase());
      for (const ev of g.drain()) {
        if (ev.t === 'deal') {
          stats.hands++;
          // Na Mão de ferro as cartas vêm escondidas; o baralho já é conferido em regras.test.js.
          if (ev.mode !== 'ferro') {
            const all = [0, 1, 2, 3].flatMap((s) => g.seatView(s).hand).concat([ev.vira]);
            assert.strictEqual(new Set(all.map((c) => c.r + c.s)).size, 13, 'carta repetida');
          }
        }
        if (ev.t === 'truco') stats.trucos++;
        if (ev.t === 'corro') stats.corridas++;
        if (ev.t === 'onze') stats.onze++;
        if (ev.t === 'ferro') stats.ferro++;
      }
      const v = g.publicView();
      stats.maxValue = Math.max(stats.maxValue, v.value);
      assert.ok(v.score[0] <= 12 && v.score[1] <= 12, `placar passou de 12: ${v.score}`);
      assert.ok(++steps < 5000, 'Partida infinita');
    }
    stats.wins[g.publicView().winner]++;
  }
  t.diagnostic(JSON.stringify(stats));
});
