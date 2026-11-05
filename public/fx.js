// Efeitos: som sintetizado, voz, confete, tremor e o Gritômetro.
window.FX = (function () {
  let ctx = null;
  const audio = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  function tone(freq, dur, type = 'square', vol = 0.15, when = 0, slideTo) {
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

  // ---------- voz ----------
  const queue = [];
  let speaking = false;
  let voices = [];
  function loadVoices() {
    voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  }
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function pickVoice(gender) {
    const pt = voices.filter((v) => /pt[-_]BR/i.test(v.lang));
    const all = pt.length ? pt : voices.filter((v) => /^pt/i.test(v.lang));
    if (!all.length) return null;
    const male = all.find((v) => /felipe|daniel|ricardo|male|masc/i.test(v.name));
    const female = all.find((v) => /luciana|joana|female|fem/i.test(v.name));
    return (gender === 'f' ? female : male) || all[0];
  }

  const VOICE = {
    ze: { pitch: 0.75, rate: 1.05 },
    blefador: { pitch: 1.15, rate: 1.15 },
    medroso: { pitch: 1.6, rate: 1.25 },
    robo: { pitch: 0.4, rate: 0.95 },
    human: { pitch: 1.0, rate: 1.1 },
  };

  let enabled = true;
  function say(text, who = 'ze', opts = {}) {
    if (!enabled || !window.speechSynthesis) return;
    if (opts.urgent) { queue.length = 0; }
    if (queue.length > 2) queue.shift();
    queue.push({ text, who, onstart: opts.onstart, onend: opts.onend });
    pump();
  }
  function pump() {
    if (speaking || !queue.length) return;
    const item = queue.shift();
    const u = new SpeechSynthesisUtterance(item.text);
    const v = VOICE[item.who] || VOICE.human;
    const voice = pickVoice('m');
    if (voice) u.voice = voice;
    u.lang = 'pt-BR';
    u.pitch = v.pitch;
    u.rate = v.rate;
    speaking = true;
    u.onstart = () => item.onstart && item.onstart();
    const done = () => { speaking = false; item.onend && item.onend(); setTimeout(pump, 120); };
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
    // segurança: se o navegador engasgar
    setTimeout(() => { if (speaking) { speaking = false; pump(); } }, 9000);
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

  // ---------- Gritômetro ----------
  let analyser = null;
  let micOn = false;
  async function enableMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const a = audio();
      analyser = a.createAnalyser();
      analyser.fftSize = 1024;
      a.createMediaStreamSource(stream).connect(analyser);
      micOn = true;
    } catch (e) {
      micOn = false;
    }
    return micOn;
  }
  function level() {
    if (!analyser) return 0;
    const d = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(d);
    let sum = 0;
    for (const x of d) sum += x * x;
    const rms = Math.sqrt(sum / d.length);
    // rms de ~0.01 (silêncio) a ~0.5 (berro) → 0..100
    const db = 20 * Math.log10(rms + 1e-6);
    return Math.max(0, Math.min(100, ((db + 50) / 44) * 100));
  }
  // Mede por `ms` e chama onTick(nível atual) e devolve o pico.
  function listen(ms, onTick) {
    return new Promise((resolve) => {
      if (!micOn) return resolve(-1);
      const t0 = performance.now();
      let peak = 0;
      (function loop() {
        const l = level();
        peak = Math.max(peak, l);
        onTick && onTick(l, peak);
        if (performance.now() - t0 < ms) requestAnimationFrame(loop);
        else resolve(Math.round(peak));
      })();
    });
  }

  function hush() {
    queue.length = 0;
    speaking = false;
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  return {
    sfx, say, hush, confetti, shake, flash, enableMic, listen, audio,
    get voiceOn() { return enabled; },
    get micOn() { return micOn; },
    setVoice(on) { enabled = on; if (!on && window.speechSynthesis) speechSynthesis.cancel(); },
  };
})();
