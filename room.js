// A "sala" do Truco: guarda a partida, os clientes conectados e o relógio do jogo.
// Não usa nada do Node. Roda igual no servidor local (server.js) e na Cloudflare (worker/index.js).
'use strict';
const { Game } = require('./game.js');
const brain = require('./bots.js');
const { TAUNTS } = require('./public/shared.js');

const ROBOT_NAMES = ['Robô Juca', 'Robô Lurdes'];

class Room {
  constructor() {
    this.game = new Game({ brain });
    this.clients = new Set();
    this.humanNames = ['Jogador 1', 'Jogador 2'];
    this.timer = null;
    this.timerKey = '';
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
        s.name = s.bot ? ROBOT_NAMES[seat] : this.humanNames[seat];
        s.connected = s.bot;
        return null;
      }
      case 'start': {
        const missing = [0, 1].filter((i) => !game.seats[i].bot && !game.seats[i].connected);
        if (missing.length && !a.force) return `Falta conectar: ${missing.map((i) => game.seats[i].name).join(' e ')}.`;
        return game.start();
      }
      case 'lobby': game.toLobby(); return null;
      case 'play': return game.play(seat, Number(a.idx));
      case 'truco': return game.truco(seat);
      case 'respond': return game.respond(seat, a.ans);
      case 'onze': return game.onzeDecide(seat, a.ans);
      case 'taunt': {
        const i = Number(a.i);
        if (!(i >= 0 && i < TAUNTS.length)) return 'Provocação inválida.';
        game.emit({ t: 'say', seat, text: TAUNTS[i] });
        return null;
      }
      default: return 'Ação desconhecida.';
    }
  }
}

module.exports = { Room };
