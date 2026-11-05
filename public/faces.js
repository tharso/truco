// Rostos em SVG. As expressões (sinais) mudam via classe CSS no <svg>.
window.FACES = (function () {
  const PRESETS = {
    ze: { skin: '#e9b48a', hair: '#ddd', hat: 'palha', mustache: '#eee', shirt: '#c0392b', toothpick: true },
    blefador: { skin: '#c98b5e', hair: '#2b1b10', hat: 'bone', mustache: '#2b1b10', shirt: '#2f6fd6', gold: true },
    medroso: { skin: '#f2c9a0', hair: '#8a5a2b', hat: null, mustache: null, shirt: '#d63a3a', sweat: true, glasses: true },
    robo: { skin: '#9fb3c8', hair: null, hat: 'antena', mustache: null, shirt: '#555' },
  };

  function hatSVG(kind) {
    if (kind === 'palha') return `
      <ellipse cx="60" cy="40" rx="56" ry="11" fill="#e6c36a" stroke="#a8862c" stroke-width="2"/>
      <path d="M28 40 Q30 6 60 6 Q90 6 92 40 Z" fill="#f0d27a" stroke="#a8862c" stroke-width="2"/>
      <rect x="29" y="30" width="62" height="7" fill="#b03a2e"/>`;
    if (kind === 'bone') return `
      <path d="M24 44 Q26 10 60 10 Q94 10 96 44 Z" fill="#1f4fa8"/>
      <path d="M84 40 Q112 38 116 48 L90 48 Z" fill="#163a7c"/>
      <circle cx="60" cy="12" r="4" fill="#163a7c"/>
      <text x="60" y="36" font-size="16" text-anchor="middle" fill="#ffd400" font-weight="900" font-family="Arial Black,Arial">T</text>`;
    if (kind === 'antena') return `
      <line x1="60" y1="30" x2="60" y2="8" stroke="#555" stroke-width="3"/>
      <circle class="bulb" cx="60" cy="7" r="6" fill="#ff3b3b"/>`;
    return '';
  }

  function svg(name, opts = {}) {
    const p = Object.assign({}, PRESETS[name] || PRESETS.robo, opts);
    const hair = p.hair && p.hat !== 'palha' && p.hat !== 'bone'
      ? `<path d="M24 66 Q20 22 60 22 Q100 22 96 66 Q92 40 60 38 Q28 40 24 66 Z" fill="${p.hair}"/>` : '';
    const sideHair = p.hair && (p.hat === 'palha' || p.hat === 'bone')
      ? `<path d="M23 60 Q22 46 30 44 L30 66 Z M97 60 Q98 46 90 44 L90 66 Z" fill="${p.hair}"/>` : '';
    const mustache = p.mustache ? `<path class="mustache" d="M36 100 Q46 88 60 96 Q74 88 84 100 Q74 96 60 102 Q46 96 36 100 Z" fill="${p.mustache}"/>` : '';
    const glasses = p.glasses ? `<g class="glasses" fill="none" stroke="#222" stroke-width="2.5">
        <circle cx="45" cy="70" r="11"/><circle cx="75" cy="70" r="11"/><line x1="56" y1="70" x2="64" y2="70"/></g>` : '';
    const sweat = p.sweat ? `<path class="sweat" d="M96 58 Q100 66 96 70 Q92 66 96 58 Z" fill="#7cc7ff"/>` : '';
    const tooth = p.toothpick ? `<line class="toothpick" x1="70" y1="110" x2="92" y2="104" stroke="#d9b36c" stroke-width="2.5" stroke-linecap="round"/>` : '';
    const gold = p.gold ? `<rect class="goldtooth" x="62" y="108" width="5" height="5" fill="#ffd400"/>` : '';
    return `<svg class="face face-${name}" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 150 Q16 122 60 120 Q104 122 106 150 Z" fill="${p.shirt}"/>
      <circle cx="22" cy="78" r="9" fill="${p.skin}"/><circle cx="98" cy="78" r="9" fill="${p.skin}"/>
      <ellipse class="head" cx="60" cy="76" rx="38" ry="46" fill="${p.skin}"/>
      ${hair}${sideHair}
      <g class="cheeks"><circle class="cheek" cx="36" cy="96" r="10" fill="${p.skin}" stroke="#0002"/><circle class="cheek" cx="84" cy="96" r="10" fill="${p.skin}" stroke="#0002"/></g>
      <circle cx="36" cy="92" r="6" fill="#ff6b6b33"/><circle cx="84" cy="92" r="6" fill="#ff6b6b33"/>
      <g class="eye eye-l"><ellipse cx="45" cy="70" rx="8" ry="9" fill="#fff"/><circle class="pupil" cx="45" cy="71" r="4" fill="#222"/></g>
      <g class="eye eye-r"><ellipse cx="75" cy="70" rx="8" ry="9" fill="#fff"/><circle class="pupil" cx="75" cy="71" r="4" fill="#222"/></g>
      <path class="lid lid-r" d="M66 70 Q75 74 84 70" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path class="lid lid-l" d="M36 70 Q45 74 54 70" stroke="#222" stroke-width="3" fill="none" stroke-linecap="round"/>
      <rect class="brow brow-l" x="36" y="54" width="18" height="4" rx="2" fill="#3a2a1a"/>
      <rect class="brow brow-r" x="66" y="54" width="18" height="4" rx="2" fill="#3a2a1a"/>
      ${glasses}
      <ellipse cx="60" cy="88" rx="7" ry="6" fill="#00000022"/>
      <g class="mouth">
        <path class="m-normal" d="M46 108 Q60 116 74 108" stroke="#5a1a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path class="m-open" d="M46 106 Q60 126 74 106 Z" fill="#5a1a1a"/>
        <path class="m-side" d="M54 110 Q66 112 78 104" stroke="#5a1a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <g class="m-bite"><path d="M46 108 L74 108" stroke="#5a1a1a" stroke-width="3"/><rect x="52" y="104" width="16" height="5" fill="#fff" stroke="#5a1a1a" stroke-width="1"/></g>
        <path class="m-sad" d="M48 114 Q60 104 72 114" stroke="#5a1a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        <path class="m-happy" d="M42 104 Q60 126 78 104 Z" fill="#5a1a1a"/>
      </g>
      ${gold}${mustache}${tooth}${sweat}
      ${hatSVG(p.hat)}
    </svg>`;
  }

  // Sinal: aplica a expressão por um tempo.
  function signal(el, sig, ms = 1300) {
    const s = el && el.querySelector('svg');
    if (!s) return;
    s.classList.add('sig-' + sig);
    setTimeout(() => s.classList.remove('sig-' + sig), ms);
  }

  function mood(el, m, ms = 2500) {
    const s = el && el.querySelector('svg');
    if (!s) return;
    s.classList.remove('mood-happy', 'mood-sad', 'mood-shock');
    s.classList.add('mood-' + m);
    setTimeout(() => s.classList.remove('mood-' + m), ms);
  }

  return { svg, signal, mood };
})();
