// Textos e a vez na Mesa: o rótulo da Manilha, quem está na vez e a linha de estado.
// Arquivo puro, usado pela Mesa (table.js) e testado no Node (test/navegador/).
(function (root) {
  // Figuras e ás por extenso; número fica número.
  const FIGURE = { Q: 'Dama', J: 'Valete', K: 'Rei', A: 'Ás' };

  function manilhaText(rank) {
    return `Manilha: ${FIGURE[rank] || rank}`;
  }

  // Quem decide a Mão de onze pela Dupla: o Jogador, se houver; senão o Lugar da Dupla.
  function voiceOf(state, team) {
    if (!state.seats[team].bot) return team;
    if (!state.seats[team + 2].bot) return team + 2;
    return team;
  }

  // Na vez: quem joga, quem responde ao Truco ou quem decide a Mão de onze. -1: ninguém.
  function seatOnTurn(state) {
    if (state.phase === 'play' && state.turn >= 0) return state.turn;
    if (state.phase === 'truco' && state.pending) return state.pending.responder;
    if (state.phase === 'onze') return voiceOf(state, state.onzeTeam);
    return -1;
  }

  // A linha de estado. A vez de jogar não aparece aqui: aparece no Pensando, ao lado do rosto.
  function statusText(state) {
    const s = state.seats;
    // Quem caiu (ADR 0002) não aparece aqui: aparece no Personagem dele (fellSeat).
    if (state.phase === 'deal' && state.dealer >= 0) return `${s[state.dealer].name} está dando as cartas…`;
    if (state.phase === 'truco' && state.pending) return `${s[state.pending.responder].name}: aceita, corre ou aumenta?`;
    if (state.phase === 'onze') return `${s[voiceOf(state, state.onzeTeam)].name}: joga ou corre?`;
    return '';
  }

  // Cair: um Jogador sem Celular na Sala, no meio da Partida. A Mesa apaga o Personagem dele.
  function fellSeat(state, i) {
    const s = state.seats[i];
    return state.phase !== 'lobby' && state.phase !== 'over' && !!s && !s.bot && !s.connected;
  }

  // Marcas da Rodada de um Lugar: as Rodadas desta Mão que ele ganhou ('win') ou empatou ('tie').
  function roundMarksOf(state, i) {
    return (state.roundMarks || []).filter((m) => m.seats.includes(i)).map((m) => ({ n: m.n, kind: m.result === 'tie' ? 'tie' : 'win' }));
  }

  // Festa do zap: só quando o zap ganhou a Rodada que deu a Mão (fim de Mão 'jogo').
  // Zap no meio da Mão não faz festa: perceber a Manilha faz parte do jogo.
  function zapDecidiu(rodada, fimDaMao, manilha) {
    const c = rodada && rodada.card;
    return !!(c && fimDaMao && fimDaMao.reason === 'jogo' && c.r === manilha && c.s === 'paus' && rodada.result === fimDaMao.winner);
  }

  // Vozes gravadas (issue #25): cada Personagem fala com a própria voz, em public/audio/<id>/<fala>.m4a.
  // O Juninho ainda não gravou. Gravações novas: scripts/cortar-vozes.sh.
  const VOZES = ['tonhao', 'cida', 'neide', 'blurp', 'beto', 'roque', 'nina'];
  const FALAS = ['truco', 'seis', 'nove', 'doze', 'mostra', 'fora'];
  // Qual áudio toca quando o Personagem fala. Sem voz própria: o pedido de truco
  // usa a voz antiga (public/audio/<fala>.m4a); Mostra e Tô fora ficam mudos (null).
  function falaDe(avatar, fala) {
    if (VOZES.includes(avatar)) return `${avatar}/${fala}`;
    return fala === 'mostra' || fala === 'fora' ? null : fala;
  }

  const TABLE_TEXT = { manilhaText, seatOnTurn, statusText, voiceOf, fellSeat, roundMarksOf, zapDecidiu, VOZES, FALAS, falaDe };
  if (typeof module !== 'undefined' && module.exports) module.exports = TABLE_TEXT;
  else root.TABLE_TEXT = TABLE_TEXT;
})(typeof window !== 'undefined' ? window : globalThis);
