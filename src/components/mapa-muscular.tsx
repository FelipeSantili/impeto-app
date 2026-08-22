import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { Rotulo } from '@/components/base';
import type { Grupo } from '@/data/types';
import { usarPaleta } from '@/design/tema';
import { sp } from '@/design/tokens';
import type { MusculoTrabalhado } from '@/lib/metricas';

/**
 * Prancha anatômica: os músculos trabalhados sobre a figura humana.
 *
 * A versão anterior era feita de retângulos e elipses — lia como boneco de
 * blocos, não como músculo. Aqui cada grupo é um traçado com a forma real do
 * músculo: o peitoral em leque, o deltoide em capuz sobre o ombro, o dorsal em
 * asa da axila até a cintura, o quadríceps descendo em gota até o joelho.
 *
 * Os músculos NÃO são pintados por cima de uma silhueta: eles SÃO o corpo,
 * como numa prancha de anatomia. O que não foi trabalhado fica no tom neutro;
 * o que foi trabalhado ganha densidade de tinta proporcional ao esforço.
 *
 * Intensidade é densidade, nunca matiz — a mesma regra do resto do app, e o
 * que mantém a prancha legível nos dois temas e para quem não distingue cores.
 */

const VB = { l: 200, a: 470 };
const PROPORCAO = VB.l / VB.a;

type Vista = 'frente' | 'costas';

/**
 * Espelha um traçado do lado esquerdo para o direito.
 *
 * Todo músculo é desenhado uma vez, na metade esquerda (x < 100), e refletido
 * no eixo central. Autorar os dois lados à mão faria a figura ficar assimétrica
 * na primeira correção que esquecesse um deles.
 */
function Par({ d }: { d: string }) {
  return (
    <>
      <Path d={d} />
      <G transform={`translate(${VB.l},0) scale(-1,1)`}>
        <Path d={d} />
      </G>
    </>
  );
}

interface Regiao {
  grupo: Grupo;
  vista: Vista | 'ambas';
  /** Traçado do lado esquerdo; espelhado automaticamente. */
  par?: string;
  /** Traçado único, centrado no eixo (não espelha). */
  centro?: string;
}

/*
 * Sistema de coordenadas (200 × 470, eixo em x=100):
 *   cabeça      y  6– 60
 *   ombros      y 88–140
 *   tronco      y 88–250
 *   quadril     y 250–290
 *   coxa        y 268–378
 *   joelho      y 378–396
 *   panturrilha y 392–448
 */
