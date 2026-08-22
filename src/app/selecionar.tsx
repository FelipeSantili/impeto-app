import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, BotaoGlifo, Regua, Rotulo, Tx } from '@/components/base';
import { ListaExercicios } from '@/components/lista-exercicios';
import { color, margem, sp } from '@/design/tokens';
import { useSelecao } from '@/store/selecao';
import { useTreino } from '@/store/treino';

/**
 * Seletor múltiplo de exercícios.
 *
 * Sem `?destino`, adiciona ao treino em andamento. Com `?destino=rotina`,
 * devolve a seleção pela rota de edição de rotina.
 */
export default function Selecionar() {
  const insets = useSafeAreaInsets();
  const { destino } = useLocalSearchParams<{ destino?: string }>();
  const addExercicios = useTreino((s) => s.addExercicios);
  const entregar = useSelecao((s) => s.entregar);
  const [marcados, setMarcados] = useState<string[]>([]);

  const conjunto = new Set(marcados);

  function alternar(id: string) {
    setMarcados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  function confirmar() {
    if (!marcados.length) return;
    if (destino === 'rotina') entregar(marcados);
    else addExercicios(marcados);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.papel, paddingTop: insets.top + sp.xs }}>
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
                Adicionar
              </Tx>
              {marcados.length > 0 ? (
                <Rotulo cor={color.azul}>{marcados.length} marcados</Rotulo>
              ) : null}
            </View>
            <Regua peso="forte" cor={color.tinta} style={{ marginHorizontal: margem.pagina }} />
          </View>
        }
      />

      {marcados.length > 0 ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(140)}
          style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}
        >
          <Regua peso="forte" cor={color.tinta} />
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

const estilos = StyleSheet.create({
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
    backgroundColor: color.papel,
  },
  rodapeCorpo: { flexDirection: 'row', paddingHorizontal: margem.pagina, paddingTop: sp.md },
});
