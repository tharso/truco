// Montagem: o único lugar dos testes que mexe no estado de dentro do Game.
// Se o Game mudar por dentro, só este arquivo muda (ADR 0001).
'use strict';
const { Game, manilhaOf } = require('../game.js');

// Sorteio fixo (mulberry32): a mesma semente dá sempre as mesmas cartas.
function rngFixo(semente = 1) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Partida já começada, com a Mão nova sendo dada e o placar escolhido.
// Ex.: partidaComPlacar(11, 4) dá uma Mão de onze para a Dupla Azul.
function partidaComPlacar(azul, vermelha) {
  const g = new Game({ rng: rngFixo() });
  g.start();
  g.drain();
  g.score = [azul, vermelha];
  g.startHand();
  return g;
}

// Partida com Robôs nos quatro Lugares, cada um com um jeito de jogar.
// Os Lugares 0 e 1 viram Robôs dos extremos: blefa e encara tudo (0), não blefa e tem medo (1).
function partidaSoDeRobos({ brain } = {}) {
  const g = new Game({ brain });
  g.seats.forEach((s, i) => {
    if (!s.bot) Object.assign(s, { bot: true }, i === 0 ? { bluff: 10, nerve: 10 } : { bluff: 0, nerve: 0 });
  });
  return g;
}

// Muda as barras de blefe e de coragem (0 a 10) do Robô do Lugar `lugar`.
function barras(g, lugar, bluff, nerve) {
  Object.assign(g.seats[lugar], { bluff, nerve });
}

// Troca as cartas da Mão que está sendo dada pelas cartas escolhidas.
// Use antes de passar o tempo das cartas (fase 'deal'). maos[lugar] = Cartas na mão do Lugar.
function darCartas(g, { vira, maos }) {
  if (g.phase !== 'deal') throw new Error('darCartas só vale enquanto as cartas estão sendo dadas');
  g.vira = vira;
  g.manilha = manilhaOf(vira);
  g.hands = maos.map((m) => m.slice());
}

// Os Sinais da Mão que o Robô `robo` viu, como [Lugar de quem fez, Sinal].
function sinaisQueORoboViu(g, robo) {
  return g.signals.filter((x) => x.seenBy.includes(robo)).map((x) => [x.seat, x.sig]);
}

// Apaga os Sinais da Mão (os que os Robôs fizeram ao receber as cartas).
function semSinais(g) {
  g.signals = [];
}

// Faz o Robô `robo` ver todos os Sinais da Mão, sem tirar a sorte.
function roboViuTudo(g, robo) {
  g.signals.forEach((x) => { if (x.seat !== robo && !x.seenBy.includes(robo)) x.seenBy.push(robo); });
}

module.exports = { semSinais, roboViuTudo, rngFixo, partidaComPlacar, partidaSoDeRobos, darCartas, sinaisQueORoboViu, barras };
