# Plano de ajustes — rodada 2

Fonte: 2 conversas com a Nina no Granola, em 05/11/2026.
- 10:54 — "Truco app feedback and improvements"
- 11:05 — "Truco game feature ideas"

O nome era **Truco do Bar do Zé**. Em 06/11/2026 virou **Truco do Bar do Blurp** (ver rodada 3 no fim).

---

## Bloco 1 — Mesa mais limpa (tela da TV) · ✅ feito em 05/11/2026

1. **Tirar o Seu Zé.** Ele sai da tela, e a lateral dele também.
   - Quem dá as cartas muda a cada mão, como numa mesa de verdade.
   - As cartas saem voando do lugar de quem está dando.
   - Arquivos: `table.html`, `table.css`, `table.js`.
2. **Avatares fora do feltro.** Os 4 rostos ficam na borda, do lado de fora da mesa, e ficam maiores.
   - No meio do feltro ficam só as cartas.
3. **Vira no centro.** A vira e a manilha ficam no meio da mesa, junto das cartas jogadas.
4. **Placar grande.** Números grandes e claros para cada dupla. Saem os "amendoins".
   - O valor da mão ("Vale 3") fica junto do placar.
5. **Botão de som sempre à vista.** Um botão 🔊 no topo da TV liga e desliga o som a qualquer hora.
6. **QR Code no lobby.** A TV mostra um QR Code. O celular lê e abre a mão direto.
   - O código do QR fica dentro do projeto. Não usa serviço externo.
7. **"Nova partida" fácil.** Um botão no topo zera a partida e volta ao lobby para trocar os jogadores.
   - O botão "Jogar de novo" no fim continua.

## Bloco 2 — Menos falação · ✅ feito em 05/11/2026 (voz Luciana do Mac)

1. **A voz fala só o básico:**
   - a manilha, quando a vira aparece;
   - mão de onze e mão de ferro;
   - o grito de truco (seis, nove, doze).
2. **Sai a zoeira.** Saem as piadas, as provocações narradas e os elogios.
   - Os botões de provocação no celular: eu tiraria também. Vocês não falaram deles. Se quiser manter, me diga.
3. **Lembrete só depois de 20 segundos.** Se alguém demora mais de 20 segundos, a voz dá um toque, uma vez só.
4. **Voz mais natural.** Veja a decisão A no fim.

## Bloco 3 — Truco de verdade · ✅ feito em 05/11/2026

1. **Quem responde é o Lugar logo depois de quem pediu.** Ele dá a palavra final: aceita, corre ou aumenta.
   - Vale também para o aumento. Exemplo: o Lugar 2 pede truco, o Lugar 3 grita "seis", e quem responde ao seis é o Lugar 0.
   - Se quem responde é Robô, ele decide. Se é Jogador, ele decide no Celular.
2. **O parceiro de quem responde dá a Opinião: "aceita" ou "corre".** Ele não decide.
   - Robô dá Opinião: o Personagem dele faz cara na Mesa ("aceita" = foto `feliz`, "corre" = foto `triste`). A cara aparece em cerca de 1 segundo.
   - Jogador dá Opinião: toca "Aceita" ou "Corre" no Celular, uma vez só. O Personagem dele faz a mesma cara na Mesa.
   - Todo mundo vê a cara. Ela diz a verdade (mesmo cálculo do cochicho antigo). Blefe na cara fica para o Bloco 5.
   - Robô que responde espera a Opinião do Jogador até 10 segundos. Sem Opinião, decide sozinho.
   - Robô usa a Opinião como pista: "aceita" deixa ele mais corajoso, "corre" com mais medo. Com mão muito forte ou muito fraca, pode fazer o contrário.
   - Dupla de dois Robôs: sem Opinião e sem cara.
   - Robôs não leem caras de ninguém (isso é Bloco 4).
3. **Sai o cochicho no Celular.** A mensagem "minha mão tá boa ou ruim" some.
4. **Carta fechada.**
   - Só a partir da 2ª Rodada. Na Mão de ferro não pode; na Mão de onze pode.
   - Perde para qualquer carta aberta. Ninguém vê, nem no fim da Mão.
   - Se as 4 cartas da Rodada forem fechadas, a Rodada empata.
   - No Celular: toque na carta para escolher. Aparece o botão "Jogar fechada". Tocar de novo na carta joga aberta, como hoje.
   - Robô fecha só carta que não serve na Rodada (o parceiro já ganha, ou a carta não ganha), 4 em 10 vezes, e nunca fecha Manilha. O número fica fácil de mudar.

