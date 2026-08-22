import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarraAnimada, Contador, EntradaCartao, SeloConcluido } from '@/components/animado';
import { Botao, BotaoIcone, Rotulo, Tx, Vazio } from '@/components/base';
import { Brilho } from '@/components/decor';
import { Miniatura } from '@/components/demo';
import { abrirConfirmacao, abrirMenu } from '@/components/folha';
import { POR_ID } from '@/data/exercicios';
import { GRUPO_LABEL, MEDIDA_LABEL } from '@/data/types';
import { color, radius, shadow, sp } from '@/design/tokens';
import {
  conquistasDaSessao,
  duracaoMs,
  fmtData,
  fmtHora,
  fmtNumero,
  fmtVolume,
  musculosDaSessao,
  seriesFeitas,
  volumeExercicio,
  volumeSessao,
  type Recorde,
} from '@/lib/metricas';
import { lerCardio } from '@/lib/saude';
import { useTreino } from '@/store/treino';

// O recorde de força é medido em 1RM estimado, não em peso levantado de fato —
// o rótulo precisa deixar isso explícito para o número não enganar.
const RECORDE_TEXTO: Record<Recorde['tipo'], string> = {
  carga: 'Nova carga máxima · antes',
  forca: 'Melhor série · 1RM est. antes',
};

/**
 * Relatório de treino.
 *
 * Com `?novo=1` (logo após concluir) entra no modo comemorativo: selo animado,
 * números que sobem e barras que preenchem. Aberto pelo histórico, mostra o
 * mesmo conteúdo sem a encenação.
 */
