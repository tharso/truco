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

// O Personagem e o nome de cada Lugar, na ordem da Mesa.
const personagensENomes = (mesa) => mesa.estado.seats.map((s) => [s.avatar, s.name]);

// O nome que a Mesa mostra para um Personagem.
const nomeDe = (id) => AVATARS.find((a) => a.id === id).name;

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

  test('o corte em 16 letras não deixa espaço no fim nem meia letra', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'join', seat: 0, name: 'Maria Aparecida Souza' });
    assert.strictEqual(mesa.estado.seats[0].name, 'Maria Aparecida');
    sala.action({ type: 'join', seat: 0, name: 'Maria Aparecida😀' });
    assert.strictEqual(mesa.estado.seats[0].name, 'Maria Aparecida😀');
    // Uma bandeira é uma letra só, feita de dois pedaços: não se corta ao meio.
    sala.action({ type: 'join', seat: 0, name: 'Maria Aparecida🇧🇷' });
    assert.strictEqual(mesa.estado.seats[0].name, 'Maria Aparecida🇧🇷');
    // O nome que o Jogador dá ao parceiro segue a mesma regra.
    sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque', partnerName: 'Maria Aparecida Souza' });
    assert.strictEqual(mesa.estado.seats[2].name, 'Maria Aparecida');
    sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque', partnerName: 'Maria Aparecida😀' });
    assert.strictEqual(mesa.estado.seats[2].name, 'Maria Aparecida😀');
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

  test('um Lugar vazio, falso ou verdadeiro também é inválido, e não vira o Lugar 0 ou 1', () => {
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
    assert.strictEqual(robo.name, nomeDe(robo.avatar));
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

describe('Sala: escolha de Personagem', () => {
  test('o Jogador escolhe o próprio Personagem e o do parceiro, e a Mesa mostra os dois', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque' }), { ok: true });
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 1, avatar: 'beto', partner: 'blurp' }), { ok: true });
    assert.deepStrictEqual(personagensNaMesa(mesa), ['nina', 'beto', 'roque', 'blurp']);
  });

  test('o parceiro usa o nome dado pelo Jogador, sem os símbolos < > & "', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque', partnerName: '<Bi&go"de>' });
    assert.strictEqual(mesa.estado.seats[2].name, 'Bigode');
    assert.strictEqual(mesa.estado.seats[2].avatar, 'roque');
  });

  test('sem nome dado, o parceiro usa o nome do Personagem', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'neide', partnerName: 'Bigode' });
    // Nome vazio, só espaços ou só símbolos limpos: vale o nome do Personagem.
    for (const partnerName of [undefined, '', '   ', '<>']) {
      sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'neide', partnerName });
      assert.strictEqual(mesa.estado.seats[2].name, 'Dona Neide', `nome ${JSON.stringify(partnerName)}`);
    }
  });

  test('um Personagem que não existe dá erro, e a Mesa não muda', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    const antes = personagensNaMesa(mesa);
    const escolhas = [
      { avatar: 'xuxa', partner: 'roque' },
      { avatar: 'nina', partner: 'xuxa' },
      { partner: 'roque' },
      { avatar: 'nina' },
      { avatar: 'Nina', partner: 'roque' },
    ];
    for (const escolha of escolhas) {
      assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, ...escolha }), { error: 'Personagem inválido.' }, JSON.stringify(escolha));
    }
    assert.deepStrictEqual(personagensNaMesa(mesa), antes);
  });

  test('o mesmo Personagem para o Jogador e o parceiro dá erro, e a Mesa não muda', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    const antes = personagensNaMesa(mesa);
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'nina' }), { error: 'Escolha um parceiro diferente de você.' });
    assert.deepStrictEqual(personagensNaMesa(mesa), antes);
  });

  test('um Personagem que o outro Jogador já escolheu dá erro, para ele ou para o parceiro', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'pick', seat: 1, avatar: 'beto', partner: 'blurp', partnerName: 'Bigode' });
    const antes = personagensENomes(mesa);
    const erro = { error: 'Esse personagem já foi escolhido. Escolha outro.' };
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'beto', partner: 'roque' }), erro);
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'blurp' }), erro);
    assert.deepStrictEqual(personagensENomes(mesa), antes);
  });

  test('o Jogador pode trocar a própria escolha', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque' });
    // Trocar de lugar com o parceiro não esbarra na escolha que ele mesmo fez.
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'roque', partner: 'nina' }), { ok: true });
    assert.deepStrictEqual([mesa.estado.seats[0].avatar, mesa.estado.seats[2].avatar], ['roque', 'nina']);
  });

  test('quem escolhe tira o Personagem do Robô parceiro do outro Jogador, que ainda não escolheu', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    assert.strictEqual(mesa.estado.seats[3].avatar, 'cida');
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'cida', partner: 'nina' }), { ok: true });
    const robo = mesa.estado.seats[3];
    assert.strictEqual(mesa.estado.seats[0].avatar, 'cida');
    assert.ok(robo.avatar && robo.avatar !== 'cida', `o Robô ficou com ${robo.avatar}`);
    // O Robô se chamava Cida por causa do Personagem: troca de nome junto.
    assert.strictEqual(robo.name, nomeDe(robo.avatar));
    semPersonagemRepetido(mesa);
  });

  test('o Robô que entrou no lugar de quem falta também cede o Personagem e troca de nome', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'config', seat: 1, bot: true });
    assert.strictEqual(mesa.estado.seats[1].avatar, 'juninho');
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'juninho', partner: 'nina' }), { ok: true });
    const robo = mesa.estado.seats[1];
    assert.ok(robo.avatar && robo.avatar !== 'juninho', `o Robô ficou com ${robo.avatar}`);
    assert.strictEqual(robo.name, nomeDe(robo.avatar));
    semPersonagemRepetido(mesa);
  });

  test('o Robô que cede o Personagem fica com o nome que o Jogador deu a ele', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'pick', seat: 1, avatar: 'beto', partner: 'blurp', partnerName: 'Bigode' });
    // Marcar e desmarcar "falta uma pessoa" desfaz a escolha do Jogador 2; o parceiro fica como estava.
    sala.action({ type: 'config', seat: 1, bot: true });
    sala.action({ type: 'config', seat: 1, bot: false });
    assert.deepStrictEqual([mesa.estado.seats[3].avatar, mesa.estado.seats[3].name], ['blurp', 'Bigode']);
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'blurp' }), { ok: true });
    const robo = mesa.estado.seats[3];
    assert.ok(robo.avatar && robo.avatar !== 'blurp', `o Robô ficou com ${robo.avatar}`);
    assert.strictEqual(robo.name, 'Bigode');
    semPersonagemRepetido(mesa);
  });

  test('o Jogador que só ganhou um Personagem ao começar cede esse Personagem e fica com o próprio nome', (t) => {
    pararRelogio(t);
    const sala = new Room();
    const mesa = conectarMesa(sala);
    sala.action({ type: 'join', seat: 1, name: 'Rita' });
    comecarPartida(sala);
    sala.action({ type: 'lobby' });
    const daRita = mesa.estado.seats[1].avatar;
    assert.ok(daRita, 'a Rita ficou sem Personagem ao começar');
    const parceiro = AVATARS.map((a) => a.id).find((id) => !personagensNaMesa(mesa).includes(id));
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: daRita, partner: parceiro }), { ok: true });
    const rita = mesa.estado.seats[1];
    assert.strictEqual(mesa.estado.seats[0].avatar, daRita);
    assert.ok(rita.avatar && rita.avatar !== daRita, `a Rita ficou com ${rita.avatar}`);
    assert.strictEqual(rita.name, 'Rita');
    semPersonagemRepetido(mesa);
  });

  test('no meio da Partida, escolher Personagem dá erro, e a Mesa não muda', (t) => {
    pararRelogio(t);
    const sala = new Room({ rng: sorteioFixo(9) });
    const mesa = conectarMesa(sala);
    comecarPartida(sala);
    const erro = { error: 'Só dá pra escolher antes de começar.' };
    for (const fase of ['deal', 'play']) {
      if (fase === 'play') t.mock.timers.tick(5000);
      assert.strictEqual(mesa.estado.phase, fase);
      const antes = personagensENomes(mesa);
      assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque', partnerName: 'Bigode' }), erro, `na fase ${fase}`);
      assert.deepStrictEqual(personagensENomes(mesa), antes, `na fase ${fase}`);
    }
  });

  test('no fim da Partida, o Jogador pode escolher de novo', (t) => {
    pararRelogio(t);
    const sala = new Room({ rng: sorteioFixo(13) });
    const mesa = conectarMesa(sala);
    const celulares = [conectarCelular(sala, 0), conectarCelular(sala, 1)];
    comecarPartida(sala);
    // Os dois Jogadores jogam a primeira carta, aceitam todo Truco e jogam toda Mão de onze.
    for (let passo = 0; mesa.estado.phase !== 'over'; passo++) {
      assert.ok(passo < 5000, 'a Partida não terminou');
      const celular = celulares.find((c) => c.estado.canPlay || c.estado.mustRespond || c.estado.mustOnze);
      if (!celular) { t.mock.timers.tick(1000); continue; }
      const seat = celular.estado.me;
      const acao = celular.estado.mustOnze ? { type: 'onze', seat, ans: 'joga' }
        : celular.estado.mustRespond ? { type: 'respond', seat, ans: 'aceito' }
          : { type: 'play', seat, idx: 0 };
      assert.deepStrictEqual(sala.action(acao), { ok: true }, JSON.stringify(acao));
    }
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque', partnerName: 'Bigode' }), { ok: true });
    assert.deepStrictEqual([mesa.estado.seats[0].avatar, mesa.estado.seats[2].avatar, mesa.estado.seats[2].name], ['nina', 'roque', 'Bigode']);
    semPersonagemRepetido(mesa);
  });

  test('num Lugar ocupado por Robô, escolher Personagem dá erro, e o Robô fica como estava', () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    // O Celular do Lugar 0 fica aberto depois que um Robô entra no lugar do Jogador.
    conectarCelular(sala, 0);
    sala.action({ type: 'config', seat: 0, bot: true });
    const antes = personagensENomes(mesa);
    const resposta = sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'roque', partnerName: 'Bigode' });
    assert.ok(resposta.error, 'a Sala aceitou a escolha num Lugar de Robô');
    assert.deepStrictEqual(personagensENomes(mesa), antes);
  });

  test('o jeito de jogar do Robô vem do Personagem, não do Lugar', { todo: 'hoje `persona` fica presa ao Lugar e não muda com o Personagem' }, () => {
    const sala = new Room();
    const mesa = conectarMesa(sala);
    // Na Sala nova, Tonhão (Lugar 2) e Cida (Lugar 3) têm jeitos de jogar diferentes.
    const [tonhao, cida] = [mesa.estado.seats[2], mesa.estado.seats[3]];
    assert.deepStrictEqual([tonhao.avatar, cida.avatar], ['tonhao', 'cida']);
    assert.notStrictEqual(tonhao.persona, cida.persona);
    // Cada Jogador leva o parceiro do outro para o Lugar da frente: Cida no 2, Tonhão no 3.
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 0, avatar: 'nina', partner: 'cida' }), { ok: true });
    assert.deepStrictEqual(sala.action({ type: 'pick', seat: 1, avatar: 'beto', partner: 'tonhao' }), { ok: true });
    const [lugar2, lugar3] = [mesa.estado.seats[2], mesa.estado.seats[3]];
    assert.deepStrictEqual([lugar2.avatar, lugar3.avatar], ['cida', 'tonhao']);
    assert.strictEqual(lugar2.persona, cida.persona, 'a Cida mudou de jeito de jogar ao mudar de Lugar');
    assert.strictEqual(lugar3.persona, tonhao.persona, 'o Tonhão mudou de jeito de jogar ao mudar de Lugar');
  });
});

