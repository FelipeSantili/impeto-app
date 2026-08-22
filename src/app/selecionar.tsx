import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, BotaoIcone, Tx } from '@/components/base';
import { ListaExercicios } from '@/components/lista-exercicios';
import { color, shadow, sp } from '@/design/tokens';
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
    setMarcados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );
  }

  function confirmar() {
    if (!marcados.length) return;
    if (destino === 'rotina') entregar(marcados);
    else addExercicios(marcados);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top + sp.sm }}>
      <ListaExercicios
        selecionados={conjunto}
        onPress={(ex) => alternar(ex.id)}
        rodape={marcados.length ? 140 : 60}
        cabecalho={
          <View style={estilos.topo}>
            <BotaoIcone icone="close" onPress={() => router.back()} />
            <Tx v="bodyMed" style={{ flex: 1, textAlign: 'center' }}>
              Adicionar exercícios
            </Tx>
            <View style={{ width: 40 }} />
          </View>
        }
      />

      {marcados.length > 0 ? (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(160)}
          style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }, shadow.floating]}
        >
          <Botao
            titulo={`Adicionar ${marcados.length}`}
            grande
            onPress={confirmar}
            style={{ flex: 1 }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingBottom: sp.lg,
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
