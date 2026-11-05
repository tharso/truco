// A Sala vista de fora: só pelo que ela escreve para a Mesa e para cada Celular,
// e pela resposta de `action`. Nunca abre o Game de dentro (ADR 0001).
'use strict';
const { describe, test } = require('node:test');
const assert = require('node:assert');
const { Room } = require('../room.js');
const { conectarTela, conectarMesa, conectarCelular, sorteioFixo, cartasEm } = require('./telas.js');

// Para o relógio da Sala (o setTimeout dos Robôs e das pausas). Assim nenhum teste deixa
// timer vivo, e o relógio só anda com t.mock.timers.tick(ms). Chame no começo do teste.
const pararRelogio = (t) => t.mock.timers.enable({ apis: ['setTimeout'] });

// Começa a Partida, mesmo faltando Celular. Pare o relógio antes.
function comecarPartida(sala) {
  const resposta = sala.action({ type: 'start', force: true });
  assert.deepStrictEqual(resposta, { ok: true });
}

describe('Sala: sorteio controlado', () => {
  test('duas Salas com o mesmo sorteio dão as mesmas Cartas na mão e a mesma Vira', (t) => {
    pararRelogio(t);
    const cartasDoLugar0 = () => {
      const sala = new Room({ rng: sorteioFixo(42) });
      const celular = conectarCelular(sala, 0);
      comecarPartida(sala);
      return { mao: celular.estado.hand, vira: celular.estado.vira };
    };
    const primeira = cartasDoLugar0();
    assert.strictEqual(primeira.mao.length, 3);
    assert.deepStrictEqual(cartasDoLugar0(), primeira);
  });
});

