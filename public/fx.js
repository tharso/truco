// Efeitos: som sintetizado, falas gravadas (public/audio), confete e tremor.
window.FX = (function () {
  let ctx = null;
  const audio = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  let enabled = localStorage.getItem('truco-som') !== 'off';

  function tone(freq, dur, type = 'square', vol = 0.15, when = 0, slideTo) {
    if (!enabled) return;
    const a = audio();
    const t = a.currentTime + when;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur = 0.06, vol = 0.3, when = 0, hp = 1500) {
    if (!enabled) return;
    const a = audio();
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = a.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination);
    src.start(a.currentTime + when);
  }

  const sfx = {
    slap() { noise(0.07, 0.5, 0, 900); tone(140, 0.08, 'sine', 0.2); },
    shuffle() { for (let i = 0; i < 14; i++) noise(0.03, 0.25, i * 0.045, 2500); },
    deal() { for (let i = 0; i < 12; i++) noise(0.04, 0.2, i * 0.09, 2000); },
    horn() {
      [0, 0.18, 0.36].forEach((w, i) => {
        tone(220, 0.16, 'sawtooth', 0.12, w);
        tone(277, 0.16, 'sawtooth', 0.1, w);
        if (i === 2) { tone(220, 0.6, 'sawtooth', 0.14, w); tone(330, 0.6, 'sawtooth', 0.12, w); }
      });
    },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i === 3 ? 0.5 : 0.14, 'square', 0.1, i * 0.12)); },
    sad() { [392, 370, 349, 330].forEach((f, i) => tone(f, i === 3 ? 0.7 : 0.25, 'triangle', 0.15, i * 0.28)); },
    boing() { tone(180, 0.35, 'sine', 0.25, 0, 600); },
    ding() { tone(1320, 0.4, 'sine', 0.15); tone(1760, 0.5, 'sine', 0.08, 0.05); },
    drumroll() { for (let i = 0; i < 24; i++) noise(0.03, 0.15 + i * 0.01, i * 0.05, 300); },
    chicken() { [0, 0.15, 0.3].forEach((w) => tone(900, 0.1, 'square', 0.08, w, 1400)); tone(700, 0.4, 'square', 0.08, 0.5, 1200); },
  };

  // ---------- falas gravadas ----------
  // Cada fala é um arquivo em /audio/<chave>.m4a. Voz da Mesa: scripts/gravar-vozes.sh.
  // Voz de cada Personagem: /audio/<personagem>/<fala>.m4a (scripts/cortar-vozes.sh).
  const T = window.TABLE_TEXT;
  const CLIPS = ['truco', 'seis', 'nove', 'doze', 'onze', 'ferro', 'vez', 'responde', 'onze-decide', 'comeca', 'fim']
    .concat(['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'].map((r) => 'man-' + r))
    .concat(T ? T.VOZES.flatMap((id) => T.FALAS.map((f) => `${id}/${f}`)) : []);
  const buffers = {};
  let loading = null;
  function loadClips() {
    if (loading) return loading;
    const a = audio();
    loading = Promise.all(CLIPS.map((k) => fetch(`/audio/${k}.m4a`)
      .then((r) => r.arrayBuffer())
      .then((b) => new Promise((ok, fail) => a.decodeAudioData(b, ok, fail)))
      .then((buf) => { buffers[k] = buf; })
      .catch(() => {})));
    return loading;
  }
  const queue = [];
  let current = null;
  // Toca uma fala. urgent: corta o que estiver tocando.
  function speak(key, opts = {}) {
    if (!enabled) return;
    if (opts.urgent) hush();
    if (queue.length > 1) queue.shift();
    queue.push({ key, onstart: opts.onstart, onend: opts.onend });
    loadClips().then(next);
  }
  function next() {
    if (current || !queue.length) return;
    const item = queue.shift();
    const buf = buffers[item.key];
    if (!buf || !enabled) return next();
    const a = audio();
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    g.gain.value = 1;
    src.connect(g).connect(a.destination);
    current = src;
    item.onstart && item.onstart(buf.duration);
    src.onended = () => { if (current === src) current = null; item.onend && item.onend(); setTimeout(next, 150); };
    src.start();
  }
  function hush() {
    queue.length = 0;
    if (current) { const c = current; current = null; try { c.stop(); } catch (e) { /* já parou */ } }
  }

  // ---------- confete e tremor ----------
  const COLORS = ['#ffd400', '#ff3b3b', '#2f7bff', '#2ecc71', '#ff7af6', '#fff'];
  function confetti(n = 120, emoji) {
    const layer = document.getElementById('fx-layer');
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      if (emoji) { el.textContent = emoji; el.classList.add('emoji'); }
      else el.style.background = COLORS[i % COLORS.length];
      el.style.left = Math.random() * 100 + 'vw';
      const dur = 1.8 + Math.random() * 1.8;
      el.animate([
        { transform: `translate(0,-10vh) rotate(0deg)` },
        { transform: `translate(${(Math.random() - 0.5) * 30}vw, 110vh) rotate(${Math.random() * 1080}deg)` },
      ], { duration: dur * 1000, easing: 'cubic-bezier(.2,.6,.4,1)', delay: Math.random() * 400 });
      layer.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000 + 500);
    }
  }

  function shake(level = 1) {
    const b = document.body;
    b.style.setProperty('--shake', `${4 + level * 10}px`);
    b.classList.remove('shake');
    void b.offsetWidth;
    b.classList.add('shake');
    setTimeout(() => b.classList.remove('shake'), 700);
  }

  function flash(color = '#fff') {
    const layer = document.getElementById('fx-layer');
    const el = document.createElement('div');
    el.className = 'flash';
    el.style.background = color;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }

  return {
    sfx, speak, hush, loadClips, confetti, shake, flash, audio,
    get soundOn() { return enabled; },
    setSound(on) { enabled = on; localStorage.setItem('truco-som', on ? 'on' : 'off'); if (!on) hush(); },
  };
})();
