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

- **Dupla Azul:** Jogador 1 + Tonhão, o Blefador.
- **Dupla Vermelha:** Jogador 2 + Valdir, o Medroso.

## O que tem de divertido

- **Gritômetro:** pediu truco no celular? Grite "TRUCO!". O microfone mede o berro.
- **Sinais:** os robôs fazem sinais com o rosto no começo da mão. A cola está no celular.
  O adversário também pode ver!
- **Cochicho:** quando pedem truco pra você, seu parceiro robô cochicha no seu celular.
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
- Jogo até 12. Mão de onze: a dupla com 11 vê as cartas do parceiro e decide.
  Mão de ferro (11 × 11): todo mundo joga no escuro.

## Teste

```bash
npm test
```

Roda 500 partidas só com robôs e confere as regras.