describe('Sala: conexão e o que cada tela vê', () => {
  test('a Mesa recebe o estado da Sala assim que conecta', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    assert.strictEqual(mesa.mensagens.length, 1);
    assert.strictEqual(mesa.estado.phase, 'lobby');
    assert.strictEqual(mesa.estado.seats.length, 4);
  });

  test('o Celular recebe o estado assim que conecta no Lugar dele', () => {
    const sala = new Room();
    const celular = conectarCelular(sala, 1);
    assert.strictEqual(celular.mensagens.length, 1);
    assert.strictEqual(celular.estado.me, 1);
    assert.strictEqual(celular.estado.phase, 'lobby');
  });

  test('quando o Celular conecta e entra, a Mesa mostra o nome do Jogador no Lugar dele', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    // Como o Celular de verdade: conecta e, assim que abre, manda o nome (public/hand.js).
    conectarCelular(sala, 0);
    assert.deepStrictEqual(sala.action({ type: 'join', seat: 0, name: 'Zé' }), { ok: true });
    assert.strictEqual(mesa.estado.seats[0].name, 'Zé');
    assert.strictEqual(mesa.estado.seats[1].name, 'Jogador 2');
  });

  test('um Celular que conecta num Lugar de Robô não troca o nome do Robô', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'join', seat: 1, name: 'Rita' });
    sala.action({ type: 'config', seat: 1, bot: true });
    const nomeDoRobo = mesa.estado.seats[1].name;
    assert.notStrictEqual(nomeDoRobo, 'Rita');
    conectarCelular(sala, 1);
    assert.strictEqual(mesa.estado.seats[1].name, nomeDoRobo);
  });

  test('a Mesa vê quando um Celular conecta e quando ele sai', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    assert.strictEqual(mesa.estado.seats[0].connected, false);
    const celular = conectarCelular(sala, 0);
    assert.strictEqual(mesa.estado.seats[0].connected, true);
    assert.strictEqual(mesa.estado.seats[1].connected, false);
    celular.sair();
    assert.strictEqual(mesa.estado.seats[0].connected, false);
  });

  test('o Lugar continua conectado enquanto houver um Celular nele', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    const primeiro = conectarCelular(sala, 0);
    conectarCelular(sala, 0);
    primeiro.sair();
    assert.strictEqual(mesa.estado.seats[0].connected, true);
  });

  test('a Mesa só vê a Vira e quantas cartas cada Lugar tem, nunca as Cartas na mão', (t) => {
    pararRelogio(t);
    const sala = new Room({ rng: sorteioFixo(7) });
    const mesa = conectarMesa(sala);
    conectarCelular(sala, 0);
    conectarCelular(sala, 1);
    comecarPartida(sala);
    assert.deepStrictEqual(mesa.estado.seats.map((s) => s.cards), [3, 3, 3, 3]);
    assert.deepStrictEqual(new Set(cartasEm(mesa.mensagens)), new Set(cartasEm(mesa.estado.vira)));
  });

  test('numa Partida inteira de Robôs, a Mesa só vê a Vira e as cartas já jogadas', (t) => {
    pararRelogio(t);
    const sala = new Room({ rng: sorteioFixo(11) });
    const mesa = conectarMesa(sala);
    sala.action({ type: 'config', seat: 0, bot: true });
    sala.action({ type: 'config', seat: 1, bot: true });
    comecarPartida(sala);
    for (let passo = 0; mesa.estado.phase !== 'over'; passo++) {
      assert.ok(passo < 5000, 'a Partida de Robôs não terminou');
      t.mock.timers.tick(1000);
    }
    // Abertas: a Vira de cada Mão e as cartas que a Mesa viu jogar. Nada mais pode aparecer.
    let abertas = new Set();
    for (const m of mesa.mensagens) {
      for (const ev of m.events) {
        if (ev.t === 'deal') abertas = new Set(cartasEm(ev.vira));
        if (ev.t === 'play') cartasEm(ev.card).forEach((c) => abertas.add(c));
      }
      for (const c of cartasEm(m)) assert.ok(abertas.has(c), `a Mesa viu ${c} antes de ser jogada`);
    }
    assert.ok(mesa.eventos.filter((ev) => ev.t === 'play').length >= 4 * 3 * 2, 'poucas cartas jogadas');
  });

  test('cada Celular recebe só as próprias Cartas na mão', (t) => {
    pararRelogio(t);
    const sala = new Room({ rng: sorteioFixo(3) });
    const celulares = [conectarCelular(sala, 0), conectarCelular(sala, 1)];
    comecarPartida(sala);
    const cartasNaMao = celulares.map((c) => cartasEm(c.estado.hand));
    cartasNaMao.forEach((cartas) => assert.strictEqual(cartas.length, 3));
    assert.strictEqual(cartasNaMao[0].filter((c) => cartasNaMao[1].includes(c)).length, 0, 'Cartas na mão repetidas');
    celulares.forEach((celular, lugar) => {
      const vira = cartasEm(celular.estado.vira);
      assert.deepStrictEqual(new Set(cartasEm(celular.mensagens)), new Set([...cartasNaMao[lugar], ...vira]));
    });
  });

  test('as Cartas na mão que o Celular recebe são as do Lugar dele: é delas que sai a jogada que a Mesa vê', (t) => {
    pararRelogio(t);
    const sala = new Room({ rng: sorteioFixo(5) });
    const mesa = conectarMesa(sala);
    const celulares = [conectarCelular(sala, 0), conectarCelular(sala, 1)];
    comecarPartida(sala);
    const recebidas = celulares.map((c) => cartasEm(c.estado.hand));
    const jogadas = [[], []];
    // Joga a Mão inteira: cada Celular joga a primeira carta na vez dele e aceita qualquer Truco.
    for (let passo = 0; !mesa.eventos.some((ev) => ev.t === 'hand'); passo++) {
      assert.ok(passo < 500, 'a Mão não terminou');
      const celular = celulares.find((c) => c.estado.canPlay || c.estado.mustRespond);
      if (!celular) { t.mock.timers.tick(1000); continue; }
      const lugar = celular.estado.me;
      if (celular.estado.mustRespond) {
        assert.deepStrictEqual(sala.action({ type: 'respond', seat: lugar, ans: 'aceito' }), { ok: true });
        continue;
      }
      jogadas[lugar].push(...cartasEm(celular.estado.hand[0]));
      assert.deepStrictEqual(sala.action({ type: 'play', seat: lugar, idx: 0 }), { ok: true });
    }
    for (const lugar of [0, 1]) {
      const vistasNaMesa = mesa.eventos.filter((ev) => ev.t === 'play' && ev.seat === lugar).flatMap((ev) => cartasEm(ev.card));
      assert.ok(jogadas[lugar].length >= 2, `o Lugar ${lugar} jogou pouco`);
      assert.deepStrictEqual(vistasNaMesa, jogadas[lugar]);
      jogadas[lugar].forEach((c) => assert.ok(recebidas[lugar].includes(c), `${c} não veio no Celular ${lugar}`));
    }
  });

  test('um pedido de conexão num Lugar que não é de Jogador vira conexão de Mesa', () => {
    const pedidos = [['seat', '2'], ['seat', '3'], ['seat', '7'], ['seat', 'abc'], ['seat', null], ['xyz', '0'], [null, null]];
    for (const [papel, lugar] of pedidos) {
      const sala = new Room();
      const mesa = conectarMesa(sala);
      const tela = conectarTela(sala, papel, lugar);
      const quem = `papel ${papel}, Lugar ${lugar}`;
      assert.strictEqual(tela.estado.me, undefined, quem);
      assert.strictEqual(tela.estado.hand, undefined, quem);
      assert.deepStrictEqual(tela.estado, mesa.estado, quem);
      assert.deepStrictEqual(mesa.estado.seats.slice(0, 2).map((s) => s.connected), [false, false], quem);
    }
  });

  test('toda mudança na Sala chega a todas as telas conectadas', (t) => {
    pararRelogio(t);
    const sala = new Room();
    const telas = [conectarMesa(sala), conectarCelular(sala, 0)];
    // Confere que cada tela recebeu uma mensagem a mais (a tela que acabou de chegar, a primeira).
    const chegouEmTodas = (mudanca, confere) => {
      const antes = telas.map((tela) => tela.mensagens.length);
      mudanca();
      telas.forEach((tela, i) => {
        assert.strictEqual(tela.mensagens.length, (antes[i] || 0) + 1, 'uma tela ficou sem a mudança');
        confere(tela.estado);
      });
    };
    chegouEmTodas(() => telas.push(conectarCelular(sala, 1)), (e) => assert.strictEqual(e.seats[1].connected, true));
    chegouEmTodas(() => sala.action({ type: 'join', seat: 1, name: 'Rita' }), (e) => assert.strictEqual(e.seats[1].name, 'Rita'));
    chegouEmTodas(() => comecarPartida(sala), (e) => assert.strictEqual(e.phase, 'deal'));
    chegouEmTodas(() => t.mock.timers.tick(5000), (e) => assert.strictEqual(e.phase, 'play'));
    chegouEmTodas(() => telas.pop().sair(), (e) => assert.strictEqual(e.seats[1].connected, false));
  });

  test('uma tela que falha ao receber não atrapalha as outras e sai da Sala', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.connect('seat', '0', () => { throw new Error('o Celular perdeu o sinal'); });
    const celular = conectarCelular(sala, 1);
    sala.action({ type: 'join', seat: 1, name: 'Rita' });
    assert.strictEqual(mesa.estado.seats[1].name, 'Rita');
    assert.strictEqual(celular.estado.seats[1].name, 'Rita');
    assert.strictEqual(mesa.estado.seats[0].connected, false);
  });

  test('uma tela que falha depois, ao escrever (como na Cloudflare), também sai da Sala', async () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.connect('seat', '0', () => Promise.reject(new Error('o Celular perdeu o sinal')));
    assert.strictEqual(mesa.estado.seats[0].connected, true);
    await new Promise((pronto) => setImmediate(pronto));
    assert.strictEqual(mesa.estado.seats[0].connected, false);
    sala.action({ type: 'join', seat: 1, name: 'Rita' });
    assert.strictEqual(mesa.estado.seats[1].name, 'Rita');
  });
});
