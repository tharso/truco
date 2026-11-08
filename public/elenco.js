// Página do Elenco (/elenco): todas as caras e todas as Falas de cada Personagem, para ver e testar.
// Não é uma tela do jogo: não entra em Sala nenhuma.
'use strict';
(function () {
  const S = window.SHARED;
  const T = window.TABLE_TEXT;

  // As 12 caras, na ordem: as de Sinal primeiro (com o nome da carta, como na Cola), depois humor e vida.
  const CARAS = [
    { x: 'neutro', nome: 'Neutra' },
    ...['zap', 'copas', 'espadas', 'ouros', 'tres', 'lixo'].map((x) => ({ x, nome: S.SIGNALS[x].short, como: S.SIGNALS[x].how })),
    { x: 'feliz', nome: 'Feliz', como: 'Opinião "aceita"' },
    { x: 'triste', nome: 'Triste', como: 'Opinião "corre"' },
    { x: 'truco', nome: 'Truco', como: 'Quando pede Truco' },
    { x: 'piscando', nome: 'Piscando', como: 'Pisca sozinho' },
    { x: 'falando', nome: 'Falando', como: 'Boca da Fala' },
  ];
  // As Falas gravadas, com a palavra do balão na Mesa.
  const BALAO = { truco: 'TRUCO!', seis: 'SEIS!', nove: 'NOVE!', doze: 'DOZE!', mostra: 'Mostra!', fora: 'Tô fora!' };

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function cartao(a) {
    const temVoz = T.VOZES.includes(a.id);
    const caras = CARAS.map((c) => `
      <button class="cara${c.x === 'neutro' ? ' sel' : ''}" data-x="${c.x}" title="${esc(c.como || c.nome)}">
        <img src="/avatars/${a.id}/${c.x}.webp" alt="" loading="lazy"><span>${esc(c.nome)}</span>
      </button>`).join('');
    const falas = T.FALAS.map((f) => {
      const som = T.falaDe(a.id, f);
      return `<button class="fala" data-f="${f}" ${som ? `data-som="${som}"` : 'disabled'}>${BALAO[f]}</button>`;
    }).join('');
    return `
      <section class="pers" data-id="${a.id}">
        <div class="retrato">
          <div class="foto"><img class="grande" src="/avatars/${a.id}/neutro.webp" alt="${esc(a.name)}"></div>
          <div class="balao hidden"></div>
        </div>
        <div class="info">
          <h2 class="shout">${esc(a.name)}</h2>
          <p class="barras">Blefe <b>${a.bluff}</b> · Coragem <b>${a.nerve}</b></p>
          <p class="voz${temVoz ? '' : ' sem'}">${temVoz ? 'Voz própria' : 'Sem voz própria: usa a voz antiga no Truco; Mostra e Tô fora ficam mudos'}</p>
          <div class="falas">${falas}<button class="todas">▶ Todas</button></div>
          <div class="caras">${caras}</div>
        </div>
      </section>`;
  }

  document.getElementById('elenco').innerHTML = S.AVATARS.map(cartao).join('');

  // Só uma Fala por vez na página inteira.
  let tocando = null;
  function parar() {
    if (!tocando) return;
    tocando.audio.pause();
    tocando.fim();
    tocando = null;
  }

  function mostrar(sec, x) {
    sec.querySelector('.grande').src = `/avatars/${sec.dataset.id}/${x}.webp`;
    sec.querySelectorAll('.cara').forEach((b) => b.classList.toggle('sel', b.dataset.x === x));
  }

  // Toca uma Fala: balão, boca mexendo (falando e neutra alternando, como na Mesa) e o som.
  function falar(sec, botao) {
    parar();
    return new Promise((pronto) => {
      const audio = new Audio(`/audio/${botao.dataset.som}.m4a`);
      const balao = sec.querySelector('.balao');
      balao.textContent = BALAO[botao.dataset.f];
      balao.classList.remove('hidden');
      botao.classList.add('on');
      let aberta = false;
      const boca = setInterval(() => { aberta = !aberta; mostrar(sec, aberta ? 'falando' : 'neutro'); }, 140);
      const fim = () => {
        clearInterval(boca);
        mostrar(sec, 'neutro');
        balao.classList.add('hidden');
        botao.classList.remove('on');
        pronto();
      };
      tocando = { audio, fim };
      audio.onended = () => { if (tocando && tocando.audio === audio) { tocando = null; fim(); } };
      audio.onerror = audio.onended;
      audio.play().catch(audio.onended);
    });
  }

  document.getElementById('elenco').addEventListener('click', async (e) => {
    const sec = e.target.closest('.pers');
    if (!sec) return;
    const cara = e.target.closest('.cara');
    if (cara) { parar(); mostrar(sec, cara.dataset.x); return; }
    const fala = e.target.closest('.fala');
    if (fala && !fala.disabled) { falar(sec, fala); return; }
    if (e.target.closest('.todas')) {
      for (const b of sec.querySelectorAll('.fala:not([disabled])')) {
        await falar(sec, b);
        if (tocando) return; // outra Fala começou no meio
        await new Promise((r) => setTimeout(r, 350));
      }
    }
  });
})();
