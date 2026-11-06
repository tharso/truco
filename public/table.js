// Tela da MESA (TV/notebook): mostra tudo. A voz fala só o básico: manilha, truco, mão de onze/ferro.
(function () {
  const S = window.SHARED;
  const $ = (id) => document.getElementById(id);
  const POS = ['bottom', 'left', 'top', 'right'];
  const HUMAN_EMOJI = ['🤠', '😎'];
  const TEAM_COLOR = ['#2f7bff', '#ff3b3b'];
  const LEVEL_CLIP = { 3: 'truco', 6: 'seis', 9: 'nove', 12: 'doze' };
  const NUDGE_MS = 20000;
  // A Sala vem do endereço (/s/KF4P/mesa). Sem código, é a Sala única do notebook.
  const BASE = S.roomBase(S.roomCode(location.pathname));

  let state = null;
  let dealingUntil = 0;
  let viraAt = 0;
  let viraShownFor = '';
  const built = [null, null, null, null];
  let lastScore = [0, 0];
  let nudgeTimer = null;
  let nudgeKey = '';
  let record = 0;

  const seatEl = (i) => $('seat' + i);
  // Quanto tempo a cara do Sinal fica na tela (ms).
  const SIGNAL_MS = 2500;
  const OPINION_FACE_MS = 9000;
  const teamName = (t) => S.TEAM_NAME[t];
  const avatarOf = (i) => state.seats[i].avatar || 'robo';
  const voiceOf = (team) => {
    if (!state.seats[team].bot) return team;
    if (!state.seats[team + 2].bot) return team + 2;
    return team;
  };

  function post(a) {
    return fetch(`${BASE}/api/action`, { method: 'POST', body: JSON.stringify(a) }).then((r) => r.json()).catch(() => ({ error: 'Sem conexão com o servidor.' }));
  }

  // ---------- falas ----------
  function bubble(el, text, ms) {
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), ms || 2200);
  }

  // Toca uma fala gravada. Se for um robô falando, a boca dele mexe.
  function speak(key, opts = {}) {
    const el = opts.seat !== undefined ? seatEl(opts.seat) : null;
    FX.speak(key, {
      urgent: opts.urgent,
      onstart: () => el && FACES.talk(el, true),
      onend: () => el && FACES.talk(el, false),
    });
  }

  // ---------- overlay ----------
  let ovToken = 0;
  function showOverlay(html, ms) {
    const t = ++ovToken;
    const o = $('overlay');
    o.innerHTML = `<div class="ov-bg"></div><div class="ov-box">${html}</div>`;
    o.classList.add('show');
    if (ms) setTimeout(() => hideOverlay(t), ms);
    return t;
  }
  function hideOverlay(t) {
    if (t === ovToken) $('overlay').classList.remove('show');
  }

  // ---------- render ----------
  function render() {
    if (!state) return;
    $('lobby').classList.toggle('hidden', state.phase !== 'lobby');
    $('endscreen').classList.toggle('hidden', state.phase !== 'over');
    if (state.phase === 'lobby') renderLobby();
    if (state.phase === 'over') renderEnd();
    renderScore();
    for (let i = 0; i < 4; i++) renderSeat(i);
    renderCenter();
    renderStatus();
    nudge();
  }

  function renderScore() {
    [0, 1].forEach((t) => {
      const el = $('s' + t);
      el.textContent = state.score[t];
      if (state.score[t] !== lastScore[t]) {
        el.classList.remove('bump');
        void el.offsetWidth;
        if (state.score[t] > lastScore[t]) el.classList.add('bump');
      }
      $('m' + t).textContent = `${state.seats[t].name} + ${state.seats[t + 2].name}`;
      $('b' + t).style.width = `${(Math.min(12, state.score[t]) / 12) * 100}%`;
    });
    lastScore = [...state.score];
    // valor da mão e rodadas
    const vb = $('value-badge');
    let txt = `Vale ${state.value}`;
    let hot = false;
    if (state.pending) { txt = `${S.LEVEL_NAME[state.pending.level]}? Vale ${state.pending.level}!`; hot = true; }
    else if (state.mode === 'ferro') { txt = 'MÃO DE FERRO · no escuro'; hot = true; }
    else if (state.mode === 'onze') { txt = state.phase === 'onze' ? 'MÃO DE ONZE' : `MÃO DE ONZE · Vale ${state.value}`; hot = true; }
    else if (state.value > 1) { txt = `${S.LEVEL_NAME[state.value]} · Vale ${state.value}`; hot = true; }
    vb.textContent = state.phase === 'lobby' || state.phase === 'over' ? '' : txt;
    vb.classList.toggle('hot', hot);
    vb.style.display = vb.textContent ? '' : 'none';
    $('rounds').innerHTML = state.phase === 'lobby' ? '' : [0, 1, 2].map((k) => {
      const r = state.rounds[k];
      return `<div class="rdot ${r === undefined ? '' : r === 'tie' ? 'rtie' : 'r' + r}"></div>`;
    }).join('');
  }

  function buildSeat(i) {
    const s = state.seats[i];
    const sig = (s.avatar || (s.bot ? 'robo' : 'h')) + (s.bot ? 'b' : 'p') + i;
    if (built[i] === sig) return;
    built[i] = sig;
    const el = seatEl(i);
    // Pessoa de verdade: o personagem que ela escolheu (ou um emoji, se ainda não escolheu) + selo de celular.
    const face = s.avatar || s.bot ? FACES.avatar(avatarOf(i)) : `<div class="human-av">${HUMAN_EMOJI[i]}</div>`;
    const av = `<div class="avatar">${face}${s.bot ? '' : '<div class="phone-badge">📱</div>'}</div>`;
    el.innerHTML = `<div class="bubble"></div>${av}<div class="seat-info"><div class="nameplate"></div><div class="backs"></div><div class="dealer-chip">🃏 dá as cartas</div></div>`;
  }

  function renderSeat(i) {
    buildSeat(i);
    const s = state.seats[i];
    const el = seatEl(i);
    const dealing = state.phase === 'deal' && state.dealer === i && Date.now() < dealingUntil;
    // Na vez: quem joga, quem responde ao truco ou quem decide a mão de onze.
    const onTurn = (state.phase === 'play' && state.turn === i)
      || (state.phase === 'truco' && state.pending && state.pending.responder === i)
      || (state.phase === 'onze' && voiceOf(state.onzeTeam) === i);
    el.className = `seat pos-${POS[i]} t${i % 2}${onTurn ? ' active' : ''}${dealing ? ' dealing' : ''}`;
    const np = el.querySelector('.nameplate');
    const npHtml = s.name;
    if (np.innerHTML !== npHtml) np.innerHTML = npHtml;
    const badge = el.querySelector('.phone-badge');
    if (badge) badge.classList.toggle('off', !s.connected);
    el.querySelector('.dealer-chip').style.display = state.dealer === i && state.phase !== 'lobby' && state.phase !== 'over' ? '' : 'none';
    const n = Date.now() < dealingUntil ? 0 : s.cards;
    const backs = el.querySelector('.backs');
    if (backs.childElementCount !== n) backs.innerHTML = Array.from({ length: n }, () => S.cardHTML({ hidden: true })).join('');
  }

  function renderCenter() {
    // vira
    const vira = $('vira');
    const showVira = state.vira && Date.now() >= viraAt;
    const vkey = showVira ? state.handNo + state.vira.r + state.vira.s : '';
    if (vkey !== viraShownFor) {
      viraShownFor = vkey;
      vira.innerHTML = showVira ? S.cardHTML(state.vira, null, 'flip') : '';
    }
    $('man-label').innerHTML = state.manilha && showVira
      ? `Manilha: <b>${state.manilha} (${S.RANK_NAME[state.manilha]})</b>` : '';
    // cartas jogadas
    const done = (state.phase === 'roundEnd' || state.phase === 'handEnd') && state.table.length === 4 && state.lastRound;
    for (let i = 0; i < 4; i++) {
      const slot = $('slot' + i);
      const p = state.table.find((x) => x.seat === i);
      if (!p) { if (slot.innerHTML) slot.innerHTML = ''; slot.dataset.id = ''; continue; }
      const id = p.closed ? 'fechada' : p.card.r + p.card.s;
      if (slot.dataset.id !== id || !slot.firstElementChild) {
        slot.dataset.id = id;
        slot.innerHTML = S.cardHTML(p.card, state.manilha);
        flyIn(slot.firstElementChild, i);
      }
      const c = slot.firstElementChild;
      c.classList.toggle('win', !!done && state.lastRound.result !== 'tie' && state.lastRound.seat === i);
      c.classList.toggle('lose', !!done && state.lastRound.result !== 'tie' && state.lastRound.seat !== i);
    }
  }

  function flyIn(card, seat) {
    const from = seatEl(seat).querySelector('.avatar').getBoundingClientRect();
    const to = card.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    card.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(.4) rotate(-40deg)`, opacity: 0.4 },
      { transform: 'none', opacity: 1 },
    ], { duration: 380, easing: 'cubic-bezier(.2,.8,.3,1.25)' });
  }

  function renderStatus() {
    let t = '';
    const s = state.seats;
    if (state.phase === 'deal' && state.dealer >= 0) t = `${s[state.dealer].name} está dando as cartas…`;
    else if (state.phase === 'play' && state.turn >= 0) {
      t = s[state.turn].bot ? `${s[state.turn].name} está pensando…` : `Vez de ${s[state.turn].name} · jogue pelo celular 📱`;
    } else if (state.phase === 'truco' && state.pending) {
      t = `${s[state.pending.responder].name}: aceita, corre ou aumenta?`;
    } else if (state.phase === 'onze') {
      t = `${s[voiceOf(state.onzeTeam)].name}: joga ou corre?`;
    }
    $('status').textContent = t;
  }

  // Se uma pessoa demora mais de 20 segundos, a voz dá um toque (uma vez só).
  function nudge() {
    const key = [state.phase, state.turn, state.pending && state.pending.level, state.handNo].join('|');
    if (key === nudgeKey) return;
    nudgeKey = key;
    clearTimeout(nudgeTimer);
    let who = -1;
    let clip = 'vez';
    if (state.phase === 'play') who = state.turn;
    else if (state.phase === 'truco') { who = state.pending.responder; clip = 'responde'; }
    else if (state.phase === 'onze') { who = voiceOf(state.onzeTeam); clip = 'onze-decide'; }
    if (who < 0 || state.seats[who].bot) return;
    nudgeTimer = setTimeout(() => {
      speak(clip);
      bubble(seatEl(who).querySelector('.bubble'), 'Sua vez! ⏰', 3000);
    }, NUDGE_MS);
  }

  // ---------- lobby e fim ----------
  function renderLobby() {
    [0, 1].forEach((i) => {
      const s = state.seats[i];
      const partner = state.seats[i + 2];
      const status = s.bot ? `🤖 ${s.name} joga neste lugar`
        : s.connected ? `✅ <b>${s.name}</b> conectado` : '⏳ Esperando um celular…';
      const mini = (x) => (x.avatar ? `<img class="lmini" src="/avatars/${x.avatar}/neutro.jpg" alt="">` : '<span class="lmini q">?</span>');
      $('lseat' + i).innerHTML = `
        <div class="who ${i ? 't1c' : 't0c'}">Jogador ${i + 1}</div>
        <div class="lpair">${mini(s)}<span>+</span>${mini(partner)}<div><b>${s.name}</b> com <b>${partner.name}</b>${s.bot || s.picked ? '' : '<br><small>escolhendo no celular…</small>'}</div></div>
        <div>${status}</div>
        <label><input type="checkbox" data-seat="${i}" ${s.bot ? 'checked' : ''}> Ninguém neste lugar? Um personagem joga sozinho</label>`;
    });
  }

  function renderEnd() {
    const w = state.winner;
    $('end-title').textContent = `${teamName(w).toUpperCase()} VENCEU!`;
    $('end-title').style.color = TEAM_COLOR[w];
    $('end-score').innerHTML = `<span class="t0c">${state.score[0]}</span> x <span class="t1c">${state.score[1]}</span>`;
  }

  function showLink(urls) {
    const [first, ...rest] = urls;
    if (!first) return;
    $('lan-url').innerHTML = `${first}${rest.length ? `<small>Se não abrir, tente: ${rest.join(' ou ')}</small>` : ''}`;
    try {
      const qr = qrcode(0, 'M');
      qr.addData(first);
      qr.make();
      $('qr').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
    } catch (e) {
      $('qr').style.display = 'none';
    }
  }

  // ---------- eventos ----------
  function preEvent(ev) {
    if (ev.t === 'deal') {
      dealingUntil = Date.now() + 2300;
      viraAt = Date.now() + 2500;
      setTimeout(render, 2350);
      setTimeout(render, 2550);
    }
  }

  function handleEvent(ev) {
    const s = state.seats;
    switch (ev.t) {
      case 'start':
        FX.sfx.fanfare();
        speak('comeca');
        break;

      case 'deal': {
        FX.sfx.shuffle();
        setTimeout(() => {
          FX.sfx.deal();
          const dealer = ev.dealer >= 0 ? ev.dealer : 0;
          const from = seatEl(dealer).querySelector('.avatar').getBoundingClientRect();
          for (let k = 0; k < 12; k++) {
            const seat = (ev.starter + k) % 4;
            setTimeout(() => flyCard(from, seatEl(seat).querySelector('.backs')), k * 95);
          }
        }, 1000);
        // Manilha: só em mão normal ou de onze (na de ferro, o grito é outro).
        if (ev.mode !== 'ferro') setTimeout(() => speak('man-' + ev.manilha), 2600);
        break;
      }

      case 'play': {
        FX.sfx.slap();
        const c = ev.card; // Carta fechada: sem carta no evento.
        if (c && c.r === state.manilha && c.s === 'paus') {
          FX.shake(1);
          FX.flash('#ffd400');
          FX.confetti(40);
        }
        break;
      }

      case 'round':
        if (ev.result === 'tie') FX.sfx.boing();
        else FX.sfx.ding();
        break;

      case 'hand': {
        const w = ev.winner;
        if (w === null) { FX.sfx.sad(); break; }
        FX.sfx.fanfare();
        FX.confetti(ev.points >= 3 ? 120 : 30);
        if (ev.points >= 3) showOverlay(`<div class="big-word small" style="color:${TEAM_COLOR[w]}">+${ev.points}</div><div class="ov-sub">${teamName(w)}</div>`, 1700);
        for (let i = 0; i < 4; i++) if (s[i].avatar) FACES.mood(seatEl(i), i % 2 === w ? 'happy' : 'sad', 3000);
        break;
      }

      case 'over':
        FX.sfx.fanfare();
        setTimeout(() => FX.sfx.fanfare(), 700);
        FX.confetti(320);
        setTimeout(() => FX.confetti(200), 1200);
        speak('fim-' + ev.winner, { urgent: true });
        break;

      case 'truco':
        trucoFx(ev);
        break;

      // Opinião do parceiro de quem responde: a cara fica até a resposta chegar.
      // A do Robô vem um segundo depois do grito, como quem pensa.
      case 'opiniao': {
        const face = () => FACES.mood(seatEl(ev.seat), ev.ans === 'aceita' ? 'happy' : 'sad', OPINION_FACE_MS);
        if (s[ev.seat].bot) setTimeout(face, 1000); else face();
        break;
      }

      case 'aceito':
        FX.sfx.ding();
        showOverlay(`<div class="stamp">ACEITO!</div>`, 1300);
        bubble(seatEl(ev.seat).querySelector('.bubble'), 'Aceito!');
        break;

      case 'corro':
        FX.sfx.chicken();
        showOverlay(`<div class="big-emoji">🐔</div><div class="ov-sub">${s[ev.seat].name} CORREU!</div>`, 1800);
        bubble(seatEl(ev.seat).querySelector('.bubble'), 'Corro! 🐔');
        break;

      case 'onze':
        FX.sfx.drumroll();
        showOverlay(`<div class="big-word small">MÃO DE ONZE!</div><div class="ov-sub">${teamName(ev.team)} decide</div>`, 2600);
        speak('onze');
        break;

      case 'onzeJoga':
        showOverlay(`<div class="stamp">VALE 3!</div>`, 1500);
        break;

      case 'onzeCorre':
        FX.sfx.chicken();
        break;

      case 'ferro':
        FX.sfx.horn();
        FX.shake(2);
        showOverlay(`<div class="big-word small">MÃO DE FERRO!</div><div class="ov-sub">Todo mundo no escuro!</div>`, 2800);
        speak('ferro');
        break;

      case 'signal': {
        // Sinal lento e exagerado: a cara fica SIGNAL_MS na tela e o rosto todo mexe.
        const hand = state.handNo;
        setTimeout(() => {
          if (state.handNo !== hand) return;
          const el = seatEl(ev.seat);
          FACES.signal(el, ev.sig, SIGNAL_MS);
          // A marca fica no .avatar: o Lugar é redesenhado a cada estado, o .avatar não.
          const av = el.querySelector('.avatar');
          if (!av) return;
          av.classList.remove('signing');
          void av.offsetWidth; // recomeça a animação
          av.classList.add('signing');
          clearTimeout(av._signing);
          av._signing = setTimeout(() => av.classList.remove('signing'), SIGNAL_MS);
        }, ev.delay || 0);
        break;
      }
    }
  }

  function flyCard(fromRect, toEl) {
    if (!toEl) return;
    const to = toEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'flying';
    el.innerHTML = S.cardHTML({ hidden: true });
    el.firstElementChild.style.setProperty('--cw', '40px');
    const fx = fromRect.left + fromRect.width / 2;
    const fy = fromRect.top + fromRect.height / 2;
    el.style.left = fx - 20 + 'px';
    el.style.top = fy - 28 + 'px';
    document.body.appendChild(el);
    const dx = to.left + to.width / 2 - fx;
    const dy = to.top + to.height / 2 - fy;
    el.animate([
      { transform: 'translate(0,0) rotate(0deg)' },
      { transform: `translate(${dx}px, ${dy}px) rotate(${360 + Math.random() * 180}deg)` },
    ], { duration: 450, easing: 'cubic-bezier(.3,.7,.4,1)' }).onfinish = () => el.remove();
  }

  async function trucoFx(ev) {
    const word = S.LEVEL_NAME[ev.level];
    const s = state.seats[ev.seat];
    const team = ev.seat % 2;
    FX.sfx.horn();
    FX.shake(2);
    FX.flash(TEAM_COLOR[team]);
    const sub = `${s.name} ${ev.raise ? 'aumentou' : 'pediu'}!`;
    bubble(seatEl(ev.seat).querySelector('.bubble'), `${word}!`, 2600);

    if (s.bot || !FX.micOn) {
      showOverlay(`<div class="big-word">${word}!</div><div class="ov-sub">${sub}</div>`, 2400);
      if (s.bot) FACES.mood(seatEl(ev.seat), 'shock', 1500);
      speak(LEVEL_CLIP[ev.level], { urgent: true, seat: s.bot ? ev.seat : undefined });
      return;
    }
    // Gritômetro: a pessoa grita, o microfone mede.
    FX.hush();
    const t = showOverlay(`
      <div class="big-word" id="ov-word">${word}!</div>
      <div class="ov-sub">GRITA, ${s.name.toUpperCase()}!</div>
      <div class="meter"><div class="fill" id="ov-fill"></div><div class="peak" id="ov-peak"></div></div>
      <div class="meter-label" id="ov-label">🎤 GRITÔMETRO</div>`);
    const peak = await FX.listen(2600, (l, pk) => {
      const f = $('ov-fill'), p = $('ov-peak'), w = $('ov-word');
      if (f) f.style.width = l + '%';
      if (p) p.style.left = pk + '%';
      if (w) w.style.transform = `scale(${1 + l / 110}) rotate(${(Math.random() - 0.5) * l / 7}deg)`;
      if (l > 78 && Math.random() < 0.12) FX.shake(1);
    });
    const tier = peak < 30 ? 0 : peak < 55 ? 1 : peak < 80 ? 2 : 3;
    let extra = '';
    if (peak > record) { record = peak; extra = ' 🏅 RECORDE DA NOITE!'; }
    const lab = $('ov-label');
    if (lab) lab.textContent = `GRITÔMETRO: ${peak}! ${['🥱', '😐', '😮', '🤯'][tier]}${extra}`;
    if (tier >= 2) FX.confetti(tier === 3 ? 160 : 60);
    if (tier === 3) { FX.shake(3); FX.flash('#fff'); }
    setTimeout(() => hideOverlay(t), 2000);
  }

  // ---------- vida dos rostos ----------
  setInterval(() => {
    document.querySelectorAll('.face-photo').forEach((f) => { if (Math.random() < 0.05) FACES.blink(f); });
    document.querySelectorAll('.face').forEach((f) => {
      const r = Math.random();
      if (r < 0.06) FACES.blink(f);
      else if (r < 0.09) {
        const c = Math.random() < 0.5 ? 'look-l' : 'look-r';
        f.classList.add(c);
        setTimeout(() => f.classList.remove(c), 900);
      }
    });
  }, 500);

  // ---------- botões ----------
  function paintSound() {
    $('btn-sound').textContent = FX.soundOn ? '🔊' : '🔇';
    $('btn-sound').classList.toggle('off', !FX.soundOn);
  }
  async function unlock() {
    FX.audio();
    if (!FX.soundOn) { FX.setSound(true); paintSound(); }
    FX.loadClips();
    FX.sfx.ding();
    const ok = await FX.enableMic();
    $('unlock-status').textContent = ok ? '✅ Som e Gritômetro ligados!' : '🔇 Som ligado. Microfone bloqueado (o Gritômetro fica de folga).';
    $('btn-mic').classList.toggle('on', ok);
  }
  $('btn-unlock').onclick = unlock;
  $('btn-mic').onclick = unlock;
  $('btn-sound').onclick = () => {
    FX.audio();
    FX.setSound(!FX.soundOn);
    paintSound();
  };
  $('btn-new').onclick = () => {
    if (state && state.phase !== 'lobby' && state.phase !== 'over' && !confirm('Começar uma nova partida? A partida atual acaba.')) return;
    post({ type: 'lobby' });
  };
  $('btn-start').onclick = async () => {
    FX.audio();
    const r = await post({ type: 'start' });
    $('start-msg').textContent = r.error || '';
  };
  $('btn-again').onclick = () => { FX.audio(); post({ type: 'start' }); };
  $('btn-end-lobby').onclick = () => post({ type: 'lobby' });
  document.addEventListener('change', (e) => {
    if (e.target.matches('input[data-seat]')) post({ type: 'config', seat: Number(e.target.dataset.seat), bot: e.target.checked });
  });
  document.addEventListener('click', () => { FX.audio(); FX.loadClips(); }, { once: true });

  // ---------- início ----------
  paintSound();
  FX.loadClips();
  fetch(`${BASE}/api/info`).then((r) => r.json()).then((info) => {
    if (info.online) {
      $('url-hint').innerHTML = `Aponte a câmera do celular para o QR Code. Jogando de longe? Mande este link para o outro Jogador. Código da Sala: <b>${info.code}</b>`;
      showLink([`${location.origin}/s/${info.code}`]);
    } else showLink(info.urls);
  });

  const es = new EventSource(`${BASE}/events?role=table`);
  es.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type !== 'state') return;
    state = m.state;
    m.events.forEach(preEvent);
    render();
    m.events.forEach((ev) => handleEvent(ev));
  };

  window.__truco = { get state() { return state; } };
})();
