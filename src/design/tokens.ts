/*
 * ─────────────────────────────────────────────────────────────────────────────
 * ÍMPETO — CONTRATO DE DIREÇÃO                                     TELEMETRIA
 * ─────────────────────────────────────────────────────────────────────────────
 * THESIS: o Ímpeto não é um app de treino, é um INSTRUMENTO DE MEDIÇÃO que por
 *   acaso mede treino. Preto neutro sem matiz, fios de 1px, tudo alinhado em
 *   coluna, tudo monoespaçado — e um LED vermelho que diz apenas uma coisa:
 *   está gravando.
 *
 * AS DUAS CORES TÊM TRABALHOS QUE NÃO SE CONFUNDEM. Esta é a regra que
 *   organiza o sistema inteiro:
 *
 *     VERMELHO (`rec`) diz ESTADO — está rodando, ou não está. É binário.
 *       Aparece em exatamente dois lugares: o LED de sessão aberta e a marca de
 *       recorde. Em nenhum outro. Se ele começar a aparecer em botão, em ícone
 *       de aba ou em destaque de texto, o sistema morre: vermelho que aparece
 *       em todo lugar deixa de significar "atenção".
 *
 *     ÂMBAR (`acento`) diz QUANTIDADE — é o topo da rampa térmica, não uma cor
 *       independente. Tudo o que o usuário escreveu, tudo que está feito, tudo
 *       que carrega carga alta é âmbar porque âmbar é o fim da escala.
 *
 * RAMPA TÉRMICA (`calor`): a escala é o vocabulário de intensidade do app
 *   inteiro — a prancha anatômica, o modelo 3D, as barras de carga muscular e o
 *   estado "feito" saem todos dela. Vai do inerte ao âmbar passando por um
 *   verde-azulado frio, porque uma rampa que começa cinza e termina laranja
 *   passa por marrom no meio e fica suja.
 *
 * ESCURO É A CASA. Instrumento de bancada é escuro; o claro existe porque a
 *   academia às vezes está com sol na tela, e legibilidade não é eixo de
 *   estilo. No claro o âmbar escurece para ocre — a mesma posição na rampa,
 *   a luminância que o fundo exige.
 *
 * GEOMETRIA: canto de 4 a 8px. Não é quadrado e não é macio: é a chanfradura
 *   de um painel fresado. Densidade alta — a sessão é uma TABELA, com cabeça de
 *   coluna e valores alinhados à direita.
 *
 * RISCO HONESTO: monoespaçada come largura, e densidade alta briga com dedo
 *   suado. O corretivo é estrutural, não cosmético: a linha pode ser
 *   visualmente magra, mas o alvo de toque nunca desce de 48dp — o ✓ tem
 *   `hitSlop`, e a entrada de carga saiu da célula minúscula e foi para um
 *   teclado próprio ao alcance do polegar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { StyleSheet } from 'react-native';

/**
 * Uma paleta.
 *
 * Os nomes são do PAPEL que a cor cumpre, não do material nem do matiz:
 * `acento` é âmbar no escuro e ocre no claro, e as duas coisas são "o topo da
 * rampa". Nomear pelo matiz obrigaria a mentir em um dos dois temas.
 *
 * Todo par de contraste abaixo foi calculado, não estimado.
 */
export interface Paleta {
  fundo: string;
  fundoAlto: string;
  fundoBaixo: string;
  fundoBorda: string;

  tinta: string;
  tintaMid: string;
  tintaFraca: string;
  tintaFantasma: string;

  regua: string;
  reguaMid: string;
  reguaForte: string;

  /** Topo da rampa térmica. Diz QUANTIDADE — o que está feito, o que é alto. */
  acento: string;
  acentoSuave: string;
  acentoLinha: string;
  /** Tinta que fica POR CIMA do acento quando ele vira preenchimento. */
  acentoTexto: string;
  /** O acento com o dedo em cima: um degrau abaixo na rampa, nos dois temas. */
  acentoPress: string;

  /**
   * O LED. Diz ESTADO, e só. Dois usos no app inteiro: sessão gravando e
   * recorde batido. Qualquer terceiro uso é regressão.
   */
  rec: string;
  recSuave: string;
  recLinha: string;

  /**
   * Rampa térmica, do inerte ao topo. Índice 0 é "não trabalhado" e vale como
   * cor de superfície; 1..5 são intensidade crescente.
   */
  calor: readonly [string, string, string, string, string, string];

