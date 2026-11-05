// Tela da MESA (TV/notebook): mostra tudo, o Seu Zé narra, os robôs fazem sinais.
(function () {
  const S = window.SHARED;
  const L = window.LINES;
  const BL = window.BOT_LINES;
  const $ = (id) => document.getElementById(id);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fill = (t, o) => t.replace(/\{(\w)\}/g, (_, k) => (o[k] !== undefined ? o[k] : ''));
  const POS = ['bottom', 'left', 'top', 'right'];
  const HUMAN_EMOJI = ['🤠', '😎'];
  const PERSONA_LABEL = { blefador: 'o Blefador', medroso: 'o Medroso', robo: 'robô' };
  const TEAM_COLOR = ['#2f7bff', '#ff3b3b'];

  let state = null;
  let dealingUntil = 0;
  let viraAt = 0;
  let viraShownFor = '';
  const built = [null, null, null, null];
  let lastScore = [0, 0];
  let nagTimer = null;
  let nagKey = '';
  let record = 0;

  const seatEl = (i) => $('seat' + i);
  const teamName = (t) => S.TEAM_NAME[t];
  const personaOf = (i) => state.seats[i].persona || 'robo';
  const voiceOf = (team) => {
    if (!state.seats[team].bot) return team;
    if (!state.seats[team + 2].bot) return team + 2;
    return team;
  };

  function post(a) {
    return fetch('/api/action', { method: 'POST', body: JSON.stringify(a) }).then((r) => r.json()).catch(() => ({ error: 'Sem conexão com o servidor.' }));
  }

  // ---------- falas ----------
  function log(text) {
    const box = $('log');
    const d = document.createElement('div');
    d.textContent = text;
    box.prepend(d);
    while (box.children.length > 30) box.lastChild.remove();
  }

  function bubble(el, text, ms) {
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), ms || Math.max(2600, text.length * 75));
  }

  function talkFace(svg, text) {
    return {
      onstart: () => svg && svg.classList.add('talking'),
      onend: () => svg && svg.classList.remove('talking'),
      fallback: () => {
        if (!svg) return;
        svg.classList.add('talking');
        setTimeout(() => svg.classList.remove('talking'), Math.min(4000, 400 + text.length * 55));
      },
    };
  }

  function zeSay(text, opts = {}) {
    bubble($('ze-bubble'), text);
    log('🧔 ' + text);
    const t = talkFace($('ze').querySelector('svg'), text);
    if (FX.voiceOn && window.speechSynthesis) FX.say(text, 'ze', { urgent: opts.urgent, onstart: t.onstart, onend: t.onend });
    else t.fallback();
  }

  function seatSay(i, text, urgent) {
    const el = seatEl(i);
    bubble(el.querySelector('.bubble'), text);
    log(`${state.seats[i].bot ? '🤖' : '🗣️'} ${state.seats[i].name}: ${text}`);
    const svg = el.querySelector('svg');
    const t = talkFace(svg, text);
    const voice = state.seats[i].bot ? personaOf(i) : 'human';
    if (FX.voiceOn && window.speechSynthesis) FX.say(text, voice, { urgent, onstart: t.onstart, onend: t.onend });
    else t.fallback();
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
    nag();
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
      $('b' + t).innerHTML = Array.from({ length: 12 }, (_, k) => `<div class="bean ${k < state.score[t] ? 'on' : ''}"></div>`).join('');
    });
    lastScore = [...state.score];
  }

  function buildSeat(i) {
    const s = state.seats[i];
    const sig = (s.bot ? personaOf(i) : 'h') + i;
    if (built[i] === sig) return;
    built[i] = sig;
    const el = seatEl(i);
    const av = s.bot
      ? `<div class="avatar">${FACES.svg(personaOf(i))}</div>`
      : `<div class="avatar"><div class="human-av">${HUMAN_EMOJI[i]}</div><div class="phone-badge">📱</div></div>`;
    el.innerHTML = `<div class="bubble"></div>${av}<div class="seat-info"><div class="nameplate"></div><div class="backs"></div></div>`;
  }

  function renderSeat(i) {
    buildSeat(i);
    const s = state.seats[i];
    const el = seatEl(i);
    el.className = `seat pos-${POS[i]} t${i % 2}${state.turn === i && state.phase === 'play' ? ' active' : ''}`;
    const persona = s.bot ? `<span class="persona">${PERSONA_LABEL[personaOf(i)] || ''}</span>` : '';
    const np = el.querySelector('.nameplate');
    const npHtml = `${s.name}${persona}`;
    if (np.innerHTML !== npHtml) np.innerHTML = npHtml;
    const badge = el.querySelector('.phone-badge');
    if (badge) badge.classList.toggle('off', !s.connected);
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
      ? `Manilha: <b>${state.manilha} (${S.RANK_NAME[state.manilha]})</b>` : (state.phase === 'deal' ? 'Embaralhando…' : '');
    // rodadas
    $('rounds').innerHTML = [0, 1, 2].map((k) => {
      const r = state.rounds[k];
      return `<div class="rdot ${r === undefined ? '' : r === 'tie' ? 'rtie' : 'r' + r}"></div>`;
    }).join('');
    // valor
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
    // cartas jogadas
    const done = (state.phase === 'roundEnd' || state.phase === 'handEnd') && state.table.length === 4 && state.lastRound;
    for (let i = 0; i < 4; i++) {
      const slot = $('slot' + i);
      const p = state.table.find((x) => x.seat === i);
      if (!p) { if (slot.innerHTML) slot.innerHTML = ''; continue; }
      const id = p.card.r + p.card.s;
      if (slot.dataset.id !== id || !slot.firstElementChild) {
        slot.dataset.id = id;
        slot.innerHTML = S.cardHTML(p.card, state.manilha);
        flyIn(slot.firstElementChild, i);
      }
      const c = slot.firstElementChild;
      c.classList.toggle('win', !!done && state.lastRound.result !== 'tie' && state.lastRound.seat === i);
      c.classList.toggle('lose', !!done && state.lastRound.result !== 'tie' && state.lastRound.seat !== i);
    }
    for (let i = 0; i < 4; i++) if (!state.table.find((x) => x.seat === i)) $('slot' + i).dataset.id = '';
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
    const st = $('status');
    let t = '';
    const s = state.seats;
    if (state.phase === 'deal') t = 'Seu Zé está dando as cartas…';
    else if (state.phase === 'play' && state.turn >= 0) {
      t = s[state.turn].bot ? `${s[state.turn].name} está pensando…` : `Vez de ${s[state.turn].name} — jogue pelo celular 📱`;
    } else if (state.phase === 'truco' && state.pending) {
      const v = voiceOf(state.pending.respondTeam);
      t = `${s[v].name}: aceita, corre ou aumenta?`;
    } else if (state.phase === 'onze') {
      t = `${s[voiceOf(state.onzeTeam)].name}: joga ou corre?`;
    }
    st.textContent = t;
  }

  function nag() {
    const key = [state.phase, state.turn, state.pending && state.pending.level, state.handNo].join('|');
    if (key === nagKey) return;
    nagKey = key;
    clearTimeout(nagTimer);
    let who = -1;
    if (state.phase === 'play') who = state.turn;
    else if (state.phase === 'truco') who = voiceOf(state.pending.respondTeam);
    else if (state.phase === 'onze') who = voiceOf(state.onzeTeam);
    if (who < 0 || state.seats[who].bot) return;
    const name = state.seats[who].name;
    nagTimer = setTimeout(() => zeSay(fill(pick(L.turnHuman), { n: name })), 16000);
  }

  // ---------- lobby e fim ----------
  function renderLobby() {
    [0, 1].forEach((i) => {
      const s = state.seats[i];
      const partner = state.seats[i + 2];
      const status = s.bot ? '🤖 Robô neste lugar'
        : s.connected ? `✅ <b>${s.name}</b> conectado` : '⏳ Esperando um celular…';
      $('lseat' + i).innerHTML = `
        <div class="who ${i ? 't1c' : 't0c'}">Jogador ${i + 1}</div>
        <div>Parceiro na tela: <b>${partner.name}</b>, ${PERSONA_LABEL[partner.persona]}</div>
        <div>${status}</div>
        <label><input type="checkbox" data-seat="${i}" ${s.bot ? 'checked' : ''}> Colocar um robô neste lugar</label>`;
    });
  }

  function renderEnd() {
    const w = state.winner;
    $('end-title').textContent = `${teamName(w).toUpperCase()} VENCEU!`;
    $('end-title').style.color = TEAM_COLOR[w];
    $('end-score').innerHTML = `<span class="t0c">${state.score[0]}</span> x <span class="t1c">${state.score[1]}</span>`;
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

  function handleEvent(ev, batch) {
    const s = state.seats;
    switch (ev.t) {
      case 'start':
        FX.sfx.fanfare();
        zeSay(pick(L.start));
        break;

      case 'deal': {
        const ze = $('ze');
        ze.classList.add('shuffling');
        FX.sfx.shuffle();
        if (ev.handNo > 1 && Math.random() < 0.5) zeSay(pick(L.shuffle));
        setTimeout(() => {
          ze.classList.remove('shuffling');
          FX.sfx.deal();
          const from = ze.getBoundingClientRect();
          for (let k = 0; k < 12; k++) {
            const seat = (ev.starter + k) % 4;
            setTimeout(() => flyCard(from, seatEl(seat).querySelector('.backs')), k * 95);
          }
        }, 1000);
        setTimeout(() => zeSay(fill(pick(L.vira), { v: S.cardName(ev.vira), m: S.RANK_NAME[ev.manilha] })), 2550);
        break;
      }

      case 'play': {
        FX.sfx.slap();
        const c = ev.card;
        log(`🃏 ${s[ev.seat].name} jogou ${S.cardName(c)}`);
        const man = c.r === state.manilha;
        if (man && c.s === 'paus') {
          zeSay(pick(L.zap));
          FX.shake(1);
          FX.flash('#ffd400');
          FX.confetti(50);
        } else if (man && Math.random() < 0.6) zeSay(pick(L.manilha));
        break;
      }

      case 'round':
        if (ev.result === 'tie') { FX.sfx.boing(); zeSay(pick(L.tie)); }
        else {
          FX.sfx.ding();
          if (!batch.some((e) => e.t === 'hand') && Math.random() < 0.35) zeSay(fill(pick(L.roundWin), { d: teamName(ev.result) }));
        }
        break;

      case 'hand': {
        const w = ev.winner;
        if (w === null) { zeSay(pick(L.handNobody)); FX.sfx.sad(); break; }
        const pts = ev.points === 1 ? '1 tento' : `${ev.points} tentos`;
        log(`🏁 ${teamName(w)} +${ev.points}`);
        if (ev.reason === 'jogo') zeSay(fill(pick(L.handWin), { d: teamName(w), p: pts }));
        FX.sfx.fanfare();
        FX.confetti(ev.points >= 3 ? 160 : 50);
        if (ev.points >= 3) showOverlay(`<div class="big-word small" style="color:${TEAM_COLOR[w]}">+${ev.points}</div><div class="ov-sub">${teamName(w)}</div>`, 1700);
        for (let i = 0; i < 4; i++) if (s[i].bot) FACES.mood(seatEl(i), i % 2 === w ? 'happy' : 'sad', 3000);
        const talker = [2, 3].find((i) => s[i].bot && Math.random() < 0.35);
        if (talker !== undefined) {
          const set = BL[personaOf(talker)];
          setTimeout(() => seatSay(talker, pick(talker % 2 === w ? set.win : set.lose)), 600);
        }
        break;
      }

      case 'over':
        FX.sfx.fanfare();
        setTimeout(() => FX.sfx.fanfare(), 700);
        FX.confetti(320);
        setTimeout(() => FX.confetti(200), 1200);
        zeSay(fill(pick(L.over), { d: teamName(ev.winner) }), { urgent: true });
        break;

      case 'truco':
        trucoFx(ev);
        break;

      case 'aceito':
        FX.sfx.ding();
        showOverlay(`<div class="stamp">CAI DENTRO!</div>`, 1400);
        log(`✅ ${s[ev.seat].name} aceitou (${ev.level})`);
        if (s[ev.seat].bot) seatSay(ev.seat, pick(BL[personaOf(ev.seat)].aceito));
        else zeSay(pick(L.aceito));
        break;

      case 'corro':
        FX.sfx.chicken();
        showOverlay(`<div class="big-emoji">🐔</div><div class="ov-sub">${s[ev.seat].name} CORREU!</div>`, 2000);
        FX.confetti(30, '🐔');
        log(`🐔 ${s[ev.seat].name} correu`);
        if (s[ev.seat].bot) seatSay(ev.seat, pick(BL[personaOf(ev.seat)].corro));
        zeSay(pick(L.correu));
        break;

      case 'advice':
        seatSay(ev.seat, pick(BL[personaOf(ev.seat)].publicAdvice));
        break;

      case 'onze':
        FX.sfx.drumroll();
        showOverlay(`<div class="big-word small">MÃO DE ONZE!</div><div class="ov-sub">${teamName(ev.team)} decide</div>`, 2600);
        zeSay(fill(pick(L.onze), { d: teamName(ev.team) }));
        break;

      case 'onzeJoga':
        showOverlay(`<div class="stamp">VALE 3!</div>`, 1500);
        zeSay(fill(pick(L.onzeJoga), { d: teamName(ev.team) }));
        break;

      case 'onzeCorre':
        FX.sfx.chicken();
        zeSay(fill(pick(L.onzeCorre), { d: teamName(ev.team) }));
        break;

      case 'ferro':
        FX.sfx.horn();
        FX.shake(2);
        showOverlay(`<div class="big-word small">MÃO DE FERRO!</div><div class="ov-sub">Todo mundo no escuro!</div>`, 2800);
        zeSay(pick(L.ferro));
        break;

      case 'signal': {
        const hand = state.handNo;
        setTimeout(() => {
          if (state.handNo === hand) FACES.signal(seatEl(ev.seat), ev.sig, 1300);
        }, ev.delay);
        break;
      }

      case 'say':
        seatSay(ev.seat, ev.text);
        if (Math.random() < 0.3) setTimeout(() => zeSay(pick(['Uuuuh! Pegou pesado!', 'Ih, vai ter briga!', 'Olha a boca, que aqui é lugar de família!'])), 1800);
        break;
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
    log(`📣 ${s.name}: ${word}!`);

    if (s.bot) {
      showOverlay(`<div class="big-word">${word}!</div><div class="ov-sub">${sub}</div>`, 2600);
      FACES.mood(seatEl(ev.seat), 'shock', 1500);
      const set = BL[personaOf(ev.seat)];
      seatSay(ev.seat, fill(pick(ev.raise ? set.raise : set.truco), { L: word }), true);
      return;
    }
    if (!FX.micOn) {
      showOverlay(`<div class="big-word">${word}!</div><div class="ov-sub">${sub}</div>`, 2400);
      zeSay(`${word}! ${s.name} ${ev.raise ? 'aumentou pra' : 'pediu'} ${word.toLowerCase()}!`, { urgent: true });
      return;
    }
    // Gritômetro!
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
    log(`🎤 Gritômetro de ${s.name}: ${peak}${extra}`);
    if (tier >= 2) FX.confetti(tier === 3 ? 220 : 90);
    if (tier === 3) { FX.shake(3); FX.confetti(25, '💥'); FX.flash('#fff'); }
    zeSay(pick(L.shout[tier]));
    setTimeout(() => hideOverlay(t), 2000);
  }

  // ---------- vida dos rostos ----------
  setInterval(() => {
    document.querySelectorAll('.face').forEach((f) => {
      const r = Math.random();
      if (r < 0.06) { f.classList.add('blink'); setTimeout(() => f.classList.remove('blink'), 140); }
      else if (r < 0.09) {
        const c = Math.random() < 0.5 ? 'look-l' : 'look-r';
        f.classList.add(c);
        setTimeout(() => f.classList.remove(c), 900);
      }
    });
  }, 500);

  // ---------- botões ----------
  async function unlock() {
    FX.audio();
    FX.sfx.ding();
    const ok = await FX.enableMic();
    $('unlock-status').textContent = ok ? '✅ Som e Gritômetro ligados!' : '🔇 Som ligado. Microfone bloqueado (o Gritômetro fica de folga).';
    $('btn-mic').classList.toggle('on', ok);
    zeSay(ok ? 'Testando, testando! Tô ouvindo vocês! Quando pedir truco, GRITA!' : 'Som ligado! Sem microfone, mas a zoeira continua.');
  }
  $('btn-unlock').onclick = unlock;
  $('btn-mic').onclick = unlock;
  $('btn-voice').onclick = () => {
    const on = !FX.voiceOn;
    FX.setVoice(on);
    $('btn-voice').classList.toggle('off', !on);
  };
  $('btn-lobby').onclick = () => {
    if (state && state.phase !== 'lobby' && !confirm('Voltar ao início? A partida atual acaba.')) return;
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
  document.addEventListener('click', () => FX.audio(), { once: true });

  // ---------- início ----------
  $('ze').innerHTML = FACES.svg('ze');
  $('lobby-ze').innerHTML = FACES.svg('ze');
  fetch('/api/info').then((r) => r.json()).then((info) => {
    if (info.online) { $('url-hint').textContent = 'No celular, abra:'; info.urls = [`${location.origin}/mao`]; }
    const [first, ...rest] = info.urls;
    $('lan-url').innerHTML = first
      ? `${first}${rest.length ? `<div style="font-size:15px;opacity:.7;margin-top:4px">Se não abrir, tente: ${rest.join(' ou ')}</div>` : ''}`
      : `http://IP-deste-computador:${info.port}/mao`;
  });

  const es = new EventSource('/events?role=table');
  es.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type !== 'state') return;
    state = m.state;
    m.events.forEach(preEvent);
    render();
    m.events.forEach((ev) => handleEvent(ev, m.events));
  };

  window.__truco = { get state() { return state; } };
})();