## Bloco 4 — Sinais que dá para pegar · ✅ feito em 05/11/2026

1. **Rostos maiores e sinais mais claros.** Os sinais ficam mais lentos e mais exagerados.
   - A cara do Sinal fica 2,5 segundos na Mesa, e o rosto todo inclina e balança (`SIGNAL_MS` em `table.js`).
   - Cada Robô faz o Sinal num momento sorteado só para ele, entre 1 e 6 segundos depois das cartas (`SIGNAL_WINDOW` em `bots.js`). Às vezes dois Sinais vêm juntos, e você escolhe para quem olhar.
2. **Sinais iguais para as duas Duplas.** Decidido em 05/11/2026: ficam os sinais tradicionais. Sinal diferente por Dupla daria trabalho para aprender.
3. **Você também faz sinal.** No celular, cada carta tem um botão 😉.
   - Você toca, e o **seu** Personagem faz o sinal na TV. Manilha faz o naipe dela, 3 faz "tem um três", as outras cartas fazem "mão ruim".
   - Cada carta faz o sinal uma vez por Mão. Na Mão de ferro não tem 😉.
   - O robô parceiro vê o sinal 8 em 10 vezes. O robô adversário vê 2 em 10 (`SIGNAL_SEEN` em `bots.js`). Vale para os sinais dos Robôs também.
   - Quem vê lembra até a carta do sinal ser jogada. Sinal bom do parceiro deixa o Robô mais corajoso; do adversário, com mais medo, mas menos (`SIGNAL_WEIGHT` e `OPPONENT_SIGNAL` em `bots.js`).
   - O sinal "mão ruim" não é de uma carta só, então quem vê lembra dele até a Mão acabar (revisão de 05/11/2026).
   - O Sinal do Robô só acontece na hora sorteada: a TV mostra a cara e, nessa hora, os Robôs tiram a sorte de ver. Se o Robô já jogou a carta do Sinal antes da hora, o Sinal não acontece (revisão de 05/11/2026).
4. **Não chega sinal no celular.** Só a Mesa recebe o sinal. A graça é ver ou não ver.

## Bloco 5 — Escolher seu parceiro e seu rosto · ✅ feito em 05/11/2026

1. **Escolher o seu rosto.** Ao entrar, cada pessoa escolhe um Personagem.
2. **Montar o seu parceiro robô.** Ao entrar, você escolhe:
   - o nome dele (por exemplo, "Cleitinho");
   - o quanto ele blefa, numa barra de 0 a 10;
   - o quanto ele tem coragem, numa barra de 0 a 10.
   - As barras começam nas do Personagem (Tonhão blefa 7, Cida tem coragem 3…), em `AVATARS` de `public/shared.js`.
3. **O adversário não vê** as barras. Na TV aparece só o nome. Só o seu Celular mostra as barras do seu parceiro.
4. **Saem o "Blefador" e o "Medroso"** fixos. O jeito de jogar vem do Personagem e das barras, não do Lugar.
   - Os robôs ficam mais equilibrados: com coragem 0, o Robô ainda encara Truco com mão boa (`BLUFF_MAX` e `NERVE_MAX` em `bots.js`).
5. **Blefe na cara fica fora.** Decidido em 05/11/2026: a Opinião continua dizendo a verdade. Mentir na cara engana mais o próprio parceiro do que o adversário.
   - "A verdade" é o que o Robô sabe: a mão dele e os Sinais que ele viu. Um Sinal de zap do adversário pode virar a Opinião para "corre" (revisão de 05/11/2026).

---

## Onde paramos (06/11/2026): jogar online