  /** Corpo da prancha anatômica: o que não é músculo nomeado. */
  silhueta: string;
  silhuetaTraco: string;

  /** Tom dos ícones da barra de status do sistema. */
  barraStatus: 'light' | 'dark';
  /** Véu atrás da folha modal. */
  veu: string;
}

/**
 * ESCURA — o instrumento na bancada.
 *
 * Preto NEUTRO, sem matiz nenhum: é o que separa "aparelho de medição" de
 * "app escuro com acento". Qualquer viés de matiz no fundo faz a rampa térmica
 * mentir, porque ela passa a ser lida contra uma cor em vez de contra o vazio.
 */
export const ESCURA: Paleta = {
  fundo: '#0A0B0C',
  fundoAlto: '#16191B',
  fundoBaixo: '#050607',
  fundoBorda: '#23282B',

  tinta: '#E9ECEE', // 15,8:1
  tintaMid: '#9AA2A7', // 7,9:1
  tintaFraca: '#6A7276', // 4,6:1 — piso do que carrega significado
  tintaFantasma: '#3C4347', // só decoração

  regua: 'rgba(233,236,238,0.09)',
  reguaMid: 'rgba(233,236,238,0.17)',
  reguaForte: 'rgba(233,236,238,0.34)',

  // 9,7:1 como texto sobre o fundo E 9,7:1 com o texto escuro por cima quando
  // vira preenchimento — atende aos dois papéis, como toda cor de ação precisa.
  acento: '#E8A13D',
  acentoSuave: 'rgba(232,161,61,0.10)',
  acentoLinha: 'rgba(232,161,61,0.32)',
  acentoTexto: '#0A0B0C',
  acentoPress: '#C4832A',

  rec: '#FF3B30', // 5,5:1
  recSuave: 'rgba(255,59,48,0.10)',
  recLinha: 'rgba(255,59,48,0.34)',

  calor: ['#16191B', '#26413F', '#3D6355', '#7A7A42', '#B9863A', '#E8A13D'] as const,

  silhueta: '#16191B',
  silhuetaTraco: 'rgba(233,236,238,0.26)',

  barraStatus: 'light',
  veu: 'rgba(0,0,0,0.72)',
};

/**
 * CLARA — o mesmo instrumento com sol na tela.
 *
 * Não é a escura invertida: é o que um painel branco de laboratório faz. O
 * âmbar desce para ocre porque âmbar claro sobre branco tem 2:1 e sumiria — a
 * POSIÇÃO na rampa é a mesma, a luminância é a que o fundo exige.
 */
export const CLARA: Paleta = {
  fundo: '#F3F4F4',
  fundoAlto: '#FFFFFF',
  fundoBaixo: '#E5E8E8',
  fundoBorda: '#D3D8D9',

  tinta: '#0E1113', // 17,2:1
  tintaMid: '#4C5457', // 7,6:1
  tintaFraca: '#6B7376', // 4,6:1 — piso
  tintaFantasma: '#A9B0B2', // só decoração

  regua: 'rgba(14,17,19,0.11)',
  reguaMid: 'rgba(14,17,19,0.20)',
  reguaForte: 'rgba(14,17,19,0.38)',

  acento: '#8A5510', // 6,4:1 como texto; 6,0:1 com branco por cima
  acentoSuave: 'rgba(138,85,16,0.09)',
  acentoLinha: 'rgba(138,85,16,0.28)',
  acentoTexto: '#FFFFFF',
  acentoPress: '#6E4309',

  rec: '#C1261C', // 6,1:1
  recSuave: 'rgba(193,38,28,0.09)',
  recLinha: 'rgba(193,38,28,0.30)',

  calor: ['#E5E8E8', '#B6C7C2', '#8FAA98', '#A9945A', '#9C7326', '#8A5510'] as const,

  silhueta: '#E5E8E8',
  silhuetaTraco: 'rgba(14,17,19,0.30)',

  barraStatus: 'dark',
  veu: 'rgba(12,14,15,0.46)',
};

/**
 * Posição na rampa térmica para uma fração de esforço (0..1).
 *
 * A raiz quadrada abre o meio da escala: sem ela, um grupo com 10% do esforço
 * cairia no primeiro degrau e a prancha pareceria vazia num treino bem
 * distribuído. `0.45` é o teto prático — acima disso um grupo já domina a
 * sessão e não há por que distinguir mais.
 */
