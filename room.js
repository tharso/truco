// A "sala" do Truco: guarda a partida, os clientes conectados e o relógio do jogo.
// Não usa nada do Node. Roda igual no servidor local (server.js) e na Cloudflare (worker/index.js).
'use strict';
const { Game } = require('./game.js');
const brain = require('./bots.js');
const { AVATARS } = require('./public/shared.js');

const AVATAR_IDS = AVATARS.map((a) => a.id);
const avatarName = (id) => (AVATARS.find((a) => a.id === id) || {}).name || id;
const clean = (t) => String(t || '').replace(/[<>&"]/g, '').trim().slice(0, 16);
// Quem joga no lugar de uma pessoa que não veio (se o rosto estiver livre).
const FILL_AVATARS = ['neide', 'juninho'];
// Os lugares de cada jogador: o dele e o do parceiro.
const OWNED = [[0, 2], [1, 3]];

class Room {
  // opts.rng: sorteio das cartas (os testes passam um fixo). Sem ele, o Game usa Math.random.
  constructor(opts = {}) {
    this.game = new Game({ brain, rng: opts.rng });
    this.clients = new Set();
    this.humanNames = ['Jogador 1', 'Jogador 2'];
    this.timer = null;
    this.timerKey = '';
  }

  // ---------- avatares ----------
  // Um jogador "travou" a escolha quando ele mesmo escolheu os rostos no celular.
  locked(owner) { return !!this.game.seats[owner].picked; }

  // Rostos que o jogador `owner` não pode usar: os do outro jogador, se ele já escolheu.
  takenFor(owner) {
    const other = 1 - owner;
    if (!this.locked(other)) return new Set();
    return new Set(OWNED[other].map((i) => this.game.seats[i].avatar).filter(Boolean));
  }

  freeAvatar(exclude, prefer) {
    if (prefer && !exclude.has(prefer)) return prefer;
    return AVATAR_IDS.find((id) => !exclude.has(id)) || null;
  }

  // Quem não travou a escolha cede o rosto se houver repetição.
  fixConflicts() {
    const seats = this.game.seats;
    for (const owner of [0, 1]) {
      if (this.locked(owner)) continue;
      const other = 1 - owner;
      const used = new Set(OWNED[other].map((i) => seats[i].avatar).filter(Boolean));
      for (const i of OWNED[owner]) {
        const s = seats[i];
        if (!s.avatar || !used.has(s.avatar)) { if (s.avatar) used.add(s.avatar); continue; }
        const old = s.avatar;
        s.avatar = this.freeAvatar(used, i >= 2 ? null : FILL_AVATARS[i]);
        if (s.bot && s.name === avatarName(old)) s.name = avatarName(s.avatar);
        used.add(s.avatar);
      }
    }
  }

  // c = { kind: 'table'|'seat', seat, write(texto) }
  connect(kind, seat, write) {
    const c = { kind: kind === 'seat' ? 'seat' : 'table', seat: seat === null || seat === undefined ? null : Number(seat), write };
    if (c.kind === 'seat' && c.seat !== 0 && c.seat !== 1) c.kind = 'table';
    this.clients.add(c);
    if (c.kind === 'seat' && !this.game.seats[c.seat].bot) this.game.seats[c.seat].name = this.humanNames[c.seat];
    this.broadcast();
    return c;
  }

  disconnect(c) {
    if (this.clients.delete(c)) this.broadcast();
  }

  // Mantém as conexões vivas e descobre quem caiu.
  heartbeat() {
    for (const c of this.clients) this.write(c, ': oi\n\n');
  }

  write(c, text) {
    try {
      const r = c.write(text);
      if (r && typeof r.catch === 'function') r.catch(() => this.disconnect(c));
    } catch {
      this.disconnect(c);
    }
  }

  viewFor(c) {
    return c.kind === 'seat' ? this.game.seatView(c.seat) : this.game.publicView();
  }

  refreshConnected() {
    [0, 1].forEach((seat) => {
      if (this.game.seats[seat].bot) return;
      this.game.seats[seat].connected = [...this.clients].some((c) => c.kind === 'seat' && c.seat === seat);
    });
  }

  broadcast() {
    this.refreshConnected();
    const events = this.game.drain();
    for (const c of this.clients) {
      this.write(c, `data: ${JSON.stringify({ type: 'state', state: this.viewFor(c), events })}\n\n`);
    }
    this.pump();
  }

  // Relógio do jogo: robôs e pausas entre rodadas.
  stateKey() {
    const g = this.game;
    return [g.phase, g.turn, g.table.length, g.rounds.length, g.handNo, g.pending && g.pending.level].join('|');
  }

  pump() {
    const n = this.game.next();
    const key = this.stateKey();
    if (this.timer && key === this.timerKey) return; // já está contando
    clearTimeout(this.timer);
    this.timer = null;
    if (n.who !== 'timer' && n.who !== 'bot') return;
    this.timerKey = key;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (n.who === 'timer') this.game.onTimer();
      else brain.act(this.game, n.seat);
      this.broadcast();
    }, n.delay);
  }

  // Recebe uma ação (JSON já lido). Devolve { ok } ou { error }.
  action(a) {
    const err = this.handle(a || {});
    this.broadcast();
    return err ? { error: err } : { ok: true };
  }

  handle(a) {
    const game = this.game;
    const seat = Number(a.seat);
    switch (a.type) {
      case 'join': {
        if (seat !== 0 && seat !== 1) return 'Lugar inválido.';
        const name = String(a.name || '').replace(/[<>&"]/g, '').trim().slice(0, 16);
        if (name) { this.humanNames[seat] = name; if (!game.seats[seat].bot) game.seats[seat].name = name; }
        return null;
      }
      case 'config': {
        if (seat !== 0 && seat !== 1) return 'Lugar inválido.';
        if (game.phase !== 'lobby') return 'Só dá pra trocar antes de começar.';
        const s = game.seats[seat];
        s.bot = !!a.bot;
        s.persona = s.bot ? 'robo' : null;
        s.connected = s.bot;
        s.picked = false;
        if (s.bot) {
          const used = new Set(game.seats.filter((x, i) => i !== seat).map((x) => x.avatar).filter(Boolean));
          s.avatar = this.freeAvatar(used, FILL_AVATARS[seat]);
          s.name = avatarName(s.avatar);
        } else {
          s.avatar = null;
          s.name = this.humanNames[seat];
        }
        return null;
      }
      case 'pick': {
        // O jogador escolhe o próprio rosto e o do parceiro (e o nome do parceiro).
        if (seat !== 0 && seat !== 1) return 'Lugar inválido.';
        if (game.phase !== 'lobby' && game.phase !== 'over') return 'Só dá pra escolher antes de começar.';
        const me = String(a.avatar || '');
        const partner = String(a.partner || '');
        if (!AVATAR_IDS.includes(me) || !AVATAR_IDS.includes(partner)) return 'Personagem inválido.';
        if (me === partner) return 'Escolha um parceiro diferente de você.';
        const taken = this.takenFor(seat);
        if (taken.has(me) || taken.has(partner)) return 'Esse personagem já foi escolhido. Escolha outro.';
        const s = game.seats[seat];
        const p = game.seats[seat + 2];
        s.avatar = me;
        s.picked = true;
        p.avatar = partner;
        p.name = clean(a.partnerName) || avatarName(partner);
        this.fixConflicts();
        return null;
      }
      case 'start': {
        const missing = [0, 1].filter((i) => !game.seats[i].bot && !game.seats[i].connected);
        if (missing.length && !a.force) return `Falta conectar: ${missing.map((i) => game.seats[i].name).join(' e ')}.`;
        // Quem não escolheu rosto ganha um livre.
        const used = new Set(game.seats.map((x) => x.avatar).filter(Boolean));
        game.seats.forEach((x) => { if (!x.avatar) { x.avatar = this.freeAvatar(used); used.add(x.avatar); } });
        return game.start();
      }
      case 'lobby': game.toLobby(); return null;
      case 'play': return game.play(seat, Number(a.idx));
      case 'truco': return game.truco(seat);
      case 'respond': return game.respond(seat, a.ans);
      case 'onze': return game.onzeDecide(seat, a.ans);
      default: return 'Ação desconhecida.';
    }
  }
}

module.exports = { Room };
