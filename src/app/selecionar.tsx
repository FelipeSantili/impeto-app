import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, BotaoGlifo, Regua, Rotulo, Tx } from '@/components/base';
import { ListaExercicios } from '@/components/lista-exercicios';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, sp } from '@/design/tokens';
import { useSelecao } from '@/store/selecao';
import { useTreino } from '@/store/treino';

/**
 * Seletor de exercícios.
 *
 * Sem `?destino`, adiciona ao treino em andamento. Com `?destino=rotina`,
 * devolve a seleção pela rota de edição de rotina.
 *
 * Com `?trocar`, a tela vira SUBSTITUIÇÃO: um toque só resolve, sem rodapé de
 * confirmação, porque trocar é escolher um — e o valor de `trocar` diz quem
 * sai (o `uid` da linha no treino, ou a posição na rotina em edição).
 */
export default function Selecionar() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const insets = useSafeAreaInsets();
  const { destino, trocar } = useLocalSearchParams<{ destino?: string; trocar?: string }>();
  const addExercicios = useTreino((s) => s.addExercicios);
  const substituirExercicio = useTreino((s) => s.substituirExercicio);
  const entregar = useSelecao((s) => s.entregar);
  const [marcados, setMarcados] = useState<string[]>([]);

  const trocando = !!trocar;
  const conjunto = new Set(marcados);

  function alternar(id: string) {
    if (trocando) {
      if (destino === 'rotina') entregar([id], Number(trocar));
      else substituirExercicio(trocar, id);
      router.back();
      return;
    }
    setMarcados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  function confirmar() {
    if (!marcados.length) return;
    if (destino === 'rotina') entregar(marcados);
    else addExercicios(marcados);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo, paddingTop: insets.top + sp.xs }}>
      <ListaExercicios
        selecionados={conjunto}
        onPress={(ex) => alternar(ex.id)}
        rodape={marcados.length ? 140 : 60}
        cabecalho={
          <View>
            <View style={estilos.topo}>
              <View style={{ marginLeft: -sp.sm }}>
                <BotaoGlifo glifo="fechar" acessivel="Fechar" onPress={() => router.back()} />
              </View>
              <Tx v="title" style={{ flex: 1 }}>
                {trocando ? 'Trocar' : 'Adicionar'}
              </Tx>
              {marcados.length > 0 ? (
                <Rotulo cor={c.acento}>{marcados.length} marcados</Rotulo>
              ) : null}
            </View>
            <Regua peso="forte" cor={c.tinta} style={{ marginHorizontal: margem.pagina }} />
          </View>
        }
      />

      {marcados.length > 0 ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(140)}
          style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}
        >
          <Regua peso="forte" cor={c.tinta} />
          <View style={estilos.rodapeCorpo}>
            <Botao
              titulo={`Adicionar ${marcados.length}`}
              grande
              onPress={confirmar}
              style={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const usarEstilos = criarEstilos((c) => ({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.md,
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
