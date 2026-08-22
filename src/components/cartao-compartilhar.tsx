import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Rotulo, Tx } from '@/components/base';
import { MapaMuscular } from '@/components/mapa-muscular';
import { GRUPO_LABEL } from '@/data/types';
import { color, radius, sp } from '@/design/tokens';
import {
  duracaoMs,
  fmtData,
  fmtDuracaoCurta,
  fmtVolume,
  musculosDaSessao,
  seriesFeitas,
  volumeSessao,
} from '@/lib/metricas';
import type { Sessao } from '@/store/treino';

const RAIO_PONTOS = '60.5,4.5 23.5,54.5 45.5,54.5 39.5,95.5 76.5,43.5 54.5,43.5';

/** A marca do app, a mesma do ícone — assina o cartão compartilhado. */
function Marca({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
      <Polygon points={RAIO_PONTOS} fill={color.accent} />
    </Svg>
  );
}

/**
 * Cartão de treino para compartilhar.
 *
 * Renderizado fora da tela e capturado como imagem, então tem tamanho fixo e
 * não usa nada dependente de rolagem, safe area ou animação — o que estiver
 * animando no momento da captura sairia num quadro intermediário.
 */
export function CartaoCompartilhar({
  sessao,
  refCaptura,
}: {
  sessao: Sessao;
  refCaptura: RefObject<View | null>;
}) {
  const musculos = musculosDaSessao(sessao);
  const principais = musculos.slice(0, 3).map((m) => GRUPO_LABEL[m.grupo]);

  return (
    <View ref={refCaptura} collapsable={false} style={estilos.cartao}>
      <LinearGradient
        colors={['rgba(124,58,237,0.28)', 'rgba(124,58,237,0.04)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={estilos.topo}>
        <Marca />
        <Rotulo cor={color.textDim}>ÍMPETO</Rotulo>
        <View style={{ flex: 1 }} />
        <Tx v="caption" cor={color.textFaint}>
          {fmtData(sessao.fim ?? sessao.inicio).toUpperCase()}
        </Tx>
      </View>

      <Tx v="title" style={{ marginTop: sp.xxl }} numberOfLines={2}>
        {sessao.nome}
      </Tx>
      {principais.length ? (
        <Tx v="small" cor={color.textFaint} style={{ marginTop: sp.xs }}>
          {principais.join(' · ')}
        </Tx>
      ) : null}

      <View style={estilos.numeros}>
        <Numero valor={fmtDuracaoCurta(duracaoMs(sessao))} rotulo="Duração" />
        <View style={estilos.sep} />
        <Numero valor={fmtVolume(volumeSessao(sessao))} rotulo="Volume" />
        <View style={estilos.sep} />
        <Numero valor={String(seriesFeitas(sessao))} rotulo="Séries" />
      </View>

      <View style={{ marginTop: sp.h1 }}>
        {/* atraso 0: a captura acontece depois, com o mapa já em opacidade cheia */}
        <MapaMuscular musculos={musculos} atraso={0} largura={108} />
      </View>

      {sessao.cardio ? (
        <View style={estilos.cardio}>
          <Ionicons name="heart" size={12} color={color.accent} />
          <Tx v="small" tab cor={color.textDim}>
            {sessao.cardio.media} bpm médio · {sessao.cardio.maxima} máx
          </Tx>
        </View>
      ) : null}

      <View style={estilos.rodape}>
        <Tx v="caption" cor={color.textGhost}>
          {sessao.exercicios.length} EXERCÍCIOS
        </Tx>
      </View>
    </View>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Tx v="heading" tab>
        {valor}
      </Tx>
      <Tx v="caption" cor={color.textFaint}>
        {rotulo.toUpperCase()}
      </Tx>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    width: 380,
    backgroundColor: color.bg,
    paddingHorizontal: sp.xxl,
    paddingTop: sp.xxl,
    paddingBottom: sp.xl,
    overflow: 'hidden',
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  numeros: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp.xxl,
    paddingVertical: sp.lg,
    borderRadius: radius.xl,
    backgroundColor: color.bgSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  sep: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: color.lineMid },
  cardio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    marginTop: sp.lg,
  },
  rodape: { alignItems: 'center', marginTop: sp.lg },
});
