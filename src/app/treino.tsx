import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Botao,
  BotaoGlifo,
  Pressavel,
  Regua,
  Rotulo,
  Tx,
  Vazio,
} from '@/components/base';
import { CorpoEmbutido } from '@/components/corpo-3d';
import { TiraDescanso } from '@/components/descanso';
import { abrirConfirmacao, abrirMenu, abrirPrompt } from '@/components/folha';
import { Glifo } from '@/components/glifos';
import { BlocoExercicio } from '@/components/treino-exercicio';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { curva } from '@/design/movimento';
import { margem, sp, type } from '@/design/tokens';
import {
  fmtDuracao,
  fmtVolume,
  musculosDaSessao,
  ultimaExecucao,
  volumeSessao,
} from '@/lib/metricas';
import { useCinta } from '@/store/cinta';
import { useDescanso } from '@/store/descanso';
import { useTreino } from '@/store/treino';

/**
 * O LED de gravação.
 *
 * Pulsa devagar, como o de um aparelho de bancada — não pisca, que lê como
 * alerta. Junto com a marca de recorde, é o único uso de vermelho no app: aqui
 * ele diz ESTADO (a sessão está aberta), nunca importância.
 */
function Led() {
  const c = usarPaleta();
  const p = useSharedValue(1);
  const reduzido = useReducedMotion();

  useEffect(() => {
    if (reduzido) return;
    p.set(
      withRepeat(withTiming(0.26, { duration: 1200, easing: curva.pulso }), -1, true),
    );
  }, [reduzido, p]);

  const estilo = useAnimatedStyle(() => ({ opacity: p.get() }));

  return (
    <Animated.View
      style={[
        { width: 7, height: 7, borderRadius: 4, backgroundColor: c.rec },
        estilo,
      ]}
    />
  );
}

/**
 * Treino em andamento.
 *
 * O topo virou o cabeçalho da página: nome editável e, abaixo, uma FAIXA DE
 * TOTAIS com cabeça de coluna — tempo, séries, volume e batimento. Antes esses
 * números eram um aglomerado centralizado em texto miúdo; em colunas rotuladas
 * eles se leem de relance, que é a única forma de leitura que existe entre uma
 * série e outra.
 */
