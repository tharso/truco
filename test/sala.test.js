// A Sala vista de fora: só pelo que ela escreve para a Mesa e para cada Celular,
// e pela resposta de `action`. Nunca abre o Game de dentro (ADR 0001).
'use strict';
const { describe, test } = require('node:test');
const assert = require('node:assert');
const { Room } = require('../room.js');
const { AVATARS } = require('../public/shared.js');
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

// Os Personagens dos quatro Lugares, na ordem da Mesa.
const personagensNaMesa = (mesa) => mesa.estado.seats.map((s) => s.avatar);

function semPersonagemRepetido(mesa) {
  const naMesa = personagensNaMesa(mesa);
  assert.strictEqual(new Set(naMesa).size, naMesa.length, `Personagem repetido na Mesa: ${naMesa}`);
}

describe('Sala: lobby', () => {
  test('o nome que o Jogador manda ao entrar aparece na Mesa, sem os símbolos < > & "', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    assert.deepStrictEqual(sala.action({ type: 'join', seat: 0, name: '<Zé>' }), { ok: true });
    assert.strictEqual(mesa.estado.seats[0].name, 'Zé');
    sala.action({ type: 'join', seat: 1, name: '"Rita"' });
    assert.strictEqual(mesa.estado.seats[1].name, 'Rita');
    sala.action({ type: 'join', seat: 1, name: 'Bia&Cia' });
    assert.strictEqual(mesa.estado.seats[1].name, 'BiaCia');
  });

  test('o nome é cortado em 16 letras', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'join', seat: 0, name: 'Joaquim Albuquerque' });
    assert.strictEqual(mesa.estado.seats[0].name, 'Joaquim Albuquer');
  });

  test('o corte em 16 letras não deixa espaço no fim nem meia letra', { todo: 'hoje o corte conta unidades UTF-16 e é feito depois do trim' }, () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'join', seat: 0, name: 'Maria Aparecida Souza' });
    assert.strictEqual(mesa.estado.seats[0].name, 'Maria Aparecida');
    sala.action({ type: 'join', seat: 0, name: 'Maria Aparecida😀' });
    assert.strictEqual(mesa.estado.seats[0].name, 'Maria Aparecida😀');
  });

  test('uma ação de um Lugar que não é de Jogador devolve "Lugar inválido."', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    for (const seat of [2, 3, -1, 7, 'abc', undefined]) {
      assert.deepStrictEqual(sala.action({ type: 'join', seat, name: 'Intruso' }), { error: 'Lugar inválido.' }, `join no Lugar ${seat}`);
      assert.deepStrictEqual(sala.action({ type: 'config', seat, bot: true }), { error: 'Lugar inválido.' }, `config no Lugar ${seat}`);
    }
    assert.deepStrictEqual(mesa.estado.seats.map((s) => s.name), ['Jogador 1', 'Jogador 2', 'Tonhão', 'Cida']);
    assert.deepStrictEqual(mesa.estado.seats.map((s) => s.bot), [false, false, true, true]);
  });

  test('um Lugar vazio, falso ou verdadeiro também é inválido, e não vira o Lugar 0 ou 1', { todo: 'hoje Number(a.seat) faz null, "", " " e false virarem 0, e true virar 1' }, () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    for (const seat of [null, '', ' ', false, true]) {
      assert.deepStrictEqual(sala.action({ type: 'join', seat, name: 'Intruso' }), { error: 'Lugar inválido.' }, `join no Lugar ${JSON.stringify(seat)}`);
      assert.deepStrictEqual(sala.action({ type: 'config', seat, bot: true }), { error: 'Lugar inválido.' }, `config no Lugar ${JSON.stringify(seat)}`);
    }
    assert.deepStrictEqual(mesa.estado.seats.slice(0, 2).map((s) => s.name), ['Jogador 1', 'Jogador 2']);
  });

  test('marcar que falta uma pessoa põe um Robô no Lugar dela, como Dona Neide ou Juninho', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    assert.deepStrictEqual(sala.action({ type: 'config', seat: 0, bot: true }), { ok: true });
    assert.deepStrictEqual(sala.action({ type: 'config', seat: 1, bot: true }), { ok: true });
    const [lugar0, lugar1] = mesa.estado.seats;
    assert.deepStrictEqual([lugar0.bot, lugar0.avatar, lugar0.name], [true, 'neide', 'Dona Neide']);
    assert.deepStrictEqual([lugar1.bot, lugar1.avatar, lugar1.name], [true, 'juninho', 'Juninho']);
  });

  test('se Dona Neide já está na Mesa, o Robô que entra ganha outro Personagem livre e o nome dele', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 1, avatar: 'neide', partner: 'beto' }), { ok: true });
    sala.action({ type: 'config', seat: 0, bot: true });
    const robo = mesa.estado.seats[0];
    assert.strictEqual(robo.bot, true);
    assert.ok(robo.avatar && robo.avatar !== 'neide', `o Robô ficou com ${robo.avatar}`);
    semPersonagemRepetido(mesa);
    // Qual Personagem livre ele ganha a spec não fixa; o nome tem de ser o desse Personagem.
    assert.strictEqual(robo.name, AVATARS.find((a) => a.id === robo.avatar).name);
  });

  test('desmarcar devolve o Lugar ao Jogador, com o nome dele', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'join', seat: 0, name: 'Zé' });
    sala.action({ type: 'config', seat: 0, bot: true });
    // O Jogador muda o nome enquanto o Robô joga por ele: a Mesa segue com o nome do Robô.
    sala.action({ type: 'join', seat: 0, name: 'Zé Carlos' });
    assert.strictEqual(mesa.estado.seats[0].name, 'Dona Neide');
    assert.deepStrictEqual(sala.action({ type: 'config', seat: 0, bot: false }), { ok: true });
    const lugar = mesa.estado.seats[0];
    assert.deepStrictEqual([lugar.bot, lugar.avatar, lugar.name], [false, null, 'Zé Carlos']);
  });

  test('depois que a Partida começa, ninguém troca Jogador por Robô nem Robô por Jogador', (t) => {
    pararRelogio(t);
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'config', seat: 1, bot: true });
    comecarPartida(sala);
    const erro = { error: 'Só dá pra trocar antes de começar.' };
    assert.deepStrictEqual(sala.action({ type: 'config', seat: 0, bot: true }), erro);
    assert.deepStrictEqual(sala.action({ type: 'config', seat: 1, bot: false }), erro);
    assert.deepStrictEqual(mesa.estado.seats.slice(0, 2).map((s) => s.bot), [false, true]);
  });

  test('com os dois Celulares conectados, a Partida começa', (t) => {
    pararRelogio(t);
    const sala = new Room();
    const mesa = conectarMesa(sala);
    conectarCelular(sala, 0);
    conectarCelular(sala, 1);
    assert.deepStrictEqual(sala.action({ type: 'start' }), { ok: true });
    assert.strictEqual(mesa.estado.phase, 'deal');
    assert.ok(mesa.eventos.some((ev) => ev.t === 'start'), 'a Mesa não soube que a Partida começou');
  });

  test('um Lugar de Robô não precisa de Celular para a Partida começar', (t) => {
    pararRelogio(t);
    const sala = new Room();
    const mesa = conectarMesa(sala);
    conectarCelular(sala, 0);
    sala.action({ type: 'config', seat: 1, bot: true });
    assert.deepStrictEqual(sala.action({ type: 'start' }), { ok: true });
    assert.strictEqual(mesa.estado.phase, 'deal');
  });

  test('faltando Celular, começar dá erro dizendo quem falta, e a Partida não começa', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'join', seat: 0, name: 'Zé' });
    sala.action({ type: 'join', seat: 1, name: 'Rita' });
    assert.deepStrictEqual(sala.action({ type: 'start' }), { error: 'Falta conectar: Zé e Rita.' });
    conectarCelular(sala, 0);
    assert.deepStrictEqual(sala.action({ type: 'start' }), { error: 'Falta conectar: Rita.' });
    assert.strictEqual(mesa.estado.phase, 'lobby');
    assert.ok(!mesa.eventos.some((ev) => ev.t === 'start'), 'a Partida começou sem a Rita');
  });

  test('forçar o começo funciona mesmo sem nenhum Celular conectado', (t) => {
    pararRelogio(t);
    const sala = new Room();
    const mesa = conectarMesa(sala);
    assert.deepStrictEqual(sala.action({ type: 'start', force: true }), { ok: true });
    assert.strictEqual(mesa.estado.phase, 'deal');
  });

  test('ao começar sem ninguém escolher, os quatro Lugares têm Personagens diferentes', (t) => {
    pararRelogio(t);
    const sala = new Room();
    const mesa = conectarMesa(sala);
    comecarPartida(sala);
    const naMesa = personagensNaMesa(mesa);
    const ids = AVATARS.map((a) => a.id);
    naMesa.forEach((id) => assert.ok(ids.includes(id), `Lugar sem Personagem: ${naMesa}`));
    semPersonagemRepetido(mesa);
  });

  test('ao começar, quem não escolheu Personagem ganha um livre, e quem escolheu fica com o seu', (t) => {
    pararRelogio(t);
    const sala = new Room();
    const mesa = conectarMesa(sala);
    // O Jogador 1 escolhe Nina e Roque. O Tonhão, que estava no Lugar 2, fica livre.
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque' }), { ok: true });
    comecarPartida(sala);
    const naMesa = personagensNaMesa(mesa);
    assert.deepStrictEqual([naMesa[0], naMesa[2]], ['nina', 'roque']);
    assert.ok(naMesa[1], 'o Lugar 1 ficou sem Personagem');
    semPersonagemRepetido(mesa);
  });

  test('voltar ao lobby no meio da Partida zera o placar', (t) => {
    pararRelogio(t);
    const sala = new Room({ rng: sorteioFixo(11) });
    const mesa = conectarMesa(sala);
    sala.action({ type: 'config', seat: 0, bot: true });
    sala.action({ type: 'config', seat: 1, bot: true });
    comecarPartida(sala);
    for (let passo = 0; mesa.estado.score.every((p) => p === 0); passo++) {
      assert.ok(passo < 1000, 'nenhuma Dupla marcou ponto');
      t.mock.timers.tick(1000);
    }
    assert.deepStrictEqual(sala.action({ type: 'lobby' }), { ok: true });
    assert.strictEqual(mesa.estado.phase, 'lobby');
    assert.deepStrictEqual(mesa.estado.score, [0, 0]);
    assert.strictEqual(mesa.eventos.at(-1).t, 'lobby');
  });

  test('uma ação que não existe devolve "Ação desconhecida." e não muda nada', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    const antes = mesa.estado;
    for (const acao of [{ type: 'dançar', seat: 0 }, { seat: 0 }, {}, null, undefined]) {
      assert.deepStrictEqual(sala.action(acao), { error: 'Ação desconhecida.' }, `ação ${JSON.stringify(acao)}`);
      assert.deepStrictEqual(mesa.mensagens.at(-1).events, [], `ação ${JSON.stringify(acao)} soltou evento`);
    }
    assert.deepStrictEqual(mesa.estado, antes);
  });
});
