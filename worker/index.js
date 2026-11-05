// Truco do Bar do Zé na Cloudflare.
// O Worker entrega as telas. A partida mora num Durable Object ("Mesa"), que fica ligado
// enquanto a TV ou um celular está conectado. A lógica da sala é a mesma do servidor local: room.js.
import { DurableObject } from 'cloudflare:workers';
import roomModule from '../room.js';

const { Room } = roomModule;
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

    if (p === '/api/info') {
      return new Response(JSON.stringify({ urls: [`${url.origin}/mao`], online: true }), { headers: JSON_HEADERS });
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/events' || p.startsWith('/api/')) {
      const stub = env.MESA.get(env.MESA.idFromName('mesa'));
      return stub.fetch(request);
    }

    const page = p === '/' || p === '/mesa' ? '/table.html' : p === '/mao' || p === '/m' ? '/hand.html' : null;
    if (page) return env.ASSETS.fetch(new Request(new URL(page, url.origin), request));

    return env.ASSETS.fetch(request);
  },
};
