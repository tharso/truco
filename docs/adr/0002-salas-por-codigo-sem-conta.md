# Jogar online: Salas por código, sem conta, e a Partida espera quem cai

Decidido em 05/11/2026, para jogar online (cada um da sua casa). Na Cloudflare, abrir `truco.tharso.com` cria uma **Sala** nova, com um **Código da Sala** de 4 letras. A Mesa mostra o link e o QR Code com o código. Quem abre o link entra na Sala: na TV ou no computador vira Mesa, no celular vira Celular. O bar usa o mesmo caminho: todo mundo lê o mesmo QR. Não tem conta nem senha. O **Lugar** de um Jogador fica com o primeiro Celular que o pegou, por uma marca que o Celular guarda. Se um Jogador **cai**, a Partida espera ele voltar, e o Robô não joga no lugar dele. Uma Sala sem ninguém conectado por 6 horas acaba.

Antes havia uma Sala só (`idFromName('mesa')` em `worker/index.js`), e qualquer Celular jogava por qualquer Lugar. Online o link vai pelo WhatsApp e pode chegar a outra pessoa, então o Lugar precisa de dono.

## Opções consideradas

- **Login (conta com e-mail ou Google).** Rejeitado: dá muito trabalho para uma partida entre amigos. A marca no Celular basta.
- **Sala fixa com senha.** Rejeitado: só uma partida por vez no mundo todo, e senha é mais um passo.
- **O Robô joga por quem cai.** Rejeitado: é partida entre amigos. Esperar é melhor que o Robô jogar errado por você.
- **Uma tela nova que junta Mesa e Celular.** Não descartada: fica para um protótipo depois. O online começa com as duas telas de hoje.
- **Chat ou voz dentro do jogo.** Rejeitado: as pessoas conversam por fora (WhatsApp, FaceTime).

## Consequências

- O servidor do notebook (`npm start`) continua com uma Sala só. As várias Salas ficam só na Cloudflare.
- `truco.tharso.com/mao` sem código pede o Código da Sala.
- A Sala precisa ser guardada no armazenamento do Durable Object. Sem isso, a Cloudflare pode apagar a Sala da memória quando ninguém está conectado, bem antes das 6 horas.
- Os Sinais aparecem em todas as Mesas da Sala, na mesma hora. A regra do Sinal não muda.
- Jogar com 3 ou 4 pessoas é outra obra, depois desta. Ela vale para o bar e para o online.
