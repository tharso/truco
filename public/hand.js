// Tela do CELULAR: só as suas cartas, o botão de TRUCO e as provocações.
(function () {
  const S = window.SHARED;
  const $ = (id) => document.getElementById(id);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  let seat = localStorage.getItem('truco-seat');
  seat = seat === null ? null : Number(seat);
  let state = null;
  let es = null;
  let selected = -1;
  let wasMyMove = false;
  let whisperKey = '';
  let whisperText = '';
  let busy = false;

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  async function post(a) {
    try {
      const r = await fetch('/api/action', { method: 'POST', body: JSON.stringify(Object.assign({ seat }, a)) });
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
    $('pick').classList.remove('hidden');
    $('main').classList.add('hidden');
    $('name').value = localStorage.getItem('truco-name') || '';
  }
  document.querySelectorAll('.seat-btn').forEach((b) => {
    b.onclick = async () => {
      const i = Number(b.dataset.seat);
      const name = $('name').value.trim() || `Jogador ${i + 1}`;
      localStorage.setItem('truco-name', name);
      localStorage.setItem('truco-seat', String(i));
      seat = i;
      await post({ type: 'join', name });
      connect();
    };
  });
  $('change-seat').onclick = (e) => {
    e.preventDefault();
    if (es) es.close();
    es = null;
    localStorage.removeItem('truco-seat');
    seat = null;
    showPick();
  };

  function connect() {
    $('pick').classList.add('hidden');
    $('main').classList.remove('hidden');
    if (es) es.close();
    es = new EventSource(`/events?role=seat&seat=${seat}`);
    es.onopen = () => post({ type: 'join', name: localStorage.getItem('truco-name') || '' });
    es.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type !== 'state') return;
      state = m.state;
      render();
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
    const myMove = st.canPlay || st.mustRespond || st.mustOnze;
    const stEl = $('status');
    stEl.classList.toggle('myturn', !!st.canPlay);
    stEl.textContent = statusText(st);
    if (myMove && !wasMyMove && navigator.vibrate) navigator.vibrate([120, 60, 120]);
    wasMyMove = myMove;

    // mão
    if (!st.canPlay) selected = -1;
    const hand = $('hand');
    hand.classList.toggle('wait', !st.canPlay);
    hand.innerHTML = (st.hand || []).map((c, i) => S.cardHTML(c, st.manilha, i === selected ? 'sel' : '')).join('');
    [...hand.children].forEach((el, i) => { el.onclick = () => tapCard(i); });

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
      const key = `${st.handNo}-${p.level}`;
      if (key !== whisperKey) {
        whisperKey = key;
        whisperText = st.advice && st.advice.to === me
          ? `🤫 ${st.seats[st.advice.seat].name} cochicha: “${pick(window.WHISPER[st.advice.mood])}”` : '';
      }
      $('whisper').textContent = whisperText;
      const raise = $('btn-raise');
      raise.style.display = p.level < 12 ? '' : 'none';
      raise.textContent = p.level < 12 ? `${S.LEVEL_NAME[p.level + 3]}!` : '';
    }

    // mão de onze
    $('onze').classList.toggle('hidden', !st.mustOnze);
    if (st.mustOnze) {
      $('onze-cards').innerHTML = st.hand.map((c) => S.cardHTML(c, st.manilha)).join('')
        + '<div class="sep"></div>' + (st.partnerHand || []).map((c) => S.cardHTML(c, st.manilha)).join('');
    }

    // começar / de novo
    const gb = $('game-btns');
    if (st.phase === 'lobby') gb.innerHTML = '<button class="shout" data-act="start">COMEÇAR!</button>';
    else if (st.phase === 'over') gb.innerHTML = '<button class="shout" data-act="start">JOGAR DE NOVO!</button>';
    else gb.innerHTML = '';
  }

  function statusText(st) {
    const s = st.seats;
    const me = st.me;
    if (s[me].bot) return 'A TV pôs um robô no seu lugar. Desmarque lá.';
    switch (st.phase) {
      case 'lobby': return 'Esperando começar…';
      case 'deal': return 'Seu Zé está dando as cartas…';
      case 'onze': return st.mustOnze ? 'Decida a mão de onze!' : 'Mão de onze: esperando os outros…';
      case 'truco': return st.mustRespond ? 'E aí? Vai encarar?' : `Esperando resposta…`;
      case 'play':
        if (st.canPlay) return selected >= 0 ? 'Toque de novo pra jogar!' : 'SUA VEZ! Escolha uma carta';
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

  $('truco-btn').onclick = async () => {
    if (busy) return;
    busy = true;
    if (navigator.vibrate) navigator.vibrate(300);
    await post({ type: 'truco' });
    busy = false;
  };
  document.querySelectorAll('[data-ans]').forEach((b) => { b.onclick = () => post({ type: 'respond', ans: b.dataset.ans }); });
  document.querySelectorAll('[data-onze]').forEach((b) => { b.onclick = () => post({ type: 'onze', ans: b.dataset.onze }); });
  $('game-btns').onclick = (e) => {
    if (e.target.dataset.act === 'start') post({ type: 'start' });
  };

  // cola de sinais
  $('sig-list').innerHTML = Object.values(S.SIGNALS).map((s) => `<div class="sig"><span>${s.label}</span><b>${s.how}</b></div>`).join('');

  // início
  if (seat === 0 || seat === 1) connect();
  else showPick();
})();
