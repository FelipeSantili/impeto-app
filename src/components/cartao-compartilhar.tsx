import { Image } from 'expo-image';
import { useEffect, useRef, type RefObject } from 'react';
import { View } from 'react-native';
import { Regua, Rotulo, Tx } from '@/components/base';
import { Glifo } from '@/components/glifos';
import { MapaMuscular } from '@/components/mapa-muscular';
import { POR_ID } from '@/data/exercicios';
import { GRUPO_LABEL } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { radius, sp, traco } from '@/design/tokens';
import {
  duracaoMs,
  fmtDataAbs,
  fmtDuracaoCurta,
  fmtVolume,
  musculosDaSessao,
  seriesFeitas,
  volumeExercicio,
  volumeSessao,
} from '@/lib/metricas';
import { PROPORCAO_RETRATO, type Retratos } from '@/lib/retrato-corpo';
import type { Cardio, ExercicioTreino, Sessao } from '@/store/treino';

const MARGEM = 26;

/**
 * Largura de cada retrato, e da figura da prancha quando ela entra no lugar.
 *
 * É a mesma medida da prancha 2D que o retrato substituiu, e a proporção também
 * (`PROPORCAO_RETRATO` sai do mesmo 220x560): trocada a peça, o bloco do corpo
 * ocupa exatamente o mesmo espaço na folha, e o resto da composição não se mexe.
 */
const RETRATO = 104;

/**
 * Quantos exercícios saem impressos.
 *
 * O cartão cresce com a lista, e uma imagem de dois metros de altura não é
 * legível em lugar nenhum. Doze cobre praticamente todo treino real; o que
 * passar disso vira uma linha dizendo quantos ficaram de fora, que é honesto e
 * ocupa uma linha.
 */
const TETO_EXERCICIOS = 12;

/**
 * A linha de cardio do rodapé, com o que a fonte de fato mediu.
 *
 * Devolve string vazia quando não sobrou nada — e aí o rodapé inteiro não sai,
 * em vez de o cartão terminar numa faixa com um coração sozinho.
 */
function resumoCardio(cardio: Cardio): string {
  const partes: string[] = [];
  if (cardio.media != null) partes.push(`${cardio.media} bpm médio`);
  if (cardio.maxima != null) partes.push(`${cardio.maxima} máx`);
  if (cardio.calorias != null) partes.push(`${cardio.calorias} kcal`);
  return partes.join(' · ');
}

/**
 * O que cada exercício rendeu, em uma linha.
 *
 * O volume só entra quando existe: em barra fixa, prancha e corrida ele é zero
 * por construção, e "3 séries · 0 kg" impresso numa imagem que vai para fora do
 * app lê como treino que não contou.
 */
function resumoExercicio(e: ExercicioTreino): string {
  const feitas = e.series.filter((s) => s.feita).length;
  const series = `${feitas} ${feitas === 1 ? 'série' : 'séries'}`;
  const volume = volumeExercicio(e);
  return volume > 0 ? `${series} · ${fmtVolume(volume)}` : series;
}

/** Um dos dois lados do corpo, com o rótulo embaixo. */
function Retrato({
  uri,
  rotulo,
  aoCarregar,
}: {
  uri: string;
  rotulo: string;
  aoCarregar: (uri: string) => void;
}) {
  const c = usarPaleta();
  return (
    <View style={{ alignItems: 'center' }}>
      <Image
        source={{ uri }}
        style={{ width: RETRATO, height: RETRATO / PROPORCAO_RETRATO }}
        contentFit="contain"
        // Sem transição: a imagem é capturada um piscar depois de aparecer, e
        // uma entrada em fade sairia impressa no meio do caminho. Cache só em
        // memória porque o arquivo vive numa pasta temporária e some depois.
        transition={0}
        cachePolicy="memory"
        onLoad={() => aoCarregar(uri)}
      />
      <Rotulo cor={c.tintaFraca} style={{ marginTop: sp.sm }}>
        {rotulo}
      </Rotulo>
    </View>
  );
}

/**
 * Cartão de treino para compartilhar — uma folha do caderno destacada.
 *
 * É a única peça do app que sai dele, então é onde o mundo precisa ser mais
 * legível: marca e data na mesma linha de base, régua forte fechando o
 * cabeçalho, totais em colunas rotuladas, o corpo no meio e a lista do que foi
 * feito embaixo.
 *
 * O corpo são dois PNG do MODELO 3D — o mesmo do relatório, de frente e de
 * costas, gerados por `usarRetratos`. Era a prancha 2D, a peça mais velha do
 * app: a imagem que saía daqui continuava mostrando o corpo que o relatório já
 * tinha aposentado. A prancha ficou como plano B, para o caso de o aparelho não
 * entregar contexto GL nenhum — um cartão com um buraco no meio seria pior que
 * um cartão desatualizado.
 *
 * Renderizado fora da tela e capturado como imagem, então tem tamanho fixo e
 * não usa nada dependente de rolagem, safe area ou animação — o que estivesse
 * animando no momento da captura sairia num quadro intermediário.
 */
