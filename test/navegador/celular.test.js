// Linha de estado e Mão de onze do Celular (ADR 0001: lógica de tela em arquivo puro).
// Rodada 4 (06/11/2026): durante a Mão, o Celular só fala o que é para o Jogador fazer.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { statusText } = require('../../public/hand-view.js');

const seats = [{ name: 'Tharso' }, { name: 'Ana' }, { name: 'Cleitinho' }, { name: 'Zeca' }];
const estado = (extra) => Object.assign({ me: 0, seats, dealer: 1, turn: 1 }, extra);

test('na sua vez, o Celular chama você para jogar', () => {
  assert.strictEqual(statusText(estado({ phase: 'play', canPlay: true }), -1), 'SUA VEZ! Escolha uma carta');
  assert.strictEqual(statusText(estado({ phase: 'play', canPlay: true }), 0), 'Toque de novo pra jogar!');
  assert.strictEqual(statusText(estado({ phase: 'play', canPlay: true, canPlayClosed: true }), 0), 'Toque de novo, ou jogue fechada');
});

test('Truco para você responder, ou para dar Opinião', () => {
  assert.strictEqual(statusText(estado({ phase: 'truco', mustRespond: true, pending: { responder: 0 } }), -1), 'E aí? Vai encarar?');
  assert.strictEqual(statusText(estado({ phase: 'truco', mustOpine: true, pending: { responder: 2 } }), -1), 'Dê a sua opinião!');
});

test('Mão de onze: decidir, ou esperar os outros', () => {
  assert.strictEqual(statusText(estado({ phase: 'onze', mustOnze: true }), -1), 'Decida a mão de onze!');
  assert.strictEqual(statusText(estado({ phase: 'onze' }), -1), 'Mão de onze: esperando os outros…');
});

test('durante a Mão, nada do que é dos outros aparece', () => {
  assert.strictEqual(statusText(estado({ phase: 'play' }), -1), '');                                 // era "Vez de Ana…"
  assert.strictEqual(statusText(estado({ phase: 'truco', pending: { responder: 1 } }), -1), '');     // era "Ana está pensando…"
  assert.strictEqual(statusText(estado({ phase: 'deal' }), -1), '');                                 // era "Ana está dando as cartas…"
  assert.strictEqual(statusText(estado({ phase: 'roundEnd', lastRound: { result: 0 } }), -1), '');   // era "Rodada sua! 💪"
  assert.strictEqual(statusText(estado({ phase: 'roundEnd', lastRound: { result: 'tie' } }), -1), ''); // era "Cangou! Empate!"
  assert.strictEqual(statusText(estado({ phase: 'handEnd', lastHand: { winner: 0, points: 3 } }), -1), ''); // era "+3 pra vocês! 🎉"
  assert.strictEqual(statusText(estado({ phase: 'handEnd', lastHand: { winner: null } }), -1), '');  // era "Ninguém marcou."
});

test('fora da Mão, os avisos continuam', () => {
  assert.strictEqual(statusText(estado({ phase: 'lobby' }), -1), 'Esperando começar…');
  assert.strictEqual(statusText(estado({ phase: 'over', winner: 0 }), -1), '🏆 VOCÊS VENCERAM!');
  assert.strictEqual(statusText(estado({ phase: 'over', winner: 1 }), -1), '😭 Perderam! Paga a rodada!');
  const robo = [{ name: 'Nina', bot: true }, ...seats.slice(1)];
  assert.strictEqual(statusText(estado({ phase: 'play', seats: robo }), -1), 'Nina está jogando no seu lugar. Desmarque na TV.');
});

