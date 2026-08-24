import type { RefObject } from 'react';
import { View } from 'react-native';
import { Regua, Rotulo, Tx } from '@/components/base';
import { Glifo } from '@/components/glifos';
import { MapaMuscular } from '@/components/mapa-muscular';
import { GRUPO_LABEL } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { sp, traco } from '@/design/tokens';
import {
  duracaoMs,
  fmtDataAbs,
  fmtDuracaoCurta,
  fmtVolume,
  musculosDaSessao,
  seriesFeitas,
  volumeSessao,
} from '@/lib/metricas';
import type { Cardio, Sessao } from '@/store/treino';

const MARGEM = 26;

/**
 * A linha de cardio do rodapé, com o que a fonte de fato mediu.
 *
 * Devolve string vazia quando não sobrou nada — o cartão então cede o espaço à
 * contagem de exercícios em vez de imprimir um coração sozinho.
 */
function resumoCardio(cardio: Cardio): string {
  const partes: string[] = [];
  if (cardio.media != null) partes.push(`${cardio.media} bpm médio`);
  if (cardio.maxima != null) partes.push(`${cardio.maxima} máx`);
  if (cardio.calorias != null) partes.push(`${cardio.calorias} kcal`);
  return partes.join(' · ');
}

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
  const c = usarPaleta();
  const estilos = usarEstilos();
  const musculos = musculosDaSessao(sessao);
  const principais = musculos.slice(0, 3).map((m) => GRUPO_LABEL[m.grupo]);

  return (
    <View ref={refCaptura} collapsable={false} style={estilos.cartao}>
      <View style={estilos.topo}>
        <Glifo nome="raio" tamanho={16} cor={c.tinta} />
        <Rotulo cor={c.tinta} style={estilos.marca}>
          Ímpeto
        </Rotulo>
        <View style={{ flex: 1 }} />
        <Rotulo cor={c.tintaFraca}>{fmtDataAbs(sessao.fim ?? sessao.inicio)}</Rotulo>
      </View>
      <Regua peso="forte" cor={c.tinta} />

      <View style={{ paddingTop: sp.xl }}>
        <Tx v="display" numberOfLines={2}>
          {sessao.nome}
        </Tx>
        {principais.length ? (
          <Tx v="small" cor={c.tintaFraca} style={{ marginTop: 2 }}>
            {principais.join(' · ')}
          </Tx>
        ) : null}
      </View>

      <View style={estilos.colunas}>
        <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
          Tempo
        </Rotulo>
        <Rotulo cor={c.tintaMid} style={{ flex: 1.2 }}>
          Volume
        </Rotulo>
        <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
          Séries
        </Rotulo>
      </View>
      <Regua peso="normal" cor={c.reguaMid} />
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
        <MapaMuscular musculos={musculos} atraso={0} largura={104} interativo={false} />
      </View>

      <Regua />
      <View style={estilos.rodape}>
        {/*
          Máxima e calorias entram só quando existem: a exportação de
          musculação do Mi Fitness traz apenas a média, e um "undefined máx"
          sairia impresso na imagem que vai para fora do app.
        */}
        {sessao.cardio && resumoCardio(sessao.cardio) ? (
          <View style={estilos.cardio}>
            <Glifo nome="coracao" tamanho={11} cor={c.rec} />
            <Tx v="small" tab cor={c.tintaMid}>
              {resumoCardio(sessao.cardio)}
            </Tx>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Rotulo cor={c.tintaFraca}>{sessao.exercicios.length} exercícios</Rotulo>
      </View>
    </View>
  );
}

const usarEstilos = criarEstilos((c) => ({
  cartao: {
    width: 380,
    backgroundColor: c.fundo,
    paddingHorizontal: MARGEM,
    paddingTop: MARGEM,
    paddingBottom: sp.xl,
    borderWidth: traco.normal,
    borderColor: c.fundoBorda,
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
}));