// O ritmo da Partida, em ms: quanto dura cada pausa antes de a Sala andar sozinha.
// É o ritmo que a Mesa mostra no bar (game.js, `timing`). Se o ritmo mudar, muda só aqui.
const PAUSAS = { cartas: 3200, robo: 1400, rodada: 1900, mao: 4500, truco: 3200 };

// Uma Sala com os dois Celulares conectados e a Partida começada, com o sorteio dado.
// Pare o relógio antes. Sementes usadas: 8 (a 1ª Mão começa pelo Lugar 0) e 3 (começa pelo Tonhão,
// no Lugar 2, que joga uma carta). `robos` = Lugares de Jogador marcados como "falta uma pessoa".
function partidaComDoisCelulares(semente, { robos = [] } = {}) {
  const sala = new Room({ rng: sorteioFixo(semente) });
  const mesa = conectarMesa(sala);
  const celulares = [conectarCelular(sala, 0), conectarCelular(sala, 1)];
  robos.forEach((seat) => sala.action({ type: 'config', seat, bot: true }));
  comecarPartida(sala);
  return { sala, mesa, celulares };
}

// Uma Partida só de Robôs, vista pela Mesa. Com o sorteio 11, ela tem Truco, aceito e corro.
function partidaDeRobos(semente) {
  const sala = new Room({ rng: sorteioFixo(semente) });
  const mesa = conectarMesa(sala);
  sala.action({ type: 'config', seat: 0, bot: true });
  sala.action({ type: 'config', seat: 1, bot: true });
  comecarPartida(sala);
  return { sala, mesa };
}

