// Tela do CELULAR: escolher personagens, as suas cartas e o botão de TRUCO.
(function () {
  const S = window.SHARED;
  const $ = (id) => document.getElementById(id);

  // A Sala vem do endereço (/s/KF4P/mao). Sem código, é a Sala única do notebook.
  const CODE = S.roomCode(location.pathname);
  const BASE = S.roomBase(CODE);
  // Cada Sala lembra o seu Lugar: o Celular pode ter jogado em outra Sala antes.
  const SEAT_KEY = CODE ? `truco-seat:${CODE}` : 'truco-seat';
  let seat = localStorage.getItem(SEAT_KEY);
  // A marca deste Celular (ADR 0002): o Lugar fica com o primeiro Celular que o pega.
  // getRandomValues funciona também no Wi-Fi de casa (http), onde randomUUID não existe.
  let marca = localStorage.getItem('truco-marca');
  if (!/^[\w-]{8,64}$/.test(marca || '')) {
    marca = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('truco-marca', marca);
  }
  seat = seat === null ? null : Number(seat);
  let state = null;
  let es = null;
  let selected = -1;
  let wasMyMove = false;
  let busy = false;
  // escolha de personagens
  let choosing = false;   // a tela de escolha está aberta
  let chStep = 'me';      // 'me' ou 'partner'
  let chMe = null;
  let chPartner = null;
  let chSkipped = false;  // a pessoa fechou a escolha sem escolher

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  async function post(a) {
    try {
      const r = await fetch(`${BASE}/api/action`, { method: 'POST', body: JSON.stringify(Object.assign({ seat, marca }, a)) });
      const j = await r.json();
      if (j.error) toast(j.error);
      return j;
    } catch {
      toast('Sem conexão com a mesa. Confira a internet.');
      return { error: 'rede' };
    }
  }

  // ---------- escolher lugar ----------
  function showPick() {
    choosing = false;
    chSkipped = false;
    $('choose').classList.add('hidden');
    $('pick').classList.remove('hidden');
    $('main').classList.add('hidden');
    $('name').value = localStorage.getItem('truco-name') || '';
  }
  document.querySelectorAll('.seat-btn').forEach((b) => {
    b.onclick = async () => {
      const i = Number(b.dataset.seat);
      const name = $('name').value.trim() || `Jogador ${i + 1}`;
      localStorage.setItem('truco-name', name);
      seat = i;
      const r = await post({ type: 'join', name });
      if (r.error) { seat = null; return; }
      localStorage.setItem(SEAT_KEY, String(i));
      connect();
    };
  });
  $('change-seat').onclick = (e) => {
    e.preventDefault();
    if (es) es.close();
    es = null;
    if (seat === 0 || seat === 1) post({ type: 'leave' });
    localStorage.removeItem(SEAT_KEY);
    seat = null;
    showPick();
  };

  // ---------- escolher personagens ----------
  const OWNED = [[0, 2], [1, 3]];
  function takenNow() {
    // Rostos do outro jogador, se ele já escolheu.
    if (!state) return new Set();
    const other = 1 - seat;
    if (!state.seats[other].picked) return new Set();
    return new Set(OWNED[other].map((i) => state.seats[i].avatar).filter(Boolean));
  }

  function openChoose() {
    choosing = true;
    chStep = 'me';
    const s = state && state.seats;
    chMe = s && s[seat].picked ? s[seat].avatar : null;
    chPartner = s && s[seat].picked ? s[seat + 2].avatar : null;
    $('partner-name').value = s && s[seat].picked ? s[seat + 2].name : '';
    setBars(state && state.partner && s[seat].picked ? state.partner : S.barsOf(chPartner));
    showScreen();
    renderChoose();
  }

  function closeChoose() {
    choosing = false;
    showScreen();
    render();
  }

  function showScreen() {
    $('pick').classList.add('hidden');
    $('choose').classList.toggle('hidden', !choosing);
    $('main').classList.toggle('hidden', choosing);
  }

  function renderChoose() {
    const taken = takenNow();
    const partnerStep = chStep === 'partner';
    $('ch-title').textContent = partnerStep ? 'QUEM JOGA COM VOCÊ?' : 'QUEM É VOCÊ?';
    $('ch-hint').textContent = partnerStep ? 'Escolha o seu parceiro. Ele joga na tela.' : 'Escolha o seu personagem.';
    $('ch-name').classList.toggle('hidden', !partnerStep || !chPartner);
    $('ch-bars').classList.toggle('hidden', !partnerStep || !chPartner);
    $('ch-back').textContent = partnerStep ? 'Voltar' : 'Depois';
    $('ch-ok').textContent = partnerStep ? 'PRONTO!' : 'PRÓXIMO';
    $('ch-ok').disabled = partnerStep ? !chPartner : !chMe;
    $('ch-grid').innerHTML = S.AVATARS.map((a) => {
      const off = taken.has(a.id) || (partnerStep && a.id === chMe);
      const sel = partnerStep ? a.id === chPartner : a.id === chMe;
      const meMark = partnerStep && a.id === chMe ? ' me' : '';
      return `<button class="av${sel ? ' sel' : ''}${meMark}" data-id="${a.id}" ${off ? 'disabled' : ''}>
        <img src="/avatars/${a.id}/neutro.jpg" alt=""><span>${partnerStep && a.id === chMe ? 'Você' : a.name}</span></button>`;
    }).join('');
  }

  // Barras de blefe e de coragem do parceiro (0 a 10).
  function setBars(b) {
    $('bluff').value = b.bluff;
    $('nerve').value = b.nerve;
    showBars();
  }
  function showBars() {
    $('bluff-val').textContent = $('bluff').value;
    $('nerve-val').textContent = $('nerve').value;
  }
  $('bluff').oninput = showBars;
  $('nerve').oninput = showBars;

  $('ch-grid').onclick = (e) => {
    const b = e.target.closest('.av');
    if (!b || b.disabled) return;
    const id = b.dataset.id;
    if (chStep === 'me') {
      chMe = id;
      if (chPartner === id) chPartner = null;
    } else {
      const old = chPartner;
      chPartner = id;
      const nameEl = $('partner-name');
      const oldName = (S.AVATARS.find((a) => a.id === old) || {}).name;
      if (!nameEl.value || nameEl.value === oldName) nameEl.value = S.AVATARS.find((a) => a.id === id).name;
      // Barras do parceiro novo: as do Personagem, até você mudar.
      if (old !== id) setBars(S.barsOf(id));
    }
    renderChoose();
  };
  $('ch-back').onclick = () => {
    if (chStep === 'partner') { chStep = 'me'; renderChoose(); return; }
    chSkipped = true;
    closeChoose();
  };
  $('ch-ok').onclick = async () => {
    if (chStep === 'me') { if (chMe) { chStep = 'partner'; renderChoose(); } return; }
    const r = await post({
      type: 'pick', avatar: chMe, partner: chPartner, partnerName: $('partner-name').value.trim(),
      bluff: Number($('bluff').value), nerve: Number($('nerve').value),
    });
    if (r && r.ok) closeChoose();
    else renderChoose();
  };

  function connect() {
    $('pick').classList.add('hidden');
    showScreen();
    if (es) es.close();
    es = new EventSource(`${BASE}/events?role=seat&seat=${seat}&marca=${marca}`);
    es.onopen = () => post({ type: 'join', name: localStorage.getItem('truco-name') || '' });
    es.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === 'taken') {
        // Outro Celular pegou este Lugar antes.
        es.close();
        es = null;
        localStorage.removeItem(SEAT_KEY);
        seat = null;
        showPick();
        toast('Esse Lugar já tem outro Celular. Escolha outro.');
        return;
      }
      if (m.type !== 'state') return;
      state = m.state;
      const s = state.seats[state.me];
      const canChoose = (state.phase === 'lobby' || state.phase === 'over') && !s.bot;
      if (!choosing && canChoose && !s.picked && !chSkipped) openChoose();
      else if (choosing && !canChoose) closeChoose();
      if (choosing) renderChoose();
      else render();
    };
    es.onerror = () => { $('status').textContent = 'Reconectando…'; };
  }

  // ---------- render ----------
  function render() {
    const st = state;
    const me = st.me;
    const myTeam = me % 2;
    const sc = st.score;
    $('score').innerHTML = `<span class="t0c">AZUL ${sc[0]}</span> × <span class="t1c">${sc[1]} VERMELHA</span>`;
    $('team-line').textContent = `Você: ${st.seats[me].name} · ${S.TEAM_NAME[myTeam]} com ${st.seats[me + 2].name}`;
    $('me-line').textContent = `Jogador ${me + 1}`;

    // vira e valor
    $('vira-mini').innerHTML = st.vira && st.phase !== 'deal' ? S.cardHTML(st.vira) : '';
    $('man-mini').innerHTML = st.manilha && st.phase !== 'deal' ? `Manilha: <b>${st.manilha}</b>` : '';
    const vm = $('value-mini');
    const playing = !['lobby', 'over'].includes(st.phase);
    vm.style.display = playing ? '' : 'none';
    vm.textContent = st.mode === 'ferro' ? 'MÃO DE FERRO' : `Vale ${st.value}`;
    vm.classList.toggle('hot', st.value > 1 || st.mode !== 'normal');

    // status
    const myMove = st.canPlay || st.mustRespond || st.mustOpine || st.mustOnze;
    const stEl = $('status');
    stEl.classList.toggle('myturn', !!st.canPlay);
    stEl.textContent = statusText(st);
    if (myMove && !wasMyMove && navigator.vibrate) navigator.vibrate([120, 60, 120]);
    wasMyMove = myMove;

    // mão
    if (!st.canPlay) selected = -1;
    const hand = $('hand');
    hand.classList.toggle('wait', !st.canPlay);
    // Cada carta tem o botão 😉: o seu Personagem faz o Sinal dela na TV (uma vez por carta).
    const canSig = st.canSignal || [];
    hand.innerHTML = (st.hand || []).map((c, i) => `<div class="slot">${S.cardHTML(c, st.manilha, i === selected ? 'sel' : '')}`
      + `<button class="sig-btn${canSig[i] ? '' : ' off'}" data-sig="${i}" aria-label="Fazer sinal desta carta">😉</button></div>`).join('');
    [...hand.children].forEach((el, i) => {
      el.querySelector('.card').onclick = () => tapCard(i);
      el.querySelector('.sig-btn').onclick = () => signalCard(i);
    });

    // jogar fechada (a partir da 2ª Rodada, com uma carta escolhida)
    $('closed-btn').classList.toggle('hidden', !(st.canPlayClosed && selected >= 0));

    // truco
    const tb = $('truco-btn');
    tb.style.display = playing && st.mode === 'normal' ? '' : 'none';
    tb.disabled = !st.canTruco || busy;
    tb.textContent = st.nextLevel ? `${S.LEVEL_NAME[st.nextLevel]}!` : 'TRUCO!';

    // responder truco
    $('respond').classList.toggle('hidden', !st.mustRespond);
    if (st.mustRespond) {
      const p = st.pending;
      $('resp-title').textContent = `${st.seats[p.bySeat].name} pediu ${S.LEVEL_NAME[p.level]}!`;
      const raise = $('btn-raise');
      raise.style.display = p.level < 12 ? '' : 'none';
      raise.textContent = p.level < 12 ? `${S.LEVEL_NAME[p.level + 3]}!` : '';
    }

    // Opinião: quem responde é o parceiro Robô; você diz o que acha, e o seu Personagem faz a cara na TV.
    $('opine').classList.toggle('hidden', !st.mustOpine);
    if (st.mustOpine) {
      const p = st.pending;
      $('opine-title').textContent = `${st.seats[p.bySeat].name} pediu ${S.LEVEL_NAME[p.level]}!`;
      $('opine-hint').textContent = `Quem responde é ${st.seats[p.responder].name}. O que você acha?`;
    }

    // mão de onze
    $('onze').classList.toggle('hidden', !st.mustOnze);
    if (st.mustOnze) {
      $('onze-cards').innerHTML = st.hand.map((c) => S.cardHTML(c, st.manilha)).join('')
        + '<div class="sep"></div>' + (st.partnerHand || []).map((c) => S.cardHTML(c, st.manilha)).join('');
    }

    // começar / de novo
    const gb = $('game-btns');
    const swap = st.seats[me].bot ? '' : '<button class="alt" data-act="choose">🎭 Trocar personagens</button>';
    if (st.phase === 'lobby') gb.innerHTML = '<button class="shout" data-act="start">COMEÇAR!</button>' + swap;
    else if (st.phase === 'over') gb.innerHTML = '<button class="shout" data-act="start">JOGAR DE NOVO!</button>' + swap;
    else gb.innerHTML = '';
  }

  function statusText(st) {
    const s = st.seats;
    const me = st.me;
    if (s[me].bot) return `${s[me].name} está jogando no seu lugar. Desmarque na TV.`;
    switch (st.phase) {
      case 'lobby': return 'Esperando começar…';
      case 'deal': return st.dealer >= 0 ? `${s[st.dealer].name} está dando as cartas…` : 'Dando as cartas…';
      case 'onze': return st.mustOnze ? 'Decida a mão de onze!' : 'Mão de onze: esperando os outros…';
      case 'truco':
        if (st.mustRespond) return 'E aí? Vai encarar?';
        if (st.mustOpine) return 'Dê a sua opinião!';
        return `${s[st.pending.responder].name} está pensando…`;
      case 'play':
        if (st.canPlay) {
          if (selected < 0) return 'SUA VEZ! Escolha uma carta';
          return st.canPlayClosed ? 'Toque de novo, ou jogue fechada' : 'Toque de novo pra jogar!';
        }
        return `Vez de ${s[st.turn].name}…`;
      case 'roundEnd': {
        const r = st.lastRound;
        if (!r) return '';
        if (r.result === 'tie') return 'Cangou! Empate!';
        return r.result === me % 2 ? 'Rodada sua! 💪' : 'Perdeu a rodada…';
      }
      case 'handEnd': {
        const h = st.lastHand;
        if (!h || h.winner === null) return 'Ninguém marcou.';
        return h.winner === me % 2 ? `+${h.points} pra vocês! 🎉` : `+${h.points} pra eles… 😬`;
      }
      case 'over': return st.winner === me % 2 ? '🏆 VOCÊS VENCERAM!' : '😭 Perderam! Paga a rodada!';
      default: return '';
    }
  }

  async function tapCard(i) {
    if (!state || !state.canPlay || busy) return;
    if (selected !== i) { selected = i; render(); return; }
    busy = true;
    selected = -1;
    await post({ type: 'play', idx: i });
    busy = false;
  }

  async function signalCard(i) {
    if (!state || !(state.canSignal || [])[i]) return;
    const r = await post({ type: 'sinal', idx: i });
    if (r && r.ok) toast('😉 Seu Personagem fez o sinal na TV!');
  }

  $('closed-btn').onclick = async () => {
    if (!state || !state.canPlayClosed || selected < 0 || busy) return;
    const i = selected;
    busy = true;
    selected = -1;
    await post({ type: 'play', idx: i, fechada: true });
    busy = false;
  };

  $('truco-btn').onclick = async () => {
    if (busy) return;
    busy = true;
    if (navigator.vibrate) navigator.vibrate(300);
    await post({ type: 'truco' });
    busy = false;
  };
  document.querySelectorAll('[data-ans]').forEach((b) => { b.onclick = () => post({ type: 'respond', ans: b.dataset.ans }); });
  document.querySelectorAll('[data-opine]').forEach((b) => { b.onclick = () => post({ type: 'opiniao', ans: b.dataset.opine }); });
  document.querySelectorAll('[data-onze]').forEach((b) => { b.onclick = () => post({ type: 'onze', ans: b.dataset.onze }); });
  $('game-btns').onclick = (e) => {
    if (e.target.dataset.act === 'start') post({ type: 'start' });
    if (e.target.dataset.act === 'choose') openChoose();
  };

  // cola de sinais
  $('sig-list').innerHTML = Object.values(S.SIGNALS).map((s) => `<div class="sig"><span>${s.label}</span><b>${s.how}</b></div>`).join('');

  // ---------- Código da Sala (só na internet) ----------
  function showRoom() {
    $('room').classList.remove('hidden');
    $('room-code').focus();
  }
  $('room').onsubmit = (e) => {
    e.preventDefault();
    const c = S.cleanRoomCode($('room-code').value);
    if (!c) return toast('O código tem 4 letras. Confira na Mesa.');
    location.href = `/s/${c}/mao`;
  };

  // início
  function start() {
    if (seat === 0 || seat === 1) connect();
    else showPick();
  }
  if (CODE) start();
  else {
    fetch('/api/info').then((r) => r.json()).then((info) => (info.online ? showRoom() : start())).catch(start);
  }
})();
