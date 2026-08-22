/*
 * ─────────────────────────────────────────────────────────────────────────────
 * ÍMPETO — CONTRATO DE DIREÇÃO                              seed b78ebf1d/pick
 * ─────────────────────────────────────────────────────────────────────────────
 * THESIS: Ímpeto é um registro escrito à mão, não um painel. Recusa o arranjo
 *   padrão da categoria — cartões escuros com um acento neon — e imprime o
 *   treino como tabela pautada, onde as colunas carregam a hierarquia e nada
 *   flutua.
 *
 * OWN-WORLD: dois materiais do mesmo mundo, um por tema.
 *   CLARO  — o caderno: papel cinza de gramatura, tinta grafite, duas canetas.
 *   ESCURO — o quadro da academia: ardósia e giz, com giz azul e giz vermelho.
 *   Escuro não é o claro invertido: é outro objeto real da mesma parede. Azul é
 *   sempre o que VOCÊ escreveu (cargas, repetições, o ✓); vermelho é sempre o
 *   carimbo (recorde, correção). Réguas hairline no lugar de bordas de cartão;
 *   raio de canto 2–4px; zero sombra. Archivo para prosa, Barlow Condensed para
 *   todo número. Margem esquerda fixa em toda tela.
 *
 * STORY: o usuário vê a sessão como uma página que é dele; acredita no registro
 *   porque ele mostra a estimativa como estimativa; e anota a próxima série sem
 *   pensar no app.
 *
 * FIRST VIEWPORT (Início): margem à esquerda; ÍMPETO em carimbo no alto à
 *   esquerda com o raio ao lado, data à direita na mesma linha de base. A
 *   semana como LINHA PAUTADA de sete células com as iniciais por cabeçalho —
 *   não sete bolinhas. Ação primária como barra sólida, retangular. ROTINAS
 *   como cabeçalho de seção sobre régua, cada rotina uma LINHA DE LIVRO-CAIXA:
 *   ordinal na margem, nome, coluna tabular à direita. Nenhum cartão.
 *
 * ESTADO SEM COR (ver `marca`): feita = escrita em azul + ✓; ativa = barra na
 *   margem; pendente = pontilhado de formulário; aquecimento = ordinal entre
 *   parênteses, porque livro-caixa põe entre parênteses o que não soma;
 *   técnica = sigla carimbada; recorde = traço vermelho na margem. Nada disso
 *   depende de matiz — exigência funcional: a academia às vezes está clara, às
 *   vezes escura, e agora o app também.
 *
 * RISCO HONESTO: minimalismo pautado pode ficar mole — só hairline e ar. O
 *   corretivo é massa: a ação primária é barra cheia, os números monumentais
 *   são monumentais de verdade, e a régua de cabeçalho é régua, não sussurro.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { StyleSheet } from 'react-native';

/**
 * Uma paleta.
 *
 * Os nomes são do PAPEL que a cor cumpre, não do material: `fundo` é papel no
 * claro e ardósia no escuro. Nomear pelo material ("papel") obrigaria a mentir
 * em um dos dois temas.
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

  azul: string;
  azulSuave: string;
  azulLinha: string;
  azulTexto: string;

  vermelho: string;
  vermelhoSuave: string;
  vermelhoLinha: string;

  /** Cor da silhueta na prancha anatômica — precisa contornar em ambos. */
  silhueta: string;
  silhuetaTraco: string;

  /** Tom da barra de status do sistema. */
  barraStatus: 'light' | 'dark';
  /** Véu atrás da folha modal. */
  veu: string;
}

/**
 * CLARO — o caderno.
 *
 * Cinza de gramatura, não creme: creme + serifa + terracota é um dos três
 * agrupamentos em que interface gerada por IA sempre cai.
 */
export const CLARA: Paleta = {
  fundo: '#E8E7E2',
  fundoAlto: '#F2F1ED',
  fundoBaixo: '#DBDAD3',
  fundoBorda: '#D0CFC7',

  tinta: '#191B1C', // 13,8:1
  tintaMid: '#4A4E51', // 6,8:1
  tintaFraca: '#62666B', // 4,6:1 — piso do que carrega significado
  tintaFantasma: '#9A9C99', // só decoração

  regua: 'rgba(25,27,28,0.13)',
  reguaMid: 'rgba(25,27,28,0.24)',
  reguaForte: 'rgba(25,27,28,0.42)',

  // 8,6:1 como texto sobre o fundo e 10,7:1 com o texto por cima quando vira
  // preenchimento — atende aos dois papéis, como toda cor de ação precisa.
  azul: '#23368C',
  azulSuave: 'rgba(35,54,140,0.09)',
  azulLinha: 'rgba(35,54,140,0.26)',
  azulTexto: '#F2F1ED',

  vermelho: '#B4231F', // 5,3:1
  vermelhoSuave: 'rgba(180,35,31,0.10)',
  vermelhoLinha: 'rgba(180,35,31,0.30)',

  silhueta: '#DCDAD2',
  silhuetaTraco: 'rgba(25,27,28,0.34)',

  barraStatus: 'dark',
  veu: 'rgba(30,32,28,0.42)',
};

