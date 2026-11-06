// Truco do Bar do Zé na Cloudflare.
// O Worker entrega as telas. Cada Sala mora no seu Durable Object ("Mesa"), achado pelo Código da Sala
// (ADR 0002). A lógica da sala é a mesma do servidor local: room.js.
//   /             cria uma Sala nova e leva para a Mesa dela (/s/KF4P/mesa)
//   /s/KF4P       Celular no celular, Mesa no resto
//   /s/KF4P/mesa  /s/KF4P/mao  a tela pedida
//   /mao          o Celular pede o Código da Sala
import { DurableObject } from 'cloudflare:workers';
import roomModule from '../room.js';
import sharedModule from '../public/shared.js';

const { Room } = roomModule;
const { newRoomCode, roomCode } = sharedModule;
const enc = new TextEncoder();
const SSE_HEADERS = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' };
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

export class Mesa extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.room = new Room();
    this.beat = null;
  }

  startBeat() {
    if (this.beat) return;
    this.beat = setInterval(() => {
      this.room.heartbeat();
      if (this.room.clients.size === 0) { clearInterval(this.beat); this.beat = null; }
    }, 10000);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/events') {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      writer.write(enc.encode('retry: 1500\n\n')).catch(() => {});
      const c = this.room.connect(url.searchParams.get('role'), url.searchParams.get('seat'), (text) => writer.write(enc.encode(text)));
      if (request.signal) request.signal.addEventListener('abort', () => this.room.disconnect(c));
      this.startBeat();
      return new Response(readable, { headers: SSE_HEADERS });
    }

    // Sala ocupada: alguém conectado ou Partida começada. Um código novo não pode cair nela.
    if (p === '/busy') {
      return new Response(JSON.stringify({ busy: this.room.clients.size > 0 || this.room.game.phase !== 'lobby' }), { headers: JSON_HEADERS });
    }

    if (p === '/api/action' && request.method === 'POST') {
      const body = await request.text();
      let a = {};
      if (body.length <= 5000) { try { a = JSON.parse(body || '{}'); } catch { a = {}; } }
      return new Response(JSON.stringify(this.room.action(a)), { headers: JSON_HEADERS });
    }

    return new Response('Não achei.', { status: 404 });
  }
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
const mesaOf = (env, code) => env.MESA.get(env.MESA.idFromName(code));
const page = (env, url, request, file) => env.ASSETS.fetch(new Request(new URL(file, url.origin), request));

async function freshCode(env) {
  let code = newRoomCode();
  for (let i = 0; i < 5; i++) {
    const r = await mesaOf(env, code).fetch('https://mesa/busy');
    if (!(await r.json()).busy) return code;
    code = newRoomCode();
  }
  return code;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/' || p === '/mesa') {
      return Response.redirect(`${url.origin}/s/${await freshCode(env)}/mesa`, 302);
    }
    if (p === '/mao' || p === '/m') return page(env, url, request, '/hand.html');
    if (p === '/api/info') return json({ online: true, code: null });
    if (p === '/events' || p.startsWith('/api/')) return json({ error: 'Falta o Código da Sala.' }, 400);

    if (p.startsWith('/s/')) {
      const code = roomCode(p);
      if (!code) return Response.redirect(`${url.origin}/mao`, 302);
      const rest = p.replace(/^\/s\/[^/]+/, '') || '/';
      if (rest === '/api/info') return json({ online: true, code });
      if (rest === '/events' || rest.startsWith('/api/')) {
        return mesaOf(env, code).fetch(new Request(new URL(rest + url.search, url.origin), request));
      }
      if (rest === '/mesa') return page(env, url, request, '/table.html');
      if (rest === '/mao' || rest === '/m') return page(env, url, request, '/hand.html');
      if (rest === '/') {
        const phone = /Mobi|Android/i.test(request.headers.get('User-Agent') || '');
        return page(env, url, request, phone ? '/hand.html' : '/table.html');
      }
      return new Response('Não achei.', { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
