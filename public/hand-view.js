// O que o Celular escreve: a linha de estado, a Mão de onze e a Cola.
// Arquivo puro, usado pelo Celular (hand.js) e testado no Node (test/navegador/).
(function (root) {
  // Linha de estado. Durante a Mão, só o que é para o Jogador fazer (Rodada 4, 06/11/2026).
  // selected: a carta escolhida (-1 se nenhuma).
  function statusText(st, selected) {
    const s = st.seats;
    const me = st.me;
    if (s[me].bot) return `${s[me].name} está jogando no seu lugar. Desmarque na TV.`;
    switch (st.phase) {
      case 'lobby': return 'Esperando começar…';
      case 'onze': return st.mustOnze ? 'Decida a mão de onze!' : 'Mão de onze: esperando os outros…';
      case 'truco':
        if (st.mustRespond) return 'E aí? Vai encarar?';
        if (st.mustOpine) return 'Dê a sua opinião!';
        return '';
      case 'play':
        if (!st.canPlay) return '';
        if (selected < 0) return 'SUA VEZ! Escolha uma carta';
        return st.canPlayClosed ? 'Toque de novo, ou jogue fechada' : 'Toque de novo pra jogar!';
      case 'over': return st.winner === me % 2 ? '🏆 VOCÊS VENCERAM!' : '😭 Perderam! Paga a rodada!';
      default: return '';
    }
  }

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

  // Mão de onze: 2 faixas de 3 cartas. Em cima as suas, no fundo normal.
  // Embaixo as do parceiro, na cor da Dupla, com o rosto e o nome dele.
  // cardHTML(carta, manilha): a carta desenhada (SHARED.cardHTML).
  function onzeHTML(st, cardHTML) {
    const cards = (list) => `<div class="onze-cards">${(list || []).map((c) => cardHTML(c, st.manilha)).join('')}</div>`;
    const partner = st.seats[st.me + 2];
    const face = partner.avatar ? `<img class="onze-face" src="/avatars/${esc(partner.avatar)}/neutro.webp" alt="">` : '';
    return `<div class="onze-row mine"><div class="onze-who">Suas cartas</div>${cards(st.hand)}</div>`
      + `<div class="onze-row partner t${st.me % 2}"><div class="onze-who">${face}<span>${esc(partner.name)}</span></div>`
      + `${cards(st.partnerHand)}</div>`;
  }

  // Cola: o rosto do parceiro fazendo cada Sinal, com o nome da carta embaixo.
  // Sem parceiro, o seu rosto. Sem nenhum rosto, a lista de texto.
  // signals: SHARED.SIGNALS.
  function colaHTML(st, signals) {
    const s = st && st.seats;
    const face = s && ((s[st.me + 2] && s[st.me + 2].avatar) || (s[st.me] && s[st.me].avatar));
    const list = Object.entries(signals);
    if (!face) return list.map(([, x]) => `<div class="sig"><span>${x.label}</span><b>${x.how}</b></div>`).join('');
    return `<div class="sig-grid">${list.map(([k, x]) => `<figure class="sig-photo">`
      + `<img src="/avatars/${esc(face)}/${k}.webp" alt="${esc(x.how)}"><figcaption>${x.short}</figcaption></figure>`).join('')}</div>`;
  }

  const HAND_VIEW = { statusText, onzeHTML, colaHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = HAND_VIEW;
  else root.HAND_VIEW = HAND_VIEW;
})(typeof window !== 'undefined' ? window : globalThis);