// Mão de onze: as 6 cartas em 2 faixas de 3. Em cima as suas, embaixo as do parceiro,
// na cor da Dupla, com o rosto e o nome dele.
const { onzeHTML } = require('../../public/hand-view.js');
const carta = (c) => `<i class="card">${c.r}${c.s}</i>`;
const cartasDe = (html) => [...html.matchAll(/<i class="card">(\w+)<\/i>/g)].map((m) => m[1]);
const faixas = (html) => html.split(/(?=<div class="onze-row)/).filter((f) => f.startsWith('<div class="onze-row'));

const onze = (me) => ({
  me,
  manilha: '5',
  seats: [
    { name: 'Tharso', avatar: 'nina' }, { name: 'Ana', avatar: 'beto' },
    { name: 'Cleitinho', avatar: 'roque' }, { name: 'Zeca', avatar: 'cida' },
  ],
  hand: [{ r: '4', s: 'c' }, { r: '7', s: 'o' }, { r: 'K', s: 'e' }],
  partnerHand: [{ r: 'A', s: 'p' }, { r: '3', s: 'c' }, { r: 'Q', s: 'o' }],
});

test('Mão de onze: suas 3 cartas em cima, as 3 do parceiro embaixo', () => {
  const [suas, parceiro, ...resto] = faixas(onzeHTML(onze(0), carta));
  assert.strictEqual(resto.length, 0);
  assert.match(suas, /Suas cartas/);
  assert.deepStrictEqual(cartasDe(suas), ['4c', '7o', 'Ke']);
  assert.deepStrictEqual(cartasDe(parceiro), ['Ap', '3c', 'Qo']);
});

test('Mão de onze: a faixa do parceiro tem o rosto, o nome e a cor da Dupla', () => {
  const parceiroAzul = faixas(onzeHTML(onze(0), carta))[1];
  assert.match(parceiroAzul, /class="onze-row partner t0"/);
  assert.match(parceiroAzul, /src="\/avatars\/roque\/neutro\.webp"/);
  assert.match(parceiroAzul, /Cleitinho/);
  assert.doesNotMatch(faixas(onzeHTML(onze(0), carta))[0], /t0|t1/); // a sua faixa fica no fundo normal

  const parceiroVermelho = faixas(onzeHTML(onze(1), carta))[1];
  assert.match(parceiroVermelho, /class="onze-row partner t1"/);
  assert.match(parceiroVermelho, /src="\/avatars\/cida\/neutro\.webp"/);
  assert.match(parceiroVermelho, /Zeca/);
});

// Cola (07/11/2026): o rosto do parceiro fazendo cada Sinal, com o nome da carta embaixo.
const { colaHTML } = require('../../public/hand-view.js');
const { SIGNALS } = require('../../public/shared.js');
const fotos = (html) => [...html.matchAll(/src="\/avatars\/(\w+)\/(\w+)\.webp"/g)].map((m) => `${m[1]}/${m[2]}`);
const legendas = (html) => [...html.matchAll(/<figcaption>([^<]+)<\/figcaption>/g)].map((m) => m[1]);
const mesa = (avatares, me = 0) => ({ me, seats: avatares.map((avatar) => ({ avatar })) });

test('a Cola mostra o rosto do parceiro fazendo os 6 Sinais', () => {
  const html = colaHTML(mesa(['nina', 'beto', 'roque', 'cida'], 1), SIGNALS);
  assert.deepStrictEqual(fotos(html), ['cida/zap', 'cida/copas', 'cida/espadas', 'cida/ouros', 'cida/tres', 'cida/lixo']);
  assert.deepStrictEqual(legendas(html), ['Zap', 'Copão', 'Espadilha', 'Pica-fumo', 'Tem um três', 'Mão ruim']);
});

test('sem parceiro, a Cola usa o seu rosto; sem rosto nenhum, a lista de texto', () => {
  assert.deepStrictEqual(fotos(colaHTML(mesa(['nina', null, null, null]), SIGNALS)).slice(0, 1), ['nina/zap']);
  const texto = colaHTML(mesa([null, null, null, null]), SIGNALS);
  assert.deepStrictEqual(fotos(texto), []);
  assert.match(texto, /Pisca um olho/);
  assert.match(colaHTML(null, SIGNALS), /Pisca um olho/);
});
