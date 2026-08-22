/**
 * Forja — sistema de design.
 * Monocromático profundo + um único acento. Tudo respira.
 */

export const color = {
  // Fundos — pretos com uma gota de violeta. O desvio é pequeno de propósito:
  // não deve ser lido como "cinza roxo", só amarrar o preto ao acento.
  bg: '#09080C',
  bgSoft: '#0F0E15',
  surface: '#15131D',
  surfaceHi: '#1D1A27',
  surfacePress: '#262232',

  // Traços — brancos levemente violeta, pela mesma razão.
  line: 'rgba(196,184,255,0.07)',
  lineMid: 'rgba(196,184,255,0.12)',
  lineHi: 'rgba(196,184,255,0.20)',

  // Texto
  text: '#F4F3F7',
  textDim: '#9C98A8',
  textFaint: '#5C5868',
  textGhost: '#3C3846',

  // Acento — violeta claro. Sobre preto ele fica legível como texto miúdo
  // (6,8:1) e ainda aceita texto escuro por cima quando vira preenchimento
  // (7,7:1) — um roxo mais fechado falharia num dos dois usos.
  accent: '#A78BFA',
  accentText: '#12061F',
  accentSoft: 'rgba(167,139,250,0.13)',
  accentLine: 'rgba(167,139,250,0.28)',
  /** Realce de fundo em áreas grandes (linha de série concluída). Bem discreto. */
  accentFundo: 'rgba(167,139,250,0.07)',
  /** Violeta fechado — só para profundidade: halos e degradês. */
  accentDeep: '#7C3AED',

  // Sinais
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.12)',
  positive: '#6FE0B0',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Escala de espaçamento em passos de 4. */
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

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Escala tipográfica. `tnum` liga números tabulares onde alinhamento importa. */
export const type = {
  display: { fontFamily: font.bold, fontSize: 42, lineHeight: 46, letterSpacing: -1.4 },
  title: { fontFamily: font.semibold, fontSize: 26, lineHeight: 31, letterSpacing: -0.7 },
  heading: { fontFamily: font.semibold, fontSize: 19, lineHeight: 24, letterSpacing: -0.4 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  bodyMed: { fontFamily: font.medium, fontSize: 15, lineHeight: 21, letterSpacing: -0.1 },
  small: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, letterSpacing: -0.05 },
  smallMed: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, letterSpacing: -0.05 },
  caption: { fontFamily: font.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.6 },
  mono: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
} as const;

/** Sombra sutil — usada só nos elementos flutuantes. */
export const shadow = {
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  /** Halo discreto sob o botão principal — sugere elevação, não luminosidade. */
  glow: {
    shadowColor: '#7C3AED',
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
} as const;
