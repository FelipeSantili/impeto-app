/*
 * ─────────────────────────────────────────────────────────────────────────────
 * ÍMPETO — CONTRATO DE DIREÇÃO                              seed b78ebf1d/pick
 * ─────────────────────────────────────────────────────────────────────────────
 * THESIS: Ímpeto é um caderno de treino, não um painel. Recusa o arranjo padrão
 *   da categoria — cartões escuros com um acento neon — e imprime o registro
 *   como tabela pautada sobre papel, onde as colunas carregam a hierarquia e
 *   nada flutua.
 *
 * OWN-WORLD: papel cinza de gramatura, tinta grafite, duas canetas. Azul
 *   esferográfica é o que VOCÊ escreveu (cargas, repetições, o ✓). Vermelho é o
 *   carimbo: recorde, correção. Réguas hairline no lugar de bordas de cartão;
 *   raio de canto 2–4px porque papel não é arredondado; zero sombra. Archivo
 *   para prosa, Barlow Condensed para todo número — condensada lê como
 *   impressa em formulário. Margem esquerda fixa em toda tela.
 *
 * STORY: o usuário vê a sessão como página de um livro que é dele; acredita no
 *   registro porque ele mostra a estimativa como estimativa; e anota a próxima
 *   série sem pensar no app.
 *
 * FIRST VIEWPORT (Início): margem à esquerda; ÍMPETO em carimbo no alto à
 *   esquerda com o raio impresso ao lado, data à direita na mesma linha de
 *   base. A semana como LINHA PAUTADA de sete células com as iniciais por
 *   cabeçalho — não sete bolinhas. Ação primária como barra sólida de tinta
 *   azul, retangular. ROTINAS como cabeçalho de seção sobre régua, e cada
 *   rotina como LINHA DE LIVRO-CAIXA: ordinal na margem, nome, e uma coluna
 *   tabular alinhada à direita. Nenhum cartão em lugar nenhum.
 *
 * ESTADO SEM COR (vocabulário de marcas — ver `marca` abaixo): feita = escrita
 *   em azul + ✓; ativa = barra de tinta na margem; pendente = pontilhado de
 *   formulário não preenchido; aquecimento = ordinal entre parênteses, porque
 *   livro-caixa coloca entre parênteses o que não soma; técnica = sigla
 *   carimbada; recorde = carimbo vermelho na margem. Nada disso depende de
 *   matiz — exigência funcional: a academia às vezes está clara, às vezes
 *   escura.
 *
 * RISCO HONESTO: minimalismo de papel pautado pode ficar mole — só hairline e
 *   ar. O corretivo é massa de tinta: a ação primária é barra cheia, os números
 *   monumentais são monumentais de verdade, e a régua de cabeçalho é régua, não
 *   sussurro.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { StyleSheet } from 'react-native';

export const color = {
  // ── Papel ────────────────────────────────────────────────────────────────
  // Cinza de gramatura, não creme. Creme + serifa + terracota é um dos três
  // agrupamentos em que interface gerada por IA sempre cai; este mundo é
  // papel de escritório, frio, impresso.
  papel: '#E8E7E2',
  /** Encaixe mais claro: campo preenchido, linha concluída, folha modal. */
  papelAlto: '#F2F1ED',
  /** Faixa mais escura: cabeçalho de coluna, linha riscada. */
  papelBaixo: '#DBDAD3',
  /** Borda da folha, contra a qual a página se recorta. */
  papelBorda: '#D0CFC7',

  // ── Tinta impressa ───────────────────────────────────────────────────────
  tinta: '#191B1C',
  tintaMid: '#4A4E51',
  /** Piso de 4,6:1 sobre `papel`. Abaixo disto nada carrega significado. */
  tintaFraca: '#62666B',
  /** Só decoração: pontilhado de formulário. Nunca texto que precise ser lido. */
  tintaFantasma: '#9A9C99',

  // ── Réguas ───────────────────────────────────────────────────────────────
  regua: 'rgba(25,27,28,0.13)',
  reguaMid: 'rgba(25,27,28,0.24)',
  reguaForte: 'rgba(25,27,28,0.42)',

  // ── Caneta azul: o que você escreveu ─────────────────────────────────────
  // 8,6:1 como texto sobre papel e 10,7:1 com papel por cima quando vira
  // preenchimento — atende aos dois papéis, como toda cor de ação precisa.
  azul: '#23368C',
  azulSuave: 'rgba(35,54,140,0.09)',
  azulLinha: 'rgba(35,54,140,0.26)',
  /** Texto sobre preenchimento azul. */
  azulTexto: '#F2F1ED',

  // ── Caneta vermelha: o carimbo ───────────────────────────────────────────
  // Recorde, correção, remoção. 5,3:1 sobre papel.
  vermelho: '#B4231F',
  vermelhoSuave: 'rgba(180,35,31,0.10)',
  vermelhoLinha: 'rgba(180,35,31,0.30)',

  branco: '#FFFFFF',
  preto: '#000000',
} as const;

