// Humor dos Personagens com foto: decide qual foto entra quando um humor é pedido.
// Arquivo puro, usado pela Mesa (faces.js) e testado no Node (test/navegador/).
(function (root) {
  const MOOD_PHOTO = { happy: 'feliz', sad: 'triste', shock: 'susto' };

  // current: a foto que o Personagem mostra agora. mood: o humor pedido.
  // Devolve a foto a mostrar, ou null para não trocar.
  function moodPhoto(current, mood) {
    const idle = !current || current === 'neutro';
    const showingMood = Object.values(MOOD_PHOTO).includes(current);
    if (!idle && current !== 'falando' && !showingMood) return null;
    return MOOD_PHOTO[mood] || 'neutro';
  }

  const MOOD = { moodPhoto };
  if (typeof module !== 'undefined' && module.exports) module.exports = MOOD;
  else root.MOOD = MOOD;
})(typeof window !== 'undefined' ? window : globalThis);
