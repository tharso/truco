# Estratégia de testes: duas costuras, sem teste de tela, cobertura por lista

O projeto passou a ser desenvolvido com TDD (05/11/2026). Os testes usam `node:test`, que já vem no Node, e entram por duas costuras só: a **Sala** (`Room`), que é a principal e é observada apenas pelo que ela manda para a Mesa e para os Celulares, e o **Game**, usado só para regras difíceis de montar pela Sala. "Boa cobertura" quer dizer uma lista de comportamentos (cada regra do README, cada ação da Sala, cada bug corrigido), e não uma porcentagem de linhas.

## Opções consideradas

- **Testar as telas num navegador automático (Playwright).** Rejeitado por agora: é lento, pesado e quebra quando o visual muda. A lógica das telas sai para arquivos puros (como `public/shared.js`) e é testada no Node, mas só quando um ticket precisar mexer nela. O que é desenho (CSS) se confere no navegador, com print de prova.
- **Meta de porcentagem (por exemplo, 80%).** Rejeitado: a porcentagem premia testar detalhe sem importância. O relatório de cobertura serve só como pista.
- **Branch e PR com CI no GitHub Actions.** Rejeitado por agora: é um projeto de uma pessoa, e cada push na `main` já publica. No lugar disso, um gancho em `.githooks/` roda o `npm test` antes de cada commit.

## Consequências

- Os testes nunca leem `room.game` nem estado interno da Sala. Atalhos para montar situações (como placar 11 a 4) ficam todos em `test/montagem.js`, para que uma mudança interna no `Game` mexa num arquivo só.
- `server.js` e `worker/index.js` ficam sem teste automático.
- Dos Robôs, testa-se que não fazem jogada inválida, que a partida não trava, e as **regras de Robô que o `PLANO-AJUSTES.md` fixa** (mudança de 05/11/2026, nos Blocos 3 a 5). Exemplos: o parceiro vê o Sinal 8 em 10 vezes; o Robô nunca fecha a Manilha; Sinal bom do parceiro deixa o Robô mais corajoso; com coragem 0 ele ainda encara Truco com mão boa. Essas regras são do jogo, e o dono decidiu cada uma.
- O ajuste fino dos Robôs continua sem teste: os pesos e limites (`SIGNAL_WEIGHT`, `OPINION_WEIGHT`, as fórmulas de `winProb`). Um teste de regra de Robô monta uma situação clara (mão muito fraca, mão muito forte), para não quebrar quando um peso muda.
- Bug que já existe vira teste marcado como `todo`, escrito com o comportamento certo. Nunca um teste que confirma o bug.
