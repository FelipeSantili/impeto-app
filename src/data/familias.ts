/**
 * Execução resumida por família de movimento — em português.
 * Vários exercícios compartilham a mesma família (ex.: supino reto com barra,
 * halteres, máquina e Smith), por isso a orientação vive aqui e não no catálogo.
 */
export interface Familia {
  passos: string[];
  erro: string;
}

export const familias: Record<string, Familia> = {
  supino_horizontal: {
    passos: [
      'Deite no banco com os pés firmes no chão e as escápulas encaixadas para trás e para baixo.',
      'Desça controlando até a linha do mamilo, cotovelos a cerca de 45° do tronco.',
      'Empurre até estender os cotovelos sem travá-los, mantendo o peito aberto.',
    ],
    erro: 'Abrir os cotovelos a 90° sobrecarrega o ombro — mantenha-os mais fechados.',
  },
  supino_inclinado: {
    passos: [
      'Ajuste o banco entre 30° e 45°. Acima disso o ombro assume o trabalho.',
      'Desça a carga até a parte alta do peito, logo abaixo da clavícula.',
      'Suba em linha levemente diagonal, na direção dos olhos.',
    ],
    erro: 'Inclinação exagerada transforma o exercício em desenvolvimento de ombro.',
  },
  supino_declinado: {
    passos: [
      'Trave as pernas no apoio e mantenha as escápulas retraídas.',
      'Desça até a parte baixa do peito com cotovelos próximos ao corpo.',
      'Empurre até quase estender, sem perder a tensão.',
    ],
    erro: 'Descer rápido demais tira a tensão da porção inferior do peitoral.',
  },
  crucifixo: {
    passos: [
      'Cotovelos levemente flexionados e travados nesse ângulo do início ao fim.',
      'Abra os braços em arco até sentir o alongamento do peitoral, sem forçar o ombro.',
      'Feche pensando em aproximar os cotovelos, não as mãos.',
    ],
    erro: 'Flexionar e estender o cotovelo transforma o crucifixo em supino.',
  },
  voador: {
    passos: [
      'Ajuste o banco para que as manoplas fiquem na altura do peito.',
      'Feche os braços até quase encostar as manoplas e segure meio segundo.',
      'Volte devagar, controlando a abertura até sentir o alongamento.',
    ],
    erro: 'Subir o ombro na hora de fechar — mantenha as escápulas apoiadas no encosto.',
  },
  crossover: {
    passos: [
      'Dê um passo à frente e incline levemente o tronco para manter a tensão.',
      'Traga as mãos ao centro descrevendo um arco, cruzando levemente uma sobre a outra.',
      'Retorne devagar até a linha dos ombros.',
    ],
    erro: 'Usar carga alta demais e puxar com os braços em vez de fechar com o peito.',
  },
  pullover: {
    passos: [
      'Braços quase estendidos, com o cotovelo travado num ângulo leve.',
      'Leve a carga para trás da cabeça até sentir o alongamento das costelas.',
      'Puxe de volta com o dorsal e o peitoral, sem dobrar os cotovelos.',
    ],
    erro: 'Arquear demais a lombar para ganhar amplitude.',
  },
  flexao: {
    passos: [
      'Mãos na largura dos ombros, corpo em linha reta da cabeça aos calcanhares.',
      'Desça até o peito quase encostar no chão, cotovelos a 45°.',
      'Empurre o chão e finalize com as escápulas afastadas.',
    ],
    erro: 'Deixar o quadril cair — contraia o abdômen e o glúteo o tempo todo.',
  },
  mergulho: {
    passos: [
      'Sustente o corpo com os braços estendidos e ombros longe das orelhas.',
      'Desça até o cotovelo formar aproximadamente 90°.',
      'Empurre de volta sem travar bruscamente os cotovelos.',
    ],
    erro: 'Descer além do confortável no ombro; pare onde o controle acaba.',
  },

  puxada: {
    passos: [
      'Trave as coxas no apoio e segure a barra um pouco além da largura dos ombros.',
      'Puxe pensando em levar o cotovelo para o bolso, até a barra chegar ao queixo.',
      'Suba controlando por 2 segundos, deixando a escápula subir no final.',
    ],
    erro: 'Jogar o tronco para trás e puxar com o bíceps em vez do dorsal.',
  },
  remada_horizontal: {
    passos: [
      'Coluna neutra, peito aberto e joelhos levemente flexionados.',
      'Puxe até a barra tocar o abdômen, cotovelos rentes ao corpo.',
      'Volte estendendo os braços sem deixar a lombar arredondar.',
    ],
    erro: 'Usar impulso do tronco para vencer a carga.',
  },
  remada_unilateral: {
    passos: [
      'Apoie joelho e mão no banco, coluna paralela ao chão.',
      'Puxe o peso na direção do quadril, cotovelo colado ao tronco.',
      'Desça até estender completamente e sentir o dorsal alongar.',
    ],
    erro: 'Girar o tronco para levantar mais carga.',
  },
  barra_fixa: {
    passos: [
      'Pendure com os ombros ativos — puxe as escápulas para baixo antes de subir.',
      'Suba até o queixo passar da barra, sem balançar as pernas.',
      'Desça controlando até quase estender os cotovelos.',
    ],
    erro: 'Usar impulso de perna quando o objetivo é hipertrofia.',
  },
  pulldown_reto: {
    passos: [
      'Braços estendidos à frente, tronco levemente inclinado.',
      'Puxe a barra até a coxa mantendo os cotovelos travados.',
      'Volte devagar até sentir o dorsal esticar.',
    ],
    erro: 'Dobrar o cotovelo e virar em tríceps.',
  },
  terra: {
    passos: [
      'Barra rente à canela, pés na largura do quadril, peito alto.',
      'Empurre o chão com as pernas e mantenha a barra colada ao corpo na subida.',
      'Trave quadril e joelho ao mesmo tempo, sem hiperextender a lombar.',
    ],
    erro: 'Arredondar a lombar na saída do chão. Reduza a carga antes que isso aconteça.',
  },
  stiff: {
    passos: [
      'Joelhos levemente flexionados e fixos nesse ângulo.',
      'Empurre o quadril para trás descendo a barra colada às pernas.',
      'Suba contraindo glúteo e posterior quando sentir o alongamento.',
    ],
    erro: 'Transformar em agachamento dobrando os joelhos durante a descida.',
  },
  hiperextensao: {
    passos: [
      'Ajuste o apoio logo abaixo da crista ilíaca.',
      'Desça com a coluna neutra até sentir o posterior alongar.',
      'Suba até alinhar tronco e pernas — não passe disso.',
    ],
    erro: 'Hiperextender a lombar no topo do movimento.',
  },
  encolhimento: {
    passos: [
      'Braços relaxados, apenas sustentando a carga.',
      'Eleve os ombros na direção das orelhas e segure 1 segundo.',
      'Desça devagar até o alongamento completo do trapézio.',
    ],
    erro: 'Girar os ombros — o movimento é vertical, puro.',
  },

  desenvolvimento: {
    passos: [
      'Antebraços verticais, punhos alinhados com os cotovelos.',
      'Empurre para cima até quase estender, sem travar o cotovelo.',
      'Desça até a altura do queixo mantendo a tensão no deltoide.',
    ],
    erro: 'Arquear a lombar para empurrar — contraia o abdômen e o glúteo.',
  },
  elevacao_lateral: {
    passos: [
      'Cotovelo levemente flexionado e mais alto que o punho durante todo o trajeto.',
      'Suba até a linha dos ombros, sem passar disso.',
      'Desça em 2 a 3 segundos, resistindo à gravidade.',
    ],
    erro: 'Usar impulso do tronco. Se precisar balançar, a carga está alta demais.',
  },
  elevacao_frontal: {
    passos: [
      'Braços quase estendidos, à frente do corpo.',
      'Eleve até a altura dos olhos, sem encolher o ombro.',
      'Volte controlando até a coxa.',
    ],
    erro: 'Subir demais e transferir a carga para o trapézio.',
  },
  crucifixo_inverso: {
    passos: [
      'Tronco inclinado ou peito apoiado no encosto, cotovelos levemente flexionados.',
      'Abra os braços na linha dos ombros pensando em juntar as escápulas.',
      'Volte devagar sem deixar os braços caírem.',
    ],
    erro: 'Puxar com o cotovelo e virar em remada.',
  },
  face_pull: {
    passos: [
      'Polia na altura do rosto, corda com pegada neutra.',
      'Puxe em direção à testa abrindo os cotovelos para fora e para cima.',
      'Segure 1 segundo com as escápulas juntas e volte controlando.',
    ],
    erro: 'Puxar para o peito em vez do rosto, perdendo o deltoide posterior.',
  },
  remada_alta: {
    passos: [
      'Pegada um pouco mais aberta que os ombros para poupar o ombro.',
      'Puxe conduzindo os cotovelos para cima, até a barra chegar ao peito.',
      'Desça controlando.',
    ],
    erro: 'Pegada muito fechada somada a subir acima do queixo irrita o manguito.',
  },
  rotacao_externa: {
    passos: [
      'Cotovelo colado ao corpo, flexionado a 90°.',
      'Gire o antebraço para fora sem afastar o cotovelo do tronco.',
      'Volte devagar. Carga leve, foco em controle.',
    ],
    erro: 'Usar carga alta e compensar com o tronco.',
  },

  rosca: {
    passos: [
      'Cotovelos fixos ao lado do tronco do começo ao fim.',
      'Suba até a contração máxima do bíceps, sem levar o cotovelo à frente.',
      'Desça em 2 a 3 segundos até estender por completo.',
    ],
    erro: 'Balançar o tronco. Se acontecer, encoste as costas numa parede.',
  },
  rosca_martelo: {
    passos: [
      'Pegada neutra, palmas viradas uma para a outra.',
      'Suba mantendo o punho firme, sem girar.',
      'Desça controlando até estender.',
    ],
    erro: 'Girar o punho no topo — isso vira rosca direta e tira o braquial.',
  },
  rosca_scott: {
    passos: [
      'Axila apoiada no banco, braço inteiro em contato com a superfície.',
      'Suba até a contração e evite parar na vertical, onde a tensão some.',
      'Desça até quase estender, sem soltar o peso bruscamente.',
    ],
    erro: 'Estender de forma explosiva no final, expondo o cotovelo.',
  },
  triceps_pulley: {
    passos: [
      'Cotovelos colados ao tronco, tronco levemente inclinado à frente.',
      'Estenda até travar o cotovelo e segure meio segundo.',
      'Volte apenas até 90°, sem deixar o cotovelo abrir.',
    ],
    erro: 'Deixar o cotovelo viajar para frente e para trás.',
  },
  triceps_testa: {
    passos: [
      'Braços perpendiculares ao chão, cotovelos apontando ao teto.',
      'Desça a barra até a testa ou logo atrás dela.',
      'Estenda sem mover a posição do cotovelo.',
    ],
    erro: 'Abrir os cotovelos para os lados durante a descida.',
  },
  triceps_frances: {
    passos: [
      'Carga acima da cabeça, cotovelos apontando para frente e próximos.',
      'Desça atrás da nuca até sentir o alongamento da cabeça longa.',
      'Estenda sem afastar os cotovelos.',
    ],
    erro: 'Deixar os cotovelos abrirem — reduz a carga sobre o tríceps.',
  },
  triceps_coice: {
    passos: [
      'Tronco inclinado, braço colado ao corpo e cotovelo a 90°.',
      'Estenda para trás até o braço ficar reto e segure 1 segundo.',
      'Volte devagar sem mexer o ombro.',
    ],
    erro: 'Balançar o braço inteiro em vez de mover só o antebraço.',
  },
  supino_fechado: {
    passos: [
      'Pegada na largura dos ombros — mais fechado machuca o punho.',
      'Desça com os cotovelos colados ao tronco até a parte baixa do peito.',
      'Empurre focando em estender o cotovelo.',
    ],
    erro: 'Fechar demais a pegada e sobrecarregar o punho.',
  },

  agachamento: {
    passos: [
      'Pés na largura dos ombros, pontas levemente para fora.',
      'Desça empurrando o quadril para trás, joelhos acompanhando a linha dos pés.',
      'Suba empurrando o chão, mantendo o peito alto.',
    ],
    erro: 'Deixar o calcanhar subir. Se acontecer, trabalhe a mobilidade de tornozelo.',
  },
  agachamento_frontal: {
    passos: [
      'Barra apoiada nos deltoides, cotovelos bem altos.',
      'Desça mantendo o tronco o mais vertical possível.',
      'Suba conduzindo com os cotovelos, sem deixá-los cair.',
    ],
    erro: 'Cotovelo baixo faz a barra rolar e o tronco despencar à frente.',
  },
  leg_press: {
    passos: [
      'Pés na plataforma na largura do quadril, joelhos alinhados aos pés.',
      'Desça até o joelho formar cerca de 90°, sem tirar a lombar do encosto.',
      'Empurre sem travar o joelho no topo.',
    ],
    erro: 'Descer até a lombar descolar do banco — é onde o disco sofre.',
  },
  hack: {
    passos: [
      'Costas coladas no apoio, pés um pouco à frente do quadril.',
      'Desça controlando até 90° ou pouco abaixo.',
      'Empurre pelo meio do pé mantendo o joelho na linha do pé.',
    ],
    erro: 'Descolar o quadril do apoio no fundo do movimento.',
  },
  extensora: {
    passos: [
      'Encoste bem no banco e ajuste o rolete logo acima do tornozelo.',
      'Estenda até travar o joelho e segure 1 segundo contraindo.',
      'Desça em 2 a 3 segundos sem deixar o peso bater.',
    ],
    erro: 'Levantar o quadril do banco para vencer a carga.',
  },
  flexora: {
    passos: [
      'Ajuste o rolete logo acima do calcanhar e mantenha o quadril apoiado.',
      'Flexione até o máximo confortável e segure a contração.',
      'Volte devagar sem estender o joelho por completo.',
    ],
    erro: 'Levantar o quadril na hora de puxar.',
  },
  afundo: {
    passos: [
      'Passo à frente confortável, tronco ereto.',
      'Desça até o joelho de trás quase tocar o chão.',
      'Suba empurrando pelo calcanhar da perna da frente.',
    ],
    erro: 'Passo curto demais joga toda a carga no joelho da frente.',
  },
  bulgaro: {
    passos: [
      'Pé de trás apoiado no banco, perna da frente afastada o suficiente.',
      'Desça vertical até o joelho de trás quase tocar o chão.',
      'Suba empurrando o calcanhar da frente, sem apoiar na perna de trás.',
    ],
    erro: 'Colocar o pé da frente perto demais do banco.',
  },
  hip_thrust: {
    passos: [
      'Escápulas apoiadas no banco, barra sobre o quadril com proteção.',
      'Suba até o tronco ficar paralelo ao chão, contraindo o glúteo forte.',
      'Desça controlando sem encostar totalmente no chão.',
    ],
    erro: 'Hiperextender a lombar no topo em vez de contrair o glúteo.',
  },
  abducao: {
    passos: [
      'Sente com a coluna encostada e ajuste a amplitude inicial.',
      'Abra as pernas até o limite confortável e segure 1 segundo.',
      'Volte devagar, sem deixar o peso bater.',
    ],
    erro: 'Inclinar o tronco para frente e para trás para gerar impulso.',
  },
  aducao: {
    passos: [
      'Ajuste a abertura inicial sem forçar a virilha.',
      'Feche as pernas contraindo os adutores e segure a contração.',
      'Abra devagar até o alongamento controlado.',
    ],
    erro: 'Começar com abertura excessiva e arriscar um estiramento.',
  },
  panturrilha: {
    passos: [
      'Antepé na plataforma, calcanhar livre para descer.',
      'Desça até o alongamento máximo e segure 1 segundo lá embaixo.',
      'Suba na ponta do pé até a contração total.',
    ],
    erro: 'Fazer repetições curtas e rápidas — a panturrilha responde à amplitude.',
  },
  coice_gluteo: {
    passos: [
      'Tronco estável, abdômen contraído, quadril neutro.',
      'Estenda a perna para trás contraindo o glúteo, sem arquear a lombar.',
      'Volte devagar até a posição inicial.',
    ],
    erro: 'Compensar com a lombar quando o glúteo cansa.',
  },

  abdominal_crunch: {
    passos: [
      'Lombar apoiada, mãos ao lado da cabeça sem puxar o pescoço.',
      'Enrole a coluna trazendo as costelas na direção da bacia.',
      'Desça devagar sem relaxar por completo.',
    ],
    erro: 'Puxar a nuca com as mãos.',
  },
  abdominal_infra: {
    passos: [
      'Lombar colada no apoio, mãos firmes na base.',
      'Traga os joelhos ao peito enrolando a bacia para cima.',
      'Desça controlando sem deixar a lombar arquear.',
    ],
    erro: 'Usar impulso das pernas em vez de enrolar o quadril.',
  },
  prancha: {
    passos: [
      'Antebraços abaixo dos ombros, corpo em linha reta.',
      'Contraia abdômen e glúteo e mantenha a respiração fluindo.',
      'Segure o tempo alvo sem deixar o quadril cair ou subir.',
    ],
    erro: 'Prender a respiração ou empinar o quadril.',
  },
  rotacao_tronco: {
    passos: [
      'Pés firmes, quadril estável, braços estendidos.',
      'Gire a partir do tronco, acompanhando com o olhar.',
      'Volte controlando, resistindo à rotação de retorno.',
    ],
    erro: 'Girar apenas os braços, sem envolver o core.',
  },
  punho: {
    passos: [
      'Antebraço apoiado, apenas o punho livre para fora do banco.',
      'Suba flexionando o punho ao máximo e segure a contração.',
      'Desça devagar até o alongamento completo.',
    ],
    erro: 'Mover o cotovelo — o movimento é só do punho.',
  },
  carregamento: {
    passos: [
      'Pegue a carga com a coluna neutra e o peito alto.',
      'Caminhe com passos curtos, ombros para trás e abdômen firme.',
      'Solte a carga com controle, agachando em vez de curvar.',
    ],
    erro: 'Deixar os ombros caírem à frente conforme a fadiga chega.',
  },
  cardio_esteira: {
    passos: [
      'Comece com 3 a 5 minutos leves para aquecer.',
      'Mantenha o tronco ereto e evite se segurar no apoio.',
      'Finalize com alguns minutos em ritmo baixo para desacelerar.',
    ],
    erro: 'Segurar nas barras laterais, o que reduz muito o gasto real.',
  },
  cardio_bike: {
    passos: [
      'Ajuste o banco para que o joelho fique quase estendido embaixo.',
      'Mantenha cadência constante e o tronco relaxado.',
      'Use a carga para controlar a intensidade, não a velocidade sozinha.',
    ],
    erro: 'Banco baixo demais, o que sobrecarrega o joelho.',
  },
  cardio_geral: {
    passos: [
      'Aqueça em ritmo leve por alguns minutos.',
      'Mantenha uma intensidade que permita frases curtas de conversa.',
      'Desacelere gradualmente no final.',
    ],
    erro: 'Começar no ritmo máximo e não conseguir sustentar a sessão.',
  },
  olimpico: {
    passos: [
      'Movimento técnico: comece leve e priorize a execução sobre a carga.',
      'Extensão explosiva de tornozelo, joelho e quadril na sequência certa.',
      'Receba a barra com os joelhos flexionados e o tronco firme.',
    ],
    erro: 'Puxar com os braços cedo demais em vez de estender o quadril.',
  },
  kettlebell_swing: {
    passos: [
      'Quadril para trás, coluna neutra, kettlebell entre as pernas.',
      'Projete o quadril à frente com força — o balanço vem do quadril, não do braço.',
      'Deixe a carga descer entre as pernas e repita no ritmo.',
    ],
    erro: 'Agachar em vez de fazer a dobradiça de quadril.',
  },
};
