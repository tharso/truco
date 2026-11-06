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

  // Onde ficam os naipes nas cartas de número (x, y em % da área do meio). y > 50 fica de cabeça para baixo.
  const PIPS = {
    '2': [[50, 12], [50, 88]],
    '3': [[50, 12], [50, 50], [50, 88]],
    '4': [[27, 12], [73, 12], [27, 88], [73, 88]],
    '5': [[27, 12], [73, 12], [50, 50], [27, 88], [73, 88]],
    '6': [[27, 12], [73, 12], [27, 50], [73, 50], [27, 88], [73, 88]],
    '7': [[27, 12], [73, 12], [50, 31], [27, 50], [73, 50], [27, 88], [73, 88]],
  };
  const FACE = { Q: true, J: true, K: true };

  // HTML de uma carta. Funciona no navegador (o servidor não usa).
  function cardHTML(c, manilha, extra) {
    if (!c || c.hidden) return `<div class="card back ${extra || ''}"><div class="back-art">🃏</div></div>`;
    const red = c.s === 'ouros' || c.s === 'copas';
    const isMan = c.r === manilha;
    const sym = SUIT_SYMBOL[c.s];
    const label = isMan ? `<div class="man-tag">${MANILHA_NAME[c.s]}</div>` : '';
    let mid;
    if (FACE[c.r]) {
      const src = `/cards/${c.r}-${c.s}.jpg`;
      mid = `<div class="c-face"><img src="${src}" alt=""><img class="flip" src="${src}" alt=""></div>`;
    } else if (PIPS[c.r]) {
      mid = `<div class="c-pips">${PIPS[c.r].map(([x, y]) => `<span style="left:${x}%;top:${y}%"${y > 50 ? ' class="flip"' : ''}>${sym}</span>`).join('')}</div>`;
    } else {
      mid = `<span class="c-big">${sym}</span>`;
    }
    return `<div class="card ${red ? 'red' : 'black'} ${isMan ? 'manilha' : ''} ${c.s === 'paus' && isMan ? 'zap' : ''} ${extra || ''}" data-id="${c.r}${c.s}">
      <span class="c-idx"><b>${c.r}</b>${sym}</span>${mid}<span class="c-idx c-idx2"><b>${c.r}</b>${sym}</span>${label}</div>`;
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

  const SHARED = {
    AVATARS, RANKS, SUITS, SUIT_SYMBOL, RANK_NAME, MANILHA_NAME, LEVEL_NAME, TEAM_NAME,
    SIGNALS, cardName, cardHTML, barsOf,
    newRoomCode, cleanRoomCode, roomCode, roomBase,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SHARED;
  else root.SHARED = SHARED;
})(typeof window !== 'undefined' ? window : globalThis);
