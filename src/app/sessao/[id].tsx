import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraAnimada, CarimboConcluido, Contador, Entrada } from '@/components/animado';
import {
  Botao,
  BotaoGlifo,
  CabecaColuna,
  Carimbo,
  Pressavel,
  Regua,
  Rotulo,
  Secao,
  Tx,
  Vazio,
} from '@/components/base';
import { CartaoCompartilhar } from '@/components/cartao-compartilhar';
import { CurvaFc } from '@/components/curva-fc';
import { Miniatura } from '@/components/demo';
import { abrirConfirmacao, abrirMenu } from '@/components/folha';
import { Glifo } from '@/components/glifos';
import { MapaMuscular } from '@/components/mapa-muscular';
import { POR_ID } from '@/data/exercicios';
import { tecnicaDe } from '@/data/tecnicas';
import { GRUPO_LABEL, MEDIDA_LABEL } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, sp, traco } from '@/design/tokens';
import { compartilharView } from '@/lib/compartilhar';
import {
  conquistasDaSessao,
  duracaoMs,
  fmtData,
  fmtDuracaoCurta,
  fmtHora,
  fmtNumero,
  fmtVolume,
  musculosDaSessao,
  seriesFeitas,
  volumeExercicio,
  volumeSessao,
  type Recorde,
} from '@/lib/metricas';
import { importarParaSessao } from '@/lib/relogio';
import { lerCardio } from '@/lib/saude';
import { useTreino, type Cardio } from '@/store/treino';

// O recorde de força é medido em 1RM estimado, não em peso levantado de fato —
// o rótulo precisa deixar isso explícito para o número não enganar.
const RECORDE_TEXTO: Record<Recorde['tipo'], string> = {
  carga: 'Antes',
  forca: '1RM est. antes',
};

/**
 * De onde vieram os batimentos. São três caminhos diferentes e o rótulo precisa
 * distinguir os dois que passam pelo relógio: o Health Connect chega sozinho
 * depois que o Mi Fitness sincroniza; o arquivo é um .tcx que você importou.
 */
const FONTE_TEXTO: Record<Cardio['fonte'], string> = {
  cinta: 'Cinta',
  saude: 'Health Connect',
  relogio: 'Arquivo do relógio',
};

/**
 * Relatório de treino — a página fechada e carimbada.
 *
 * Com `?novo=1` (logo após concluir) entra no modo comemorativo: o carimbo
 * desce sobre o papel e os totais sobem de zero. Aberto pelo histórico, mostra
 * exatamente o mesmo conteúdo, sem a encenação.
 *
 * O relatório inteiro perdeu as caixas. Antes eram seis cartões empilhados —
 * métricas, cardio, recordes, estreias, corpo, músculos —, cada um com borda e
 * canto de 22px. Agora é uma sequência de seções separadas por régua, que é
 * como um registro é lido: de cima para baixo, sem recipientes.
 */
