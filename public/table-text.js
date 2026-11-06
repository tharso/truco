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
    // Quem caiu (ADR 0002): a Partida espera ele voltar.
    const fallen = state.phase !== 'lobby' && state.phase !== 'over' ? [0, 1].filter((i) => !s[i].bot && !s[i].connected) : [];
    if (fallen.length) return `📵 ${fallen.map((i) => s[i].name).join(' e ')} ${fallen.length > 1 ? 'caíram' : 'caiu'}. Esperando voltar…`;
    if (state.phase === 'deal' && state.dealer >= 0) return `${s[state.dealer].name} está dando as cartas…`;
    if (state.phase === 'truco' && state.pending) return `${s[state.pending.responder].name}: aceita, corre ou aumenta?`;
    if (state.phase === 'onze') return `${s[voiceOf(state, state.onzeTeam)].name}: joga ou corre?`;
    return '';
  }

  const TABLE_TEXT = { manilhaText, seatOnTurn, statusText, voiceOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = TABLE_TEXT;
  else root.TABLE_TEXT = TABLE_TEXT;
})(typeof window !== 'undefined' ? window : globalThis);