/**
 * Vocabulário de marcas de estado.
 *
 * Um livro-caixa não usa cor para dizer o que aconteceu com uma linha: usa
 * marca. Este objeto existe para que a marca seja definida uma vez e usada
 * igual em todas as telas, em vez de virar estilo improvisado por tela.
 */
export const marca = {
  /** Linha cumprida: escrita em azul, fundo levemente mais claro, ✓ na coluna. */
  feita: { fundo: color.papelAlto, tinta: color.azul },
  /** Linha da vez: barra de tinta na margem esquerda. */
  ativa: { barra: color.tinta, larguraBarra: 3 },
  /** Linha impressa e não preenchida: pontilhado de formulário. */
  pendente: { tinta: color.tintaFantasma, preenchimento: '·····' },
  /** Não soma ao total — livro-caixa põe entre parênteses. */
  aquecimento: { abre: '(', fecha: ')' },
  /** Carimbo de recorde. */
  recorde: { tinta: color.vermelho },
} as const;

/** Espaçamento em passos de 4. */
export const sp = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  h1: 32,
  h2: 40,
  h3: 56,
  h4: 72,
} as const;

/**
 * Margem esquerda do livro. Toda tela registra contra ela: é onde mora o
 * ordinal da linha, a barra da linha ativa e o carimbo de recorde.
 */
export const margem = {
  /** Recuo da folha até a coluna de conteúdo. */
  pagina: 20,
  /** Largura da calha reservada ao ordinal e às marcas. */
  calha: 26,
} as const;

/** Papel não tem canto arredondado. O pouco que existe é corte de formulário. */
export const radius = {
  none: 0,
  sm: 2,
  md: 3,
  lg: 4,
  /** Só a folha modal, que é uma folha de verdade sobre a página. */
  folha: 6,
} as const;

/** Espessura de régua. Impressa é nítida; não é sussurro. */
export const traco = {
  fina: StyleSheet.hairlineWidth,
  normal: 1,
  forte: 1.5,
} as const;

export const font = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  /** Números e cabeçalhos de coluna: condensada lê como impressa em formulário. */
  numRegular: 'BarlowCondensed_500Medium',
  num: 'BarlowCondensed_600SemiBold',
  numBold: 'BarlowCondensed_700Bold',
} as const;

/**
 * Escala tipográfica.
 *
 * Duas famílias e um princípio: prosa em Archivo, TODO número em Barlow
 * Condensed. Hierarquia vem de tinta e entrelinha, não de inflar corpo — só
 * `monumento` escapa disso, e escapa de propósito: é o número que precisa ser
 * lido com o celular no banco, a um braço de distância.
 */
export const type = {
  /** Cronômetro de descanso e o total do relatório. O único gesto de escala. */
  monumento: { fontFamily: font.num, fontSize: 104, lineHeight: 100, letterSpacing: -2 },
  numeroXG: { fontFamily: font.num, fontSize: 44, lineHeight: 46, letterSpacing: -0.8 },
  numeroG: { fontFamily: font.num, fontSize: 28, lineHeight: 30, letterSpacing: -0.4 },
  /** Célula de carga e repetição. */
  numero: { fontFamily: font.num, fontSize: 20, lineHeight: 24, letterSpacing: -0.2 },

  display: { fontFamily: font.semibold, fontSize: 30, lineHeight: 34, letterSpacing: -0.9 },
  title: { fontFamily: font.semibold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },
  heading: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.05 },
  bodyMed: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, letterSpacing: -0.05 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  smallMed: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },

  /** Cabeçalho de coluna, sobre a régua. Sempre em caixa alta. */
  coluna: { fontFamily: font.num, fontSize: 12, lineHeight: 14, letterSpacing: 1.1 },
  /** Carimbo: rótulo de seção, sigla de técnica, marca de recorde. */
  carimbo: { fontFamily: font.numBold, fontSize: 12, lineHeight: 14, letterSpacing: 1.5 },
  caption: { fontFamily: font.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
  mono: { fontFamily: font.num, fontSize: 16, lineHeight: 20 },
} as const;

/**
 * Papel não flutua — não há sombra na interface.
 *
 * A única exceção é a folha modal, que é literalmente uma folha por cima da
 * página: recebe deslocamento e desfoque de verdade, tingidos com o cinza do
 * papel em vez de preto puro, que é o que denuncia sombra genérica.
 */
export const shadow = {
  folha: {
    shadowColor: '#2A2C26',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
} as const;

/**
 * Curvas e durações.
 *
 * `saida` é a curva forte de ease-out: a embutida do Reanimated é fraca demais
 * e tira a intenção do movimento. Nunca ease-in em interface — ele atrasa
 * exatamente o instante que o usuário está olhando.
 */
export const motion = {
  toque: 110,
  estado: 180,
  entrada: 240,
} as const;