export default function RelatorioSessao() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const insets = useSafeAreaInsets();
  const { id, novo } = useLocalSearchParams<{ id: string; novo?: string }>();
  const festa = novo === '1';

  const historico = useTreino((s) => s.historico);
  const apagarSessao = useTreino((s) => s.apagarSessao);
  const salvarRotina = useTreino((s) => s.salvarRotina);
  const anexarCardio = useTreino((s) => s.anexarCardio);

  const refCartao = useRef<View | null>(null);
  const [compartilhando, setCompartilhando] = useState(false);
  const [buscandoSaude, setBuscandoSaude] = useState(true);
  const [importando, setImportando] = useState(false);

  const sessao = historico.find((s) => s.id === id);

  const musculos = useMemo(() => (sessao ? musculosDaSessao(sessao) : []), [sessao]);
  const { recordes, estreias } = useMemo(
    () => (sessao ? conquistasDaSessao(historico, sessao) : { recordes: [], estreias: [] }),
    [historico, sessao],
  );

  // Sem cinta, tentamos o Health Connect: o Mi Fitness pode ter sincronizado a
  // frequência do relógio para a janela deste treino.
  useEffect(() => {
    if (!sessao || sessao.cardio) {
      setBuscandoSaude(false);
      return;
    }
    let vivo = true;
    lerCardio(sessao.inicio, sessao.fim ?? Date.now()).then((d) => {
      if (!vivo) return;
      setBuscandoSaude(false);
      if (!d || d.amostras === 0) return;
      anexarCardio(sessao.id, {
        media: d.fcMedia,
        maxima: d.fcMaxima,
        calorias: d.calorias,
        fonte: 'saude',
      });
    });
    return () => {
      vivo = false;
    };
  }, [sessao, anexarCardio]);

  /**
   * Traz o .tcx do relógio para ESTE treino.
   *
   * Aqui não há adivinhação de par: o treino já está escolhido. Quando o
   * arquivo é de outro horário a importação acontece mesmo assim — foi uma
   * escolha explícita — mas o aviso aparece, porque isso quase sempre significa
   * arquivo trocado.
   */
  async function importarRelogio() {
    if (!sessao) return;
    setImportando(true);
    const r = await importarParaSessao(sessao.id);
    setImportando(false);
    if (r.erro) {
      abrirConfirmacao({
        titulo: 'Não deu certo',
        descricao: r.erro,
        confirmar: 'Entendi',
        onConfirmar: () => {},
      });
      return;
    }
    if (!r.ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (r.aviso) {
      abrirConfirmacao({
        titulo: 'Importado — confira a data',
        descricao: r.aviso,
        confirmar: 'Entendi',
        onConfirmar: () => {},
      });
    }
  }

  async function compartilhar() {
    setCompartilhando(true);
    const r = await compartilharView(refCartao);
    setCompartilhando(false);
    if (!r.ok && r.erro) {
      abrirConfirmacao({
        titulo: 'Não deu certo',
        descricao: r.erro,
        confirmar: 'Entendi',
        onConfirmar: () => {},
      });
    }
  }

  function sair() {
    if (festa) router.replace('/');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (!sessao) {
    return (
      <View style={{ flex: 1, backgroundColor: c.fundo, paddingTop: insets.top + sp.sm }}>
        <View style={estilos.topo}>
          <BotaoGlifo glifo="voltar" acessivel="Voltar" onPress={sair} />
        </View>
        <Vazio titulo="Treino não encontrado" />
      </View>
    );
  }

  const volume = volumeSessao(sessao);
  const series = seriesFeitas(sessao);
  const minutos = Math.round(duracaoMs(sessao) / 60000);
  const emToneladas = volume >= 1000;

  function menu() {
    abrirMenu({
      titulo: sessao!.nome,
      opcoes: [
        {
          texto: sessao!.cardio ? 'Trocar dados do relógio' : 'Importar do relógio',
          glifo: 'baixar',
          onPress: importarRelogio,
        },
        {
          texto: 'Salvar como rotina',
          glifo: 'lista',
          onPress: () =>
            salvarRotina(
              sessao!.nome,
              sessao!.exercicios.map((e) => ({
                exId: e.exId,
                series: e.series.length,
                descanso: e.descanso,
              })),
            ),
        },
        {
          texto: 'Apagar treino',
          glifo: 'lixo',
          destrutiva: true,
          onPress: () =>
            abrirConfirmacao({
              titulo: 'Apagar treino?',
              descricao: 'Este registro sai do histórico e dos seus recordes.',
              confirmar: 'Apagar',
              destrutiva: true,
              onConfirmar: () => {
                apagarSessao(sessao!.id);
                router.replace('/');
              },
            }),
        },
      ],
    });
  }

  /** Atrasos da encenação. Fora da festa tudo entra imediatamente. */
  const t = (ms: number) => (festa ? ms : 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.xs }]}>
        <BotaoGlifo glifo={festa ? 'fechar' : 'voltar'} acessivel="Voltar" onPress={sair} />
        <View style={{ flex: 1 }} />
        <BotaoGlifo glifo="reticencias" acessivel="Opções" onPress={menu} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/*
          O carimbo. É o único gesto expressivo do app e acontece uma vez por
          treino — a faixa "raro" do orçamento de deleite. Fora da festa ele
          não aparece: o histórico não precisa ser comemorado toda vez.
        */}
        {festa ? (
          <View style={estilos.selo}>
            <CarimboConcluido
              texto="Concluído"
              detalhe={fmtData(sessao.fim ?? sessao.inicio)}
              atraso={200}
            />
          </View>
        ) : null}

        <Entrada atraso={t(520)}>
          <View style={estilos.cabecalho}>
            <Tx v="display" numberOfLines={2}>
              {sessao.nome}
            </Tx>
            <Rotulo cor={c.tintaFraca} style={{ marginTop: sp.xs }}>
              {fmtData(sessao.fim ?? sessao.inicio)} · {fmtHora(sessao.inicio)}
            </Rotulo>
          </View>
        </Entrada>

        {/* Totais: cabeça de coluna e uma linha de valores. Sem caixa. */}
        <CabecaColuna>
          <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
            Tempo
          </Rotulo>
          <Rotulo cor={c.tintaMid} style={{ flex: 1.2 }}>
            Volume
          </Rotulo>
          <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
            Séries
          </Rotulo>
        </CabecaColuna>
        <View style={estilos.totais}>
          <Total
            valor={minutos}
            sufixo=" min"
            anima={festa}
            atraso={620}
            style={{ flex: 1 }}
          />
          <Total
            valor={emToneladas ? volume / 1000 : volume}
            casas={emToneladas ? 1 : 0}
            sufixo={emToneladas ? ' t' : ' kg'}
            anima={festa}
            atraso={700}
            style={{ flex: 1.2 }}
          />
          <Total valor={series} anima={festa} atraso={780} style={{ flex: 1 }} />
        </View>
        <Regua peso="forte" cor={c.tinta} style={{ marginHorizontal: margem.pagina }} />

        {/* O que o corpo marcou: cinta, Health Connect ou .tcx do relógio. */}
        <Entrada atraso={t(850)}>
          <BlocoRelogio
            cardio={sessao.cardio}
            buscando={buscandoSaude}
            importando={importando}
            onImportar={importarRelogio}
          />
        </Entrada>

        {/* Recordes — marcas superadas, carimbadas em rec na calha. */}
        {recordes.length > 0 ? (
          <Secao
            titulo="Recordes"
            espaco={sp.xxl}
            direita={
              <Carimbo texto={recordes.length === 1 ? '1 novo' : `${recordes.length} novos`} />
            }
          >
            {recordes.map((r, i) => {
              const ex = POR_ID[r.exId];
              const ganho = Math.round(r.valor - r.anterior);
              return (
                <Entrada key={`${r.exId}-${r.tipo}`} atraso={t(900) + i * 80}>
                  <View style={estilos.linhaRec}>
                    <View style={estilos.calhaRec}>
                      <View style={estilos.marcaRec} />
                    </View>
                    <Miniatura ex={ex} tamanho={32} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Tx v="smallMed" numberOfLines={1}>
                        {ex?.nome ?? r.exId}
                      </Tx>
                      <Tx v="small" cor={c.tintaFraca}>
                        {RECORDE_TEXTO[r.tipo]} {fmtNumero(Math.round(r.anterior))} kg
                      </Tx>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Tx v="numero" tab cor={c.rec}>
                        {fmtNumero(Math.round(r.valor))} kg
                      </Tx>
                      {ganho > 0 ? (
                        <Tx v="small" tab cor={c.tintaFraca}>
                          +{ganho}
                        </Tx>
                      ) : null}
                    </View>
                  </View>
                  <Regua />
                </Entrada>
              );
            })}
          </Secao>
        ) : null}

        {/* Estreias: sem carimbo, porque não houve o que superar ainda. */}
        {estreias.length > 0 ? (
          <Entrada atraso={t(950)}>
            <Tx v="small" cor={c.tintaFraca} style={estilos.estreias}>
              {estreias.length === 1
                ? '1 exercício estreando — o próximo treino já compara.'
                : `${estreias.length} exercícios estreando — o próximo treino já compara.`}
            </Tx>
          </Entrada>
        ) : null}

        {/* Músculos trabalhados */}
        {musculos.length > 0 ? (
          <Secao
            titulo="Músculos trabalhados"
            direita={<Rotulo cor={c.tintaFraca}>Séries efetivas</Rotulo>}
          >
            {/* A prancha primeiro: dá a leitura imediata de onde o treino pegou. */}
            <View style={estilos.prancha}>
              <MapaMuscular musculos={musculos} atraso={t(1000)} largura={100} sessaoId={sessao.id} />
            </View>
            <Regua />

            <View style={estilos.blocoMusculos}>
              {musculos.map((m, i) => {
                const atraso = t(1050) + i * 90;
                return (
                  <View key={m.grupo} style={estilos.linhaMusculo}>
                    <Tx v="smallMed" numberOfLines={1} style={estilos.rotuloMusculo}>
                      {GRUPO_LABEL[m.grupo]}
                    </Tx>
                    <BarraAnimada
                      fracao={m.fracao}
                      atraso={atraso}
                      altura={12}
                      // Densidade de tinta, não matiz: o grupo mais trabalhado é
                      // o mais cheio, não o de outra cor.
                      cor={i === 0 ? c.acento : c.reguaForte}
                    />
                    <Tx
                      v="numero"
                      tab
                      cor={i === 0 ? c.tinta : c.tintaMid}
                      style={estilos.valorMusculo}
                    >
                      {m.series % 1 === 0 ? m.series : m.series.toFixed(1).replace('.', ',')}
                    </Tx>
                  </View>
                );
              })}
            </View>

            <Tx v="small" cor={c.tintaFraca} style={estilos.rodapeNota}>
              O grupo principal de cada exercício conta série cheia; os assistentes contam 0,4.
            </Tx>
          </Secao>
        ) : null}

        {/* Exercícios: uma tabela por exercício, como no treino. */}
        <Secao titulo="Exercícios">
          {sessao.exercicios.map((e, i) => {
            const ex = POR_ID[e.exId];
            const rotulos = MEDIDA_LABEL[ex?.medida ?? 'peso_rep'];
            return (
              <Entrada key={e.uid} atraso={t(1250) + i * 60}>
                <Pressavel
                  onPress={() => router.push(`/exercicio/${e.exId}`)}
                  escala={0.995}
                  fundoPressionado={c.fundoBaixo}
                  style={estilos.cabecalhoEx}
                >
                  <Tx v="numero" tab cor={c.tintaFantasma} style={{ width: margem.calha }}>
                    {i + 1}
                  </Tx>
                  <Miniatura ex={ex} tamanho={34} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Tx v="bodyMed" numberOfLines={1}>
                      {ex?.nome ?? e.exId}
                    </Tx>
                    <Tx v="small" cor={c.tintaFraca}>
                      {e.series.length} séries · {fmtVolume(volumeExercicio(e))}
                    </Tx>
                  </View>
                </Pressavel>

                {e.nota ? (
                  <Tx v="small" cor={c.acento} style={estilos.nota}>
                    {e.nota}
                  </Tx>
                ) : null}

                <View style={estilos.tabela}>
                  {e.series.map((s, idx) => {
                    const tec = tecnicaDe(s.tipo);
                    const aquecimento = s.tipo === 'aquecimento';
                    return (
                      <View key={s.id} style={estilos.linhaSerie}>
                        <Tx
                          v="small"
                          tab
                          cor={c.tintaFraca}
                          style={{ width: margem.calha }}
                        >
                          {aquecimento ? `(${idx + 1})` : idx + 1}
                        </Tx>
                        <Tx v="numero" tab cor={c.acento} style={{ width: 74 }}>
                          {fmtNumero(s.peso) || '—'}
                          <Tx v="small" cor={c.tintaFraca}>
                            {' '}
                            {rotulos.a.toLowerCase()}
                          </Tx>
                        </Tx>
                        <Tx v="numero" tab cor={c.acento} style={{ flex: 1 }}>
                          {fmtNumero(s.reps) || '—'}
                          <Tx v="small" cor={c.tintaFraca}>
                            {' '}
                            {rotulos.b.toLowerCase()}
                          </Tx>
                        </Tx>
                        {tec.sigla && !aquecimento ? (
                          <Carimbo texto={tec.sigla} />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
                <Regua />
              </Entrada>
            );
          })}
        </Secao>
      </ScrollView>

      {/*
        O cartão vive fora da tela só para ser capturado. `position: absolute`
        com deslocamento negativo o mantém montado e medido, sem aparecer.
      */}
      <View style={estilos.fora} pointerEvents="none">
        <CartaoCompartilhar sessao={sessao} refCaptura={refCartao} />
      </View>

      <Entrada atraso={t(1350)} style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}>
        <Regua peso="forte" cor={c.tinta} />
        <View style={estilos.rodapeCorpo}>
          <Botao
            titulo="Compartilhar"
            tom="contorno"
            glifo="compartilhar"
            grande
            carregando={compartilhando}
            onPress={compartilhar}
            style={{ flex: 1 }}
          />
          {festa ? (
            <Botao
              titulo="Concluir"
              grande
              haptico="sucesso"
              onPress={() => router.replace('/')}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </Entrada>
    </View>
  );
}

/** Fatia uma lista em pedaços de até `n`. O último pedaço pode vir menor. */
function emGrupos<T>(lista: T[], n: number): T[][] {
  const saida: T[][] = [];
  for (let i = 0; i < lista.length; i += n) saida.push(lista.slice(i, i + n));
  return saida;
}

/**
 * O que o relógio (ou a cinta) mediu.
 *
 * As colunas são MONTADAS a partir do que existe, não fixas. Cada fonte
 * entrega um pedaço diferente: a cinta dá curva e máxima e nenhuma caloria; o
 * .tcx de musculação do Mi Fitness dá calorias e média e nem máxima nem curva.
 * Uma coluna fixa com travessão no lugar do número seria uma coluna afirmando
 * ter medido algo que ninguém mediu.
 *
 * Sem nenhum dado, o bloco vira o convite para importar o arquivo — é o único
 * lugar do app onde essa ação faz sentido sendo descoberta.
 */
function BlocoRelogio({
  cardio,
  buscando,
  importando,
  onImportar,
}: {
  cardio?: Cardio;
  buscando: boolean;
  importando: boolean;
  onImportar: () => void;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();

  if (!cardio) {
    return (
      <Secao titulo="Do relógio" espaco={sp.xxl}>
        <Pressavel
          onPress={onImportar}
          disabled={importando || buscando}
          escala={0.995}
          fundoPressionado={c.fundoBaixo}
          accessibilityRole="button"
          accessibilityLabel="Importar arquivo do relógio"
          style={estilos.importar}
        >
          <Glifo nome="coracao" tamanho={15} cor={c.tintaFantasma} />
          <View style={{ flex: 1, gap: 2 }}>
            <Tx v="smallMed">
              {buscando ? 'Procurando no Health Connect…' : 'Importar arquivo do relógio'}
            </Tx>
            <Tx v="small" cor={c.tintaFraca}>
              {buscando
                ? 'O Mi Fitness pode ainda não ter sincronizado.'
                : 'O .tcx exportado pelo Mi Fitness traz frequência, calorias e duração.'}
            </Tx>
          </View>
          {importando || buscando ? (
            <ActivityIndicator size="small" color={c.tintaMid} />
          ) : (
            <Glifo nome="avancar" tamanho={13} cor={c.tintaFantasma} />
          )}
        </Pressavel>
        <Regua />
      </Secao>
    );
  }

  const campos: { rotulo: string; valor: string }[] = [];
  if (cardio.media != null) campos.push({ rotulo: 'Médio', valor: `${cardio.media} bpm` });
  if (cardio.maxima != null) campos.push({ rotulo: 'Máximo', valor: `${cardio.maxima} bpm` });
  if (cardio.calorias != null) {
    campos.push({ rotulo: 'Calorias', valor: `${cardio.calorias} kcal` });
  }
  if (cardio.distanciaKm != null) {
    campos.push({ rotulo: 'Distância', valor: `${fmtNumero(Number(cardio.distanciaKm.toFixed(2)))} km` });
  }
  if (cardio.duracaoSeg != null) {
    campos.push({ rotulo: 'No relógio', valor: fmtDuracaoCurta(cardio.duracaoSeg * 1000) });
  }

  return (
    <Secao
      titulo={cardio.media != null ? 'Frequência cardíaca' : 'Do relógio'}
      espaco={sp.xxl}
      direita={
        <View style={estilos.fonte}>
          <Glifo nome="coracao" tamanho={11} cor={c.rec} />
          <Rotulo cor={c.tintaFraca}>{FONTE_TEXTO[cardio.fonte]}</Rotulo>
        </View>
      }
    >
      {/*
        Três por linha, no máximo. Uma corrida com o TCX completo produz cinco
        colunas — média, máxima, calorias, distância e tempo —, e cinco números
        em corpo de placar na largura de um celular viram tipografia espremida.
      */}
      {emGrupos(campos, 3).map((grupo, i) => (
        <View key={i}>
          <CabecaColuna>
            {grupo.map((x) => (
              <Rotulo key={x.rotulo} cor={c.tintaMid} style={{ flex: 1 }}>
                {x.rotulo}
              </Rotulo>
            ))}
          </CabecaColuna>
          <View style={estilos.totaisRelogio}>
            {grupo.map((x) => (
              <Tx
                key={x.rotulo}
                v="numero"
                tab
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ flex: 1 }}
              >
                {x.valor}
              </Tx>
            ))}
          </View>
        </View>
      ))}

      {cardio.curva?.length ? (
        <View style={estilos.curva}>
          <CurvaFc curva={cardio.curva} />
        </View>
      ) : null}

      {/*
        O Mi Fitness grava dois números de caloria: o total do período e só o
        esforço. Mostrar o total sem dizer isso faria o treino parecer mais
        caro do que foi.
      */}
      {cardio.caloriasAtivas != null ? (
        <Tx v="small" cor={c.tintaFraca} style={estilos.notaRelogio}>
          Do total, {cardio.caloriasAtivas} kcal foram de esforço — o resto é o gasto que o corpo
          teria parado.
        </Tx>
      ) : null}
    </Secao>
  );
}

function Total({
  valor,
  sufixo = '',
  casas = 0,
  anima,
  atraso,
  style,
}: {
  valor: number;
  sufixo?: string;
  casas?: number;
  anima: boolean;
  atraso: number;
  style?: object;
}) {
  if (anima) {
    return (
      <View style={style}>
        <Contador valor={valor} casas={casas} sufixo={sufixo} atraso={atraso} />
      </View>
    );
  }
  return (
    <Tx v="numeroG" tab style={style}>
      {casas > 0 ? valor.toFixed(casas).replace('.', ',') : Math.round(valor)}
      {sufixo}
    </Tx>
  );
}

const usarEstilos = criarEstilos((c) => ({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
  },
  selo: { alignItems: 'center', paddingTop: sp.xxl, paddingBottom: sp.h1 },
  cabecalho: { paddingHorizontal: margem.pagina, paddingBottom: sp.xl },
  totais: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: margem.pagina,
    paddingVertical: sp.md,
  },
  fonte: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  totaisRelogio: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: margem.pagina,
    paddingVertical: sp.md,
  },
  curva: { paddingHorizontal: margem.pagina, paddingBottom: sp.md },
  notaRelogio: { paddingHorizontal: margem.pagina, paddingBottom: sp.md },
  importar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.lg,
    paddingHorizontal: margem.pagina,
  },
  linhaRec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  calhaRec: { width: 6, alignItems: 'flex-start' },
  // Marca de correção do professor: um traço rec na margem da linha.
  marcaRec: { width: 3, height: 26, backgroundColor: c.rec },
  estreias: { paddingHorizontal: margem.pagina, paddingTop: sp.lg },
  prancha: { paddingVertical: sp.xxl, backgroundColor: c.fundoAlto },
  blocoMusculos: { paddingHorizontal: margem.pagina, paddingTop: sp.lg, gap: sp.md },
  linhaMusculo: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  rotuloMusculo: { width: 84 },
  valorMusculo: { width: 34, textAlign: 'right' },
  rodapeNota: { paddingHorizontal: margem.pagina, paddingTop: sp.lg },
  cabecalhoEx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingHorizontal: margem.pagina,
    paddingTop: sp.lg,
    paddingBottom: sp.sm,
  },
  nota: {
    marginHorizontal: margem.pagina,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    backgroundColor: c.fundoAlto,
    borderLeftWidth: 2,
    borderLeftColor: c.acentoLinha,
  },
  tabela: { paddingHorizontal: margem.pagina, paddingBottom: sp.md },
  linhaSerie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    height: 30,
    borderBottomWidth: traco.fina,
    borderBottomColor: c.regua,
  },
  fora: { position: 'absolute', left: -10000, top: 0 },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.fundo,
  },
  rodapeCorpo: {
    flexDirection: 'row',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingTop: sp.md,
  },
}));
