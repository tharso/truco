#!/bin/bash
# Corta as gravações dos Personagens (uma por Personagem, falas separadas por silêncio)
# e salva cada fala em public/audio/<personagem>/<fala>.m4a.
# Uso: scripts/cortar-vozes.sh <pasta com Tonhão.m4a, Cida.m4a…>
# Os tempos (início-fim, em segundos) vieram do silencedetect do ffmpeg:
#   ffmpeg -i X.m4a -af silencedetect=noise=-45dB:d=0.6 -f null -
# O nome do Personagem no começo de cada gravação fica de fora.
# Gravou de novo? Rode o silencedetect e troque os tempos daquele Personagem.
set -euo pipefail
SRC="${1:?uso: scripts/cortar-vozes.sh <pasta das gravações>}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/audio"
FALAS=(truco seis nove doze mostra fora)

# personagem|arquivo|truco seis nove doze mostra fora
CORTES=(
  "tonhao|Tonhão.m4a|4.30-4.99 7.53-8.82 10.91-12.34 15.17-16.24 19.38-20.70 23.33-25.59"
  "cida|Cida.m4a|2.59-4.18 5.26-6.68 7.95-8.98 10.15-11.39 13.51-15.36 16.45-18.55"
  "neide|Dona Neide.m4a|2.64-4.08 5.94-6.84 8.62-9.56 12.17-14.49 16.85-18.60 20.34-22.16"
  "blurp|Blurp.m4a|3.91-5.75 8.09-9.89 12.54-13.86 16.50-18.43 24.96-25.81 29.13-30.41"
  "beto|Beto.m4a|4.05-4.56 6.08-7.05 8.41-9.00 10.90-12.08 14.13-16.14 18.53-20.25"
  "roque|Roque.m4a|3.44-4.04 5.26-6.25 7.56-8.61 9.64-10.46 11.96-12.92 14.03-15.43"
  "nina|Nina.m4a|2.18-3.03 4.63-5.27 6.30-7.05 8.14-9.06 11.09-11.72 13.61-14.55"
)

for linha in "${CORTES[@]}"; do
  IFS='|' read -r id arq tempos <<<"$linha"
  mkdir -p "$DIR/$id"
  i=0
  for t in $tempos; do
    read -r ini dur fade <<<"$(awk -v a="${t%-*}" -v b="${t#*-}" \
      'BEGIN { i = a - 0.08; d = b + 0.15 - i; printf "%.2f %.2f %.2f", i, d, d - 0.08 }')"
    ffmpeg -hide_banner -loglevel error -y -ss "$ini" -t "$dur" -i "$SRC/$arq" \
      -af "afade=t=in:d=0.03,afade=t=out:st=$fade:d=0.08,loudnorm=I=-16:TP=-1.5" \
      -ac 1 -ar 44100 -c:a aac -b:a 64k "$DIR/$id/${FALAS[$i]}.m4a"
    i=$((i + 1))
  done
done
echo "OK: ${#CORTES[@]} Personagens × ${#FALAS[@]} falas em $DIR"
