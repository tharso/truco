// Telas falsas para testar a Sala por fora, como a Mesa e os Celulares de verdade.
// Cada tela guarda tudo o que a Sala escreveu para ela. O teste nunca abre o Game.
//
//   const sala = new Room();
//   const mesa = conectarMesa(sala);
//   const celular = conectarCelular(sala, 0);
//   sala.action({ type: 'join', seat: 0, name: 'Zé' });
//   mesa.estado.seats[0].name  // 'Zé'
'use strict';

// Liga uma tela na Sala. `papel` e `lugar` vão como chegam do servidor ('table' | 'seat', '0' | '1' | ...).
function conectarTela(sala, papel, lugar) {
  const tela = {
    linhas: [],     // tudo o que a Sala escreveu, como texto cru (inclui o sinal de vida)
    mensagens: [],  // cada linha `data: {...}` já lida: { type, state, events }
    get estado() { const m = tela.mensagens[tela.mensagens.length - 1]; return m && m.state; },
    get eventos() { return tela.mensagens.flatMap((m) => m.events); },
    sair() { sala.disconnect(tela.conexao); },
  };
  tela.conexao = sala.connect(papel, lugar, (texto) => {
    tela.linhas.push(texto);
    if (texto.startsWith('data: ')) tela.mensagens.push(JSON.parse(texto.slice('data: '.length)));
  });
  return tela;
}

const conectarMesa = (sala) => conectarTela(sala, 'table', null);
const conectarCelular = (sala, lugar) => conectarTela(sala, 'seat', String(lugar));

// Sorteio que dá sempre a mesma sequência para a mesma semente (mulberry32).
function sorteioFixo(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Toda carta ({ r, s }) que aparece em qualquer lugar de um valor, como texto "r+s", na ordem.
function cartasEm(valor) {
  const achadas = [];
  const procura = (v) => {
    if (Array.isArray(v)) v.forEach(procura);
    else if (v && typeof v === 'object') {
      if (typeof v.r === 'string' && typeof v.s === 'string') achadas.push(v.r + v.s);
      else Object.values(v).forEach(procura);
    }
  };
  procura(valor);
  return achadas;
}

module.exports = { conectarTela, conectarMesa, conectarCelular, sorteioFixo, cartasEm };
