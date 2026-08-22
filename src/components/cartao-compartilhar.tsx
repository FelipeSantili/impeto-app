import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { Regua, Rotulo, Tx } from '@/components/base';
import { Glifo } from '@/components/glifos';
import { MapaMuscular } from '@/components/mapa-muscular';
import { GRUPO_LABEL } from '@/data/types';
import { color, sp, traco } from '@/design/tokens';
import {
  duracaoMs,
  fmtDataAbs,
  fmtDuracaoCurta,
  fmtVolume,
  musculosDaSessao,
  seriesFeitas,
  volumeSessao,
} from '@/lib/metricas';
import type { Sessao } from '@/store/treino';

const MARGEM = 26;

/**
 * Cartão de treino para compartilhar — uma folha do caderno destacada.
 *
 * É a única peça do app que sai dele, então é onde o mundo precisa ser mais
 * legível: marca e data na mesma linha de base, régua forte fechando o
 * cabeçalho, totais em colunas rotuladas e a prancha anatômica no meio.
 *
 * Renderizado fora da tela e capturado como imagem, então tem tamanho fixo e
 * não usa nada dependente de rolagem, safe area ou animação — o que estivesse
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
      <View style={estilos.topo}>
        <Glifo nome="raio" tamanho={16} cor={color.tinta} />
        <Rotulo cor={color.tinta} style={estilos.marca}>
          Ímpeto
        </Rotulo>
        <View style={{ flex: 1 }} />
        <Rotulo cor={color.tintaFraca}>{fmtDataAbs(sessao.fim ?? sessao.inicio)}</Rotulo>
      </View>
      <Regua peso="forte" cor={color.tinta} />

      <View style={{ paddingTop: sp.xl }}>
        <Tx v="display" numberOfLines={2}>
          {sessao.nome}
        </Tx>
        {principais.length ? (
          <Tx v="small" cor={color.tintaFraca} style={{ marginTop: 2 }}>
            {principais.join(' · ')}
          </Tx>
        ) : null}
      </View>

      <View style={estilos.colunas}>
        <Rotulo cor={color.tintaMid} style={{ flex: 1 }}>
          Tempo
        </Rotulo>
        <Rotulo cor={color.tintaMid} style={{ flex: 1.2 }}>
          Volume
        </Rotulo>
        <Rotulo cor={color.tintaMid} style={{ flex: 1 }}>
          Séries
        </Rotulo>
      </View>
      <Regua peso="normal" cor={color.reguaMid} />
      {/*
        `numberOfLines` + `adjustsFontSizeToFit`: o cartão vira imagem e uma
        quebra de linha aqui desmonta a composição inteira. Duração longa
        ("2h05") ou volume alto encolhem em vez de quebrar.
      */}
      <View style={estilos.valores}>
        <Tx v="numeroXG" tab numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1 }}>
          {fmtDuracaoCurta(duracaoMs(sessao))}
        </Tx>
        <Tx v="numeroXG" tab numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1.2 }}>
          {fmtVolume(volumeSessao(sessao))}
        </Tx>
        <Tx v="numeroXG" tab numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1 }}>
          {seriesFeitas(sessao)}
        </Tx>
      </View>
      <Regua peso="forte" />

      <View style={estilos.prancha}>
        {/* atraso 0: a captura acontece com a prancha já em densidade cheia. */}
        <MapaMuscular musculos={musculos} atraso={0} largura={104} />
      </View>

      <Regua />
      <View style={estilos.rodape}>
        {sessao.cardio ? (
          <View style={estilos.cardio}>
            <Glifo nome="coracao" tamanho={11} cor={color.vermelho} />
            <Tx v="small" tab cor={color.tintaMid}>
              {sessao.cardio.media} bpm médio · {sessao.cardio.maxima} máx
            </Tx>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Rotulo cor={color.tintaFraca}>{sessao.exercicios.length} exercícios</Rotulo>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    width: 380,
    backgroundColor: color.papel,
    paddingHorizontal: MARGEM,
    paddingTop: MARGEM,
    paddingBottom: sp.xl,
    borderWidth: traco.normal,
    borderColor: color.papelBorda,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingBottom: sp.sm },
  marca: { fontSize: 14, letterSpacing: 3.4 },
  colunas: { flexDirection: 'row', marginTop: sp.h1, paddingBottom: sp.xs },
  valores: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: sp.md },
  prancha: { paddingVertical: sp.xxl },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: sp.md,
  },
  cardio: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
});