/**
 * ESCURO — o quadro da academia.
 *
 * Ardósia levemente esverdeada e giz. Não é o preto-com-neon da categoria, e
 * de propósito não é o quase-preto violeta que este app tinha antes: era essa
 * exata combinação que dava a cara de gerado.
 *
 * O giz azul e o giz vermelho são claros o bastante para cumprir os DOIS
 * papéis sobre ardósia — texto (8,3:1 e 7,5:1) e preenchimento com texto
 * escuro por cima (8,6:1).
 */
export const ESCURA: Paleta = {
  fundo: '#1B1D1C',
  fundoAlto: '#232624',
  fundoBaixo: '#141615',
  fundoBorda: '#2E312F',

  tinta: '#E9E9E4', // 13,9:1 — a mesma força do claro, espelhada
  tintaMid: '#A6A9A4', // 7,1:1
  tintaFraca: '#878B86', // 4,9:1 — piso
  tintaFantasma: '#5A5E5A', // só decoração

  regua: 'rgba(233,233,228,0.14)',
  reguaMid: 'rgba(233,233,228,0.26)',
  reguaForte: 'rgba(233,233,228,0.44)',

  azul: '#8FAEF0', // 8,3:1
  azulSuave: 'rgba(143,174,240,0.12)',
  azulLinha: 'rgba(143,174,240,0.32)',
  azulTexto: '#151719', // 8,6:1 sobre o azul

  vermelho: '#F0938A', // 7,5:1
  vermelhoSuave: 'rgba(240,147,138,0.13)',
  vermelhoLinha: 'rgba(240,147,138,0.34)',

  silhueta: '#2F332F',
  silhuetaTraco: 'rgba(233,233,228,0.30)',

  barraStatus: 'light',
  veu: 'rgba(0,0,0,0.58)',
};

/**
 * Vocabulário de marcas de estado.
 *
 * Um livro-caixa não usa cor para dizer o que aconteceu com uma linha: usa
 * marca. Definido uma vez, usado igual em todas as telas — e igual nos dois
 * temas, que é o motivo de o app inteiro continuar legível trocando de tema.
 */
export const marca = {
  /** Linha cumprida: escrita em azul, fundo mais claro, ✓ preenchido. */
  feita: 'fundoAlto',
  /** Linha da vez: barra de tinta na margem esquerda. */
  larguraBarraAtiva: 3,
  /** Linha impressa e não preenchida: pontilhado de formulário. */
  pontilhado: '·····',
  /** Não soma ao total — livro-caixa põe entre parênteses. */
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
 * Margem esquerda. Toda tela registra contra ela: é onde mora o ordinal da
 * linha, a barra da linha ativa e o carimbo de recorde.
 */
export const margem = {
  pagina: 20,
  calha: 26,
} as const;

/** Nem papel nem ardósia têm canto arredondado. O pouco que há é corte. */
export const radius = {
  none: 0,
  sm: 2,
  md: 3,
  lg: 4,
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
 * Escala tipográfica — idêntica nos dois temas.
 *
 * Duas famílias e um princípio: prosa em Archivo, TODO número em Barlow
 * Condensed. Hierarquia vem de tinta e entrelinha, não de inflar corpo; só
 * `monumento` escapa disso, e escapa de propósito.
 */
export const type = {
  monumento: { fontFamily: font.num, fontSize: 104, lineHeight: 100, letterSpacing: -2 },
  numeroXG: { fontFamily: font.num, fontSize: 44, lineHeight: 46, letterSpacing: -0.8 },
  numeroG: { fontFamily: font.num, fontSize: 28, lineHeight: 30, letterSpacing: -0.4 },
  numero: { fontFamily: font.num, fontSize: 20, lineHeight: 24, letterSpacing: -0.2 },

  display: { fontFamily: font.semibold, fontSize: 30, lineHeight: 34, letterSpacing: -0.9 },
  title: { fontFamily: font.semibold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },
  heading: { fontFamily: font.semibold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.05 },
  bodyMed: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, letterSpacing: -0.05 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  smallMed: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },

  coluna: { fontFamily: font.num, fontSize: 12, lineHeight: 14, letterSpacing: 1.1 },
  carimbo: { fontFamily: font.numBold, fontSize: 12, lineHeight: 14, letterSpacing: 1.5 },
  caption: { fontFamily: font.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
  mono: { fontFamily: font.num, fontSize: 16, lineHeight: 20 },
} as const;

/**
 * Nada flutua — não há sombra na interface.
 *
 * A única exceção é a folha modal, que é literalmente uma folha por cima da
 * página. Ela recebe deslocamento e desfoque de verdade; halo colorido de raio
 * zero é decoração, não profundidade.
 */
export function sombraFolha(p: Paleta) {
  return {
    shadowColor: p === ESCURA ? '#000000' : '#2A2C26',
    shadowOpacity: p === ESCURA ? 0.5 : 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  } as const;
}

/** Durações. Nunca ease-in em interface: atrasa o instante que se está olhando. */
export const motion = {
  toque: 110,
  estado: 180,
  entrada: 240,
} as const;
