#!/bin/bash
# Uma Partida só de Robôs, para olhar a Mesa: cartas caem no Tampo, Rodadas acabam,
# aparecem as Marcas da Rodada, Truco e Falas. Ninguém "cai", porque não há Jogador.
# Uso: scripts/cena.sh [endereço]   (padrão: http://localhost:3000)
# Depois abra a Mesa no navegador (o endereço acima). Para parar: {"type":"lobby","seat":0}.
set -euo pipefail
URL="${1:-http://localhost:3000}"

acao() {
  printf '%-45s ' "$1"
  curl -fsS -X POST "$URL/api/action" -d "$1"
  echo
}

acao '{"type":"lobby","seat":0}'
acao '{"type":"config","seat":0,"bot":true}'
acao '{"type":"config","seat":1,"bot":true}'
acao '{"type":"start","force":true}'
