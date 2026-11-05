// Cabeça dos robôs: como jogam, quando trucam, que sinal fazem.
'use strict';
const { RANKS, SUITS } = require('./public/shared.js');

const PERSONAS = {
  blefador: { bluff: 0.32, nerve: 0.14 },
  medroso: { bluff: 0.03, nerve: -0.16 },
  robo: { bluff: 0.12, nerve: 0 },
};
const persona = (g, seat) => PERSONAS[g.seats[seat].persona] || PERSONAS.robo;

// Força de uma carta de 0 a 1.
function score(card, manilha) {
  if (card.r === manilha) return [0.82, 0.88, 0.94, 1][SUITS.indexOf(card.s)];
  return (RANKS.indexOf(card.r) / 9) * 0.75;
}

// Chance (bem chutada) de a dupla levar a mão.
function winProb(g, seat, cards) {
  const team = seat % 2;
  const s = (cards || g.hands[seat]).map((c) => score(c, g.manilha)).sort((a, b) => b - a);
  const top = s[0] || 0, sec = s[1] || 0, third = s[2] || 0;
  const r = g.rounds;
  const w = r.filter((x) => x === team).length;
  const l = r.filter((x) => x === 1 - team).length;
  let p;
  if (r.length === 0) p = -0.15 + 0.6 * top + 0.45 * sec + 0.1 * third;
  else if (w >= 1 && l === 0) p = 0.5 + 0.5 * top;
  else if (l >= 1 && w === 0) p = top * sec;
  else p = 0.95 * top; // empatou a primeira, ou 1 a 1
  // O que já está na mesa nesta rodada.
  const best = g.currentBest();
  if (best && !best.tie) {
    if (best.team === team) p += 0.08;
    else if (!(cards || g.hands[seat]).some((c) => g.power(c) > best.power)) p -= 0.15;
  }
  p += 0.06; // o parceiro também joga
  return Math.max(0, Math.min(1, p));
}

function chooseCard(g, seat) {
  const hand = g.hands[seat];
  if (g.mode === 'ferro') return Math.floor(g.rng() * hand.length);
  if (hand.length === 1) return 0;
  const pw = (i) => g.power(hand[i]);
  const idx = hand.map((_, i) => i).sort((a, b) => pw(a) - pw(b));
  const lowest = idx[0];
  const highest = idx[idx.length - 1];
  const myTeam = seat % 2;

  const best = g.currentBest();
  if (!best) {
    // Abrindo a rodada.
    if (g.rounds.length === 0) {
      const normal = idx.filter((i) => hand[i].r !== g.manilha);
      if (normal.length && idx.length > 1) return normal[normal.length - 1];
    }
    return highest;
  }
  if (best.team === myTeam && !best.tie) {
    // Parceiro está ganhando. Se sou o último, jogo a menor.
    return lowest;
  }
  const beat = idx.find((i) => pw(i) > best.power);
  if (beat !== undefined) return beat;
  const tie = idx.find((i) => pw(i) === best.power);
  if (tie !== undefined && g.rounds[0] === myTeam) return tie; // cangar garante a mão
  return lowest;
}

function wantsTruco(g, seat) {
  if (!g.canTruco(seat)) return false;
  const per = persona(g, seat);
  const p = winProb(g, seat);
  const lvl = g.value === 1 ? 3 : g.value + 3;
  const need = 0.7 - per.nerve * 0.5 + (lvl > 3 ? 0.08 : 0);
  if (p > need) return g.rng() < 0.75;
  return g.rng() < per.bluff * 0.35;
}

function respondChoice(g, seat) {
  const per = persona(g, seat);
  const p = winProb(g, seat);
  if (p > 0.84 - per.nerve * 0.3 && g.pending.level < 12 && g.rng() < 0.6) return 'aumento';
  if (p > 0.38 - per.nerve * 0.6 - per.bluff * 0.3) return 'aceito';
  return 'corro';
}

// Conselho do robô pro parceiro humano.
function adviceMood(g, seat) {
  const per = persona(g, seat);
  const p = winProb(g, seat);
  if (p > 0.82 - per.nerve * 0.3) return 'aumenta';
  if (p > 0.38 - per.nerve * 0.6) return 'aceita';
  return 'corre';
}

function onzeChoice(g, seat) {
  const per = persona(g, seat);
  const both = g.hands[seat].concat(g.hands[(seat + 2) % 4]);
  return winProb(g, seat, both) > 0.62 - per.nerve ? 'joga' : 'corre';
}

function signalFor(g, seat) {
  const hand = g.hands[seat];
  const mans = hand.filter((c) => c.r === g.manilha).map((c) => SUITS.indexOf(c.s));
  if (mans.length) return ['ouros', 'espadas', 'copas', 'zap'][Math.max(...mans)];
  if (hand.some((c) => c.r === '3')) return 'tres';
  if (g.rng() < 0.6) return 'lixo';
  return null;
}

function act(g, seat) {
  if (g.phase === 'play' && g.turn === seat) {
    if (wantsTruco(g, seat)) return g.truco(seat);
    return g.play(seat, chooseCard(g, seat));
  }
  if (g.phase === 'truco') return g.respond(seat, respondChoice(g, seat));
  if (g.phase === 'onze') return g.onzeDecide(seat, onzeChoice(g, seat));
  return 'nada a fazer';
}

module.exports = { act, signalFor, adviceMood, winProb, chooseCard, PERSONAS };
