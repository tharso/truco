#!/bin/bash
# Monta uma Partida pronta para olhar no navegador, só com POST em /api/action:
# o Jogador 1 entra como Nina, com o parceiro Cleitinho (Roque, blefe 2, coragem 9),
# o Lugar do Jogador 2 vira Robô, e a Partida começa.
# Uso: scripts/montar-partida.sh [endereço]   (padrão: http://localhost:3000)
# Depois, mande jogadas do mesmo jeito. Ex.: {"type":"sinal","seat":0,"idx":0}
# Ações (seat = 0 ou 1, o Lugar do Jogador):
#   play     {"idx":0, "fechada":true?}     truco     {}
#   respond  {"ans":"aceito"|"corro"|"aumento"}
#   opiniao  {"ans":"aceita"|"corre"}        onze      {"ans":"joga"|"corre"}
#   sinal    {"idx":0}                       lobby     {}  (volta ao saguão)
# Sem Celular conectado, a Mesa mostra o Jogador como "caiu". Para só olhar a Mesa, use scripts/cena.sh.
set -euo pipefail
URL="${1:-http://localhost:3000}"

acao() {
  printf '%-60s ' "$1"
  curl -fsS -X POST "$URL/api/action" -d "$1"
  echo
}

acao '{"type":"join","seat":0,"name":"Tharso"}'
acao '{"type":"pick","seat":0,"avatar":"nina","partner":"roque","partnerName":"Cleitinho","bluff":2,"nerve":9}'
acao '{"type":"config","seat":1,"bot":true}'
acao '{"type":"start","force":true}'
