// Código da Sala: as contas puras que a Cloudflare e as telas usam (ADR 0002).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../public/shared.js');

test('um Código da Sala novo tem 4 letras sem confusão (sem O, 0, I, 1, L)', () => {
  for (let i = 0; i < 500; i++) {
    const c = S.newRoomCode();
    assert.match(c, /^[A-Z2-9]{4}$/);
    assert.doesNotMatch(c, /[O0I1L]/);
  }
});

test('Códigos novos variam', () => {
  const seen = new Set(Array.from({ length: 200 }, () => S.newRoomCode()));
  assert.ok(seen.size > 190);
});

test('o código sai do endereço da Sala, em maiúsculas', () => {
  assert.strictEqual(S.roomCode('/s/KF4P'), 'KF4P');
  assert.strictEqual(S.roomCode('/s/kf4p/mao'), 'KF4P');
  assert.strictEqual(S.roomCode('/s/KF4P/mesa'), 'KF4P');
  assert.strictEqual(S.roomCode('/s/KF4P/events'), 'KF4P');
});

test('endereço sem Sala não tem código', () => {
  assert.strictEqual(S.roomCode('/'), null);
  assert.strictEqual(S.roomCode('/mao'), null);
  assert.strictEqual(S.roomCode('/s/KF4'), null);
  assert.strictEqual(S.roomCode('/s/KF4PX'), null);
  assert.strictEqual(S.roomCode('/s/KO4P'), null);
});

test('o código digitado vale com espaço e minúscula', () => {
  assert.strictEqual(S.cleanRoomCode(' kf4p '), 'KF4P');
  assert.strictEqual(S.cleanRoomCode('kf-4p'), 'KF4P');
  assert.strictEqual(S.cleanRoomCode('kf4'), null);
  assert.strictEqual(S.cleanRoomCode('ko4p'), null);
});

test('as telas falam com a Sala certa', () => {
  assert.strictEqual(S.roomBase('KF4P'), '/s/KF4P');
  assert.strictEqual(S.roomBase(null), '');
});
