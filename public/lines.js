// Falas do Seu Zé (a banca) e dos parceiros robôs. {n} = nome, {d} = dupla.
window.LINES = {
  start: [
    'Senta que lá vem truco! Hoje ninguém sai daqui sem passar vergonha!',
    'Bem-vindos ao Bar do Zé! Aqui o feijão é contado e a vergonha é de graça!',
    'Atenção, freguesia! A banca abriu e a banca não perdoa!',
  ],
  shuffle: [
    'Embaralhando... sem trapaça, que eu sou honesto. Quase sempre.',
    'Deixa o Zé misturar essas cartas aqui...',
    'Olha a mão leve do mestre!',
    'Carta pra cá, carta pra lá... ninguém viu nada!',
  ],
  vira: [
    'Virou {v}! A manilha é {m}!',
    'Na vira, {v}. Quem tem {m} tá rindo à toa!',
    'Vira {v}. Manilha: {m}. Olha a cara de quem pegou!',
  ],
  turnHuman: [
    'Vai, {n}! Tá esperando o quê, o ônibus?',
    'É com você, {n}!',
    '{n}, o baralho não morde não!',
    'Joga logo, {n}, que a cerveja tá esquentando!',
  ],
  zap: ['ZAAAAP! Olha o ZAP na mesa, minha gente!', 'É o ZAP! Ajoelha que é santo!', 'Zap! Isso é covardia!'],
  manilha: ['Manilha na mesa!', 'Eita, manilha!', 'Olha a manilha aí, gente!'],
  tie: ['CANGOU! Empatou!', 'Empate! Ninguém leva essa!', 'Cangou! Que coisa feia!'],
  roundWin: ['Essa foi da {d}!', 'Ponto pra {d}!', 'A {d} levou a rodada!'],
  handWin: [
    '{d} leva {p}! Pode contar o feijão!',
    'E a {d} fatura {p}! O outro lado tá chorando!',
    '{p} pra {d}! Toma, que é de graça!',
  ],
  handNobody: ['Empatou tudo! Ninguém leva nada. Que mão inútil!'],
  correu: [
    'Correu! Có có có có! Galinha!',
    'CORREU! Alguém pega o milho pra essa galinha!',
    'Saiu correndo igual cachorro de mudança!',
  ],
  aceito: ['Aceitou! Agora o bicho pega!', 'CAI DENTRO! Que coragem!', 'Aceitou! Segura o coração!'],
  onze: ['MÃO DE ONZE! A {d} olha as cartas do parceiro e decide: joga valendo 3 ou corre!'],
  onzeJoga: ['A {d} vai pro pau! Mão de onze valendo 3!', 'Corajosos! Mão de onze valendo 3!'],
  onzeCorre: ['A {d} amarelou na mão de onze! Um ponto pros outros.'],
  ferro: ['MÃO DE FERRO! Onze a onze! Todo mundo joga no escuro. É na sorte, minha gente!'],
  over: [
    'ACABOU! A {d} é a campeã do Bar do Zé! O outro lado paga a rodada!',
    'FIM DE JOGO! {d} venceu! Os perdedores lavam os copos!',
  ],
  idle: [
    'Hoje o movimento tá fraco... mas a vergonha tá forte!',
    'Já contei que eu ganhei de um padre no truco? Ele rezou e mesmo assim perdeu.',
    'Quem pede truco sem nada na mão é poeta, não é jogador!',
    'Truco é igual casamento: quem corre perde menos.',
  ],
  // Gritômetro: de 0 a 3
  shout: [
    ['Isso foi um truco ou um suspiro?', 'Fala mais alto, que eu sou velho!', 'Pediu truco ou pediu desculpa?'],
    ['Meia-boca... grita com vontade da próxima!', 'Deu pra ouvir lá da cozinha. Só lá.'],
    ['AGORA SIM! Isso é truco!', 'Opa! Assustou até o gato!'],
    ['MEU TÍMPANO! Chamem os bombeiros!', 'O vizinho vai chamar a polícia! QUE TRUCO!', 'Quebrou o copo do balcão!'],
  ],
};

// Falas dos parceiros robôs (por personalidade).
window.BOT_LINES = {
  blefador: {
    truco: ['TRUUUCO, marreco!', 'TRUCO! Desce do muro!', 'Truco! E não adianta olhar pra minha cara!'],
    raise: ['{L}! Eu aumento sim!', '{L}! Quero ver agora!'],
    aceito: ['Aceito! Tô nem aí!', 'Desce! Aceito!'],
    corro: ['Tá bom, tá bom... corri. Mas foi estratégia!'],
    publicAdvice: ['Aceita, parceiro! Isso aí é medo deles!', 'Ah, isso é blefe! Eu conheço essa cara!', 'Vai com tudo, parceiro!'],
    win: ['Eu falei! Eu falei!', 'Mestre do blefe!'],
    lose: ['Foi azar. Só azar.', 'A carta tava marcada!'],
  },
  medroso: {
    truco: ['T-t-truco? Acho que... TRUCO!', 'TRUCO! Ai, meu Deus, pedi!', 'Truco... por favor, aceita devagar!'],
    raise: ['{L}! Ai, por que eu fiz isso?', '{L}... seja o que Deus quiser!'],
    aceito: ['Aceito... mas tô suando frio.', 'Tá... aceito. Segura minha mão.'],
    corro: ['Corro! Corro! Eu tenho família!', 'Não, não, não! Corri!'],
    publicAdvice: ['Ai, parceiro... sei não, hein...', 'Meu coração tá na boca!', 'Faz o que achar melhor... eu vou ali chorar.'],
    win: ['Ganhamos? Ganhamos! Nem acredito!', 'Uhul! Eu nem tava com medo!'],
    lose: ['Eu sabia... eu sabia...', 'Ai, que vergonha...'],
  },
  robo: {
    truco: ['TRUCO. Processando sua derrota.', 'TRUCO! Bip bop!'],
    raise: ['{L}! Cálculo concluído!'],
    aceito: ['Aceito. Probabilidade favorável.'],
    corro: ['Corro. Erro 404: coragem não encontrada.'],
    publicAdvice: ['Bip. Analisando.'],
    win: ['Vitória registrada.'],
    lose: ['Reiniciando autoestima.'],
  },
};

// Cochicho honesto que vai só pro celular do parceiro humano.
window.WHISPER = {
  aumenta: ['Pode aumentar! Eu tô forte!', 'Aumenta! Minha mão é boa!'],
  aceita: ['Aceita. Minha mão é ok.', 'Dá pra aceitar, eu ajudo.'],
  corre: ['Corre! Minha mão tá um lixo.', 'Eu não tenho nada... corre!'],
};
