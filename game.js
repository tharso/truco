// Motor do truco paulista. Não sabe nada de rede: só regras e estado.
'use strict';
const { RANKS, SUITS } = require('./public/shared.js');

const LADDER = [1, 3, 6, 9, 12];
const teamOf = (seat) => seat % 2; // assentos 0 e 2 = Dupla Azul; 1 e 3 = Dupla Vermelha

function nextLevel(v) {
  return LADDER[LADDER.indexOf(v) + 1];
}

function newDeck() {
  const d = [];
  for (const r of RANKS) for (const s of SUITS) d.push({ r, s });
  return d;
}

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function manilhaOf(vira) {
  return RANKS[(RANKS.indexOf(vira.r) + 1) % RANKS.length];
}

function power(card, manilha) {
  if (card.r === manilha) return 100 + SUITS.indexOf(card.s);
  return RANKS.indexOf(card.r);
}

// Quem levou a mão, olhando o resultado de cada rodada (0, 1 ou 'tie').
function decide(r) {
  const w = [0, 0];
  r.forEach((x) => { if (x !== 'tie') w[x]++; });
  if (w[0] >= 2) return { done: true, winner: 0 };
  if (w[1] >= 2) return { done: true, winner: 1 };
  if (r.length >= 2) {
    if (r[0] === 'tie' && r[1] !== 'tie') return { done: true, winner: r[1] };
    if (r[0] !== 'tie' && r[1] === 'tie') return { done: true, winner: r[0] };
  }
  if (r.length === 3) {
    if (r[2] !== 'tie') return { done: true, winner: r[2] };
    if (r[0] !== 'tie') return { done: true, winner: r[0] };
    return { done: true, winner: null }; // empatou tudo: ninguém marca
  }
  return { done: false };
}

const DEFAULT_SEATS = () => [
  // avatar = pasta das fotos em public/avatars/. persona = jeito de jogar (bots.js).
  { name: 'Jogador 1', bot: false, persona: null, avatar: null, connected: false },
  { name: 'Jogador 2', bot: false, persona: null, avatar: null, connected: false },
  { name: 'Tonhão', bot: true, persona: 'blefador', avatar: 'tonhao', connected: true },
  { name: 'Cida', bot: true, persona: 'medroso', avatar: 'cida', connected: true },
];