const REGIOES: Regiao[] = [
  // ── Ombro: o capuz do deltoide, visível nas duas vistas ──────────────────
  {
    grupo: 'ombros',
    vista: 'ambas',
    par: 'M60 92 C46 96 36 110 33 126 C31 138 36 148 45 149 C55 150 63 140 67 126 C70 114 69 100 64 92 Z',
  },

  // ── FRENTE ───────────────────────────────────────────────────────────────
  {
    grupo: 'trapezio',
    vista: 'frente',
    par: 'M88 68 C79 71 68 78 60 88 L66 96 C75 88 85 83 93 81 Z',
  },
  {
    // Peitoral em leque: largo na clavícula, convergindo para o esterno.
    grupo: 'peito',
    vista: 'frente',
    par: 'M96 86 C82 86 70 92 64 103 C59 114 61 130 68 140 C77 150 91 151 97 145 C98 128 98 102 96 86 Z',
  },
  {
    grupo: 'biceps',
    vista: 'frente',
    par: 'M41 130 C34 142 31 160 34 175 C37 184 48 185 53 178 C56 166 56 146 53 133 C50 127 45 126 41 130 Z',
  },
  {
    grupo: 'antebraco',
    vista: 'frente',
    par: 'M35 180 C28 196 24 216 25 236 C26 247 36 250 42 243 C47 227 51 202 50 183 C46 176 39 175 35 180 Z',
  },
  {
    // Reto abdominal: coluna central segmentada, com o oblíquo ladeando.
    grupo: 'abdomen',
    vista: 'frente',
    par: 'M82 152 C79 174 79 206 82 232 C86 241 95 242 97 236 L97 150 C92 147 86 147 82 152 Z',
  },
  {
    grupo: 'abdomen',
    vista: 'frente',
    par: 'M72 154 C68 176 68 202 73 222 C77 231 81 229 81 220 C78 198 78 174 80 154 Z',
  },
  {
    // Quadríceps: gota do quadril ao joelho, com o vasto medial descendo mais.
    grupo: 'quadriceps',
    vista: 'frente',
    par: 'M69 268 C61 292 59 324 64 352 C68 372 82 378 90 370 C95 342 97 300 95 270 Z',
  },
  {
    grupo: 'panturrilha',
    vista: 'frente',
    par: 'M74 396 C69 412 68 432 73 444 C79 452 88 449 89 440 C89 423 87 408 85 396 Z',
  },

  // ── COSTAS ───────────────────────────────────────────────────────────────
  {
    // Trapézio em losango: do occipital aos ombros e descendo ao meio das costas.
    grupo: 'trapezio',
    vista: 'costas',
    centro:
      'M100 64 C86 67 70 78 59 90 L67 100 C78 92 90 87 100 86 C110 87 122 92 133 100 L141 90 C130 78 114 67 100 64 Z ' +
      'M100 88 C88 90 78 96 72 104 C80 130 88 156 100 176 C112 156 120 130 128 104 C122 96 112 90 100 88 Z',
  },
  {
    // Dorsal: asa da axila até a cintura, é o que dá o V.
    grupo: 'costas',
    vista: 'costas',
    par: 'M64 112 C56 130 58 158 69 182 C78 200 92 205 97 198 C97 172 92 140 83 118 C77 108 69 105 64 112 Z',
  },
  {
    grupo: 'triceps',
    vista: 'costas',
    par: 'M36 128 C29 141 27 161 31 176 C35 185 46 184 51 176 C53 161 52 142 48 130 C44 123 40 123 36 128 Z',
  },
  {
    grupo: 'antebraco',
    vista: 'costas',
    par: 'M35 180 C28 196 24 216 25 236 C26 247 36 250 42 243 C47 227 51 202 50 183 C46 176 39 175 35 180 Z',
  },
  {
    // Eretores da espinha: duas colunas ladeando a lombar.
    grupo: 'lombar',
    vista: 'costas',
    par: 'M84 180 C80 196 79 216 83 232 C88 240 96 240 97 232 L97 182 C93 177 87 176 84 180 Z',
  },
  {
    grupo: 'gluteos',
    vista: 'costas',
    par: 'M67 240 C57 253 55 275 65 289 C77 301 93 298 97 284 C99 266 97 248 92 239 Z',
  },
  {
    // Isquiotibiais: dois ventres descendo do glúteo ao joelho.
    grupo: 'posterior',
    vista: 'costas',
    par: 'M70 292 C64 318 64 348 69 370 C75 381 88 380 92 369 C95 342 95 314 93 292 Z',
  },
  {
    // Gastrocnêmio: as duas cabeças, mais bojudas que a vista de frente.
    grupo: 'panturrilha',
    vista: 'costas',
    par: 'M72 392 C65 410 64 432 71 445 C79 454 89 450 90 439 C90 420 87 404 84 392 Z',
  },
];

/** Cabeça, pescoço, juntas, mãos e pés — o que não é músculo nomeado. */
function Estrutura({ cor, traco }: { cor: string; traco: string }) {
  return (
    <G fill={cor} stroke={traco} strokeWidth={1.4} strokeLinejoin="round">
      <Ellipse cx={100} cy={32} rx={21} ry={26} />
      <Path d="M87 50 L87 74 C92 82 108 82 113 74 L113 50 Z" />
      {/* tronco por baixo dos músculos, para não sobrar vão entre eles */}
      <Path d="M62 92 C54 112 52 140 56 168 C60 196 66 220 68 248 C68 268 66 280 68 292 L132 292 C134 280 132 268 132 248 C134 220 140 196 144 168 C148 140 146 112 138 92 C124 82 76 82 62 92 Z" />
      {/* braços */}
      <Path d="M45 118 C34 128 28 152 26 180 C24 208 24 232 27 246 L48 246 C48 224 48 196 51 172 C54 148 58 130 62 120 Z" />
      <Path d="M155 118 C166 128 172 152 174 180 C176 208 176 232 173 246 L152 246 C152 224 152 196 149 172 C146 148 142 130 138 120 Z" />
      {/* mãos */}
      <Ellipse cx={35} cy={258} rx={11} ry={15} />
      <Ellipse cx={165} cy={258} rx={11} ry={15} />
      {/* pernas */}
      <Path d="M68 268 C62 300 60 340 64 376 C66 400 68 428 70 448 L92 448 C94 428 94 400 94 376 C96 340 96 300 95 268 Z" />
      <Path d="M132 268 C138 300 140 340 136 376 C134 400 132 428 130 448 L108 448 C106 428 106 400 106 376 C104 340 104 300 105 268 Z" />
      {/* pés */}
      <Path d="M68 448 C64 458 66 464 76 464 L92 464 C94 456 94 452 92 448 Z" />
      <Path d="M132 448 C136 458 134 464 124 464 L108 464 C106 456 106 452 108 448 Z" />
    </G>
  );
}

