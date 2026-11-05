// Coisas usadas pelo servidor E pelas telas (mesa e celular).
(function (root) {
  const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
  const SUITS = ['ouros', 'espadas', 'copas', 'paus']; // ordem de força das manilhas
  const SUIT_SYMBOL = { ouros: '♦', espadas: '♠', copas: '♥', paus: '♣' };
  const RANK_NAME = {
    '4': 'quatro', '5': 'cinco', '6': 'seis', '7': 'sete', Q: 'dama',
    J: 'valete', K: 'rei', A: 'ás', '2': 'dois', '3': 'três',
  };
  const MANILHA_NAME = { ouros: 'pica-fumo', espadas: 'espadilha', copas: 'copão', paus: 'ZAP' };
  const LEVEL_NAME = { 3: 'TRUCO', 6: 'SEIS', 9: 'NOVE', 12: 'DOZE' };
  const TEAM_NAME = ['Dupla Azul', 'Dupla Vermelha'];

  const TAUNTS = [
    'Pede truco, frouxo!',
    'Corre que é tempo!',
    'Essa mão é minha!',
    'Tá tremendo, é?',
    'Vai chorar no colo da mamãe?',
    'Cai dentro, galinha!',
    'Eu tô só esquentando...',
    'Já pode ir buscando o feijão!',
  ];

  const SIGNALS = {
    zap: { label: 'Zap (manilha de paus)', how: 'Pisca um olho' },
    copas: { label: 'Copão (manilha de copas)', how: 'Levanta as sobrancelhas' },
    espadas: { label: 'Espadilha (manilha de espadas)', how: 'Boca torta pro lado' },
    ouros: { label: 'Pica-fumo (manilha de ouros)', how: 'Enche as bochechas' },
    tres: { label: 'Tem um três', how: 'Morde o lábio' },
    lixo: { label: 'Mão ruim', how: 'Olha pro céu' },
  };

  function cardName(c) {
    return `${RANK_NAME[c.r]} de ${c.s}`;
  }

  // HTML de uma carta. Funciona no navegador (o servidor não usa).
  function cardHTML(c, manilha, extra) {
    if (!c || c.hidden) return `<div class="card back ${extra || ''}"><div class="back-art">🃏</div></div>`;
    const red = c.s === 'ouros' || c.s === 'copas';
    const isMan = c.r === manilha;
    const label = isMan ? `<div class="man-tag">${MANILHA_NAME[c.s]}</div>` : '';
    return `<div class="card ${red ? 'red' : 'black'} ${isMan ? 'manilha' : ''} ${c.s === 'paus' && isMan ? 'zap' : ''} ${extra || ''}" data-id="${c.r}${c.s}">
      <span class="c-r">${c.r}</span><span class="c-s">${SUIT_SYMBOL[c.s]}</span>
      <span class="c-big">${SUIT_SYMBOL[c.s]}</span>
      <span class="c-r c-r2">${c.r}</span>${label}</div>`;
  }

  const SHARED = {
    RANKS, SUITS, SUIT_SYMBOL, RANK_NAME, MANILHA_NAME, LEVEL_NAME, TEAM_NAME,
    TAUNTS, SIGNALS, cardName, cardHTML,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SHARED;
  else root.SHARED = SHARED;
})(typeof window !== 'undefined' ? window : globalThis);
