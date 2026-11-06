// Motor do truco paulista. Não sabe nada de rede: só regras e estado.
'use strict';
const { RANKS, SUITS, barsOf } = require('./public/shared.js');

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

// O Sinal que uma carta faz: a Manilha faz o naipe dela, o 3 faz "tres", as outras cartas fazem "lixo".
const MANILHA_SIGNAL = { ouros: 'ouros', espadas: 'espadas', copas: 'copas', paus: 'zap' };
function signalOfCard(card, manilha) {
  if (card.r === manilha) return MANILHA_SIGNAL[card.s];
  return card.r === '3' ? 'tres' : 'lixo';
}
// Fases em que a Mão está viva e dá para fazer Sinal.
const SIGNAL_PHASES = new Set(['deal', 'play', 'truco', 'roundEnd', 'onze']);

const DEFAULT_SEATS = () => [
  // avatar = pasta das fotos em public/avatars/. bars = Barras do Robô ({ bluff, nerve }, de 0 a 10), do Personagem dele.
  { name: 'Jogador 1', bot: false, avatar: null, picked: false, connected: false },
  { name: 'Jogador 2', bot: false, avatar: null, picked: false, connected: false },
  { name: 'Tonhão', bot: true, avatar: 'tonhao', connected: true, bars: barsOf('tonhao') },
  { name: 'Cida', bot: true, avatar: 'cida', connected: true, bars: barsOf('cida') },
];
// O que todo mundo vê de um Lugar: tudo, menos as barras do Robô.
const publicSeat = ({ bars, ...rest }) => rest;

