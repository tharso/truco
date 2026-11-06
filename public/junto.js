// PROTÓTIPO (#12): a Mesa pequena dentro da tela do Celular (junto.html).
// O Celular é o hand.js de sempre. Este arquivo só abre a conexão da Mesa e desenha a Mesa pequena:
// os quatro Personagens, a Vira, as cartas jogadas, quem está na vez e os Sinais.
(function () {
  const S = window.SHARED;
  const box = document.getElementById('mesa-mini');
  const CODE = S.roomCode(location.pathname);
  const BASE = S.roomBase(CODE);
  const SEAT_KEY = CODE ? `truco-seat:${CODE}` : 'truco-seat';
  const SIGNAL_MS = 2500;
  const OPINION_MS = 6000;
  // Onde cada Lugar aparece: você embaixo, o parceiro em cima.
  const POS = ['bottom', 'left', 'top', 'right'];
  const me = () => (localStorage.getItem(SEAT_KEY) === '1' ? 1 : 0);
  const posOf = (seat) => POS[(seat - me() + 4) % 4];

  let state = null;

  box.innerHTML = `<div class="mm-felt"><div class="mm-vira"></div><div class="mm-value shout"></div></div>`
    + [0, 1, 2, 3].map((i) => `<div class="mm-seat t${i % 2}" data-seat="${i}">
        <div class="avatar"></div><div class="mm-name"></div><div class="mm-bubble"></div><div class="mm-played"></div></div>`).join('');
  const seatEl = (i) => box.querySelector(`.mm-seat[data-seat="${i}"]`);

  function onTurn(i) {
    const st = state;
    return (st.phase === 'play' && st.turn === i)
      || (st.phase === 'truco' && st.pending && st.pending.responder === i);
  }

  function render() {
    if (!state) return;
    const st = state;
    const playing = !['lobby', 'over'].includes(st.phase);
    box.classList.toggle('hidden', !playing);
    if (!playing) return;
    for (let i = 0; i < 4; i++) {
      const s = st.seats[i];
      const el = seatEl(i);
      el.className = `mm-seat t${i % 2} pos-${posOf(i)}${onTurn(i) ? ' active' : ''}${!s.bot && !s.connected ? ' off' : ''}`;
      const av = el.querySelector('.avatar');
      if (av.dataset.av !== String(s.avatar)) { av.dataset.av = String(s.avatar); av.innerHTML = FACES.avatar(s.avatar); }
      el.querySelector('.mm-name').textContent = s.name;
      const p = (st.table || []).find((x) => x.seat === i);
      const html = !p ? '' : p.closed ? S.cardHTML({ hidden: true }) : S.cardHTML(p.card, st.manilha);
      const played = el.querySelector('.mm-played');
      if (played.innerHTML !== html) played.innerHTML = html;
    }
    box.querySelector('.mm-vira').innerHTML = st.vira && st.phase !== 'deal' ? S.cardHTML(st.vira) : '';
    box.querySelector('.mm-value').textContent = st.mode === 'ferro' ? 'FERRO' : `Vale ${st.value}`;
  }

  function bubble(i, text, ms = 1800) {
    const b = seatEl(i).querySelector('.mm-bubble');
    b.textContent = text;
    b.classList.add('show');
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove('show'), ms);
  }

  function handleEvent(ev) {
    const s = state.seats;
    switch (ev.t) {
      case 'truco': bubble(ev.seat, `${S.LEVEL_NAME[ev.level]}!`); break;
      case 'aceito': bubble(ev.seat, 'Aceito!'); break;
      case 'corro': bubble(ev.seat, 'Corro! 🐔'); break;
      case 'opiniao': {
        const face = () => FACES.mood(seatEl(ev.seat), ev.ans === 'aceita' ? 'happy' : 'sad', OPINION_MS);
        if (s[ev.seat].bot) setTimeout(face, 1000); else face();
        break;
      }
      case 'signal': {
        const hand = state.handNo;
        setTimeout(() => {
          if (state.handNo !== hand) return;
          const av = seatEl(ev.seat).querySelector('.avatar');
          FACES.signal(av, ev.sig, SIGNAL_MS);
          av.classList.remove('signing');
          void av.offsetWidth; // recomeça a animação
          av.classList.add('signing');
          clearTimeout(av._signing);
          av._signing = setTimeout(() => av.classList.remove('signing'), SIGNAL_MS);
        }, ev.delay || 0);
        break;
      }
      default: break;
    }
  }

  const es = new EventSource(`${BASE}/events?role=table`);
  es.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type !== 'state') return;
    state = m.state;
    render();
    m.events.forEach(handleEvent);
  };
  // O Celular pode trocar de Lugar: redesenha as posições.
  window.addEventListener('storage', render);
  document.addEventListener('click', () => setTimeout(render, 300));
})();
