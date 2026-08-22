import type { ReactNode } from 'react';
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
import Svg, { Circle, Ellipse, G, Rect } from 'react-native-svg';
import { Rotulo } from '@/components/base';
import type { Grupo } from '@/data/types';
import { color, sp } from '@/design/tokens';
import type { MusculoTrabalhado } from '@/lib/metricas';

/**
 * Prancha anatômica: os músculos trabalhados sobre a figura humana.
 *
 * A figura é geométrica de propósito — formas simples lêem melhor em tamanho
 * pequeno, e uma ilustração anatômica detalhada viraria borrão a 100px de
 * largura.
 *
 * A intensidade é DENSIDADE DE TINTA, não matiz: um grupo mais trabalhado é
 * mais escuro, não de outra cor. É a mesma regra do resto do app — estado se
 * diz por marca, não por cor —, e aqui ela também resolve o daltonismo e a
 * leitura sob luz forte de graça.
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
  // Ombro termina em y=64 e peito começa em 66: com sobreposição os dois viram
  // uma mancha só, que foi o defeito da primeira versão desta prancha.
  { grupo: 'ombros', vista: 'ambas', formas: parElipse(30, 54, 13, 10) },
  { grupo: 'panturrilha', vista: 'ambas', formas: par(2.5, 214, 16, 46, 7) },

  { grupo: 'trapezio', vista: 'frente', formas: par(8, 44, 14, 10, 4) },
  { grupo: 'peito', vista: 'frente', formas: par(1, 66, 21, 24, 7) },
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

/**
 * Silhueta: o corpo por baixo, sempre visível.
 * Contornada a régua, como figura de prancha gravada — sem contorno ela vira
 * mancha, com contorno ela vira desenho.
 */
function Silhueta() {
  return (
    // Contorno firme: sobre papel, uma silhueta clara com traço fraco lê como
    // mancha. O traço é o que a transforma em figura gravada.
    <G fill="#DCDAD2" stroke="rgba(25,27,28,0.34)" strokeWidth={1.1}>
      <Circle cx={C} cy={19} r={13} />
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
 * Converte participação (0..1) em densidade de tinta.
 *
 * A raiz quadrada abre o meio da escala: sem ela, um grupo com 10% do esforço
 * ficaria quase invisível e a prancha pareceria vazia num treino bem
 * distribuído.
 */
function densidade(fracao: number): number {
  return 0.3 + Math.sqrt(Math.min(1, fracao / 0.45)) * 0.7;
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

        {/* As regiões trabalhadas entram por cima, com surgimento próprio. */}
        <Animated.View style={[StyleSheet.absoluteFill, estilo]}>
          <Svg width={largura} height={altura} viewBox={VIEWBOX}>
            {ativas.map((r, i) => (
              // Contorno na cor do papel em volta de cada região: é o que separa
              // grupos vizinhos que se encostam (ombro e peito, glúteo e
              // posterior). A opacidade vai só no preenchimento — se fosse no
              // grupo, o contorno desbotaria junto e a separação sumiria
              // justamente nos grupos menos trabalhados.
              <G
                key={`${r.grupo}-${i}`}
                fill={color.azul}
                fillOpacity={densidade(intensidade.get(r.grupo)!)}
                stroke="#DCDAD2"
                strokeWidth={1.6}
              >
                {r.formas}
              </G>
            ))}
          </Svg>
        </Animated.View>
      </View>

      <Rotulo cor={color.tintaFraca} style={{ marginTop: sp.sm }}>
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