class Game {
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.brain = opts.brain;
    this.timing = Object.assign({ deal: 3200, bot: 1400, round: 1900, hand: 4500, truco: 3200 }, opts.timing);
    this.seats = DEFAULT_SEATS();
    this.events = [];
    this.evSeq = 0;
    this.phase = 'lobby';
    this.score = [0, 0];
    this.handNo = 0;
    this.starter = -1;
    this.winner = null;
    this.clearHand();
  }

  // ---------- utilidades ----------
  emit(ev) { ev.id = ++this.evSeq; this.events.push(ev); }
  drain() { const e = this.events; this.events = []; return e; }
  power(card) { return power(card, this.manilha); }

  dealer() { return this.starter < 0 ? -1 : (this.starter + 3) % 4; }

  voiceOf(team) {
    // Quem fala pela dupla: o humano, se houver.
    if (!this.seats[team].bot) return team;
    if (!this.seats[team + 2].bot) return team + 2;
    return team;
  }

  currentBest() {
    if (!this.table.length) return null;
    let best = -1;
    for (const p of this.table) best = Math.max(best, this.power(p.card));
    const tops = this.table.filter((p) => this.power(p.card) === best);
    const teams = new Set(tops.map((p) => teamOf(p.seat)));
    return { power: best, seat: tops[0].seat, team: teamOf(tops[0].seat), tie: teams.size > 1 };
  }

  clearHand() {
    this.hands = [[], [], [], []];
    this.vira = null;
    this.manilha = null;
    this.table = [];
    this.rounds = [];
    this.turn = -1;
    this.value = 1;
    this.lastRaiseTeam = null;
    this.pending = null;
    this.advice = null;
    this.mode = 'normal';
    this.onzeTeam = null;
    this.lastHand = null;
    this.lastRound = null;
  }

  // ---------- quem age agora ----------
  next() {
    const T = this.timing;
    switch (this.phase) {
      case 'deal': return { who: 'timer', delay: T.deal };
      case 'roundEnd': return { who: 'timer', delay: T.round };
      case 'handEnd': return { who: 'timer', delay: T.hand };
      case 'play': return this.actor(this.turn, T.bot);
      case 'truco': return this.actor(this.voiceOf(this.pending.respondTeam), T.truco);
      case 'onze': return this.actor(this.voiceOf(this.onzeTeam), T.truco);
      default: return { who: 'none' };
    }
  }

  actor(seat, delay) {
    return this.seats[seat].bot ? { who: 'bot', seat, delay } : { who: 'human', seat };
  }

  onTimer() {
    if (this.phase === 'deal') this.afterDeal();
    else if (this.phase === 'roundEnd') this.afterRound();
    else if (this.phase === 'handEnd') this.afterHand();
  }

  // ---------- partida ----------
  start() {
    if (this.phase !== 'lobby' && this.phase !== 'over') return 'A partida já está rolando.';
    this.score = [0, 0];
    this.handNo = 0;
    this.starter = -1;
    this.winner = null;
    this.emit({ t: 'start' });
    this.startHand();
    return null;
  }

  toLobby() {
    this.phase = 'lobby';
    this.score = [0, 0];
    this.handNo = 0;
    this.starter = -1;
    this.winner = null;
    this.clearHand();
    this.emit({ t: 'lobby' });
  }

  startHand() {
    this.clearHand();
    this.handNo++;
    this.starter = this.starter < 0 ? Math.floor(this.rng() * 4) : (this.starter + 1) % 4;
    const deck = shuffle(newDeck(), this.rng);
    this.vira = deck.pop();
    this.manilha = manilhaOf(this.vira);
    for (let i = 0; i < 3; i++) for (let s = 0; s < 4; s++) this.hands[s].push(deck.pop());
    const at11 = this.score.map((x) => x === 11);
    if (at11[0] && at11[1]) this.mode = 'ferro';
    else if (at11[0] || at11[1]) { this.mode = 'onze'; this.onzeTeam = at11[0] ? 0 : 1; }
    this.phase = 'deal';
    // Quem dá as cartas é quem joga por último (o da direita de quem começa). Roda a cada mão.
    this.emit({ t: 'deal', handNo: this.handNo, starter: this.starter, dealer: this.dealer(), vira: this.vira, manilha: this.manilha, mode: this.mode });
  }

  afterDeal() {
    this.turn = this.starter;
    if (this.mode === 'onze') {
      this.phase = 'onze';
      this.emit({ t: 'onze', team: this.onzeTeam });
    } else {
      this.phase = 'play';
      if (this.mode === 'ferro') this.emit({ t: 'ferro' });
    }
    if (this.mode !== 'ferro' && this.brain) {
      this.seats.forEach((s, seat) => {
        if (!s.bot) return;
        const sig = this.brain.signalFor(this, seat);
        if (sig) this.emit({ t: 'signal', seat, sig, delay: Math.round(600 + this.rng() * 3500) });
      });
    }
  }

  play(seat, idx) {
    if (this.phase !== 'play') return 'Agora não dá pra jogar.';
    if (seat !== this.turn) return 'Calma, não é sua vez!';
    const hand = this.hands[seat];
    if (!(Number.isInteger(idx) && idx >= 0 && idx < hand.length)) return 'Carta inválida.';
    const [card] = hand.splice(idx, 1);
    this.table.push({ seat, card });
    this.emit({ t: 'play', seat, card, ferro: this.mode === 'ferro' });
    if (this.table.length < 4) {
      this.turn = (this.turn + 1) % 4;
    } else {
      this.resolveRound();
    }
    return null;
  }

  resolveRound() {
    const best = this.currentBest();
    const result = best.tie ? 'tie' : best.team;
    this.rounds.push(result);
    this.lastRound = { result, seat: best.seat };
    this.emit({ t: 'round', n: this.rounds.length, result, seat: best.seat, card: this.table.find((p) => p.seat === best.seat).card });
    this.turn = -1;
    const d = decide(this.rounds);
    if (d.done) this.endHand(d.winner, this.value, d.winner === null ? 'empate' : 'jogo');
    else this.phase = 'roundEnd';
  }

  afterRound() {
    this.table = [];
    this.turn = this.lastRound.seat;
    this.phase = 'play';
  }

  endHand(winner, points, reason) {
    this.turn = -1;
    this.pending = null;
    this.advice = null;
    if (winner !== null) this.score[winner] = Math.min(12, this.score[winner] + points);
    this.lastHand = { winner, points: winner === null ? 0 : points, reason };
    this.emit({ t: 'hand', winner, points: this.lastHand.points, reason, score: [...this.score] });
    this.phase = 'handEnd';
  }

  afterHand() {
    const w = this.score.findIndex((s) => s >= 12);
    if (w >= 0) {
      this.phase = 'over';
      this.winner = w;
      this.clearHand();
      this.emit({ t: 'over', winner: w, score: [...this.score] });
      return;
    }
    this.startHand();
  }

  // ---------- truco ----------
  canTruco(seat) {
    return this.phase === 'play' && seat === this.turn && this.mode === 'normal' && !this.pending
      && this.value < 12 && this.lastRaiseTeam !== teamOf(seat);
  }

  truco(seat) {
    if (!this.canTruco(seat)) return 'Não dá pra pedir truco agora.';
    const team = teamOf(seat);
    this.pending = { level: nextLevel(this.value), byTeam: team, bySeat: seat, respondTeam: 1 - team };
    this.phase = 'truco';
    this.emit({ t: 'truco', seat, level: this.pending.level });
    this.makeAdvice();
    return null;
  }

  makeAdvice() {
    this.advice = null;
    if (!this.brain) return;
    const resp = this.voiceOf(this.pending.respondTeam);
    const partner = (resp + 2) % 4;
    if (this.seats[resp].bot || !this.seats[partner].bot) return;
    const mood = this.brain.adviceMood(this, partner);
    this.advice = { seat: partner, to: resp, mood };
    this.emit({ t: 'advice', seat: partner, to: resp, mood });
  }

  respond(seat, ans) {
    if (this.phase !== 'truco') return 'Ninguém pediu nada.';
    const p = this.pending;
    if (seat !== this.voiceOf(p.respondTeam)) return 'Não é você que responde.';
    if (ans === 'aceito') {
      this.value = p.level;
      this.lastRaiseTeam = p.byTeam;
      this.pending = null;
      this.advice = null;
      this.phase = 'play';
      this.emit({ t: 'aceito', seat, level: p.level });
    } else if (ans === 'corro') {
      this.emit({ t: 'corro', seat, team: p.respondTeam, gain: this.value, winner: p.byTeam });
      this.endHand(p.byTeam, this.value, 'correu');
    } else if (ans === 'aumento') {
      if (p.level >= 12) return 'Já está no máximo!';
      this.value = p.level; // aumentar = aceitar o anterior
      this.lastRaiseTeam = p.byTeam;
      this.pending = { level: nextLevel(p.level), byTeam: p.respondTeam, bySeat: seat, respondTeam: p.byTeam };
      this.emit({ t: 'truco', seat, level: this.pending.level, raise: true });
      this.makeAdvice();
    } else return 'Resposta inválida.';
    return null;
  }

  // ---------- mão de onze ----------
  onzeDecide(seat, ans) {
    if (this.phase !== 'onze') return 'Não é mão de onze.';
    if (seat !== this.voiceOf(this.onzeTeam)) return 'Quem decide é a dupla que tem 11.';
    if (ans === 'joga') {
      this.value = 3;
      this.phase = 'play';
      this.emit({ t: 'onzeJoga', team: this.onzeTeam, seat });
    } else if (ans === 'corre') {
      this.emit({ t: 'onzeCorre', team: this.onzeTeam, seat });
      this.endHand(1 - this.onzeTeam, 1, 'onze-correu');
    } else return 'Resposta inválida.';
    return null;
  }

  // ---------- visões ----------
  publicView() {
    return {
      phase: this.phase,
      seats: this.seats.map((s, i) => ({ ...s, cards: this.hands[i].length })),
      score: this.score,
      handNo: this.handNo,
      starter: this.starter,
      dealer: this.dealer(),
      vira: this.vira,
      manilha: this.manilha,
      table: this.table,
      rounds: this.rounds,
      turn: this.turn,
      value: this.value,
      pending: this.pending,
      advice: this.advice,
      mode: this.mode,
      onzeTeam: this.onzeTeam,
      lastHand: this.lastHand,
      lastRound: this.lastRound,
      winner: this.winner,
      nextLevel: this.value < 12 ? nextLevel(this.value) : null,
    };
  }

  seatView(seat) {
    const v = this.publicView();
    const ferro = this.mode === 'ferro';
    v.me = seat;
    v.hand = this.hands[seat].map((c) => (ferro ? { hidden: true } : c));
    v.canPlay = this.phase === 'play' && this.turn === seat;
    v.canTruco = this.canTruco(seat);
    v.mustRespond = this.phase === 'truco' && this.voiceOf(this.pending.respondTeam) === seat;
    v.mustOnze = this.phase === 'onze' && this.voiceOf(this.onzeTeam) === seat;
    if (v.mustOnze) v.partnerHand = this.hands[(seat + 2) % 4];
    return v;
  }
}

module.exports = { Game, teamOf, power, decide, nextLevel, manilhaOf, LADDER };
