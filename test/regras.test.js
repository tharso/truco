// Regras do truco paulista, testadas pelo Game (ADR 0001).
// Os valores esperados vêm da regra do README, escritos à mão.
'use strict';
const { describe, test } = require('node:test');
const assert = require('node:assert');
const { Game, power, manilhaOf, decide, nextLevel } = require('../game.js');
const brain = require('../bots.js');
const { rngFixo, partidaComPlacar, darCartas } = require('./montagem.js');

const ORDEM_DE_FORCA = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const NAIPES = ['ouros', 'espadas', 'copas', 'paus'];
const SEGUINTE = { 4: '5', 5: '6', 6: '7', 7: 'Q', Q: 'J', J: 'K', K: 'A', A: '2', 2: '3', 3: '4' };
const AZUL = 0;
const VERMELHA = 1;
const EMPATE = 'tie';
const duplaDe = (lugar) => lugar % 2; // Lugares 0 e 2: Dupla Azul; 1 e 3: Dupla Vermelha
const outraDupla = (dupla) => 1 - dupla;
const parceiroDe = (lugar) => (lugar + 2) % 4; // o parceiro fica no Lugar da frente

// Placar com pontos só para uma Dupla. Ex.: placarCom(VERMELHA, 3) = [0, 3].
function placarCom(dupla, pontos) {
  const placar = [0, 0];
  placar[dupla] = pontos;
  return placar;
}

// ---------- ajudas que só usam a interface pública ----------

// Começa a Partida e passa o tempo das cartas sendo dadas.
function partidaNaVez(semente = 1, { brain } = {}) {
  const g = new Game({ rng: rngFixo(semente), brain });
  g.start();
  g.onTimer();
  return g;
}

// Cartas que se veem na Mão: as Cartas na mão de cada Lugar e a Vira.
function cartasDaMao(g) {
  const maos = [0, 1, 2, 3].flatMap((s) => g.seatView(s).hand);
  return maos.concat([g.publicView().vira]);
}

// Quem tem que agir agora (responder ao Truco, decidir a Mão de onze, jogar).
const quemAge = (g) => g.next().seat;

// Níveis de Truco pedidos desde a última olhada nos eventos.
const niveisPedidos = (g) => g.drain().filter((e) => e.t === 'truco').map((e) => e.level);

// Joga a primeira carta de quem está na vez até a Mão acabar. Devolve o evento de fim da Mão.
function jogarAteOFimDaMao(g) {
  g.drain();
  for (let passo = 0; passo < 20; passo++) {
    const fim = g.drain().find((e) => e.t === 'hand');
    if (fim) return fim;
    if (g.publicView().phase === 'roundEnd') g.onTimer();
    else assert.strictEqual(g.play(g.publicView().turn, 0), null);
  }
  throw new Error('a Mão não acabou');
}

// Fecha a Mão do jeito mais curto: quem está na vez pede Truco e a outra Dupla corre.
function fecharMaoCorrendo(g) {
  const vez = g.publicView().turn;
  assert.strictEqual(g.truco(vez), null);
  assert.strictEqual(g.respond(quemAge(g), 'corro'), null);
}

describe('Baralho', () => {
  test('cada Mão usa um baralho sem 8, 9 e 10 e sem carta repetida', () => {
    const g = partidaNaVez();
    const vistas = new Set();
    for (let mao = 0; mao < 40; mao++) {
      const cartas = cartasDaMao(g);
      assert.strictEqual(cartas.length, 13);
      const nomes = cartas.map((c) => c.r + ' de ' + c.s);
      assert.strictEqual(new Set(nomes).size, 13, `carta repetida na Mão: ${nomes}`);
      for (const c of cartas) {
        assert.ok(ORDEM_DE_FORCA.includes(c.r), `carta fora do baralho: ${c.r}`);
        assert.ok(NAIPES.includes(c.s), `naipe estranho: ${c.s}`);
        vistas.add(c.r + ' de ' + c.s);
      }
      g.toLobby(); // placar zerado: nunca chega à Mão de onze
      g.start();
      g.onTimer();
    }
    assert.strictEqual(vistas.size, 40, 'o baralho tem 40 cartas: 10 valores × 4 naipes');
  });
});

