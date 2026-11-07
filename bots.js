// Cabeça dos robôs: como jogam, quando trucam, que sinal fazem.
'use strict';
const { RANKS, SUITS } = require('./public/shared.js');

// Jeito de jogar: as barras de blefe e de coragem (0 a 10) do Robô viram números da cabeça dele.
// Blefe 0 a 10 vai de 0 a BLUFF_MAX. Coragem 5 é o meio (0); 0 e 10 vão até -NERVE_MAX e +NERVE_MAX.
// NERVE_MAX pequeno deixa os Robôs equilibrados: ninguém foge sempre.
const BLUFF_MAX = 0.3;
const NERVE_MAX = 0.14;
function temperOf(g, seat) {
  const b = g.seats[seat].bars || {};
  const bluff = Number.isFinite(b.bluff) ? b.bluff : 5;
  const nerve = Number.isFinite(b.nerve) ? b.nerve : 5;
  return { bluff: (bluff / 10) * BLUFF_MAX, nerve: ((nerve - 5) / 5) * NERVE_MAX };
}

// Força de uma carta de 0 a 1.
function score(card, manilha) {
  if (card.r === manilha) return [0.82, 0.88, 0.94, 1][SUITS.indexOf(card.s)];
  return (RANKS.indexOf(card.r) / 9) * 0.75;
}

// Quanto um Sinal visto muda a chance que o Robô vê de a Dupla dele levar a Mão.
// Sinal do parceiro: soma o número. Sinal do adversário: tira o número vezes OPPONENT_SIGNAL.
const SIGNAL_WEIGHT = { zap: 0.25, copas: 0.22, espadas: 0.18, ouros: 0.15, tres: 0.1, lixo: -0.06 };
const OPPONENT_SIGNAL = 0.5;

function signalBonus(g, seat) {
  let b = 0;
  for (const x of g.signals || []) {
    if (!x.seenBy.includes(seat)) continue;
    const w = SIGNAL_WEIGHT[x.sig] || 0;
    b += x.seat % 2 === seat % 2 ? w : -w * OPPONENT_SIGNAL;
  }
  return b;
}

// Chance (bem chutada) de a dupla levar a mão. `cards` = cartas dadas (Mão de onze: as da Dupla toda).
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
  if (!cards) p += signalBonus(g, seat); // o que ele viu dos Sinais
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

// Chance de o Robô jogar fechada uma carta que não serve na Rodada.
const CLOSE_CHANCE = 0.4;

// Fecha só carta que não serve: o parceiro já ganha a Rodada, ou a carta não ganha. Nunca a Manilha.
function wantsClosed(g, seat, idx) {
  if (!g.canPlayClosed(seat)) return false;
  const card = g.hands[seat][idx];
  if (card.r === g.manilha) return false;
  const best = g.currentBest();
  if (!best) return false;
  const partnerWins = best.team === seat % 2 && !best.tie;
  if (!partnerWins && g.power(card) >= best.power) return false;
  return g.rng() < CLOSE_CHANCE;
}

function wantsTruco(g, seat) {
  if (!g.canTruco(seat)) return false;
  const per = temperOf(g, seat);
  const p = winProb(g, seat);
  const lvl = g.value === 1 ? 3 : g.value + 3;
  const need = 0.7 - per.nerve * 0.5 + (lvl > 3 ? 0.08 : 0);
  if (p > need) return g.rng() < 0.75;
  return g.rng() < per.bluff * 0.35;
}

// Quanto a Opinião do parceiro muda a coragem de quem responde.
const OPINION_WEIGHT = 0.15;

function respondChoice(g, seat) {
  const per = temperOf(g, seat);
  const op = g.pending.opinion;
  const p = winProb(g, seat) + (op ? (op.ans === 'aceita' ? OPINION_WEIGHT : -OPINION_WEIGHT) : 0);
  if (p > 0.84 - per.nerve * 0.3 && g.pending.level < 12 && g.rng() < 0.6) return 'aumento';
  if (p > 0.38 - per.nerve * 0.6 - per.bluff * 0.3) return 'aceito';
  return 'corro';
}

// Opinião do Robô para o parceiro Jogador que responde ao Truco. Diz a verdade (sem blefe).
function opinionFor(g, seat) {
  const per = temperOf(g, seat);
  return winProb(g, seat) > 0.38 - per.nerve * 0.6 ? 'aceita' : 'corre';
}

function onzeChoice(g, seat) {
  const per = temperOf(g, seat);
  const both = g.hands[seat].concat(g.hands[(seat + 2) % 4]);
  return winProb(g, seat, both) > 0.62 - per.nerve ? 'joga' : 'corre';
}

// Quanto o Robô vê dos Sinais: o do parceiro 8 em 10 vezes, o do adversário 2 em 10.
const SIGNAL_SEEN = { partner: 0.8, opponent: 0.2 };
// Quando o Robô faz o Sinal: num momento sorteado só para ele, entre 1 e 6 segundos depois das cartas.
const SIGNAL_WINDOW = [1000, 6000];

function seesSignal(g, viewer, from) {
  return g.rng() < (viewer % 2 === from % 2 ? SIGNAL_SEEN.partner : SIGNAL_SEEN.opponent);
}

function signalDelay(g) {
  return Math.round(SIGNAL_WINDOW[0] + g.rng() * (SIGNAL_WINDOW[1] - SIGNAL_WINDOW[0]));
}

function signalFor(g, seat) {
  const hand = g.hands[seat];
  const mans = hand.filter((c) => c.r === g.manilha).map((c) => SUITS.indexOf(c.s));
  if (mans.length) return ['ouros', 'espadas', 'copas', 'zap'][Math.max(...mans)];
  if (hand.some((c) => c.r === '3')) return 'tres';
  return 'lixo'; // mão fraca também avisa: o Robô nunca fica calado
}

function act(g, seat) {
  if (g.phase === 'play' && g.turn === seat) {
    if (wantsTruco(g, seat)) return g.truco(seat);
    const idx = chooseCard(g, seat);
    return g.play(seat, idx, wantsClosed(g, seat, idx));
  }
  if (g.phase === 'truco') return g.respond(seat, respondChoice(g, seat));
  if (g.phase === 'onze') return g.onzeDecide(seat, onzeChoice(g, seat));
  return 'nada a fazer';
}

module.exports = { act, signalFor, seesSignal, signalDelay, opinionFor };
