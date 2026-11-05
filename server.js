// Servidor do Truco do Bar do Zé. Sem dependências: só Node.
// Mesa (TV/notebook): http://localhost:3000   Celulares: http://IP-DO-NOTEBOOK:3000/mao
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Game } = require('./game.js');
const brain = require('./bots.js');
const { TAUNTS } = require('./public/shared.js');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, 'public');
const game = new Game({ brain });
const clients = new Set();

const ROBOT_NAMES = ['Robô Juca', 'Robô Lurdes'];
const humanNames = ['Jogador 1', 'Jogador 2'];

function lanUrls() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) out.push(`http://${a.address}:${PORT}/mao`);
    }
  }
  return out;
}

// ---------- tempo real (Server-Sent Events) ----------
function send(c, msg) {
  c.res.write(`data: ${JSON.stringify(msg)}\n\n`);
}

function viewFor(c) {
  return c.kind === 'seat' ? game.seatView(c.seat) : game.publicView();
}

function refreshConnected() {
  [0, 1].forEach((seat) => {
    if (game.seats[seat].bot) return;
    game.seats[seat].connected = [...clients].some((c) => c.kind === 'seat' && c.seat === seat);
  });
}

function broadcast() {
  refreshConnected();
  const events = game.drain();
  for (const c of clients) send(c, { type: 'state', state: viewFor(c), events });
  pump();
}

// Relógio do jogo: robôs e pausas entre rodadas.
let timer = null;
let timerKey = '';
function stateKey() {
  return [game.phase, game.turn, game.table.length, game.rounds.length, game.handNo, game.pending && game.pending.level].join('|');
}
function pump() {
  const n = game.next();
  const key = stateKey();
  if (timer && key === timerKey) return; // já está contando
  clearTimeout(timer);
  timer = null;
  if (n.who !== 'timer' && n.who !== 'bot') return;
  timerKey = key;
  timer = setTimeout(() => {
    timer = null;
    if (n.who === 'timer') game.onTimer();
    else brain.act(game, n.seat);
    broadcast();
  }, n.delay);
}

// ---------- ações ----------
function handleAction(a) {
  const seat = Number(a.seat);
  switch (a.type) {
    case 'join': {
      if (seat !== 0 && seat !== 1) return 'Lugar inválido.';
      const name = String(a.name || '').replace(/[<>&"]/g, '').trim().slice(0, 16);
      if (name) { humanNames[seat] = name; if (!game.seats[seat].bot) game.seats[seat].name = name; }
      return null;
    }
    case 'config': {
      if (seat !== 0 && seat !== 1) return 'Lugar inválido.';
      if (game.phase !== 'lobby') return 'Só dá pra trocar antes de começar.';
      const s = game.seats[seat];
      s.bot = !!a.bot;
      s.persona = s.bot ? 'robo' : null;
      s.name = s.bot ? ROBOT_NAMES[seat] : humanNames[seat];
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

// ---------- HTTP ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function serveFile(res, file) {
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Não achei.'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write('retry: 1500\n\n');
    const seat = url.searchParams.get('seat');
    const c = { res, kind: url.searchParams.get('role') === 'seat' ? 'seat' : 'table', seat: seat === null ? null : Number(seat) };
    if (c.kind === 'seat' && c.seat !== 0 && c.seat !== 1) c.kind = 'table';
    clients.add(c);
    req.on('close', () => { clients.delete(c); broadcast(); });
    if (c.kind === 'seat' && !game.seats[c.seat].bot) game.seats[c.seat].name = humanNames[c.seat];
    broadcast();
    return;
  }

  if (p === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ urls: lanUrls(), port: PORT }));
  }

  if (p === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 5000) req.destroy(); });
    req.on('end', () => {
      let a;
      try { a = JSON.parse(body || '{}'); } catch { a = {}; }
      const err = handleAction(a);
      broadcast();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(err ? { error: err } : { ok: true }));
    });
    return;
  }

  if (p === '/' || p === '/mesa') return serveFile(res, 'table.html');
  if (p === '/mao' || p === '/m') return serveFile(res, 'hand.html');
  return serveFile(res, decodeURIComponent(p).replace(/^\/+/, ''));
});

// Mantém as conexões vivas.
setInterval(() => { for (const c of clients) c.res.write(': oi\n\n'); }, 15000);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🃏  TRUCO DO BAR DO ZÉ está no ar!\n');
  console.log(`   Mesa (abra neste computador): http://localhost:${PORT}`);
  for (const u of lanUrls()) console.log(`   Celulares (mesmo Wi-Fi):      ${u}`);
  console.log('\n   Para parar: Ctrl+C\n');
});
