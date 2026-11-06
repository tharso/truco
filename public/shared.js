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


  const SIGNALS = {
    zap: { label: 'Zap (manilha de paus)', how: 'Pisca um olho' },
    copas: { label: 'Copão (manilha de copas)', how: 'Levanta as sobrancelhas' },
    espadas: { label: 'Espadilha (manilha de espadas)', how: 'Olha de lado' },
    ouros: { label: 'Pica-fumo (manilha de ouros)', how: 'Enche as bochechas' },
    tres: { label: 'Tem um três', how: 'Aperta os olhos' },
    lixo: { label: 'Mão ruim', how: 'Olha pro céu' },
  };

  function cardName(c) {
    return `${RANK_NAME[c.r]} de ${c.s}`;
  }

  // Naipes desenhados em SVG (caixa 100 × 100). Vieram do protótipo do baralho (#15).
  const SUIT_PATH = {
    copas: 'M50 92C22 70 4 52 4 31 4 15 16 5 29 5c10 0 17 6 21 14C54 11 61 5 71 5c13 0 25 10 25 26 0 21-18 39-46 61z',
    ouros: 'M50 3C61 20 74 36 90 50 74 64 61 80 50 97 39 80 26 64 10 50 26 36 39 20 50 3z',
    espadas: 'M50 3C70 24 95 40 95 61c0 13-10 22-22 22-9 0-16-5-19-11 1 11 5 18 13 24H33c8-6 12-13 13-24-3 6-10 11-19 11-12 0-22-9-22-22C5 40 30 24 50 3z',
    paus: 'M50 5a21 21 0 0 1 17 33 21 21 0 1 1-2 39c-5 0-9-2-12-5 1 10 5 18 13 24H34c8-6 12-14 13-24-3 3-7 5-12 5a21 21 0 1 1-2-39A21 21 0 0 1 50 5z',
  };
  const FACE = { Q: true, J: true, K: true };
  const suitSVG = (s, cls) => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="${SUIT_PATH[s]}"/></svg>`;

  // HTML de uma carta. Funciona no navegador (o servidor não usa).
  // Número: número grande em cima à esquerda, naipe grande embaixo à direita.
  // Figura (Q, J, K): letra e naipe pequeno em cima, cabeça colorida embaixo.
  // Nenhuma carta diz que é Manilha: perceber faz parte do jogo. Só a Mesa diz qual é, ao lado da Vira.
  // (O 2º parâmetro fica para não mexer em quem chama.)
  function cardHTML(c, _manilha, extra) {
    if (!c || c.hidden) return `<div class="card back ${extra || ''}"><div class="back-art"></div></div>`;
    const red = c.s === 'ouros' || c.s === 'copas';
    const body = FACE[c.r]
      ? `<span class="c-num c-letter">${c.r}</span>${suitSVG(c.s, 'c-suit-s')}<span class="c-head${c.r === 'Q' ? ' c-queen' : ''}"><img src="/cards/cabeca-${c.r}-${c.s}.jpg" alt=""></span>`
      : `<span class="c-num">${c.r}</span>${suitSVG(c.s, 'c-suit-l')}`;
    return `<div class="card ${red ? 'red' : 'black'} ${extra || ''}" data-id="${c.r}${c.s}" role="img" aria-label="${cardName(c)}">${body}</div>`;
  }

  // Personagens com foto (public/avatars/<id>/). name = nome padrão quando joga como parceiro.
  // bluff e nerve = barras de blefe e de coragem (0 a 10) quando ele joga como Robô. O Jogador pode mudar.
  const AVATARS = [
    { id: 'tonhao', name: 'Tonhão', bluff: 7, nerve: 7 }, { id: 'cida', name: 'Cida', bluff: 2, nerve: 3 },
    { id: 'neide', name: 'Dona Neide', bluff: 4, nerve: 6 }, { id: 'juninho', name: 'Juninho', bluff: 6, nerve: 4 },
    { id: 'blurp', name: 'Blurp', bluff: 5, nerve: 5 }, { id: 'beto', name: 'Beto', bluff: 3, nerve: 7 },
    { id: 'roque', name: 'Roque', bluff: 8, nerve: 5 }, { id: 'nina', name: 'Nina', bluff: 5, nerve: 8 },
  ];
  // Barras padrão do Personagem.
  function barsOf(id) {
    const a = AVATARS.find((x) => x.id === id) || { bluff: 5, nerve: 5 };
    return { bluff: a.bluff, nerve: a.nerve };
  }

  // Código da Sala (ADR 0002): 4 letras, sem as que se confundem (O e 0, I, 1 e L).
  const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const CODE_RE = new RegExp(`^[${CODE_LETTERS}]{4}$`);
  function newRoomCode(rand = Math.random) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_LETTERS[Math.floor(rand() * CODE_LETTERS.length)];
    return c;
  }
  function cleanRoomCode(text) {
    const c = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return CODE_RE.test(c) ? c : null;
  }
  // '/s/KF4P', '/s/kf4p/mao' → 'KF4P'. Outro endereço → null.
  function roomCode(pathname) {
    const m = /^\/s\/([^/]+)(\/|$)/.exec(pathname || '');
    if (!m) return null;
    const c = m[1].toUpperCase();
    return CODE_RE.test(c) ? c : null;
  }
  // Onde as telas falam com a Sala. Sem código (notebook), é a Sala única de sempre.
  function roomBase(code) {
    return code ? `/s/${code}` : '';
  }

  // Mão decidida: quanto tempo (ms) a Mesa pausa com a carta que decidiu, antes do fim de Mão.
  const DECIDED_PAUSE = 1500;

  const SHARED = {
    DECIDED_PAUSE, AVATARS, RANKS, SUITS, SUIT_SYMBOL, RANK_NAME, MANILHA_NAME, LEVEL_NAME, TEAM_NAME,
    SIGNALS, cardName, cardHTML, barsOf,
    newRoomCode, cleanRoomCode, roomCode, roomBase,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SHARED;
  else root.SHARED = SHARED;
})(typeof window !== 'undefined' ? window : globalThis);
