import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { Rotulo } from '@/components/base';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { sp, traco } from '@/design/tokens';

/**
 * A curva de frequência do treino.
 *
 * Só aparece quando a fonte manda amostra a amostra — a cinta cardíaca, ou um
 * .tcx de atividade ao ar livre. A exportação de musculação do Mi Fitness traz
 * apenas a média, e nesse caso não há curva nenhuma para desenhar.
 *
 * Segue a regra do gráfico de volume: sem moldura, sem degradê, crescendo de
 * uma LINHA DE BASE. A base aqui é o menor batimento do treino, não zero —
 * ninguém treina a 0 bpm, e ancorar em zero achataria a variação inteira numa
 * faixa fina no topo.
 *
 * A largura vem do `onLayout` em vez de um `viewBox` esticado: `Svg` com
 * `preserveAspectRatio="none"` deformaria a espessura do traço junto com a
 * geometria, e o traço ficaria mais grosso na horizontal que na vertical.
 */
export function CurvaFc({ curva, altura = 56 }: { curva: number[]; altura?: number }) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const [largura, setLargura] = useState(0);

  if (curva.length < 2) return null;

  const medir = (e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width);

  const min = curva.reduce((a, b) => (b < a ? b : a), curva[0]);
  const max = curva.reduce((a, b) => (b > a ? b : a), curva[0]);
  // Meio traço de folga em cima e embaixo para a linha não ser cortada.
  const folga = 2;
  const util = altura - folga * 2;
  const faixa = max - min;

  // Treino de frequência constante vira uma reta no meio, não uma colada no topo.
  const alturaDe = (v: number) => (faixa === 0 ? altura / 2 : folga + util - ((v - min) / faixa) * util);
  const yPico = alturaDe(max);

  const pontos = curva
    .map((v, i) => `${((i / (curva.length - 1)) * largura).toFixed(1)},${alturaDe(v).toFixed(1)}`)
    .join(' ');

  return (
    <View style={{ paddingTop: sp.sm }}>
      <View onLayout={medir} style={{ height: altura }}>
        {largura > 0 ? (
          <Svg width={largura} height={altura}>
            {/* Pico: régua pontilhada onde a curva encosta. */}
            <Line
              x1={0}
              y1={yPico}
              x2={largura}
              y2={yPico}
              stroke={c.reguaMid}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <Polyline
              points={pontos}
              fill="none"
              stroke={c.rec}
              strokeWidth={1.6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        ) : null}
      </View>
      {/* A base é linha cheia: é dela que a curva cresce. */}
      <View style={{ height: traco.normal, backgroundColor: c.reguaForte }} />
      <View style={estilos.rotulos}>
        <Rotulo cor={c.tintaFraca}>{min} mín</Rotulo>
        <Rotulo cor={c.tintaFraca}>{max} pico</Rotulo>
      </View>
    </View>
  );
}

const usarEstilos = criarEstilos(() => ({
  rotulos: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: sp.xs },
}));
