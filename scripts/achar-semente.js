// Acha sorteios (sementes) para os testes da Sala, quando uma regra nova muda as Partidas.
// Joga como os testes de test/sala.test.js: dois Celulares, cada Jogador joga a 1ª carta e aceita todo Truco;
// o relógio é falso, então roda rápido. DESDE=40 começa a procurar na semente 40.
//
// Uso: node scripts/achar-semente.js <alvo> [quantas]   (padrão: 5 sementes)
// Alvos:
//   onze-azul, onze-vermelha  a Partida chega à Mão de onze dessa Dupla (mostra o placar)
//   ferro                     a Partida chega à Mão de ferro
//   comeca-0                  a 1ª Mão começa pelo Lugar 0
'use strict';
const path = require('path');
const raiz = path.join(__dirname, '..');

// O mesmo relógio falso dos testes (t.mock.timers): as Partidas andam igual às de test/sala.test.js.
const { mock } = require('node:test');
const andar = (ms) => mock.timers.tick(ms);

const { Room } = require(path.join(raiz, 'room.js'));
const { conectarMesa, conectarCelular, sorteioFixo } = require(path.join(raiz, 'test/telas.js'));

const ALVOS = {
  'onze-azul': (m) => m.estado.phase === 'onze' && m.estado.onzeTeam === 0,
  'onze-vermelha': (m) => m.estado.phase === 'onze' && m.estado.onzeTeam === 1,
  ferro: (m) => m.estado.mode === 'ferro',
  'comeca-0': (m) => m.estado.handNo === 1 && m.estado.starter === 0,
};

const [alvo, quantas = '5'] = process.argv.slice(2);
if (!ALVOS[alvo]) {
  console.error(`Alvo desconhecido: ${alvo || '(nenhum)'}. Use: ${Object.keys(ALVOS).join(', ')}`);
  process.exit(1);
}

let achadas = 0;
for (let semente = Number(process.env.DESDE || 1); semente <= 2000 && achadas < Number(quantas); semente++) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['setTimeout'] });
  const sala = new Room({ rng: sorteioFixo(semente) });
  const mesa = conectarMesa(sala);
  const celulares = [conectarCelular(sala, 0), conectarCelular(sala, 1)];
  sala.action({ type: 'start', force: true });
  for (let passo = 0; passo < 20000 && mesa.estado.phase !== 'over'; passo++) {
    if (ALVOS[alvo](mesa)) {
      console.log(`semente ${semente}: placar ${mesa.estado.score.join(' a ')}, Mão ${mesa.estado.handNo}`);
      achadas++;
      break;
    }
    const c = celulares.find((x) => x.estado.canPlay || x.estado.mustRespond);
    if (!c) { andar(100); continue; }
    const seat = c.estado.me;
    sala.action(c.estado.mustRespond ? { type: 'respond', seat, ans: 'aceito' } : { type: 'play', seat, idx: 0 });
  }
}
if (!achadas) console.log('Nenhuma semente achada até 2000.');
