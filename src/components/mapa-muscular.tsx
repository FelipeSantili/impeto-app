import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Rect } from 'react-native-svg';
import { Tx } from '@/components/base';
import type { Grupo } from '@/data/types';
import { color, sp } from '@/design/tokens';
import type { MusculoTrabalhado } from '@/lib/metricas';

/**
 * Mapa dos músculos trabalhados, desenhado sobre uma figura humana.
 *
 * A figura é geométrica de propósito: formas simples lêem melhor em tamanho
 * pequeno e combinam com o resto do app. Uma ilustração anatômica detalhada
 * viraria borrão a 100px de largura.
 *
 * Cada região é pintada por intensidade — do cinza da silhueta até o acento
 * cheio, conforme a participação do grupo no esforço da sessão.
 */

// O desenho vive em torno de x=80; a janela recorta as margens vazias para a
// figura preencher o quadro.
const C = 80; // eixo de simetria
const JANELA = { x: 20, y: 0, l: 120, a: 284 };
const VIEWBOX = `${JANELA.x} ${JANELA.y} ${JANELA.l} ${JANELA.a}`;
const PROPORCAO = JANELA.l / JANELA.a;

type Vista = 'frente' | 'costas';

/** Par espelhado no eixo central — evita repetir coordenadas de cada lado. */
function par(dx: number, y: number, w: number, h: number, r = 5) {
  return (
    <>
      <Rect x={C - dx - w} y={y} width={w} height={h} rx={r} />
      <Rect x={C + dx} y={y} width={w} height={h} rx={r} />
    </>
  );
}

function parElipse(dx: number, cy: number, rx: number, ry: number) {
  return (
    <>
      <Ellipse cx={C - dx} cy={cy} rx={rx} ry={ry} />
      <Ellipse cx={C + dx} cy={cy} rx={rx} ry={ry} />
    </>
  );
}

interface Regiao {
  grupo: Grupo;
  vista: Vista | 'ambas';
  formas: ReactNode;
}

/*
 * Geometria de referência (eixo em x=80):
 *   tronco  x 56–104,  y 42–134
 *   braços  x 28–44 e 116–132,  y 58–158   (afastados do tronco para serem lidos)
 *   pernas  x 58,5–78,5 e 81,5–101,5,  y 148–264
 * As faixas verticais não se sobrepõem entre grupos vizinhos: ombro termina
 * onde o peito começa, senão os dois viram uma mancha só.
 */
const REGIOES: Regiao[] = [
  { grupo: 'ombros', vista: 'ambas', formas: parElipse(30, 56, 13, 11) },
  { grupo: 'panturrilha', vista: 'ambas', formas: par(2.5, 214, 16, 46, 7) },

  { grupo: 'trapezio', vista: 'frente', formas: par(8, 44, 14, 10, 4) },
  { grupo: 'peito', vista: 'frente', formas: par(1, 64, 21, 24, 7) },
  { grupo: 'biceps', vista: 'frente', formas: par(37, 80, 14, 32, 7) },
  { grupo: 'antebraco', vista: 'frente', formas: par(38, 116, 12, 36, 6) },
  {
    grupo: 'abdomen',
    vista: 'frente',
    formas: <Rect x={C - 16} y={92} width={32} height={42} rx={7} />,
  },
  { grupo: 'quadriceps', vista: 'frente', formas: par(1.5, 148, 20, 62, 9) },

  {
    grupo: 'trapezio',
    vista: 'costas',
    formas: <Rect x={C - 21} y={46} width={42} height={34} rx={9} />,
  },
  { grupo: 'costas', vista: 'costas', formas: par(1, 82, 23, 40, 8) },
  { grupo: 'triceps', vista: 'costas', formas: par(37, 80, 14, 32, 7) },
  { grupo: 'antebraco', vista: 'costas', formas: par(38, 116, 12, 36, 6) },
  {
    grupo: 'lombar',
    vista: 'costas',
    formas: <Rect x={C - 14} y={124} width={28} height={22} rx={6} />,
  },
  { grupo: 'gluteos', vista: 'costas', formas: par(1.5, 148, 20, 28, 9) },
  { grupo: 'posterior', vista: 'costas', formas: par(1.5, 180, 20, 46, 9) },
];

/** Silhueta: o corpo por baixo, sempre visível, sem destaque. */
function Silhueta() {
  return (
    <G fill="#2C2839">
      <Circle cx={C} cy={20} r={15} />
      <Rect x={C - 7} y={32} width={14} height={12} rx={5} />
      <Rect x={C - 24} y={42} width={48} height={92} rx={14} />
      <Rect x={C - 22} y={128} width={44} height={30} rx={10} />
      {par(36, 58, 16, 100, 8)}
      {par(1.5, 148, 20, 116, 9)}
      {par(2.5, 260, 16, 10, 4)}
    </G>
  );
}

/**
 * Converte participação (0..1) em opacidade.
 *
 * A raiz quadrada abre o meio da escala: sem ela, um grupo com 10% do esforço
 * ficaria quase invisível e o mapa pareceria vazio num treino bem distribuído.
 */
function opacidade(fracao: number): number {
  return 0.28 + Math.sqrt(Math.min(1, fracao / 0.45)) * 0.72;
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
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(atraso, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [atraso, p]);

  const estilo = useAnimatedStyle(() => ({ opacity: p.value }));

  const ativas = REGIOES.filter(
    (r) => (r.vista === vista || r.vista === 'ambas') && intensidade.has(r.grupo),
  );

  const altura = largura / PROPORCAO;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: largura, height: altura }}>
        <Svg width={largura} height={altura} viewBox={VIEWBOX}>
          <Silhueta />
        </Svg>

        {/* As regiões destacadas entram por cima, com fade próprio. */}
        <Animated.View style={[StyleSheet.absoluteFill, estilo]}>
          <Svg width={largura} height={altura} viewBox={VIEWBOX}>
            {ativas.map((r, i) => (
              <G
                key={`${r.grupo}-${i}`}
                fill={color.accent}
                opacity={opacidade(intensidade.get(r.grupo)!)}
              >
                {r.formas}
              </G>
            ))}
          </Svg>
        </Animated.View>
      </View>

      <Tx v="caption" cor={color.textFaint} style={{ marginTop: sp.sm }}>
        {vista === 'frente' ? 'FRENTE' : 'COSTAS'}
      </Tx>
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
      <Figura vista="costas" intensidade={intensidade} atraso={atraso + 220} largura={largura} />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flexDirection: 'row', justifyContent: 'center', gap: sp.h1 },
});
