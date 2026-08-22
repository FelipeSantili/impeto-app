import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Botao,
  BotaoGlifo,
  CabecaColuna,
  Pressavel,
  Regua,
  Rotulo,
  Tx,
  Vazio,
} from '@/components/base';
import { TiraDescanso } from '@/components/descanso';
import { abrirConfirmacao, abrirMenu, abrirPrompt } from '@/components/folha';
import { Glifo } from '@/components/glifos';
import { BlocoExercicio } from '@/components/treino-exercicio';
import { color, margem, sp, type } from '@/design/tokens';
import { fmtDuracao, fmtVolume, ultimaExecucao, volumeSessao } from '@/lib/metricas';
import { useCinta } from '@/store/cinta';
import { useDescanso } from '@/store/descanso';
import { useTreino } from '@/store/treino';

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

  // Sem treino aberto não há tela: pode ter sido finalizado em outro caminho.
  useEffect(() => {
    if (!ativa && router.canGoBack()) router.back();
  }, [ativa]);

  if (!ativa) return null;

  const series = ativa.exercicios.reduce((t, e) => t + e.series.filter((s) => s.feita).length, 0);
  const volume = volumeSessao({ ...ativa, exercicios: ativa.exercicios });

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
      style={{ flex: 1, backgroundColor: color.papel }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[estilos.topo, { paddingTop: insets.top + sp.xs }]}>
        <BotaoGlifo glifo="baixo" acessivel="Voltar" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <BotaoGlifo glifo="reticencias" acessivel="Opções do treino" onPress={menu} />
      </View>

      <TextInput
        value={ativa.nome}
        onChangeText={renomear}
        style={estilos.titulo}
        placeholder="Nome do treino"
        placeholderTextColor={color.tintaFantasma}
        returnKeyType="done"
        maxFontSizeMultiplier={1.3}
      />

      {/* Faixa de totais: colunas rotuladas, valores em condensada tabular. */}
      <CabecaColuna>
        <Rotulo cor={color.tintaMid} style={{ flex: 1.3 }}>
          Tempo
        </Rotulo>
        <Rotulo cor={color.tintaMid} style={{ flex: 1 }}>
          Séries
        </Rotulo>
        <Rotulo cor={color.tintaMid} style={{ flex: 1.2 }}>
          Volume
        </Rotulo>
        {bpm !== null ? (
          <Rotulo cor={color.tintaMid} style={{ width: 52, textAlign: 'right' }}>
            bpm
          </Rotulo>
        ) : null}
      </CabecaColuna>
      <View style={estilos.totais}>
        <Tx v="numeroG" tab style={{ flex: 1.3 }}>
          {fmtDuracao(agora - ativa.inicio)}
        </Tx>
        <Tx v="numeroG" tab style={{ flex: 1 }}>
          {series}
        </Tx>
        <Tx v="numeroG" tab style={{ flex: 1.2 }}>
          {fmtVolume(volume)}
        </Tx>
        {bpm !== null ? (
          <View style={estilos.bpm}>
            <Glifo nome="coracao" tamanho={11} cor={color.vermelho} />
            <Tx v="numeroG" tab cor={color.vermelho}>
              {bpm}
            </Tx>
          </View>
        ) : null}
      </View>
      <Regua peso="forte" cor={color.tinta} />

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
              fundoPressionado={color.papelBaixo}
              style={estilos.addExercicio}
            >
              <Glifo nome="mais" tamanho={16} cor={color.tinta} />
              <Tx v="bodyMed">Adicionar exercício</Tx>
            </Pressavel>
            <Regua />
          </View>
        ) : null}
      </ScrollView>

      <TiraDescanso bottom={alturaRodape} />

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}>
        <Regua peso="forte" cor={color.tinta} />
        <View style={estilos.rodapeCorpo}>
          <Botao titulo="Concluir treino" grande onPress={concluir} style={{ flex: 1 }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
  },
  titulo: {
    ...type.title,
    color: color.tinta,
    paddingHorizontal: margem.pagina,
    paddingVertical: 0,
    marginBottom: sp.md,
  },
  totais: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: margem.pagina,
    paddingVertical: sp.sm,
  },
  bpm: { width: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
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
    backgroundColor: color.papel,
  },
  rodapeCorpo: {
    flexDirection: 'row',
    paddingHorizontal: margem.pagina,
    paddingTop: sp.md,
  },
});