describe('Força das cartas', () => {
  // Força de cada carta numa Mão, olhando a Vira.
  const forcaNaMao = (vira) => (r, s = 'ouros') => power({ r, s }, manilhaOf({ r: vira, s: 'copas' }));

  test('fora da Manilha, a força segue 4 5 6 7 Q J K A 2 3', () => {
    // Vira 3 → Manilha 4: confere do 5 ao 3.
    const comVira3 = forcaNaMao('3');
    const sem4 = ['5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
    for (let i = 1; i < sem4.length; i++) {
      assert.ok(comVira3(sem4[i - 1]) < comVira3(sem4[i]), `${sem4[i - 1]} deveria perder para ${sem4[i]}`);
    }
    // Vira K → Manilha A: confere do 4 ao 3, pulando o A.
    const comViraK = forcaNaMao('K');
    const semA = ['4', '5', '6', '7', 'Q', 'J', 'K', '2', '3'];
    for (let i = 1; i < semA.length; i++) {
      assert.ok(comViraK(semA[i - 1]) < comViraK(semA[i]), `${semA[i - 1]} deveria perder para ${semA[i]}`);
    }
  });

  test('fora da Manilha, o naipe não desempata', () => {
    const f = forcaNaMao('7');
    assert.strictEqual(f('3', 'ouros'), f('3', 'paus'));
    assert.strictEqual(f('A', 'espadas'), f('A', 'copas'));
  });
});

describe('Rodada', () => {
  const carta = (r, s) => ({ r, s });
  // Duas cartas de sobra por Lugar, só para completar as Cartas na mão.
  const sobra = (lugar) => [carta('Q', NAIPES[lugar]), carta('J', NAIPES[lugar])];

  // Dá as cartas escolhidas (a primeira de cada Lugar é a jogada) e joga uma Rodada.
  function jogarRodada(primeiras) {
    const g = new Game({ rng: rngFixo() });
    g.start();
    darCartas(g, { vira: carta('4', 'copas'), maos: primeiras.map((c, lugar) => [c, ...sobra(lugar)]) });
    g.onTimer();
    g.drain();
    for (let i = 0; i < 4; i++) assert.strictEqual(g.play(g.publicView().turn, 0), null);
    return g.drain().find((e) => e.t === 'round');
  }

  // Vira 4 → Manilha 5.
  test('a carta mais forte ganha a Rodada para a Dupla dela', () => {
    const r = jogarRodada([carta('K', 'ouros'), carta('3', 'espadas'), carta('7', 'paus'), carta('A', 'copas')]);
    assert.strictEqual(r.result, VERMELHA);
    assert.strictEqual(r.seat, 1);
  });

  test('a Manilha ganha do 3', () => {
    const r = jogarRodada([carta('K', 'ouros'), carta('3', 'espadas'), carta('5', 'ouros'), carta('A', 'copas')]);
    assert.strictEqual(r.result, AZUL);
    assert.strictEqual(r.seat, 2);
  });

  test('entre Manilhas na mesma Rodada, ganha o naipe mais forte', () => {
    const r = jogarRodada([carta('5', 'espadas'), carta('5', 'paus'), carta('5', 'copas'), carta('3', 'ouros')]);
    assert.strictEqual(r.result, VERMELHA);
    assert.strictEqual(r.seat, 1);
  });

  test('cartas mais fortes iguais em Duplas diferentes empatam a Rodada', () => {
    const r = jogarRodada([carta('3', 'ouros'), carta('3', 'paus'), carta('6', 'espadas'), carta('K', 'paus')]);
    assert.strictEqual(r.result, EMPATE);
  });

  test('cartas mais fortes iguais na mesma Dupla: a Dupla ganha a Rodada', () => {
    const r = jogarRodada([carta('3', 'ouros'), carta('2', 'espadas'), carta('3', 'paus'), carta('A', 'copas')]);
    assert.strictEqual(r.result, AZUL);
  });
});

describe('Manilha', () => {
  test('a Manilha é a carta seguinte à Vira, e depois do 3 vem o 4', () => {
    for (const [vira, manilha] of Object.entries(SEGUINTE)) {
      assert.strictEqual(manilhaOf({ r: vira, s: 'paus' }), manilha, `Vira ${vira}`);
    }
  });

  test('a Manilha da Mão é a seguinte à Vira que a Mesa mostra', () => {
    for (let semente = 1; semente <= 20; semente++) {
      const v = partidaNaVez(semente).publicView();
      assert.strictEqual(v.manilha, SEGUINTE[v.vira.r], `Vira ${v.vira.r}`);
    }
  });

  test('entre Manilhas, o naipe desempata: ouros < espadas < copas < paus', () => {
    const f = (s) => power({ r: '5', s }, manilhaOf({ r: '4', s: 'copas' }));
    assert.ok(f('ouros') < f('espadas'));
    assert.ok(f('espadas') < f('copas'));
    assert.ok(f('copas') < f('paus'));
  });

  test('a Manilha mais fraca ganha do 3, a carta mais forte fora dela', () => {
    const manilha = manilhaOf({ r: '7', s: 'copas' }); // Q
    assert.ok(power({ r: 'Q', s: 'ouros' }, manilha) > power({ r: '3', s: 'paus' }, manilha));
  });
});

describe('Desempate da Mão', () => {
  // Cada Rodada: AZUL, VERMELHA ou EMPATE.
  const ganha = (dupla) => ({ done: true, winner: dupla });
  const segue = { done: false };

  test('quem ganha as duas primeiras Rodadas leva a Mão', () => {
    assert.deepStrictEqual(decide([AZUL, AZUL]), ganha(AZUL));
    assert.deepStrictEqual(decide([VERMELHA, VERMELHA]), ganha(VERMELHA));
  });

  test('uma Rodada para cada: a Mão segue para a terceira, que decide', () => {
    assert.deepStrictEqual(decide([AZUL, VERMELHA]), segue);
    assert.deepStrictEqual(decide([AZUL, VERMELHA, VERMELHA]), ganha(VERMELHA));
    assert.deepStrictEqual(decide([VERMELHA, AZUL, AZUL]), ganha(AZUL));
  });

  test('empate na primeira Rodada: quem ganha a segunda leva', () => {
    assert.deepStrictEqual(decide([EMPATE]), segue);
    assert.deepStrictEqual(decide([EMPATE, VERMELHA]), ganha(VERMELHA));
    assert.deepStrictEqual(decide([EMPATE, AZUL]), ganha(AZUL));
  });

  test('empate depois da primeira Rodada: vale quem ganhou a primeira', () => {
    assert.deepStrictEqual(decide([VERMELHA, EMPATE]), ganha(VERMELHA));
    assert.deepStrictEqual(decide([AZUL, EMPATE]), ganha(AZUL));
    assert.deepStrictEqual(decide([AZUL, VERMELHA, EMPATE]), ganha(AZUL));
    assert.deepStrictEqual(decide([VERMELHA, AZUL, EMPATE]), ganha(VERMELHA));
  });

  test('empate nas duas primeiras Rodadas: a terceira decide', () => {
    assert.deepStrictEqual(decide([EMPATE, EMPATE]), segue);
    assert.deepStrictEqual(decide([EMPATE, EMPATE, AZUL]), ganha(AZUL));
    assert.deepStrictEqual(decide([EMPATE, EMPATE, VERMELHA]), ganha(VERMELHA));
  });

  test('três empates: ninguém marca ponto', () => {
    assert.deepStrictEqual(decide([EMPATE, EMPATE, EMPATE]), ganha(null));
  });
});

describe('Quem dá as cartas', () => {
  test('quem dá as cartas é quem joga por último na Mão', () => {
    for (let semente = 1; semente <= 8; semente++) {
      const v = partidaNaVez(semente).publicView();
      assert.strictEqual(v.turn, (v.dealer + 1) % 4, 'começa quem está depois de quem deu');
    }
  });

  test('quem dá as cartas muda a cada Mão, girando pela Mesa', () => {
    const g = partidaNaVez();
    const quemDeu = [g.publicView().dealer];
    for (let mao = 0; mao < 4; mao++) {
      fecharMaoCorrendo(g);
      g.onTimer(); // fim da Mão → cartas novas
      quemDeu.push(g.publicView().dealer);
      g.onTimer(); // cartas dadas → vez de jogar
    }
    const d = quemDeu[0];
    assert.deepStrictEqual(quemDeu, [d, (d + 1) % 4, (d + 2) % 4, (d + 3) % 4, d]);
  });
});

describe('Truco', () => {
  test('o valor sobe 3 → seis → nove → doze e para no doze', () => {
    assert.strictEqual(nextLevel(1), 3);
    assert.strictEqual(nextLevel(3), 6);
    assert.strictEqual(nextLevel(6), 9);
    assert.strictEqual(nextLevel(9), 12);

    const g = partidaNaVez();
    g.drain();
    assert.strictEqual(g.truco(g.publicView().turn), null);
    assert.strictEqual(g.respond(quemAge(g), 'aumento'), null);
    assert.strictEqual(g.respond(quemAge(g), 'aumento'), null);
    assert.strictEqual(g.respond(quemAge(g), 'aumento'), null);
    assert.deepStrictEqual(niveisPedidos(g), [3, 6, 9, 12]);
    assert.ok(g.respond(quemAge(g), 'aumento'), 'depois do doze não dá para aumentar');
    assert.strictEqual(g.respond(quemAge(g), 'aceito'), null);
    assert.strictEqual(g.publicView().value, 12);
    for (const lugar of [0, 1, 2, 3]) assert.ok(!g.seatView(lugar).canTruco, `Lugar ${lugar} pediu acima do doze`);
    assert.ok(g.truco(g.publicView().turn), 'depois do doze não dá para pedir Truco');
  });

  test('só quem está na vez pede Truco', () => {
    const g = partidaNaVez();
    const vez = g.publicView().turn;
    for (const lugar of [0, 1, 2, 3].filter((l) => l !== vez)) {
      assert.ok(!g.seatView(lugar).canTruco, `Lugar ${lugar} não está na vez`);
      assert.ok(g.truco(lugar), `Lugar ${lugar} pediu fora da vez`);
    }
    assert.ok(g.seatView(vez).canTruco);
    assert.strictEqual(g.truco(vez), null);
  });

  test('a mesma Dupla não pede Truco duas vezes seguidas', () => {
    const g = partidaNaVez();
    const vez = g.publicView().turn;
    assert.strictEqual(g.truco(vez), null);
    assert.strictEqual(g.respond(quemAge(g), 'aceito'), null);
    assert.ok(g.truco(vez), 'quem pediu não pede de novo');
    assert.strictEqual(g.play(vez, 0), null);
    const adversario = (vez + 1) % 4;
    assert.strictEqual(g.play(adversario, 0), null);
    const parceiro = parceiroDe(vez);
    assert.ok(g.truco(parceiro), 'o parceiro de quem pediu também não pede');
    assert.strictEqual(g.play(parceiro, 0), null);
    g.drain();
    assert.strictEqual(g.truco((vez + 3) % 4), null, 'a outra Dupla pode pedir seis');
    assert.deepStrictEqual(niveisPedidos(g), [6]);
  });

  test('só a Dupla que recebeu o pedido responde', () => {
    const g = partidaNaVez();
    const vez = g.publicView().turn;
    assert.strictEqual(g.truco(vez), null);
    for (const lugar of [vez, parceiroDe(vez)]) {
      assert.ok(!g.seatView(lugar).mustRespond);
      assert.ok(g.respond(lugar, 'aceito'), `Lugar ${lugar} pediu e respondeu ao próprio Truco`);
    }
    const responde = quemAge(g);
    assert.strictEqual(duplaDe(responde), outraDupla(duplaDe(vez)));
    assert.ok(g.seatView(responde).mustRespond);
    assert.strictEqual(g.respond(responde, 'aceito'), null);
  });
});

describe('Correr', () => {
  test('correr do Truco dá 1 ponto (o valor de antes) à Dupla que pediu', () => {
    const g = partidaNaVez();
    const pediu = duplaDe(g.publicView().turn);
    fecharMaoCorrendo(g);
    assert.deepStrictEqual(g.publicView().score, placarCom(pediu, 1));
  });

  test('correr do seis dá 3 pontos à Dupla que pediu', () => {
    const g = partidaNaVez();
    const vez = g.publicView().turn;
    assert.strictEqual(g.truco(vez), null);
    assert.strictEqual(g.respond(quemAge(g), 'aceito'), null);
    assert.strictEqual(g.play(vez, 0), null);
    const pediuSeis = (vez + 1) % 4;
    assert.strictEqual(g.truco(pediuSeis), null);
    assert.strictEqual(g.respond(quemAge(g), 'corro'), null);
    assert.deepStrictEqual(g.publicView().score, placarCom(duplaDe(pediuSeis), 3));
  });

  test('aumentar vale como aceitar o pedido anterior', () => {
    const g = partidaNaVez();
    const vez = g.publicView().turn;
    assert.strictEqual(g.truco(vez), null);
    const aumentou = quemAge(g);
    assert.strictEqual(g.respond(aumentou, 'aumento'), null);
    assert.strictEqual(g.publicView().value, 3, 'o Truco ficou aceito');
    // Quem pediu o Truco corre do seis: a outra Dupla leva os 3 do Truco aceito.
    assert.strictEqual(g.respond(quemAge(g), 'corro'), null);
    assert.deepStrictEqual(g.publicView().score, placarCom(duplaDe(aumentou), 3));
  });
});

describe('Fim da Partida', () => {
  test('a Partida segue enquanto ninguém chega a 12', () => {
    const g = partidaComPlacar(10, 10);
    g.onTimer();
    fecharMaoCorrendo(g); // 11 para quem pediu
    g.drain();
    g.onTimer();
    const eventos = g.drain().map((e) => e.t);
    assert.ok(eventos.includes('deal'), 'faltou a Mão seguinte');
    assert.ok(!eventos.includes('over'), 'a Partida acabou antes do 12');
    assert.strictEqual(g.publicView().winner, null);
  });

  test('a Partida termina quando uma Dupla chega a 12, sem passar de 12', () => {
    const g = partidaComPlacar(10, 10);
    g.onTimer();
    const pediu = duplaDe(g.publicView().turn);
    assert.strictEqual(g.truco(g.publicView().turn), null);
    assert.strictEqual(g.respond(quemAge(g), 'aumento'), null); // seis
    assert.strictEqual(g.respond(quemAge(g), 'aumento'), null); // nove
    assert.strictEqual(g.respond(quemAge(g), 'corro'), null); // quem pediu leva 6: 10 + 6 passaria de 12
    const placar = [10, 10];
    placar[pediu] = 12;
    assert.deepStrictEqual(g.publicView().score, placar);
    g.drain();
    g.onTimer();
    const fim = g.drain().find((e) => e.t === 'over');
    assert.ok(fim, 'faltou o fim da Partida');
    assert.strictEqual(fim.winner, pediu);
    assert.strictEqual(g.publicView().phase, 'over');
  });
});

describe('Mão de onze', () => {
  test('a Dupla com 11 vê as cartas do parceiro, e a outra Dupla não', () => {
    const azul = partidaComPlacar(11, 4);
    azul.onTimer();
    const v = azul.seatView(0);
    assert.ok(v.mustOnze, 'a Dupla Azul decide se joga');
    assert.deepStrictEqual(v.partnerHand, azul.seatView(2).hand);
    assert.strictEqual(v.partnerHand.length, 3);
    assert.strictEqual(azul.seatView(1).partnerHand, undefined);

    const vermelha = partidaComPlacar(4, 11);
    vermelha.onTimer();
    assert.ok(vermelha.seatView(1).mustOnze, 'a Dupla Vermelha decide se joga');
    assert.deepStrictEqual(vermelha.seatView(1).partnerHand, vermelha.seatView(3).hand);
    assert.strictEqual(vermelha.seatView(0).partnerHand, undefined);
  });

  test('só a Dupla com 11 decide se joga', () => {
    const g = partidaComPlacar(11, 4);
    g.onTimer();
    assert.ok(g.onzeDecide(1, 'joga'), 'a Dupla Vermelha não tem 11');
    assert.strictEqual(g.onzeDecide(0, 'joga'), null);
  });

  test('ninguém pede Truco na Mão de onze', () => {
    const g = partidaComPlacar(11, 4);
    g.onTimer();
    assert.strictEqual(g.onzeDecide(0, 'joga'), null);
    for (const lugar of [0, 1, 2, 3]) assert.ok(!g.seatView(lugar).canTruco, `Lugar ${lugar} pôde pedir Truco`);
    assert.ok(g.truco(g.publicView().turn), 'Truco na Mão de onze');
  });

  test('jogar a Mão de onze vale 3 pontos', () => {
    // Com a semente fixa, a Dupla Vermelha ganha esta Mão: 4 + 3 = 7.
    const g = partidaComPlacar(11, 4);
    g.onTimer();
    assert.strictEqual(g.onzeDecide(0, 'joga'), null);
    assert.strictEqual(g.publicView().value, 3);
    const fim = jogarAteOFimDaMao(g);
    assert.strictEqual(fim.winner, VERMELHA);
    assert.strictEqual(fim.points, 3);
    assert.deepStrictEqual(fim.score, [11, 7]);
  });

  test('correr da Mão de onze dá 1 ponto à outra Dupla', () => {
    const g = partidaComPlacar(11, 4);
    g.onTimer();
    assert.strictEqual(g.onzeDecide(0, 'corre'), null);
    assert.deepStrictEqual(g.publicView().score, [11, 5]);
  });
});

describe('Mão de ferro', () => {
  test('com 11 a 11, ninguém vê as próprias cartas', () => {
    const g = partidaComPlacar(11, 11);
    g.onTimer();
    assert.strictEqual(g.publicView().mode, 'ferro');
    for (const lugar of [0, 1, 2, 3]) {
      const mao = g.seatView(lugar).hand;
      assert.strictEqual(mao.length, 3);
      assert.ok(mao.every((c) => c.hidden && !c.r && !c.s), `Lugar ${lugar} viu as próprias cartas`);
    }
  });

  test('na Mão de ferro ninguém decide se joga nem pede Truco', () => {
    const g = partidaComPlacar(11, 11);
    g.onTimer();
    assert.strictEqual(g.publicView().phase, 'play');
    for (const lugar of [0, 1, 2, 3]) {
      assert.ok(!g.seatView(lugar).mustOnze);
      assert.ok(!g.seatView(lugar).canTruco);
    }
  });
});

describe('Cochicho', () => {
  test('com parceiro Robô, quem responde ao Truco recebe o cochicho no Celular', () => {
    const g = partidaNaVez(1, { brain });
    g.drain();
    assert.strictEqual(g.truco(g.publicView().turn), null);
    const responde = quemAge(g);
    const parceiro = parceiroDe(responde);
    const cochicho = g.seatView(responde).advice;
    assert.ok(cochicho, 'faltou o cochicho do parceiro Robô');
    assert.strictEqual(cochicho.to, responde);
    assert.strictEqual(cochicho.seat, parceiro);
    assert.ok(['aumenta', 'aceita', 'corre'].includes(cochicho.mood), `cochicho estranho: ${cochicho.mood}`);
    assert.ok(g.drain().some((e) => e.t === 'advice' && e.to === responde && e.seat === parceiro));
  });

  test('quando a outra Dupla aumenta, o cochicho vai para quem responde agora', () => {
    const g = partidaNaVez(1, { brain });
    assert.strictEqual(g.truco(g.publicView().turn), null);
    assert.strictEqual(g.respond(quemAge(g), 'aumento'), null);
    const responde = quemAge(g);
    const cochicho = g.seatView(responde).advice;
    assert.ok(cochicho, 'faltou o cochicho depois do aumento');
    assert.strictEqual(cochicho.to, responde);
    assert.strictEqual(cochicho.seat, parceiroDe(responde));
  });
});