class Game {
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.brain = opts.brain;
    this.timing = Object.assign({ deal: 3200, bot: 1400, round: 1900, hand: 4500, truco: 3200, opinion: 10000 }, opts.timing);
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
  // Força de uma carta na mesa: a Carta fechada perde para qualquer carta aberta.
  powerOn(p) { return p.closed ? -1 : this.power(p.card); }

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
    for (const p of this.table) best = Math.max(best, this.powerOn(p));
    const tops = this.table.filter((p) => this.powerOn(p) === best);
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
    this.mode = 'normal';
    this.onzeTeam = null;
    this.lastHand = null;
    this.lastRound = null;
    // Sinais da Mão: { seat, sig, card, seenBy } (seenBy = Robôs que viram). Some quando a carta é jogada.
    this.signals = [];
    this.signalPlan = [];
  }

  // ---------- quem age agora ----------
  next() {
    const T = this.timing;
    switch (this.phase) {
      case 'deal': return { who: 'timer', delay: T.deal };
      case 'roundEnd': return { who: 'timer', delay: T.round };
      case 'handEnd': return { who: 'timer', delay: T.hand };
      case 'play': return this.actor(this.turn, T.bot);
      // Robô que responde espera a Opinião do parceiro Jogador até T.opinion.
      case 'truco': return this.actor(this.pending.responder, this.wantsOpinion(this.pending) ? T.opinion : T.truco);
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
    this.dealNo = (this.dealNo || 0) + 1; // nunca volta a zero: separa os Sinais de cada Mão
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
        if (sig) this.signalPlan.push({ seat, sig, delay: this.brain.signalDelay(this), deal: this.dealNo });
      });
    }
  }

  // ---------- sinais ----------
  // Os Sinais dos Robôs ficam marcados para uma hora sorteada. Quem tem relógio (a Sala) pega a lista
  // aqui e chama showSignal na hora. Só então o Sinal acontece: a Mesa mostra e os Robôs tiram a sorte de ver.
  takeSignalPlan() {
    const plan = this.signalPlan;
    this.signalPlan = [];
    return plan;
  }

  showSignal({ seat, sig, deal }) {
    if (deal !== this.dealNo || this.mode === 'ferro') return;
    const card = sig === 'lixo' ? null : this.hands[seat].find((c) => signalOfCard(c, this.manilha) === sig);
    if (sig !== 'lixo' && !card) return; // a carta do Sinal já foi jogada
    this.makeSignal(seat, sig, card);
  }

  // Por que a carta `idx` do Lugar `seat` não pode fazer Sinal agora. null = pode.
  signalError(seat, idx) {
    if (this.mode === 'ferro') return 'Na Mão de ferro não tem Sinal.';
    if (!SIGNAL_PHASES.has(this.phase)) return 'Agora não dá pra fazer Sinal.';
    const card = this.hands[seat] && this.hands[seat][idx];
    if (!card) return 'Carta inválida.';
    if (this.signals.some((x) => x.seat === seat && x.card === card)) return 'Essa carta já fez Sinal.';
    return null;
  }

  canSignal(seat, idx) { return !this.signalError(seat, idx); }

  // O Jogador faz o Sinal de uma carta: o Personagem dele faz a cara na Mesa, na hora.
  signal(seat, idx) {
    const err = this.signalError(seat, idx);
    if (err) return err;
    const card = this.hands[seat][idx];
    this.makeSignal(seat, signalOfCard(card, this.manilha), card);
    return null;
  }

  // Cada Robô tira a sorte para ver ou não o Sinal (bots.js decide a chance).
  makeSignal(seat, sig, card) {
    const seenBy = this.brain
      ? this.seats.map((s, i) => i).filter((i) => i !== seat && this.seats[i].bot && this.brain.seesSignal(this, i, seat))
      : [];
    this.signals.push({ seat, sig, card: card || null, seenBy });
    this.emit({ t: 'signal', seat, sig, delay: 0 });
  }

  canPlayClosed(seat) {
    return this.phase === 'play' && seat === this.turn && this.rounds.length > 0 && this.mode !== 'ferro';
  }

  // closed = jogar a carta fechada (virada para baixo).
  play(seat, idx, closed = false) {
    if (this.phase !== 'play') return 'Agora não dá pra jogar.';
    if (seat !== this.turn) return 'Calma, não é sua vez!';
    const hand = this.hands[seat];
    if (!(Number.isInteger(idx) && idx >= 0 && idx < hand.length)) return 'Carta inválida.';
    if (closed && this.mode === 'ferro') return 'Na Mão de ferro não dá pra jogar fechada.';
    if (closed && !this.rounds.length) return 'Na 1ª Rodada não dá pra jogar fechada.';
    const [card] = hand.splice(idx, 1);
    // Quem viu o Sinal desta carta esquece: ela já foi jogada.
    this.signals = this.signals.filter((x) => x.card !== card);
    if (closed) {
      this.table.push({ seat, card, closed: true });
      this.emit({ t: 'play', seat, closed: true });
    } else {
      this.table.push({ seat, card });
      this.emit({ t: 'play', seat, card, ferro: this.mode === 'ferro' });
    }
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
    const top = this.table.find((p) => p.seat === best.seat);
    this.emit({ t: 'round', n: this.rounds.length, result, seat: best.seat, card: top.closed ? undefined : top.card });
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
    this.pending = this.request(nextLevel(this.value), seat);
    this.phase = 'truco';
    this.emit({ t: 'truco', seat, level: this.pending.level });
    this.robotOpinion();
    return null;
  }

  // Um pedido (truco ou aumento) de `seat`. Quem responde é o Lugar logo depois dele.
  request(level, seat) {
    const team = teamOf(seat);
    return { level, byTeam: team, bySeat: seat, respondTeam: 1 - team, responder: (seat + 1) % 4, opinion: null };
  }

  // O parceiro de quem responde dá a Opinião. Se ele é Robô e quem responde é Jogador, dá na hora.
  // Se ele é Jogador e quem responde é Robô, o Jogador dá pelo Celular (opine). Dupla de dois Robôs: nada.
  opinionSeatOf(p) { return (p.responder + 2) % 4; }

  // Quem responde é Robô e o parceiro dele é Jogador: o Jogador dá a Opinião pelo Celular.
  playerOpines(p) {
    return !this.seats[this.opinionSeatOf(p)].bot && this.seats[p.responder].bot;
  }

  wantsOpinion(p) {
    return !p.opinion && this.playerOpines(p);
  }

  robotOpinion() {
    const p = this.pending;
    const adv = this.opinionSeatOf(p);
    if (!this.brain || this.seats[p.responder].bot || !this.seats[adv].bot) return;
    this.giveOpinion(adv, this.brain.opinionFor(this, adv));
  }

  giveOpinion(seat, ans) {
    this.pending.opinion = { seat, ans };
    this.emit({ t: 'opiniao', seat, ans });
  }

  opine(seat, ans) {
    if (this.phase !== 'truco') return 'Ninguém pediu nada.';
    const p = this.pending;
    if (seat !== this.opinionSeatOf(p) || !this.playerOpines(p)) return 'Não é você que dá opinião.';
    if (p.opinion) return 'Você já deu sua opinião.';
    if (ans !== 'aceita' && ans !== 'corre') return 'Opinião inválida.';
    this.giveOpinion(seat, ans);
    return null;
  }

  respond(seat, ans) {
    if (this.phase !== 'truco') return 'Ninguém pediu nada.';
    const p = this.pending;
    if (seat !== p.responder) return 'Não é você que responde.';
    if (ans === 'aceito') {
      this.value = p.level;
      this.lastRaiseTeam = p.byTeam;
      this.pending = null;
      this.phase = 'play';
      this.emit({ t: 'aceito', seat, level: p.level });
    } else if (ans === 'corro') {
      this.emit({ t: 'corro', seat, team: p.respondTeam, gain: this.value, winner: p.byTeam });
      this.endHand(p.byTeam, this.value, 'correu');
    } else if (ans === 'aumento') {
      if (p.level >= 12) return 'Já está no máximo!';
      this.value = p.level; // aumentar = aceitar o anterior
      this.lastRaiseTeam = p.byTeam;
      this.pending = this.request(nextLevel(p.level), seat);
      this.emit({ t: 'truco', seat, level: this.pending.level, raise: true });
      this.robotOpinion();
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
      seats: this.seats.map((s, i) => ({ ...publicSeat(s), cards: this.hands[i].length })),
      score: this.score,
      handNo: this.handNo,
      starter: this.starter,
      dealer: this.dealer(),
      vira: this.vira,
      manilha: this.manilha,
      table: this.table.map((p) => (p.closed ? { seat: p.seat, closed: true } : p)),
      rounds: this.rounds,
      turn: this.turn,
      value: this.value,
      pending: this.pending,
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
    v.canPlayClosed = this.canPlayClosed(seat);
    v.canSignal = this.hands[seat].map((_, i) => this.canSignal(seat, i));
    v.mustRespond = this.phase === 'truco' && this.pending.responder === seat;
    v.mustOpine = this.phase === 'truco' && this.wantsOpinion(this.pending) && this.opinionSeatOf(this.pending) === seat;
    v.mustOnze = this.phase === 'onze' && this.voiceOf(this.onzeTeam) === seat;
    // Só o dono vê as barras do parceiro Robô.
    const partner = this.seats[(seat + 2) % 4];
    if (partner.bot) v.partner = { ...partner.bars };
    if (v.mustOnze) v.partnerHand = this.hands[(seat + 2) % 4];
    return v;
  }
}

module.exports = { Game, signalOfCard, power, decide, nextLevel, manilhaOf };
