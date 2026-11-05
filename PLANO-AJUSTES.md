# Plano de ajustes — rodada 2

Fonte: 2 conversas com a Nina no Granola, em 05/11/2026.
- 10:54 — "Truco app feedback and improvements"
- 11:05 — "Truco game feature ideas"

O nome fica **Truco do Bar do Zé**. Você pensou em trocar, mas decidiu manter.

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

## Bloco 4 — Sinais que dá para pegar · 🟡 em parte (05/11/2026: rostos com foto, maiores, sinais no meio-termo)

1. **Rostos maiores e sinais mais claros.** Os sinais ficam mais lentos e mais exagerados.
   - Uma piscadinha dura mais tempo e mexe o rosto todo.
2. **Cada dupla tem sinais diferentes.** Por exemplo, a piscadinha é zap para a Azul e três para a Vermelha.
   - A cola no celular mostra só os sinais da sua dupla.
3. **Você também faz sinal.** No celular, cada carta tem um botão de sinal (😉).
   - Você toca, e o **seu** avatar na TV faz o sinal.
   - O robô parceiro vê o sinal 8 em 10 vezes.
   - O robô adversário vê o sinal 2 em 10 vezes.
   - Quem vê usa o sinal para jogar melhor.
   - Os números 80% e 20% ficam fáceis de mudar depois.
4. **Não chega sinal no celular.** Vocês decidiram assim: a graça é ver ou não ver.

## Bloco 5 — Escolher seu parceiro e seu rosto · 🟡 em parte (05/11/2026: escolha de personagem e nome do parceiro no celular)

1. **Escolher o seu rosto.** Ao entrar, cada pessoa escolhe um emoji ou personagem.
2. **Montar o seu parceiro robô.** Ao entrar, você escolhe:
   - o nome dele (por exemplo, "Cleitinho");
   - o quanto ele blefa, numa barra de 0 a 10;
   - o quanto ele tem coragem, numa barra de 0 a 10.
3. **O adversário não vê** as barras. Na TV aparece só o nome.
4. **Saem o "Blefador" e o "Medroso"** fixos. Os robôs ficam mais equilibrados: ninguém foge sempre.
   - Hoje o jeito de jogar do robô ainda vem do lugar na mesa, não do personagem. Há um teste "a fazer" para isso, e ele espera este bloco (decidido em 05/11/2026).

---

## Fica para depois (versão futura)

- Jogar online, cada um da sua casa, com avatares para todos.
- Jogar com 3 ou 4 pessoas, sem robôs.

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

