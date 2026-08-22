import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, BotaoIcone, Divisor, Tx, Vazio } from '@/components/base';
import { BarraDescanso } from '@/components/descanso';
import { abrirConfirmacao, abrirMenu, abrirPrompt } from '@/components/folha';
import { BlocoExercicio } from '@/components/treino-exercicio';
import { color, radius, shadow, sp, type } from '@/design/tokens';
import { fmtDuracao, fmtVolume, ultimaExecucao, volumeSessao } from '@/lib/metricas';
import { useCinta } from '@/store/cinta';
import { useDescanso } from '@/store/descanso';
import { useTreino } from '@/store/treino';

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
        {
          texto: 'Adicionar exercício',
          icone: 'add-circle-outline',
          onPress: () => router.push('/selecionar'),
        },
        {
          texto: 'Salvar como rotina',
          icone: 'bookmark-outline',
          onPress: () =>
            abrirPrompt({
              titulo: 'Salvar como rotina',
              descricao: 'Os exercícios e o número de séries ficam guardados.',
              valor: ativa!.nome,
              placeholder: 'Nome da rotina',
              onConfirmar: (nome) => rotinaDaAtiva(nome || ativa!.nome),
            }),
        },
        {
          texto: 'Descartar treino',
          icone: 'trash-outline',
          destrutiva: true,
          onPress: abandonar,
        },
      ],
    });
  }

  const alturaRodape = insets.bottom + 78;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: color.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[estilos.topo, { paddingTop: insets.top + sp.sm }]}>
        <BotaoIcone icone="chevron-down" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Tx v="heading" tab>
            {fmtDuracao(agora - ativa.inicio)}
          </Tx>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm }}>
            <Tx v="caption" cor={color.textFaint}>
              {series} SÉRIES · {fmtVolume(volume)}
            </Tx>
            {bpm !== null ? (
              <View style={estilos.bpm}>
                <Ionicons name="heart" size={9} color={color.accent} />
                <Tx v="caption" tab cor={color.accent}>
                  {bpm}
                </Tx>
              </View>
            ) : null}
          </View>
        </View>
        <BotaoIcone icone="ellipsis-horizontal" onPress={menu} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: sp.xl, paddingBottom: alturaRodape + 70 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <TextInput
          value={ativa.nome}
          onChangeText={renomear}
          style={estilos.titulo}
          placeholder="Nome do treino"
          placeholderTextColor={color.textGhost}
          returnKeyType="done"
        />
        <Divisor style={{ marginTop: sp.lg, marginBottom: sp.sm }} />

        {ativa.exercicios.length === 0 ? (
          <Vazio
            icone="barbell-outline"
            titulo="Treino vazio"
            texto="Adicione os exercícios do dia. Cada um já vem com três séries prontas para preencher."
            acao={
              <Botao
                titulo="Adicionar exercício"
                icone="add"
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
          <Pressable
            onPress={() => router.push('/selecionar')}
            style={({ pressed }) => [estilos.addExercicio, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="add" size={17} color={color.text} />
            <Tx v="bodyMed">Adicionar exercício</Tx>
          </Pressable>
        ) : null}
      </ScrollView>

      <BarraDescanso bottom={alturaRodape + sp.sm} />

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}>
        <Botao titulo="Concluir treino" grande onPress={concluir} style={{ flex: 1 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingBottom: sp.md,
  },
  bpm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: color.accentSoft,
  },
  titulo: { ...type.title, color: color.text, padding: 0, marginTop: sp.sm },
  addExercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
    borderStyle: 'dashed',
    marginTop: sp.lg,
  },
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
    ...shadow.soft,
  },
});