// Passa o relógio, de 100 em 100 ms, até `pronto()`. Todas as PAUSAS são múltiplas de 100 ms.
function esperarAte(t, pronto, oQue) {
  for (let passo = 0; !pronto(); passo++) {
    assert.ok(passo < 5000, `o relógio andou e não chegou: ${oQue}`);
    t.mock.timers.tick(100);
  }
}

// Os eventos da última mensagem que a tela recebeu.
const ultimosEventos = (tela) => tela.mensagens.at(-1).events;

// As jogadas e respostas de um Lugar que a Mesa recebeu (sem os Sinais e os cochichos).
const ACOES = ['play', 'truco', 'aceito', 'corro', 'onzeJoga', 'onzeCorre'];
const acoesDoLugar = (mesa, lugar) => mesa.eventos.filter((ev) => ev.seat === lugar && ACOES.includes(ev.t));

// Só os campos que o teste confere.
const campos = (objeto, nomes) => Object.fromEntries(nomes.map((n) => [n, objeto[n]]));

describe('Sala: jogo, relógio e eventos', () => {
  test('o Jogador joga uma carta na vez dele pelo Celular, e a Mesa mostra a carta', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares: [celular] } = partidaComDoisCelulares(8);
    esperarAte(t, () => celular.estado.canPlay, 'a vez do Lugar 0');
    const carta = celular.estado.hand[0];
    assert.deepStrictEqual(sala.action({ type: 'play', seat: 0, idx: 0 }), { ok: true });
    assert.deepStrictEqual(mesa.estado.table, [{ seat: 0, card: carta }]);
    assert.deepStrictEqual(ultimosEventos(mesa).map((ev) => [ev.t, ev.seat, ev.card]), [['play', 0, carta]]);
    assert.strictEqual(mesa.estado.seats[0].cards, 2);
    assert.strictEqual(celular.estado.hand.length, 2);
    assert.ok(!cartasEm(celular.estado.hand).includes(cartasEm(carta)[0]), 'a carta jogada ficou nas Cartas na mão');
  });

  test('jogar fora da vez dá erro, e a Mesa não muda', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares: [celular0, celular1] } = partidaComDoisCelulares(8);
    // Enquanto as cartas são dadas, ninguém joga.
    assert.strictEqual(mesa.estado.phase, 'deal');
    assert.deepStrictEqual(sala.action({ type: 'play', seat: 0, idx: 0 }), { error: 'Agora não dá pra jogar.' });
    esperarAte(t, () => celular0.estado.canPlay, 'a vez do Lugar 0');
    const antes = mesa.estado;
    assert.strictEqual(celular1.estado.canPlay, false);
    assert.deepStrictEqual(sala.action({ type: 'play', seat: 1, idx: 0 }), { error: 'Calma, não é sua vez!' });
    assert.deepStrictEqual(sala.action({ type: 'play', seat: 0, idx: 3 }), { error: 'Carta inválida.' });
    assert.deepStrictEqual(mesa.estado, antes);
    assert.ok(!mesa.eventos.some((ev) => ev.t === 'play'), 'a Mesa viu uma carta jogada');
  });

  test('um Celular não joga nem pede Truco pelo Lugar de um Robô', (t) => {
    pararRelogio(t);
    const { sala, mesa } = partidaComDoisCelulares(3);
    esperarAte(t, () => mesa.estado.phase === 'play', 'o fim da pausa das cartas');
    assert.strictEqual(mesa.estado.turn, 2);
    // Na vez do Tonhão, alguém manda ações pelo Lugar dele, como se fosse o Celular dele.
    for (const acao of [{ type: 'truco', seat: 2 }, { type: 'play', seat: 2, idx: 0 }]) {
      assert.ok(sala.action(acao).error, `a Sala aceitou ${JSON.stringify(acao)}`);
    }
    assert.deepStrictEqual(acoesDoLugar(mesa, 2), []);
  });

  test('um Celular não responde ao Truco nem decide a Mão de onze pelo Lugar de um Robô', (t) => {
    pararRelogio(t);
    // Os dois Celulares ficam abertos, mas os dois Lugares de Jogador viraram Robôs.
    // Com o sorteio 28, essa Partida tem Truco e, depois, Mão de onze.
    const { sala, mesa } = partidaComDoisCelulares(28, { robos: [0, 1] });
    const tentarPelosCelulares = (fase, acoes) => {
      esperarAte(t, () => mesa.estado.phase === fase, `a fase ${fase}`);
      const eventosAntes = mesa.eventos.length;
      for (const acao of acoes) assert.ok(sala.action(acao).error, `a Sala aceitou ${JSON.stringify(acao)}`);
      assert.strictEqual(mesa.estado.phase, fase);
      assert.deepStrictEqual(mesa.eventos.slice(eventosAntes).filter((ev) => ACOES.includes(ev.t)), []);
    };
    tentarPelosCelulares('truco', [0, 1].map((seat) => ({ type: 'respond', seat, ans: 'corro' })));
    tentarPelosCelulares('onze', [0, 1].map((seat) => ({ type: 'onze', seat, ans: 'corre' })));
  });

  test('as cartas são dadas e, depois da pausa, a Mão começa sozinha', (t) => {
    pararRelogio(t);
    const { mesa } = partidaComDoisCelulares(8);
    assert.strictEqual(mesa.estado.phase, 'deal');
    t.mock.timers.tick(PAUSAS.cartas - 1);
    assert.strictEqual(mesa.estado.phase, 'deal');
    t.mock.timers.tick(1);
    assert.strictEqual(mesa.estado.phase, 'play');
    // Com o sorteio 8, quem começa a 1ª Mão é o Lugar 0.
    assert.strictEqual(mesa.estado.turn, 0);
  });

  test('na vez do Robô, ele joga sozinho depois da pausa, e a vez passa para o próximo Lugar', (t) => {
    pararRelogio(t);
    const { mesa } = partidaComDoisCelulares(3);
    esperarAte(t, () => mesa.estado.phase === 'play', 'o fim da pausa das cartas');
    assert.strictEqual(mesa.estado.turn, 2);
    t.mock.timers.tick(PAUSAS.robo - 1);
    assert.deepStrictEqual(acoesDoLugar(mesa, 2), []);
    t.mock.timers.tick(1);
    assert.deepStrictEqual(acoesDoLugar(mesa, 2).map((ev) => ev.t), ['play']);
    assert.deepStrictEqual(mesa.estado.table.map((p) => p.seat), [2]);
    assert.strictEqual(mesa.estado.turn, 3);
  });

  test('quando o Jogador pede Truco a uma Dupla de Robôs, um Robô responde sozinho depois da pausa', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares: [celular0] } = partidaComDoisCelulares(8, { robos: [1] });
    esperarAte(t, () => celular0.estado.canTruco, 'o Lugar 0 poder pedir Truco');
    assert.deepStrictEqual(sala.action({ type: 'truco', seat: 0 }), { ok: true });
    t.mock.timers.tick(PAUSAS.truco - 1);
    assert.strictEqual(mesa.estado.phase, 'truco');
    assert.deepStrictEqual(acoesDoLugar(mesa, 1), []);
    t.mock.timers.tick(1);
    // Com o sorteio 8, a Dupla Vermelha corre.
    assert.deepStrictEqual(acoesDoLugar(mesa, 1).map((ev) => ev.t), ['corro']);
    assert.strictEqual(mesa.estado.phase, 'handEnd');
  });

  test('a pausa entre Rodadas e a pausa entre Mãos acontecem sozinhas', (t) => {
    pararRelogio(t);
    const { mesa } = partidaDeRobos(11);
    // Fim da 1ª Rodada: as quatro cartas ficam na Mesa durante a pausa, e depois a Mesa limpa.
    esperarAte(t, () => mesa.estado.phase === 'roundEnd', 'o fim da 1ª Rodada');
    assert.strictEqual(mesa.estado.table.length, 4);
    t.mock.timers.tick(PAUSAS.rodada - 1);
    assert.strictEqual(mesa.estado.phase, 'roundEnd');
    t.mock.timers.tick(1);
    assert.strictEqual(mesa.estado.phase, 'play');
    assert.deepStrictEqual(mesa.estado.table, []);
    assert.notStrictEqual(mesa.estado.lastRound.result, 'tie', 'com o sorteio 11, a 1ª Rodada não empata');
    assert.strictEqual(mesa.estado.turn, mesa.estado.lastRound.seat, 'quem ganhou a Rodada não começa a próxima');
    // Fim da 1ª Mão: o placar fica na Mesa durante a pausa, e depois vêm cartas novas.
    esperarAte(t, () => mesa.estado.phase === 'handEnd', 'o fim da 1ª Mão');
    assert.strictEqual(mesa.estado.handNo, 1);
    t.mock.timers.tick(PAUSAS.mao - 1);
    assert.strictEqual(mesa.estado.phase, 'handEnd');
    t.mock.timers.tick(1);
    assert.strictEqual(mesa.estado.phase, 'deal');
    assert.strictEqual(mesa.estado.handNo, 2);
    assert.deepStrictEqual(ultimosEventos(mesa).map((ev) => [ev.t, ev.handNo]), [['deal', 2]]);
  });

  test('várias ações seguidas de telas diferentes não fazem um Robô jogar duas vezes nem fora de hora', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares: [, celular1] } = partidaComDoisCelulares(3);
    esperarAte(t, () => mesa.estado.phase === 'play', 'o fim da pausa das cartas');
    assert.strictEqual(mesa.estado.turn, 2);
    // Enquanto o Tonhão pensa, telas chegam e saem, e os Celulares mandam ações (umas valem, outras dão erro).
    const metade = PAUSAS.robo / 2;
    t.mock.timers.tick(metade);
    sala.action({ type: 'join', seat: 0, name: 'Zé' });
    conectarMesa(sala);
    sala.action({ type: 'play', seat: 0, idx: 0 });
    celular1.sair();
    conectarCelular(sala, 1);
    sala.action({ type: 'truco', seat: 1 });
    sala.action({ type: 'respond', seat: 0, ans: 'aceito' });
    // Ele joga na hora de sempre: nada disso reinicia a pausa dele.
    t.mock.timers.tick(PAUSAS.robo - metade - 1);
    assert.deepStrictEqual(acoesDoLugar(mesa, 2), []);
    t.mock.timers.tick(1);
    assert.deepStrictEqual(acoesDoLugar(mesa, 2).map((ev) => ev.t), ['play']);
    // Depois vem a Cida, e a vez chega no Lugar 0. Ninguém mais joga pelo Tonhão nem pela Cida.
    esperarAte(t, () => mesa.estado.turn === 0, 'a vez do Lugar 0');
    t.mock.timers.tick(20000);
    assert.deepStrictEqual(acoesDoLugar(mesa, 2).map((ev) => ev.t), ['play']);
    assert.deepStrictEqual(acoesDoLugar(mesa, 3).map((ev) => ev.t), ['play']);
    assert.deepStrictEqual(mesa.estado.table.map((p) => p.seat), [2, 3]);
  });

  // O Jogador do Lugar 0 pede Truco na vez dele. Quem responde é o Jogador do Lugar 1.
  function trucoDoLugar0(t) {
    const partida = partidaComDoisCelulares(8);
    const { sala, mesa, celulares: [celular0, celular1] } = partida;
    esperarAte(t, () => celular0.estado.canTruco, 'o Lugar 0 poder pedir Truco');
    assert.deepStrictEqual(sala.action({ type: 'truco', seat: 0 }), { ok: true });
    assert.deepStrictEqual(mesa.eventos.filter((ev) => ev.t === 'truco').map((ev) => [ev.seat, ev.level]), [[0, 3]]);
    assert.strictEqual(mesa.estado.phase, 'truco');
    assert.deepStrictEqual([celular0.estado.mustRespond, celular1.estado.mustRespond], [false, true]);
    return partida;
  }

  test('o Jogador pede Truco pelo Celular, e o outro Jogador aceita: a Mão passa a valer 3', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares: [celular0] } = trucoDoLugar0(t);
    assert.deepStrictEqual(sala.action({ type: 'respond', seat: 1, ans: 'aceito' }), { ok: true });
    assert.deepStrictEqual(ultimosEventos(mesa).map((ev) => [ev.t, ev.seat, ev.level]), [['aceito', 1, 3]]);
    assert.strictEqual(mesa.estado.phase, 'play');
    assert.strictEqual(mesa.estado.value, 3);
    // O Jogador que pediu segue na vez, para jogar a carta.
    assert.strictEqual(celular0.estado.canPlay, true);
    assert.strictEqual(celular0.estado.canTruco, false);
  });

  test('quem corre do Truco perde a Mão, e a outra Dupla ganha o valor de antes do pedido', (t) => {
    pararRelogio(t);
    const { sala, mesa } = trucoDoLugar0(t);
    assert.deepStrictEqual(sala.action({ type: 'respond', seat: 1, ans: 'corro' }), { ok: true });
    const [corro, fimDaMao] = ultimosEventos(mesa);
    assert.deepStrictEqual(campos(corro, ['t', 'seat', 'team', 'winner', 'gain']), { t: 'corro', seat: 1, team: 1, winner: 0, gain: 1 });
    assert.deepStrictEqual(campos(fimDaMao, ['t', 'winner', 'points', 'reason', 'score']), { t: 'hand', winner: 0, points: 1, reason: 'correu', score: [1, 0] });
    assert.strictEqual(ultimosEventos(mesa).length, 2);
    assert.strictEqual(mesa.estado.phase, 'handEnd');
    assert.deepStrictEqual(mesa.estado.score, [1, 0]);
  });

  test('quem recebe o Truco pode aumentar para seis, e aí quem pediu responde', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares: [celular0, celular1] } = trucoDoLugar0(t);
    assert.deepStrictEqual(sala.action({ type: 'respond', seat: 1, ans: 'aumento' }), { ok: true });
    assert.deepStrictEqual(ultimosEventos(mesa).filter((ev) => ev.t === 'truco').map((ev) => [ev.seat, ev.level, ev.raise]), [[1, 6, true]]);
    assert.strictEqual(mesa.estado.phase, 'truco');
    assert.deepStrictEqual([celular0.estado.mustRespond, celular1.estado.mustRespond], [true, false]);
    assert.deepStrictEqual(sala.action({ type: 'respond', seat: 0, ans: 'aceito' }), { ok: true });
    assert.deepStrictEqual(ultimosEventos(mesa).map((ev) => [ev.t, ev.seat, ev.level]), [['aceito', 0, 6]]);
    assert.strictEqual(mesa.estado.value, 6);
    assert.strictEqual(mesa.estado.phase, 'play');
  });

  test('pedir Truco fora da vez, ou responder sem ser a vez de responder, dá erro', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares: [celular0] } = partidaComDoisCelulares(8);
    esperarAte(t, () => celular0.estado.canTruco, 'o Lugar 0 poder pedir Truco');
    assert.deepStrictEqual(sala.action({ type: 'respond', seat: 1, ans: 'aceito' }), { error: 'Ninguém pediu nada.' });
    assert.deepStrictEqual(sala.action({ type: 'truco', seat: 1 }), { error: 'Não dá pra pedir truco agora.' });
    sala.action({ type: 'truco', seat: 0 });
    const antes = mesa.estado;
    assert.deepStrictEqual(sala.action({ type: 'respond', seat: 0, ans: 'aceito' }), { error: 'Não é você que responde.' });
    assert.deepStrictEqual(sala.action({ type: 'respond', seat: 1, ans: 'talvez' }), { error: 'Resposta inválida.' });
    assert.deepStrictEqual(mesa.estado, antes);
  });

  // Joga com os dois Celulares (primeira carta, aceita todo Truco) até a Mão de onze.
  // Com o sorteio 13, a Dupla Vermelha chega a 11 (placar 3 a 11), e quem decide é o Jogador do Lugar 1.
  function chegarNaMaoDeOnze(t) {
    const partida = partidaComDoisCelulares(13);
    const { sala, mesa, celulares } = partida;
    for (let passo = 0; !celulares.some((c) => c.estado.mustOnze); passo++) {
      assert.ok(passo < 5000 && mesa.estado.phase !== 'over', 'a Partida não chegou na Mão de onze');
      const celular = celulares.find((c) => c.estado.canPlay || c.estado.mustRespond);
      if (!celular) { t.mock.timers.tick(100); continue; }
      const seat = celular.estado.me;
      const acao = celular.estado.mustRespond ? { type: 'respond', seat, ans: 'aceito' } : { type: 'play', seat, idx: 0 };
      assert.deepStrictEqual(sala.action(acao), { ok: true }, JSON.stringify(acao));
    }
    assert.deepStrictEqual(mesa.estado.score, [3, 11]);
    assert.strictEqual(mesa.estado.phase, 'onze');
    assert.deepStrictEqual(ultimosEventos(mesa).filter((ev) => ev.t === 'onze').map((ev) => ev.team), [1]);
    return partida;
  }

  test('na Mão de onze, o Jogador da Dupla com 11 vê as cartas do parceiro e decide pelo Celular', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares: [celular0, celular1] } = chegarNaMaoDeOnze(t);
    assert.deepStrictEqual([celular0.estado.mustOnze, celular1.estado.mustOnze], [false, true]);
    assert.strictEqual(celular1.estado.partnerHand.length, 3);
    assert.strictEqual(celular0.estado.partnerHand, undefined);
    // Esperar não decide por ele: a Mão fica parada até o Jogador responder.
    t.mock.timers.tick(20000);
    assert.strictEqual(mesa.estado.phase, 'onze');
    const antes = mesa.estado;
    assert.deepStrictEqual(sala.action({ type: 'onze', seat: 0, ans: 'joga' }), { error: 'Quem decide é a dupla que tem 11.' });
    assert.deepStrictEqual(sala.action({ type: 'onze', seat: 1, ans: 'talvez' }), { error: 'Resposta inválida.' });
    assert.deepStrictEqual(mesa.estado, antes);
  });

  test('na Mão de onze, se a Dupla joga, a Mão vale 3 e ninguém pede Truco', (t) => {
    pararRelogio(t);
    const { sala, mesa, celulares } = chegarNaMaoDeOnze(t);
    assert.deepStrictEqual(sala.action({ type: 'onze', seat: 1, ans: 'joga' }), { ok: true });
    assert.deepStrictEqual(ultimosEventos(mesa).map((ev) => [ev.t, ev.team, ev.seat]), [['onzeJoga', 1, 1]]);
    assert.strictEqual(mesa.estado.phase, 'play');
    assert.strictEqual(mesa.estado.value, 3);
    celulares.forEach((c) => assert.strictEqual(c.estado.canTruco, false));
    esperarAte(t, () => celulares.some((c) => c.estado.canPlay), 'a vez de um Jogador');
    const naVez = celulares.find((c) => c.estado.canPlay).estado.me;
    assert.deepStrictEqual(sala.action({ type: 'truco', seat: naVez }), { error: 'Não dá pra pedir truco agora.' });
  });

  test('na Mão de onze, se a Dupla corre, a outra Dupla ganha 1 ponto', (t) => {
    pararRelogio(t);
    const { sala, mesa } = chegarNaMaoDeOnze(t);
    assert.deepStrictEqual(sala.action({ type: 'onze', seat: 1, ans: 'corre' }), { ok: true });
    const [corre, fimDaMao] = ultimosEventos(mesa);
    assert.deepStrictEqual(campos(corre, ['t', 'team', 'seat']), { t: 'onzeCorre', team: 1, seat: 1 });
    assert.deepStrictEqual(campos(fimDaMao, ['t', 'winner', 'points', 'reason', 'score']), { t: 'hand', winner: 0, points: 1, reason: 'onze-correu', score: [4, 11] });
    assert.deepStrictEqual(mesa.estado.score, [4, 11]);
  });

  test('numa Partida inteira, a Mesa recebe início, cartas dadas, Truco, aceito, corro, fim de Mão e fim de Partida, cada evento uma vez', (t) => {
    pararRelogio(t);
    const { mesa } = partidaDeRobos(11);
    esperarAte(t, () => mesa.estado.phase === 'over', 'o fim da Partida');
    const eventos = mesa.eventos;
    const ids = eventos.map((ev) => ev.id);
    assert.strictEqual(new Set(ids).size, ids.length, 'a Mesa recebeu um evento duas vezes');
    assert.deepStrictEqual(eventos.slice(0, 2).map((ev) => ev.t), ['start', 'deal']);
    for (const tipo of ['truco', 'aceito', 'corro']) {
      assert.ok(eventos.some((ev) => ev.t === tipo), `a Mesa não recebeu nenhum ${tipo}`);
    }
    const fim = eventos.at(-1);
    assert.strictEqual(fim.t, 'over');
    assert.ok(fim.score[fim.winner] === 12 && fim.score[1 - fim.winner] < 12, `placar final ${fim.score}`);
    assert.deepStrictEqual(fim.score, mesa.estado.score);
    // Cada Mão: cartas dadas, depois o fim de Mão. Depois de cada fim de Mão, cartas novas ou o fim da Partida.
    const comecosEFins = eventos.filter((ev) => ev.t === 'deal' || ev.t === 'hand' || ev.t === 'over').map((ev) => ev.t);
    assert.match(comecosEFins.join(' '), /^(deal hand )+over$/);
    assert.deepStrictEqual(eventos.filter((ev) => ev.t === 'hand').at(-1).score, fim.score);
  });

  test('o sinal de vida chega a todas as telas conectadas, e só a elas', () => {
    const sala = new Room();
    const telas = [conectarMesa(sala), conectarCelular(sala, 0), conectarCelular(sala, 1)];
    const saiu = conectarMesa(sala);
    saiu.sair();
    const mensagens = telas.map((tela) => tela.mensagens.length);
    const linhasDeQuemSaiu = saiu.linhas.length;
    sala.heartbeat();
    telas.forEach((tela, i) => {
      assert.strictEqual(tela.linhas.at(-1), ': oi\n\n');
      // O sinal de vida é só um comentário: não manda estado de novo.
      assert.strictEqual(tela.mensagens.length, mensagens[i]);
    });
    assert.strictEqual(saiu.linhas.length, linhasDeQuemSaiu);
  });
});