O online para 2 pessoas está feito e publicado (spec #8, ADR 0002):
- #9 Salas por código: `truco.tharso.com` cria uma Sala nova (`/s/KF4P`).
- #10 Lugar com dono: o primeiro Celular fica com o Lugar. Quem cai volta, e a Partida espera.
- #11 A Sala fica guardada na Cloudflare e some depois de 6 horas vazia.

**Parado de propósito: protótipo da tela juntada (#12).** Mesa pequena em cima do Celular, em `truco.tharso.com/s/CODIGO/junto` (arquivos `public/junto.*`).
O Tharso tem várias observações sobre ele, mas outras prioridades vieram antes.
**Para retomar:** abrir o protótipo no celular, ouvir as observações do Tharso, e decidir na #12: vira feature, muda ou sai.

Depois: jogar com 2, 3 ou 4 pessoas (#13, faltam perguntas para o Tharso).

## Onde paramos (05/11/2026)

Os Blocos 1 a 5 estão feitos e publicados em https://truco.tharso.com (último commit do jogo: `679474f`).
Depois do Bloco 5 teve uma revisão do código (`/code-review` desde `efd4f91`). O que ela achou de importante foi corrigido.

**Próximo passo:** jogar uma partida com a Nina. Com o que vocês acharem, abrir a rodada 3 com `/grill-with-docs`.

**Sobras da revisão · ✅ limpas em 05/11/2026.**
1. As Barras do parceiro não voltam mais ao padrão quando o rosto dele troca. Só seguem o rosto novo se eram as do rosto antigo, como o nome (`fixConflicts` em `room.js`).
2. `signal()` e `canSignal()` usam a mesma conferência, `signalError()`, em `game.js`.
3. Saíram os exports sem uso de `bots.js` e `game.js`.
4. Blefe e coragem viraram um campo só no Lugar: `bars` (`{ bluff, nerve }`). Para o Celular e para o pedido `pick`, nada mudou.
5. No Celular, saiu o rótulo pequeno "toque de novo" de cima da carta escolhida. A frase grande já diz isso.

**Para quem mexer nos testes:** a mesma sorte (`rng`) dá as cartas e decide os Robôs. Mudar a lógica de um Robô muda as cartas das Mãos seguintes, e os testes da Sala que dependem de semente quebram. Para achar uma semente nova, use `node scripts/achar-semente.js <alvo>` (os alvos estão no começo do arquivo).

## Fica para depois (versão futura)

- Jogar online, cada um da sua casa. Planejado em 05/11/2026: spec na issue #8, tickets #9 a #12, decisões no ADR 0002.
- Jogar com 2, 3 ou 4 pessoas, no bar e online. Fica depois do online: issue #13.

## Ordem que eu sugiro

1. Bloco 1 e Bloco 2 juntos. É o que mais muda a cara do jogo.
2. Bloco 3.
3. Bloco 4 e Bloco 5 juntos, porque os dois mexem nos robôs.

A cada bloco: rodo os testes, jogo uma partida no navegador e publico.

---

## Decisão A — voz mais natural · ✅ decidido: vozes do Mac

1. **Áudios gravados com as vozes do Mac (eu recomendo).** Como a voz vai falar pouco, as frases são poucas, umas 25. Eu gravo cada frase com a melhor voz em português do seu Mac e guardo os arquivos no projeto. Não custa nada e soa igual em qualquer aparelho.
   - Para a melhor qualidade, você baixa uma voz "Premium" em Ajustes do Sistema → Acessibilidade → Conteúdo Falado.
2. **Voz de um serviço pago (ElevenLabs ou OpenAI).** Soa mais humana. Mas precisa de conta e chave, e custa alguns centavos para gerar os áudios uma vez.

---

## Feito fora do plano (05/11/2026)

- 4 personagens com foto (Tonhão, Cida, Dona Neide, Juninho), 12 caras cada. Arte em `arte/`.
- Apelidos (Blefador, Medroso) saíram das telas.
- Baralho com figuras de verdade e naipes espalhados.
- Quem está na vez cresce 35%. Placar centralizado.
- Deploy automático na Cloudflare religado (o app do GitHub não tinha acesso ao repositório).


---

## Rodada 3 — interface (06/11/2026) · ✅ feita

Grilling com Tharso. Tudo nas issues #14 a #22, todas fechadas.

- Nome novo: **Truco do Bar do Blurp**. Baralho desenhado em código, minimalista (#15, #22).
- A Fala sai do Personagem: ele cresce e um balão grande sai dele. A vez é só um anel amarelo; não cresce mais (#14, #19).
- Truco, aceite e corrida: só balão. No meio ficam só os Avisos da Mesa.
- Mão decidida: a Mão acaba na hora, usando só o que todos viram (#16).
- Robôs mais lentos: carta em 2,5–4,5 s, resposta de truco em 3,5–5,5 s (#17).
- Hall sem Gritômetro, passo 3 com "? + ?", título mais junto (#18).
- Falas novas e vozes regravadas; a voz do fim diz só "Fim de jogo!" (#21).

Falta: jogar uma Partida de verdade e ajustar o ritmo e os balões, se precisar.

---

## Rodada 4 — Mesa e Celular mais limpos, vozes dos Personagens (06/11/2026) · Mesa (#23) e Celular (#24) feitos; vozes (#25) esperam as gravações

Grilling com Tharso, com um board de "fica / sai" (`docs/board-rodada4.html`).

**Mesa (TV)**
- Saem: a plaquinha "🃏 dá as cartas" e a etiqueta "VIRA".
- Manilha: só "Manilha: 5". Figuras e ás por extenso: "Manilha: Valete", "Dama", "Rei", "Ás".
- Linha de estado: saem "Fulano está pensando…" e "Vez de Fulano · jogue pelo celular". Ficam "dando as cartas", "aceita, corre ou aumenta?", "joga ou corre?" e "caiu".
- Pensando: três pontinhos (•••) piscando ao lado do rosto de quem está na vez, Robô ou Jogador. Sem palavra. O anel amarelo continua.
- Sinal: o rosto não cresce nem balança. Só a cara troca, por 1,2 s (era 2,5 s).
- Avisos da Mesa e balões da Fala ficam iguais.

**Celular**
- Saem: placar, linha "Você: … com …", vira pequena, "Manilha: 5" e o selo "Vale". A manilha continua marcada na carta.
- Linha de estado: só o que é para você fazer (sua vez, encarar, opinião, mão de onze). Saem "Vez de Fulano…", "dando as cartas", "Rodada sua / Perdeu", "+3 pra vocês".
- Painéis de truco e de Opinião: sai o texto de cima. Ficam os botões.
- Mão de onze: 2 faixas de 3 cartas. Em cima, "Suas cartas", no fundo normal. Embaixo, as do parceiro, numa faixa com a cor da Dupla, com rosto e nome dele.

**Vozes** (roteiro em `docs/vozes-para-gravar.md`)
- Cada Personagem grava 6 falas: Truco, Seis, Nove, Doze, Mostra, Tô fora. Vale para Robô e para o Personagem do Jogador.
- "Mostra!" e "Tô fora!" passam a ter som.
- O Blurp também é a Voz da Mesa: grava as 17 falas de anúncio.
- Tharso grava um arquivo por Personagem, com 2 s de silêncio entre as falas. O Claude corta com `ffmpeg` e põe em `public/audio/`.

---

## Rodada 5 — Mesa em perspectiva (06/11/2026) · ✅ feita (commit 5dd1575)

Grilling com Tharso, a partir de uma imagem de referência (só a perspectiva).

**Mesa (TV)**
- Tampo: a mesa desenhada inclina 35°, fica 3 por 2 e se ajusta à janela, sempre no centro.
- Cartas jogadas e Vira deitam no Tampo, um pouco tortas, com sombra curta. Textos ficam retos.
- Personagem de trás do tamanho de antes; os outros três 20% maiores.
- Cartas na mão em leque, fechado embaixo, 25% maiores.
- Marca da Rodada: 1ª, 2ª, 3ª embaixo das cartas de quem ganhou (cor da Dupla) ou empatou (cinza).
- Quem caiu: o Personagem fica apagado, com "caiu" na plaquinha. Sai o aviso do Tampo.

**Mesa e Celular**
- Nenhuma carta marca Manilha (sem etiqueta, sem brilho). Só "Manilha: 5", ao lado da Vira.
- Festa do zap só quando o zap ganha a Rodada que dá a Mão.
- Janela estreita (mais alta que 3:2): rostos limitados pela largura e Tampo sem cartas flutuando. Tela cheia 16:9 e 16:10 não muda. (07/11/2026)

---

## Rodada 6 — Robô sempre faz Sinal (07/11/2026) · ✅ feita

Tharso notou Robôs sem Sinal. Laço com 30 Partidas só de Robôs: 25% das vezes um Robô ficava calado.

- Causa 1 (95%): com a mão só de lixo, o Robô calava 4 em 10 Mãos (sorteio no `bots.js` desde o 1º commit). Agora ele sempre faz "lixo".
- Causa 2 (5%): o Robô que começa a Mão joga a carta do Sinal antes da hora sorteada do Sinal. Fica assim: carta jogada não precisa de Sinal. Regra: o Robô nunca escolhe a carta para fugir do Sinal.
- Testes da Mão de onze: semente 25 virou 52 (mesmo placar 8 a 11).

---

## Rodada 7 — Cola com fotos (07/11/2026) · ✅ feita (PR #27)

Grilling com Tharso.

**Celular (e Junto)**
- A Cola dos sinais do parceiro vira uma grade de 6 fotos (3 × 2), na própria tela.
- Cada foto é o rosto do Personagem parceiro fazendo um Sinal. Embaixo, só o nome da carta (Zap, Copão, Espadilha, Pica-fumo, Tem um três, Mão ruim).
- Sem parceiro, o seu rosto. Sem nenhum rosto, a lista de texto de antes.
- Trocou o parceiro, as fotos trocam junto.

---

## Rodada 8 — Vozes gravadas dos Personagens (07/11/2026) · ✅ feita em parte (PR #28) · issue #25

Tharso gravou 7 Personagens. Não seguiu o texto à risca: vale como ficou ("Tô dentro, pode vir pra cima", "Catapimbas, tô fora!").

- Cada Personagem pede Truco, Seis, Nove e Doze com a própria voz, Robô ou Jogador.
- "Mostra!" e "Tô fora!" passam a ter som.
- Cortes em `public/audio/<personagem>/<fala>.m4a`, feitos por `scripts/cortar-vozes.sh` (tempos do silêncio; o nome falado no começo fica de fora).
- Falta: Juninho (usa a voz antiga no truco; Mostra e Tô fora mudos) e as 17 falas do Blurp como Voz da Mesa (segue a voz Luciana).

---

## Rodada 9 — Mila, Theo e Clara (08/11/2026) · ✅ feita (PR #29)

Grilling com Tharso. Três Personagens novos, feitos a partir de fotos de pessoas reais (as fotos ficam fora do git).

**Personagens**
- Nomes puros: Mila, Theo, Clara. Ids `mila`, `theo`, `clara`.
- Arte: a mesma receita (KIE `nano-banana-2-1`, estilo 3D, 12 caras a partir da `neutro`, WebP sem fundo, piscada com boca neutra). Antes, 2 provas de cada em `arte/provas-novos/`; Tharso escolhe.
- Escolhidas: Mila prova 1, Theo prova 2, Clara hip-hop prova 2.
- Mila: cabelo comprido ondulado, raiz castanho-escura com mechas douradas, olhos castanhos, sardas leves, colar fino dourado. Blusa rosa-claro com listras pretas de zebra.
- Theo: cabelo castanho-escuro liso e cheio, franja em cuia, óculos azul-claro em todas as caras, pintinhas na bochecha, todos os dentes. Moletom amarelo-mostarda.
- Clara: cabelo castanho-claro liso e comprido com mechas loiras, olhos castanhos, sem óculos. Depois de uma prova comum e uma K-Pop, Tharso escolheu o visual hip-hop: chapéu bucket creme, jaqueta corta-vento anos 90 (verde-água, roxo e branco), correntinha e argolinhas.
- Barras (a ajustar depois): Mila blefe 9 e coragem 3; Theo blefe 2 e coragem 9; Clara blefe 4 e coragem 2.
- Vozes: entram depois. Até gravarem, ficam como o Juninho (voz antiga no truco; Mostra e Tô fora mudos).
- Tela de escolha no Celular: segue em 4 colunas (11 Personagens, 3 linhas).

**Sem Personagem fixo**
- A Sala nova sorteia o Personagem de cada parceiro. Saem Tonhão e Cida como padrão.
- O Robô que entra no lugar de um Jogador também é sorteado. Saem Neide e Juninho como padrão.
- O Jogador troca o parceiro na escolha, como hoje.
- No código: `Room` sorteia com `opts.escolha` (separado do sorteio das cartas). Os testes passam `elencoFixo`, que pega sempre o primeiro livre.

---

## Rodada 10 — Vozes da Mila, do Theo e da Clara (08/11/2026) · ✅ feita (PR #30)

Tharso gravou os três (Clara em `.opus`). Cada um tem Truco, Seis, Nove, Doze, "Tô dentro" (Mostra) e "Tô fora".

- Cortes em `public/audio/<personagem>/<fala>.m4a`, com os tempos no `scripts/cortar-vozes.sh`.
- O script agora pula quem não tem gravação na pasta: dá para cortar só as gravações novas.
- Falta: Juninho e as falas do Blurp como Voz da Mesa.

---

## Rodada 11 — Página do Elenco (08/11/2026) · ✅ feita (PR #31)

Pedido de Tharso: uma página para ver e testar todas as caras e Falas de todos os Personagens.

- Endereço: `/elenco` (servidor local e Cloudflare). Não entra em Sala nenhuma.
- Um cartão por Personagem: retrato grande, Barras, se tem voz própria, as 6 Falas e as 12 caras.
- Tocar numa cara mostra ela grande. Tocar numa Fala toca o som, mostra o balão e mexe a boca como na Mesa. "▶ Todas" toca as 6 em seguida.
- Quem não tem voz própria (Juninho) fica com Mostra e Tô fora apagados, como no jogo.
- Arquivos: `public/elenco.html`, `elenco.js`, `elenco.css`.

