import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
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
import { Miniatura } from '@/components/demo';
import { abrirConfirmacao, abrirMenu } from '@/components/folha';
import { Glifo } from '@/components/glifos';
import { POR_ID } from '@/data/exercicios';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, radius, sp, traco, type } from '@/design/tokens';
import { useSelecao } from '@/store/selecao';
import { useTreino, type Rotina } from '@/store/treino';

type Item = Rotina['itens'][number];

export default function EditorRotina() {
  const c = usarPaleta();
  const estilos = usarEstilos();
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
        ...(i > 0
          ? [{ texto: 'Mover para cima', glifo: 'cima' as const, onPress: () => mover(i, -1) }]
          : []),
        ...(i < itens.length - 1
          ? [{ texto: 'Mover para baixo', glifo: 'baixo' as const, onPress: () => mover(i, 1) }]
          : []),
        {
          texto: 'Remover',
          glifo: 'lixo',
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
      style={{ flex: 1, backgroundColor: c.fundo }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[estilos.topo, { paddingTop: insets.top + sp.xs }]}>
        <View style={{ marginLeft: -sp.sm }}>
          <BotaoGlifo glifo="fechar" acessivel="Fechar" onPress={() => router.back()} />
        </View>
        <Rotulo cor={c.tintaFraca} style={{ flex: 1 }}>
          {nova ? 'Nova rotina' : 'Editar rotina'}
        </Rotulo>
        {existente ? (
          <BotaoGlifo
            glifo="lixo"
            cor={c.rec}
            acessivel="Apagar rotina"
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
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Campo de formulário com rótulo carimbado e régua embaixo. */}
        <View style={estilos.campoNome}>
          <Rotulo cor={c.tintaFraca}>Nome</Rotulo>
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Rotina sem nome"
            placeholderTextColor={c.tintaFantasma}
            style={estilos.nome}
            returnKeyType="done"
            maxFontSizeMultiplier={1.3}
          />
        </View>
        <Regua peso="forte" cor={c.tinta} style={{ marginHorizontal: margem.pagina }} />

        {itens.length === 0 ? (
          <Vazio
            titulo="Monte a sequência"
            texto="Escolha os exercícios e quantas séries de cada um você faz normalmente."
            acao={
              <Botao
                titulo="Adicionar exercício"
                glifo="mais"
                onPress={() => router.push('/selecionar?destino=rotina')}
              />
            }
          />
        ) : (
          <>
            <CabecaColuna>
              <Rotulo cor={c.tintaMid} style={{ width: margem.calha }}>
                Nº
              </Rotulo>
              <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
                Exercício
              </Rotulo>
              <Rotulo cor={c.tintaMid} style={{ width: 96, textAlign: 'center' }}>
                Séries
              </Rotulo>
              <View style={{ width: 30 }} />
            </CabecaColuna>

            {itens.map((it, i) => {
              const ex = POR_ID[it.exId];
              return (
                <Animated.View
                  key={`${it.exId}-${i}`}
                  layout={LinearTransition.springify().damping(18)}
                >
                  <View style={estilos.item}>
                    <Tx v="numero" tab cor={c.tintaFantasma} style={{ width: margem.calha }}>
                      {i + 1}
                    </Tx>
                    <Miniatura ex={ex} tamanho={36} />
                    <View style={{ flex: 1 }}>
                      <Tx v="bodyMed" numberOfLines={1}>
                        {ex?.nome ?? it.exId}
                      </Tx>
                    </View>

                    {/* Contador de formulário: caixa retangular, sem pílula. */}
                    <View style={estilos.contador}>
                      <Pressavel
                        hitSlop={10}
                        haptico="selecao"
                        onPress={() => ajustarSeries(i, -1)}
                        accessibilityLabel="Menos uma série"
                        style={estilos.passo}
                      >
                        <Glifo nome="menos" tamanho={13} cor={c.tintaMid} />
                      </Pressavel>
                      <Tx v="numero" tab center style={{ width: 26 }}>
                        {it.series}
                      </Tx>
                      <Pressavel
                        hitSlop={10}
                        haptico="selecao"
                        onPress={() => ajustarSeries(i, 1)}
                        accessibilityLabel="Mais uma série"
                        style={estilos.passo}
                      >
                        <Glifo nome="mais" tamanho={13} cor={c.tintaMid} />
                      </Pressavel>
                    </View>

                    <Pressavel
                      hitSlop={12}
                      onPress={() => menuItem(i)}
                      accessibilityLabel="Opções do exercício"
                      style={{ width: 30, alignItems: 'flex-end' }}
                    >
                      <Glifo nome="reticencias" tamanho={15} cor={c.tintaFraca} />
                    </Pressavel>
                  </View>
                  <Regua />
                </Animated.View>
              );
            })}

            <Pressavel
              onPress={() => router.push('/selecionar?destino=rotina')}
              haptico="leve"
              escala={0.995}
              fundoPressionado={c.fundoBaixo}
              style={estilos.add}
            >
              <Glifo nome="mais" tamanho={16} cor={c.tinta} />
              <Tx v="bodyMed">Adicionar exercício</Tx>
            </Pressavel>
            <Regua />
          </>
        )}
      </ScrollView>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}>
        <Regua peso="forte" cor={c.tinta} />
        <View style={estilos.rodapeCorpo}>
          <Botao
            titulo="Salvar rotina"
            grande
            disabled={itens.length === 0}
            onPress={salvar}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const usarEstilos = criarEstilos((c) => ({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.sm,
  },
  campoNome: { paddingHorizontal: margem.pagina, paddingBottom: sp.sm },
  nome: { ...type.display, color: c.tinta, padding: 0, marginTop: sp.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: traco.normal,
    borderColor: c.reguaMid,
    borderRadius: radius.sm,
    height: 34,
  },
  passo: { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    height: 56,
    paddingHorizontal: margem.pagina,
    marginTop: sp.lg,
  },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.fundo,
  },
  rodapeCorpo: { flexDirection: 'row', paddingHorizontal: margem.pagina, paddingTop: sp.md },
}));