export default function TreinoAtivo() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const ativa = useTreino((s) => s.ativa);
  const historico = useTreino((s) => s.historico);
  const finalizar = useTreino((s) => s.finalizar);
  const descartar = useTreino((s) => s.descartar);
  const renomear = useTreino((s) => s.renomearAtiva);
  const rotinaDaAtiva = useTreino((s) => s.rotinaDaAtiva);
  const pararDescanso = useDescanso((s) => s.parar);
  const bpm = useCinta((s) => (s.estado === 'conectada' ? s.bpm : null));

  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /*
   * Guarda contra a própria saída desta tela.
   *
   * Concluir o treino zera `ativa` E navega para o relatório. Só que esta tela
   * continua montada durante a transição: ela re-renderiza com `ativa === null`
   * e, sem esta trava, o efeito abaixo dispara `router.back()` e derruba o
   * relatório que acabou de abrir — o treino "termina" e não aparece nada.
   */
  const saindo = useRef(false);

  // Sem treino aberto não há tela: pode ter sido finalizado em outro caminho
  // (outra aba, atualização aplicada). Mas se quem está saindo somos nós, a
  // navegação já foi decidida.
  useEffect(() => {
    if (!ativa && !saindo.current && router.canGoBack()) router.back();
  }, [ativa]);

  if (!ativa) return null;

  const series = ativa.exercicios.reduce((t, e) => t + e.series.filter((s) => s.feita).length, 0);
  const volume = volumeSessao({ ...ativa, exercicios: ativa.exercicios });
  // Recalculado a cada série marcada: é o que faz a prancha do cabeçalho
  // esquentar ao vivo em vez de só existir no relatório do fim.
  const musculos = musculosDaSessao(ativa);

  function concluir() {
    const feitas = ativa!.exercicios.some((e) => e.series.some((s) => s.feita));
    if (!feitas) {
      abrirConfirmacao({
        titulo: 'Nenhuma série marcada',
        descricao: 'Toque no ✓ de ao menos uma série para registrar este treino.',
        confirmar: 'Descartar treino',
        destrutiva: true,
        onConfirmar: abandonar,
      });
      return;
    }
    abrirConfirmacao({
      titulo: 'Concluir treino?',
      descricao: 'Séries em branco serão descartadas.',
      confirmar: 'Concluir',
      onConfirmar: () => {
        // A cinta, se estiver conectada, já tem a série completa de batimentos.
        const amostras = useCinta.getState().amostras;
        const cardio =
          amostras.length > 0
            ? {
                media: Math.round(amostras.reduce((t, n) => t + n, 0) / amostras.length),
                maxima: Math.max(...amostras),
                fonte: 'cinta' as const,
              }
            : undefined;

        // Antes de zerar `ativa`: a partir daqui a saída é nossa, e o efeito
        // de guarda não deve mais navegar por conta própria.
        saindo.current = true;

        const s = finalizar(cardio);
        pararDescanso();
        useCinta.getState().zerarAmostras();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // `novo=1` liga o modo comemorativo do relatório.
        if (s) router.replace(`/sessao/${s.id}?novo=1`);
        else router.back();
      },
    });
  }

  function abandonar() {
    abrirConfirmacao({
      titulo: 'Descartar treino?',
      descricao: 'Nada deste treino será salvo.',
      confirmar: 'Descartar',
      destrutiva: true,
      onConfirmar: () => {
        saindo.current = true;
        descartar();
        pararDescanso();
        router.back();
      },
    });
  }

  function menu() {
    abrirMenu({
      titulo: ativa!.nome,
      opcoes: [
        { texto: 'Adicionar exercício', glifo: 'mais', onPress: () => router.push('/selecionar') },
        {
          texto: 'Salvar como rotina',
          glifo: 'lista',
          onPress: () =>
            abrirPrompt({
              titulo: 'Salvar como rotina',
              descricao: 'Os exercícios e o número de séries ficam guardados.',
              valor: ativa!.nome,
              placeholder: 'Nome da rotina',
              onConfirmar: (nome) => rotinaDaAtiva(nome || ativa!.nome),
            }),
        },
        { texto: 'Descartar treino', glifo: 'lixo', destrutiva: true, onPress: abandonar },
      ],
    });
  }

  const alturaRodape = insets.bottom + 74;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.fundo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[estilos.topo, { paddingTop: insets.top + sp.xs }]}>
        <BotaoGlifo glifo="baixo" acessivel="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <BotaoGlifo glifo="reticencias" acessivel="Opções do treino" onPress={menu} />
      </View>

      {/*
        O LED de gravação. É a única coisa no app inteiro, junto com a marca de
        recorde, que tem licença para usar vermelho — vermelho aqui diz ESTADO
        (a sessão está aberta), não importância.
      */}
      <View style={estilos.linhaNome}>
        <Led />
        <TextInput
          value={ativa.nome}
          onChangeText={renomear}
          style={estilos.titulo}
          placeholder="Nome do treino"
          placeholderTextColor={c.tintaFantasma}
          returnKeyType="done"
          maxFontSizeMultiplier={1.3}
        />
      </View>

      {/*
        Painel de leitura: o corpo à esquerda como mostrador, os totais em
        coluna à direita. O corpo esquenta série a série e abre o modal no
        toque — é o instrumento dizendo ONDE o treino está pegando enquanto os
        números dizem QUANTO.

        Uma figura só onde antes havia duas: a prancha precisava de frente E
        costas porque é chapada, e o modelo mostra os dois lados sozinho. Ele
        dá um terço de volta ao montar e para — a órbita fica no modal, que é
        onde há espaço para ela.
      */}
      <View style={estilos.painel}>
        <CorpoEmbutido musculos={musculos} largura={48} altura={80} />

        <View style={{ flex: 1 }}>
          <View style={estilos.colunas}>
            <Rotulo cor={c.tintaFraca} style={{ flex: 1.3 }}>
              Tempo
            </Rotulo>
            <Rotulo cor={c.tintaFraca} style={{ flex: 1 }}>
              Séries
            </Rotulo>
            <Rotulo cor={c.tintaFraca} style={{ flex: 1.2 }}>
              Volume
            </Rotulo>
            {bpm !== null ? (
              <Rotulo cor={c.tintaFraca} style={{ width: 46, textAlign: 'right' }}>
                bpm
              </Rotulo>
            ) : null}
          </View>
          <View style={estilos.totais}>
            <Tx v="numeroG" style={{ flex: 1.3 }}>
              {fmtDuracao(agora - ativa.inicio)}
            </Tx>
            <Tx v="numeroG" style={{ flex: 1 }}>
              {series}
            </Tx>
            <Tx v="numeroG" cor={volume > 0 ? c.acento : c.tinta} style={{ flex: 1.2 }}>
              {fmtVolume(volume)}
            </Tx>
            {bpm !== null ? (
              <View style={estilos.bpm}>
                <Glifo nome="coracao" tamanho={11} cor={c.rec} />
                <Tx v="numeroG" cor={c.rec}>
                  {bpm}
                </Tx>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <Regua peso="forte" cor={c.reguaForte} />

      <ScrollView
        contentContainerStyle={{ paddingTop: sp.xl, paddingBottom: alturaRodape + 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {ativa.exercicios.length === 0 ? (
          <Vazio
            titulo="Treino vazio"
            texto="Adicione os exercícios do dia. Cada um já vem com três séries prontas para preencher."
            acao={
              <Botao
                titulo="Adicionar exercício"
                glifo="mais"
                onPress={() => router.push('/selecionar')}
              />
            }
          />
        ) : (
          ativa.exercicios.map((item, i) => (
            <BlocoExercicio
              key={item.uid}
              item={item}
              indice={i}
              total={ativa.exercicios.length}
              anterior={ultimaExecucao(historico, item.exId)}
            />
          ))
        )}

        {ativa.exercicios.length > 0 ? (
          <View>
            <Regua peso="forte" />
            <Pressavel
              onPress={() => router.push('/selecionar')}
              haptico="leve"
              escala={0.995}
              fundoPressionado={c.fundoBaixo}
              style={estilos.addExercicio}
            >
              <Glifo nome="mais" tamanho={16} cor={c.tinta} />
              <Tx v="bodyMed">Adicionar exercício</Tx>
            </Pressavel>
            <Regua />
          </View>
        ) : null}
      </ScrollView>

      <TiraDescanso bottom={alturaRodape} />

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}>
        <Regua peso="forte" cor={c.tinta} />
        <View style={estilos.rodapeCorpo}>
          <Botao titulo="Concluir treino" grande onPress={concluir} style={{ flex: 1 }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const usarEstilos = criarEstilos((c) => ({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
  },
  linhaNome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    marginBottom: sp.md,
  },
  titulo: {
    ...type.title,
    flex: 1,
    color: c.tinta,
    paddingVertical: 0,
  },
  // O mostrador do corpo e os totais no mesmo painel: onde e quanto, juntos.
  painel: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: sp.md,
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.md,
  },
  colunas: { flexDirection: 'row', alignItems: 'baseline', paddingBottom: 2 },
  totais: { flexDirection: 'row', alignItems: 'baseline' },
  bpm: { width: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  addExercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    height: 56,
    paddingHorizontal: margem.pagina,
  },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.fundo,
  },
  rodapeCorpo: {
    flexDirection: 'row',
    paddingHorizontal: margem.pagina,
    paddingTop: sp.md,
  },
}));