export function nivelDeCalor(fracao: number): number {
  if (fracao <= 0) return 0;
  const n = Math.sqrt(Math.min(1, fracao / 0.45));
  return Math.max(1, Math.min(5, Math.round(n * 5)));
}

/** A cor da rampa para uma fração de esforço. Índice 0 = não trabalhado. */
export function corDeCalor(p: Paleta, fracao: number): string {
  return p.calor[nivelDeCalor(fracao)];
}

/**
 * Vocabulário de marcas de estado.
 *
 * Um instrumento não usa só cor para dizer o que aconteceu com uma leitura:
 * usa marca e posição. Definido uma vez, usado igual em todas as telas — e
 * igual nos dois temas, que é o motivo de o app continuar legível trocando.
 */
export const marca = {
  /** Linha da vez: fio de acento na margem esquerda. */
  larguraBarraAtiva: 2,
  /** Leitura não preenchida: o traço vazio de um mostrador. */
  vazio: '--',
  /** Não soma ao total — livro de registro põe entre parênteses. */
  aquecimento: { abre: '(', fecha: ')' },
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
 * Margem lateral. A calha é a coluna reservada ao ordinal da série, ao fio da
 * linha ativa e à marca de recorde.
 */
export const margem = {
  pagina: 18,
  calha: 24,
} as const;

/**
 * Canto de painel fresado: nem aresta viva, nem macio. O `pill` existe só para
 * o seletor de incremento no teclado de carga.
 */
export const radius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  folha: 14,
  pill: 999,
} as const;

/** Espessura de fio. Fio de instrumento é nítido, não sussurro. */
export const traco = {
  fina: StyleSheet.hairlineWidth,
  normal: 1,
  forte: 1.5,
} as const;

export const font = {
  /** Prosa e títulos de tela — o único lugar que escapa da monoespaçada. */
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  /** Todo dado, rótulo, coluna e número. A monoespaçada já é tabular. */
  mono: 'IBMPlexMono_400Regular',
  monoMed: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
} as const;

/**
 * Escala tipográfica — idêntica nos dois temas.
 *
 * Um princípio: TODO dado em monoespaçada, prosa em Archivo. Monoespaçada não
 * é estilo aqui — é o que faz coluna de carga alinhar sozinha, sem
 * `fontVariant`, e o que faz um número mudando de 82,5 para 100 não empurrar a
 * coluna inteira.
 *
 * Hierarquia vem de tinta e entrelinha, não de inflar corpo. Só `monumento`
 * escapa disso, de propósito.
 */
export const type = {
  monumento: { fontFamily: font.monoBold, fontSize: 76, lineHeight: 78, letterSpacing: -3.4 },
  numeroXG: { fontFamily: font.monoBold, fontSize: 36, lineHeight: 38, letterSpacing: -1.6 },
  numeroG: { fontFamily: font.monoBold, fontSize: 24, lineHeight: 27, letterSpacing: -0.9 },
  numero: { fontFamily: font.monoMed, fontSize: 16, lineHeight: 20, letterSpacing: -0.3 },

  display: { fontFamily: font.semibold, fontSize: 27, lineHeight: 31, letterSpacing: -0.8 },
  title: { fontFamily: font.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.45 },
  heading: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, letterSpacing: -0.05 },
  bodyMed: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, letterSpacing: -0.05 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 19 },
  smallMed: { fontFamily: font.medium, fontSize: 13, lineHeight: 19 },

  /** Cabeça de coluna e rótulo de campo: monoespaçada, caixa alta, destravada. */
  coluna: { fontFamily: font.monoMed, fontSize: 10, lineHeight: 13, letterSpacing: 1.5 },
  carimbo: { fontFamily: font.monoBold, fontSize: 10.5, lineHeight: 13, letterSpacing: 2.2 },
  caption: { fontFamily: font.mono, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.6 },
  mono: { fontFamily: font.mono, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
} as const;

/**
 * Nada flutua na interface — profundidade é fio e tom, não sombra.
 *
 * As exceções são as duas superfícies que de fato estão POR CIMA da página: a
 * folha modal e o teclado de carga. Elas recebem deslocamento e desfoque de
 * verdade; halo colorido de raio zero é decoração, não profundidade.
 */
export function sombraFolha(p: Paleta) {
  const escuro = p.barraStatus === 'light';
  return {
    shadowColor: '#000000',
    shadowOpacity: escuro ? 0.62 : 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  } as const;
}
