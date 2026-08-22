import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, BotaoIcone, Rotulo, Tx, Vazio } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { abrirConfirmacao, abrirMenu } from '@/components/folha';
import { POR_ID } from '@/data/exercicios';
import { color, radius, shadow, sp, type } from '@/design/tokens';
import { useSelecao } from '@/store/selecao';
import { useTreino, type Rotina } from '@/store/treino';

type Item = Rotina['itens'][number];

export default function EditorRotina() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const nova = id === 'nova';

  const rotinas = useTreino((s) => s.rotinas);
  const descansoPadrao = useTreino((s) => s.descansoPadrao);
  const salvarRotina = useTreino((s) => s.salvarRotina);
  const apagarRotina = useTreino((s) => s.apagarRotina);
  const consumir = useSelecao((s) => s.consumir);

  const existente = nova ? undefined : rotinas.find((r) => r.id === id);
  const [nome, setNome] = useState(existente?.nome ?? '');
  const [itens, setItens] = useState<Item[]>(existente?.itens ?? []);

  // Recolhe o que o seletor deixou ao voltar para esta tela.
  useFocusEffect(
    useCallback(() => {
      const ids = consumir();
      if (!ids.length) return;
      setItens((atual) => [
        ...atual,
        ...ids.map((exId) => ({ exId, series: 3, descanso: descansoPadrao })),
      ]);
    }, [consumir, descansoPadrao]),
  );

  function ajustarSeries(i: number, delta: number) {
    setItens((atual) =>
      atual.map((it, idx) =>
        idx === i ? { ...it, series: Math.max(1, Math.min(12, it.series + delta)) } : it,
      ),
    );
  }

  function mover(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= itens.length) return;
    const copia = [...itens];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setItens(copia);
  }

  function menuItem(i: number) {
    const ex = POR_ID[itens[i].exId];
    abrirMenu({
      titulo: ex?.nome ?? 'Exercício',
      opcoes: [
        ...(i > 0 ? [{ texto: 'Mover para cima', icone: 'arrow-up' as const, onPress: () => mover(i, -1) }] : []),
        ...(i < itens.length - 1
          ? [{ texto: 'Mover para baixo', icone: 'arrow-down' as const, onPress: () => mover(i, 1) }]
          : []),
        {
          texto: 'Remover',
          icone: 'trash-outline',
          destrutiva: true,
          onPress: () => setItens((atual) => atual.filter((_, idx) => idx !== i)),
        },
      ],
    });
  }

  function salvar() {
    if (!itens.length) return;
    salvarRotina(nome || 'Rotina sem nome', itens, nova ? undefined : id);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: color.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[estilos.topo, { paddingTop: insets.top + sp.sm }]}>
        <BotaoIcone icone="close" onPress={() => router.back()} />
        <Tx v="bodyMed" style={{ flex: 1, textAlign: 'center' }}>
          {nova ? 'Nova rotina' : 'Editar rotina'}
        </Tx>
        {existente ? (
          <BotaoIcone
            icone="trash-outline"
            cor={color.textFaint}
            onPress={() =>
              abrirConfirmacao({
                titulo: 'Apagar rotina?',
                descricao: `"${existente.nome}" será removida.`,
                confirmar: 'Apagar',
                destrutiva: true,
                onConfirmar: () => {
                  apagarRotina(existente.id);
                  router.back();
                },
              })
            }
          />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: sp.xl, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Nome da rotina"
          placeholderTextColor={color.textGhost}
          style={estilos.nome}
          returnKeyType="done"
        />

        <View style={estilos.cabecalhoLista}>
          <Rotulo>{itens.length ? `${itens.length} exercícios` : 'Exercícios'}</Rotulo>
        </View>

        {itens.length === 0 ? (
          <Vazio
            icone="list-outline"
            titulo="Monte a sequência"
            texto="Escolha os exercícios e quantas séries de cada um você faz normalmente."
            acao={
              <Botao
                titulo="Adicionar exercício"
                icone="add"
                onPress={() => router.push('/selecionar?destino=rotina')}
              />
            }
          />
        ) : (
          <>
            {itens.map((it, i) => {
              const ex = POR_ID[it.exId];
              return (
                <Animated.View key={`${it.exId}-${i}`} layout={LinearTransition.springify().damping(18)}>
                  <View style={estilos.item}>
                    <Miniatura ex={ex} tamanho={40} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Tx v="bodyMed" numberOfLines={1}>
                        {ex?.nome ?? it.exId}
                      </Tx>
                      <Tx v="small" cor={color.textFaint}>
                        {it.series} {it.series === 1 ? 'série' : 'séries'}
                      </Tx>
                    </View>

                    <View style={estilos.stepper}>
                      <Pressable hitSlop={6} onPress={() => ajustarSeries(i, -1)} style={estilos.step}>
                        <Ionicons name="remove" size={15} color={color.textDim} />
                      </Pressable>
                      <Tx v="smallMed" tab style={{ width: 18, textAlign: 'center' }}>
                        {it.series}
                      </Tx>
                      <Pressable hitSlop={6} onPress={() => ajustarSeries(i, 1)} style={estilos.step}>
                        <Ionicons name="add" size={15} color={color.textDim} />
                      </Pressable>
                    </View>

                    <Pressable hitSlop={8} onPress={() => menuItem(i)}>
                      <Ionicons name="ellipsis-horizontal" size={16} color={color.textFaint} />
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}

            <Pressable
              onPress={() => router.push('/selecionar?destino=rotina')}
              style={({ pressed }) => [estilos.add, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={17} color={color.text} />
              <Tx v="bodyMed">Adicionar exercício</Tx>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }, shadow.soft]}>
        <Botao
          titulo="Salvar rotina"
          grande
          disabled={itens.length === 0}
          onPress={salvar}
          style={{ flex: 1 }}
        />
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
  nome: { ...type.title, color: color.text, padding: 0, marginTop: sp.md },
  cabecalhoLista: { paddingTop: sp.h1, paddingBottom: sp.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    backgroundColor: color.surface,
    borderRadius: radius.pill,
    paddingHorizontal: sp.xs,
    height: 30,
  },
  step: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
    borderStyle: 'dashed',
    marginTop: sp.xl,
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
  },
});
