# Truco do Bar do Zé

Truco paulista para 2 pessoas na mesa + 2 parceiros robôs na tela.
Quem dá as cartas muda a cada mão. A voz fala só o básico: a manilha, o truco e a mão de onze ou de ferro.

## Como jogar

1. No notebook, dentro desta pasta:

   ```bash
   npm start
   ```

2. No notebook, abra `http://localhost:3000` (use `localhost`: o microfone só funciona assim).
   Ligue o notebook na TV, se quiser.
3. Clique em **Ligar som e microfone**.
4. Cada pessoa aponta a câmera do celular para o QR Code da TV (mesmo Wi-Fi).
   Ou abre o endereço que aparece embaixo dele. Escolhe nome e lugar.
5. Clique em **COMEÇAR!**

Se o macOS perguntar se o `node` pode receber conexões, clique em **Permitir**.

## Jogar pela internet

O jogo também roda na Cloudflare: https://truco.tharso.com

- A TV abre `https://truco.tharso.com`. Os celulares abrem `https://truco.tharso.com/mao`.
- Não precisa estar no mesmo Wi-Fi.
- Existe uma mesa só. Quem tem o link entra nela.
- Cada push na `main` publica sozinho (Workers Builds).

Como funciona: `worker/index.js` entrega as telas e guarda a partida num Durable Object
(a "Mesa"). A lógica da sala (`room.js`) é a mesma do servidor local.

Para testar a versão Cloudflare no computador (precisa de Node 22 para o wrangler novo):

```bash
npx wrangler dev
```

## Duplas

- **Dupla Azul:** Jogador 1 + Tonhão.
- **Dupla Vermelha:** Jogador 2 + Cida.
- Faltou alguém? Marque a caixa no lobby: a Dona Neide joga no lugar do Jogador 1, e o Juninho no lugar do Jogador 2.

## O que tem de divertido

- **Gritômetro:** pediu truco no celular? Grite "TRUCO!". O microfone mede o berro.
- **Sinais:** os robôs fazem sinais com o rosto no começo da mão, cada um num momento sorteado. A cola está no celular.
  O adversário também pode ver! Você também faz sinal: toque 😉 embaixo de uma carta.
  O robô parceiro vê o sinal 8 em 10 vezes, e o robô adversário 2 em 10 (`SIGNAL_SEEN` em `bots.js`).
- **Montar o parceiro:** ao escolher o parceiro no celular, você dá o nome e as barras de blefe e de coragem (0 a 10).
  Só você vê as barras. Cada Personagem já vem com as barras dele (`AVATARS` em `public/shared.js`).
- **Opinião:** quando pedem truco, o parceiro de quem responde faz uma cara na TV: aceita ou corre.
  Todo mundo vê. Se quem responde é o seu robô, você dá a opinião pelo celular.
- Mão de onze, mão de ferro, galinha quando alguém corre, confete, tremor.
- Botão 🔊 no topo da TV liga e desliga o som. Botão ↺ começa uma partida nova.

## Falas gravadas

As falas ficam em `public/audio/`. Elas são gravadas com uma voz do Mac:

```bash
scripts/gravar-vozes.sh Luciana
```

Para trocar a voz, baixe outra em Ajustes do Sistema → Acessibilidade → Conteúdo Falado
e rode o script com o nome dela. Para mudar uma frase, edite a lista no próprio script.

## Regras (truco paulista)

- Baralho sem 8, 9 e 10. Força: 4 5 6 7 Q J K A 2 3.
- Manilha = carta seguinte à vira. Ordem: ouros < espadas < copas < paus (zap).
- Truco 3 → seis 6 → nove 9 → doze 12. Quem corre dá o valor anterior.
- Quem responde ao truco (ou ao aumento) é o próximo depois de quem pediu. O parceiro dele só dá opinião.
- Da 2ª rodada em diante, dá pra jogar a carta fechada (virada pra baixo). Ela perde para qualquer carta aberta.
  Na mão de ferro não pode.
- Jogo até 12. Mão de onze: a dupla com 11 vê as cartas do parceiro e decide.
  Mão de ferro (11 × 11): todo mundo joga no escuro.

## Teste

```bash
npm test
```

Roda pela `node:test` todos os `test/*.test.js` e `test/navegador/*.test.js`:

- 500 partidas só com robôs (`PARTIDAS=2000 npm test` para mais);
- a Sala, vista de fora como a Mesa e os Celulares a veem (`test/sala.test.js`, com as telas falsas de `test/telas.js`);
- as regras do truco (`test/regras.test.js`);
- as páginas (nenhum `id` repetido);
- a lógica que saiu das telas para arquivos puros, testada no Node (`test/navegador/`, por exemplo o humor dos Personagens em `public/mood.js`).

Atalhos que montam situações por dentro do `Game` (placar 11 a 4, 11 a 11, cartas
escolhidas, Partida só de Robôs) ficam todos em `test/montagem.js`.

```bash
npm run cobertura
```

Mostra a cobertura por arquivo. É só pista, não meta (ver `docs/adr/0001`).

O `npm install` liga o gancho de `.githooks/pre-commit`: ele roda o `npm test`
e barra o commit se algum teste falhar.