/**
 * Converte participação (0..1) em densidade de tinta.
 *
 * A raiz quadrada abre o meio da escala: sem ela, um grupo com 10% do esforço
 * ficaria quase invisível e a prancha pareceria vazia num treino bem
 * distribuído.
 */
function densidade(fracao: number): number {
  return 0.32 + Math.sqrt(Math.min(1, fracao / 0.45)) * 0.68;
}

function Figura({
  vista,
  intensidade,
  atraso,
  largura,
}: {
  vista: Vista;
  intensidade: Map<Grupo, number>;
  atraso: number;
  largura: number;
}) {
  const c = usarPaleta();
  const p = useSharedValue(0);
  const reduzido = useReducedMotion();

  useEffect(() => {
    if (reduzido) {
      p.set(1);
      return;
    }
    p.set(0);
    p.set(withDelay(atraso, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })));
  }, [atraso, reduzido, p]);

  const estilo = useAnimatedStyle(() => ({ opacity: p.get() }));

  const daVista = REGIOES.filter((r) => r.vista === vista || r.vista === 'ambas');
  const inertes = daVista.filter((r) => !intensidade.has(r.grupo));
  const ativas = daVista.filter((r) => intensidade.has(r.grupo));

  const altura = largura / PROPORCAO;
  const viewBox = `0 0 ${VB.l} ${VB.a}`;

  const desenhar = (r: Regiao, i: number) =>
    r.centro ? <Path key={i} d={r.centro} /> : <Par key={i} d={r.par!} />;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: largura, height: altura }}>
        <Svg width={largura} height={altura} viewBox={viewBox}>
          <Estrutura cor={c.silhueta} traco={c.silhuetaTraco} />
          {/* Músculos em repouso: mesmo tom do corpo, contornados, de modo que
              a prancha já se lê como anatomia mesmo sem nenhum destaque. */}
          <G
            fill={c.silhueta}
            stroke={c.silhuetaTraco}
            strokeWidth={1.2}
            strokeLinejoin="round"
          >
            {inertes.map(desenhar)}
          </G>
        </Svg>

        <Animated.View style={[StyleSheet.absoluteFill, estilo]}>
          <Svg width={largura} height={altura} viewBox={viewBox}>
            {ativas.map((r, i) => (
              // Contorno na cor do corpo em volta de cada músculo: é o que
              // separa vizinhos que se encostam (deltoide e peitoral, glúteo e
              // isquiotibial). A opacidade vai só no preenchimento — se fosse
              // no grupo, o contorno desbotaria junto e a separação sumiria
              // justamente nos grupos menos trabalhados.
              <G
                key={i}
                fill={c.azul}
                fillOpacity={densidade(intensidade.get(r.grupo)!)}
                stroke={c.silhueta}
                strokeWidth={1.6}
                strokeLinejoin="round"
              >
                {desenhar(r, i)}
              </G>
            ))}
          </Svg>
        </Animated.View>
      </View>

      <Rotulo cor={c.tintaFraca} style={{ marginTop: sp.sm }}>
        {vista === 'frente' ? 'Frente' : 'Costas'}
      </Rotulo>
    </View>
  );
}

export function MapaMuscular({
  musculos,
  atraso = 0,
  largura = 96,
}: {
  musculos: MusculoTrabalhado[];
  atraso?: number;
  largura?: number;
}) {
  const intensidade = new Map<Grupo, number>();
  for (const m of musculos) {
    // 'corpo' e 'cardio' não têm região própria; pintá-los seria inventar dado.
    if (m.grupo === 'corpo' || m.grupo === 'cardio') continue;
    intensidade.set(m.grupo, m.fracao);
  }

  return (
    <View style={estilos.raiz}>
      <Figura vista="frente" intensidade={intensidade} atraso={atraso} largura={largura} />
      <Figura vista="costas" intensidade={intensidade} atraso={atraso + 200} largura={largura} />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flexDirection: 'row', justifyContent: 'center', gap: sp.h1 },
});
