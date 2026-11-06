#!/bin/bash
# Grava as falas do jogo com uma voz do Mac e salva em public/audio/*.m4a.
# Uso: scripts/gravar-vozes.sh [voz]   (padrão: Luciana)
# Dica: baixe uma voz "Premium" em Ajustes do Sistema → Acessibilidade → Conteúdo Falado
# e rode de novo com o nome dela.
set -euo pipefail
VOZ="${1:-Luciana}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/audio"
TMP="$(mktemp -d)"
mkdir -p "$DIR"

FRASES=(
  "man-4|A manilha é o quatro."
  "man-5|A manilha é o cinco."
  "man-6|A manilha é o seis."
  "man-7|A manilha é o sete."
  "man-Q|A manilha é a dama."
  "man-J|A manilha é o valete."
  "man-K|A manilha é o rei."
  "man-A|A manilha é o ás."
  "man-2|A manilha é o dois."
  "man-3|A manilha é o três."
  "truco|Truco!"
  "seis|Seis!"
  "nove|Nove!"
  "doze|Doze!"
  "onze|Mão de onze!"
  "ferro|Mão de ferro! Eu adoro mão de ferro!"
  "vez|Joga aê!!"
  "responde|E aí? Aceita ou foge?"
  "onze-decide|Vai ou não vai?"
  "comeca|Vamos começar!"
  "fim|Fim de jogo!"
)

for item in "${FRASES[@]}"; do
  chave="${item%%|*}"
  texto="${item#*|}"
  say -v "$VOZ" -r 190 -o "$TMP/$chave.aiff" "$texto"
  afconvert -f m4af -d aac -b 64000 "$TMP/$chave.aiff" "$DIR/$chave.m4a"
done
rm -rf "$TMP"
echo "OK: ${#FRASES[@]} falas gravadas com a voz $VOZ em $DIR"