export default function RelatorioSessao() {
  const insets = useSafeAreaInsets();
  const { id, novo } = useLocalSearchParams<{ id: string; novo?: string }>();
  const festa = novo === '1';

  const historico = useTreino((s) => s.historico);
  const apagarSessao = useTreino((s) => s.apagarSessao);
  const salvarRotina = useTreino((s) => s.salvarRotina);
  const anexarCardio = useTreino((s) => s.anexarCardio);

  const sessao = historico.find((s) => s.id === id);

  const musculos = useMemo(() => (sessao ? musculosDaSessao(sessao) : []), [sessao]);
  const { recordes, estreias } = useMemo(
    () => (sessao ? conquistasDaSessao(historico, sessao) : { recordes: [], estreias: [] }),
    [historico, sessao],
  );

  // Uma vibração de vitória ao abrir o relatório de um treino recém-concluído.
  useEffect(() => {
    if (festa && sessao) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [festa, sessao]);

  // Sem cinta, tentamos o Health Connect: o Mi Fitness pode ter sincronizado a
  // frequência do relógio para a janela deste treino.
  useEffect(() => {
    if (!sessao || sessao.cardio) return;
    let vivo = true;
    lerCardio(sessao.inicio, sessao.fim ?? Date.now()).then((d) => {
      if (!vivo || !d || d.amostras === 0) return;
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

  function sair() {
    if (festa) router.replace('/');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (!sessao) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top + sp.sm }}>
        <View style={estilos.topo}>
          <BotaoIcone icone="chevron-back" onPress={sair} />
        </View>
        <Vazio icone="alert-circle-outline" titulo="Treino não encontrado" />
      </View>
    );
  }

  const volume = volumeSessao(sessao);
  const series = seriesFeitas(sessao);
  const minutos = Math.round(duracaoMs(sessao) / 60000);

  function menu() {
    abrirMenu({
      titulo: sessao!.nome,
      opcoes: [
        {
          texto: 'Salvar como rotina',
          icone: 'bookmark-outline',
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
          icone: 'trash-outline',
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

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.sm }]}>
        <BotaoIcone icone={festa ? 'close' : 'chevron-back'} onPress={sair} />
        <View style={{ flex: 1 }} />
        <BotaoIcone icone="ellipsis-horizontal" onPress={menu} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: sp.xl,
          paddingBottom: insets.bottom + (festa ? 110 : sp.h2),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Herói */}
        <View style={estilos.heroi}>
          <Brilho tamanho={400} intensidade={festa ? 0.16 : 0.09} style={{ top: -120 }} />
          {festa ? (
            <>
              <SeloConcluido />
              <Animated.View entering={FadeInDown.delay(760).duration(420)}>
                <Tx v="display" center style={{ marginTop: sp.lg }}>
                  Treino feito
                </Tx>
              </Animated.View>
            </>
          ) : (
            <Tx v="caption" cor={color.textFaint}>
              {fmtData(sessao.fim ?? sessao.inicio).toUpperCase()} · {fmtHora(sessao.inicio)}
            </Tx>
          )}
          <Animated.View entering={FadeIn.delay(festa ? 900 : 0).duration(400)}>
            <Tx v={festa ? 'body' : 'title'} cor={festa ? color.textFaint : color.text} center style={{ marginTop: festa ? sp.xs : sp.sm }}>
              {sessao.nome}
            </Tx>
          </Animated.View>
        </View>

        {/* Métricas */}
        <EntradaCartao atraso={festa ? 950 : 0}>
          <View style={estilos.metricas}>
            <Metrica
              rotulo="Duração"
              valor={minutos}
              sufixo="min"
              anima={festa}
              atraso={1050}
            />
            <View style={estilos.sep} />
            <Metrica
              rotulo="Volume"
              valor={volume >= 1000 ? volume / 1000 : volume}
              sufixo={volume >= 1000 ? 't' : 'kg'}
              casas={volume >= 1000 ? 1 : 0}
              anima={festa}
              atraso={1150}
            />
            <View style={estilos.sep} />
            <Metrica rotulo="Séries" valor={series} anima={festa} atraso={1250} />
          </View>
        </EntradaCartao>

        {/* Frequência cardíaca — da cinta ou do relógio via Health Connect */}
        {sessao.cardio ? (
          <EntradaCartao atraso={festa ? 1300 : 40}>
            <View style={estilos.cardio}>
              <View style={estilos.iconeCardio}>
                <Ionicons name="heart" size={15} color={color.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Tx v="caption" cor={color.textFaint}>
                  {sessao.cardio.fonte === 'cinta' ? 'CINTA CARDÍACA' : 'DO SEU RELÓGIO'}
                </Tx>
                <Tx v="bodyMed" tab style={{ marginTop: 2 }}>
                  {sessao.cardio.media} bpm médio · {sessao.cardio.maxima} máx
                  {sessao.cardio.calorias ? ` · ${sessao.cardio.calorias} kcal` : ''}
                </Tx>
              </View>
            </View>
          </EntradaCartao>
        ) : null}

        {/* Recordes de verdade — marcas superadas */}
        {recordes.length > 0 ? (
          <EntradaCartao atraso={festa ? 1350 : 60}>
            <View style={estilos.recordes}>
              <View style={estilos.cabecalhoRec}>
                <Ionicons name="trophy" size={14} color={color.accent} />
                <Rotulo cor={color.accent}>
                  {recordes.length === 1 ? '1 recorde' : `${recordes.length} recordes`}
                </Rotulo>
              </View>
              {recordes.map((r, i) => {
                const ex = POR_ID[r.exId];
                const ganho = Math.round(r.valor - r.anterior);
                return (
                  <Animated.View
                    key={`${r.exId}-${r.tipo}`}
                    entering={FadeInDown.delay((festa ? 1450 : 120) + i * 90).duration(320)}
                    style={estilos.linhaRec}
                  >
                    <Miniatura ex={ex} tamanho={32} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Tx v="smallMed" numberOfLines={1}>
                        {ex?.nome ?? r.exId}
                      </Tx>
                      <Tx v="caption" cor={color.textFaint} style={{ textTransform: 'none' }}>
                        {RECORDE_TEXTO[r.tipo]} {fmtNumero(Math.round(r.anterior))} kg
                      </Tx>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Tx v="bodyMed" tab cor={color.accent}>
                        {fmtNumero(Math.round(r.valor))} kg
                      </Tx>
                      {ganho > 0 ? (
                        <Tx v="caption" cor={color.textFaint} tab>
                          +{ganho}
                        </Tx>
                      ) : null}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </EntradaCartao>
        ) : null}

        {/* Estreias: sem troféu, porque não houve o que superar ainda. */}
        {estreias.length > 0 ? (
          <Animated.View entering={FadeIn.delay(festa ? 1400 : 80).duration(360)}>
            <View style={estilos.estreias}>
              <Ionicons name="sparkles-outline" size={13} color={color.textFaint} />
              <Tx v="small" cor={color.textFaint} style={{ flex: 1 }}>
                {estreias.length === 1
                  ? '1 exercício estreando — o próximo treino já compara.'
                  : `${estreias.length} exercícios estreando — o próximo treino já compara.`}
              </Tx>
            </View>
          </Animated.View>
        ) : null}

        {/* Músculos trabalhados */}
        {musculos.length > 0 ? (
          <View style={{ marginTop: sp.h1 }}>
            <View style={estilos.cabecalhoSecao}>
              <Rotulo>Músculos trabalhados</Rotulo>
              <Tx v="caption" cor={color.textGhost}>
                SÉRIES EFETIVAS
              </Tx>
            </View>

            <View style={estilos.blocoMusculos}>
              {musculos.map((m, i) => {
                const atraso = (festa ? 1500 : 200) + i * 110;
                return (
                  <Animated.View
                    key={m.grupo}
                    entering={FadeInDown.delay(atraso).duration(340)}
                    style={estilos.linhaMusculo}
                  >
                    <View style={estilos.rotuloMusculo}>
                      <Tx v="smallMed" numberOfLines={1}>
                        {GRUPO_LABEL[m.grupo]}
                      </Tx>
                    </View>
                    <BarraAnimada
                      fracao={m.fracao}
                      atraso={atraso + 120}
                      // O grupo mais trabalhado recebe o acento; o resto fica neutro.
                      cor={i === 0 ? color.accent : color.lineHi}
                    />
                    <Tx v="small" tab cor={i === 0 ? color.text : color.textFaint} style={estilos.valorMusculo}>
                      {m.series % 1 === 0 ? m.series : m.series.toFixed(1)}
                    </Tx>
                  </Animated.View>
                );
              })}
            </View>

            <Tx v="small" cor={color.textGhost} style={{ marginTop: sp.md }}>
              O grupo principal de cada exercício conta série cheia; os assistentes contam 0,4.
            </Tx>
          </View>
        ) : null}

        {/* Exercícios */}
        <View style={{ marginTop: sp.h1 }}>
          <Rotulo>Exercícios</Rotulo>

          {sessao.exercicios.map((e, i) => {
            const ex = POR_ID[e.exId];
            const rotulos = MEDIDA_LABEL[ex?.medida ?? 'peso_rep'];
            return (
              <Animated.View
                key={e.uid}
                entering={FadeInDown.delay((festa ? 1700 : 260) + i * 70).duration(320)}
              >
                <View style={estilos.bloco}>
                  <Pressable
                    onPress={() => router.push(`/exercicio/${e.exId}`)}
                    style={({ pressed }) => [estilos.cabecalhoEx, pressed && { opacity: 0.6 }]}
                  >
                    <Miniatura ex={ex} tamanho={38} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Tx v="bodyMed" numberOfLines={1}>
                        {ex?.nome ?? e.exId}
                      </Tx>
                      <Tx v="small" cor={color.textFaint}>
                        {e.series.length} séries · {fmtVolume(volumeExercicio(e))}
                      </Tx>
                    </View>
                  </Pressable>

                  {e.nota ? (
                    <Tx v="small" cor={color.textFaint} style={estilos.nota}>
                      {e.nota}
                    </Tx>
                  ) : null}

                  <View style={{ marginTop: sp.md, gap: 2 }}>
                    {e.series.map((s, idx) => (
                      <View key={s.id} style={estilos.linha}>
                        <Tx v="small" tab cor={color.textGhost} style={{ width: 24 }}>
                          {s.tipo === 'aquecimento'
                            ? 'A'
                            : s.tipo === 'falha'
                              ? 'F'
                              : s.tipo === 'drop'
                                ? 'D'
                                : idx + 1}
                        </Tx>
                        <Tx v="smallMed" tab style={{ flex: 1 }}>
                          {fmtNumero(s.peso) || '—'}{' '}
                          <Tx v="small" cor={color.textGhost}>
                            {rotulos.a.toLowerCase()}
                          </Tx>
                          {'   '}
                          {fmtNumero(s.reps) || '—'}{' '}
                          <Tx v="small" cor={color.textGhost}>
                            {rotulos.b.toLowerCase()}
                          </Tx>
                        </Tx>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {festa ? (
        <Animated.View
          entering={FadeInDown.delay(1900).duration(400)}
          style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }, shadow.soft]}
        >
          <Botao titulo="Concluir" grande onPress={() => router.replace('/')} style={{ flex: 1 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Metrica({
  rotulo,
  valor,
  sufixo = '',
  casas = 0,
  anima,
  atraso,
}: {
  rotulo: string;
  valor: number;
  sufixo?: string;
  casas?: number;
  anima: boolean;
  atraso: number;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      {anima ? (
        <Contador valor={valor} casas={casas} sufixo={sufixo} atraso={atraso} />
      ) : (
        <Tx v="title" tab center>
          {casas > 0 ? valor.toFixed(casas) : Math.round(valor)}
          {sufixo}
        </Tx>
      )}
      <Tx v="caption" cor={color.textFaint}>
        {rotulo.toUpperCase()}
      </Tx>
    </View>
  );
}

const estilos = StyleSheet.create({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingBottom: sp.sm,
  },
  heroi: { alignItems: 'center', paddingTop: sp.lg, paddingBottom: sp.xxl },
  metricas: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sp.xl,
    borderRadius: radius.xl,
    backgroundColor: color.bgSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  sep: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: color.lineMid },
  recordes: {
    marginTop: sp.sm,
    padding: sp.lg,
    borderRadius: radius.xl,
    backgroundColor: color.accentFundo,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentLine,
    gap: sp.md,
  },
  cardio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    marginTop: sp.sm,
    padding: sp.lg,
    borderRadius: radius.xl,
    backgroundColor: color.bgSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  iconeCardio: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accentSoft,
  },
  cabecalhoRec: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linhaRec: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  estreias: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginTop: sp.md,
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
    borderRadius: radius.lg,
    backgroundColor: color.bgSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.md,
  },
  blocoMusculos: {
    padding: sp.lg,
    borderRadius: radius.xl,
    backgroundColor: color.bgSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
    gap: sp.md,
  },
  linhaMusculo: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  rotuloMusculo: { width: 88 },
  valorMusculo: { width: 30, textAlign: 'right' },
  bloco: {
    backgroundColor: color.bgSoft,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
    padding: sp.lg,
    marginTop: sp.md,
  },
  cabecalhoEx: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  nota: {
    marginTop: sp.md,
    padding: sp.md,
    borderRadius: radius.md,
    backgroundColor: color.surfaceHi,
  },
  linha: { flexDirection: 'row', alignItems: 'center', height: 26 },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: sp.xl,
    paddingTop: sp.md,
    backgroundColor: color.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
