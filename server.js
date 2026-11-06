// Servidor local do Truco do Bar do Blurp. Sem dependências: só Node.
// Mesa (TV/notebook): http://localhost:3000   Celulares: http://IP-DO-NOTEBOOK:3000/mao
// Na internet, o jogo roda na Cloudflare (worker/index.js). A lógica da sala é a mesma: room.js.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Room } = require('./room.js');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC = path.join(__dirname, 'public');
const room = new Room();

function lanUrls() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) out.push(`http://${a.address}:${PORT}/mao`);
    }
  }
  return out;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' };

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
    const c = room.connect(url.searchParams.get('role'), url.searchParams.get('seat'), (text) => { res.write(text); }, url.searchParams.get('marca'));
    req.on('close', () => room.disconnect(c));
    return;
  }

  if (p === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ urls: lanUrls(), port: PORT, online: false }));
  }

  if (p === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 5000) req.destroy(); });
    req.on('end', () => {
      let a;
      try { a = JSON.parse(body || '{}'); } catch { a = {}; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(room.action(a)));
    });
    return;
  }

  if (p === '/' || p === '/mesa') return serveFile(res, 'table.html');
  if (p === '/mao' || p === '/m') return serveFile(res, 'hand.html');
  if (p === '/junto') return serveFile(res, 'junto.html'); // protótipo (#12)
  return serveFile(res, decodeURIComponent(p).replace(/^\/+/, ''));
});

setInterval(() => room.heartbeat(), 15000);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n🃏  TRUCO DO BAR DO BLURP está no ar!\n');
  console.log(`   Mesa (abra neste computador): http://localhost:${PORT}`);
  for (const u of lanUrls()) console.log(`   Celulares (mesmo Wi-Fi):      ${u}`);
  console.log('\n   Para parar: Ctrl+C\n');
});