export function CartaoCompartilhar({
  sessao,
  retratos,
  aoDesenhar,
  refCaptura,
}: {
  sessao: Sessao;
  /** Frente e costas do modelo 3D. Ausente = o cartão cai na prancha 2D. */
  retratos?: Retratos | null;
  /** Avisa quando os DOIS retratos terminaram de aparecer. Ver `usarRetratos`. */
  aoDesenhar?: () => void;
  refCaptura: RefObject<View | null>;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const musculos = musculosDaSessao(sessao);
  const principais = musculos.slice(0, 3).map((m) => GRUPO_LABEL[m.grupo]);

  // Só o que foi de fato executado — é o que a imagem promete. Um treino aberto
  // e abandonado sem nenhuma série marcada cai na lista inteira, porque nesse
  // caso omitir tudo diria menos que listar.
  const feitos = sessao.exercicios.filter((e) => e.series.some((s) => s.feita));
  const exercicios = feitos.length ? feitos : sessao.exercicios;
  const impressos = exercicios.slice(0, TETO_EXERCICIOS);
  const ocultos = exercicios.length - impressos.length;

  // As duas imagens chegam em ordem imprevisível, e o cartão só está pronto
  // para virar arquivo depois da segunda. Guardado em ref porque isto não
  // desenha nada: um estado aqui provocaria uma re-renderização no meio da
  // captura, que é o momento em que menos se quer uma.
  //
  // Marcadas por ARQUIVO, não contadas: `onLoad` pode disparar de novo para a
  // mesma imagem quando a view é reaproveitada, e um contador daria o cartão
  // por pronto com um dos lados ainda vazio.
  const carregadas = useRef(new Set<string>());
  useEffect(() => {
    carregadas.current = new Set();
  }, [retratos]);
  const contar = (uri: string) => {
    carregadas.current.add(uri);
    if (carregadas.current.size >= 2) aoDesenhar?.();
  };

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
        {retratos ? (
          <View style={estilos.retratos}>
            <Retrato uri={retratos.frente} rotulo="Frente" aoCarregar={contar} />
            <Retrato uri={retratos.costas} rotulo="Costas" aoCarregar={contar} />
          </View>
        ) : (
          // atraso 0: a captura acontece com a prancha já em densidade cheia.
          <MapaMuscular musculos={musculos} atraso={0} largura={RETRATO} interativo={false} />
        )}
      </View>

      {/*
        A régua da rampa térmica, a mesma da tela do modelo. Dentro do app a cor
        se aprende usando; numa imagem que chega solta a alguém, sem ela âmbar é
        só uma cor bonita.
      */}
      <View style={estilos.rampa}>
        <Rotulo cor={c.tintaFraca}>Carga</Rotulo>
        <View style={estilos.degraus}>
          {c.calor.map((cor, i) => (
            <View key={i} style={[estilos.degrau, { backgroundColor: cor }]} />
          ))}
        </View>
        <Rotulo cor={c.tintaFraca}>Alta</Rotulo>
      </View>

      <View style={estilos.colunasLista}>
        <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
          Exercícios
        </Rotulo>
        <Rotulo cor={c.tintaFraca}>{exercicios.length}</Rotulo>
      </View>
      <Regua peso="normal" cor={c.reguaMid} />
      <View style={estilos.lista}>
        {impressos.map((e, i) => (
          <View key={e.uid} style={estilos.linha}>
            <Tx v="caption" tab cor={c.tintaFantasma} style={estilos.ordinal}>
              {String(i + 1).padStart(2, '0')}
            </Tx>
            <Tx v="smallMed" numberOfLines={1} style={{ flex: 1 }}>
              {POR_ID[e.exId]?.nome ?? e.exId}
            </Tx>
            <Tx v="small" tab cor={c.tintaMid}>
              {resumoExercicio(e)}
            </Tx>
          </View>
        ))}
        {ocultos > 0 ? (
          <Tx v="small" cor={c.tintaFraca} style={{ paddingTop: sp.xs }}>
            e mais {ocultos} {ocultos === 1 ? 'exercício' : 'exercícios'}
          </Tx>
        ) : null}
      </View>

      {/*
        O rodapé de cardio só existe quando existe cardio — e máxima e calorias
        entram só quando a fonte as mediu: a exportação de musculação do Mi
        Fitness traz apenas a média, e um "undefined máx" sairia impresso na
        imagem que vai para fora do app.

        Sem batimentos o cartão termina na lista, sem uma faixa vazia embaixo.
        A contagem que morava aqui subiu para o cabeçalho da lista, que é onde
        ela responde a uma pergunta em vez de repetir a coluna de totais.
      */}
      {sessao.cardio && resumoCardio(sessao.cardio) ? (
        <>
          <Regua />
          <View style={estilos.rodape}>
            <Glifo nome="coracao" tamanho={11} cor={c.rec} />
            <Tx v="small" tab cor={c.tintaMid}>
              {resumoCardio(sessao.cardio)}
            </Tx>
          </View>
        </>
      ) : null}
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
  colunas: { flexDirection: 'row', alignItems: 'baseline', marginTop: sp.h1, paddingBottom: sp.xs },
  // A segunda cabeça de coluna respira menos que a primeira: a lista de
  // exercícios já vem depois de um bloco alto, e repetir o vão de 32 aqui
  // empurraria o cartão para longe de qualquer proporção postável.
  colunasLista: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: sp.xxl,
    paddingBottom: sp.xs,
  },
  valores: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: sp.md },
  prancha: { paddingTop: sp.xl, paddingBottom: sp.md },
  retratos: { flexDirection: 'row', justifyContent: 'center', gap: sp.h1 },
  rampa: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  degraus: { flex: 1, flexDirection: 'row', gap: 2 },
  degrau: { flex: 1, height: 6, borderRadius: radius.sm },
  lista: { paddingTop: sp.sm, paddingBottom: sp.sm },
  linha: { flexDirection: 'row', alignItems: 'center', gap: sp.md, height: 25 },
  ordinal: { width: 18 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: sp.md },
}));
