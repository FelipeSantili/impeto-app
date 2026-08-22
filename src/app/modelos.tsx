import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoIcone, Rotulo, Tx } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { POR_ID } from '@/data/exercicios';
import { PROGRAMAS, type Modelo } from '@/data/modelos';
import { color, radius, sp } from '@/design/tokens';

/** Vitrine de treinos prontos, agrupados por divisão. */
export default function Modelos() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.sm }]}>
        <BotaoIcone icone="close" onPress={() => router.back()} />
        <Tx v="bodyMed" style={{ flex: 1, textAlign: 'center' }}>
          Modelos prontos
        </Tx>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: sp.xl, paddingBottom: insets.bottom + sp.h2 }}
        showsVerticalScrollIndicator={false}
      >
        <Tx v="small" cor={color.textFaint} style={{ marginTop: sp.sm, marginBottom: sp.sm }}>
          Divisões clássicas com séries e descansos já definidos. Use como estão ou ajuste depois
          de salvar — viram rotinas suas.
        </Tx>

        {PROGRAMAS.map((prog, pi) => (
          <Animated.View key={prog.id} entering={FadeInDown.delay(40 + pi * 50).duration(280)}>
            <View style={estilos.secao}>
              <View style={{ flex: 1 }}>
                <Rotulo cor={color.textDim}>{prog.nome}</Rotulo>
              </View>
              <Tx v="caption" cor={color.textGhost}>
                {prog.freq.toUpperCase()}
              </Tx>
            </View>
            <Tx v="small" cor={color.textFaint} style={{ marginBottom: sp.md }}>
              {prog.descricao}
            </Tx>

            <View style={{ gap: sp.sm }}>
              {prog.modelos.map((mo) => (
                <CartaoModelo key={mo.id} modelo={mo} />
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

function CartaoModelo({ modelo }: { modelo: Modelo }) {
  const exs = modelo.itens.map((i) => POR_ID[i.exId]).filter(Boolean);
  const series = modelo.itens.reduce((t, i) => t + i.series, 0);

  return (
    <Pressable
      onPress={() => router.push(`/modelo/${modelo.id}`)}
      style={({ pressed }) => [estilos.cartao, pressed && { backgroundColor: color.surfaceHi }]}
    >
      <View style={estilos.pilha}>
        {exs.slice(0, 3).map((e, i) => (
          <View key={`${e.id}-${i}`} style={[estilos.pilhaItem, i > 0 && { marginLeft: -12 }]}>
            <Miniatura ex={e} tamanho={34} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Tx v="bodyMed" numberOfLines={1}>
          {modelo.nome}
        </Tx>
        <Tx v="small" cor={color.textFaint} numberOfLines={1}>
          {modelo.foco}
        </Tx>
        <Tx v="caption" cor={color.textGhost} style={{ marginTop: 2 }}>
          {modelo.itens.length} EXERCÍCIOS · {series} SÉRIES
        </Tx>
      </View>
      <Ionicons name="chevron-forward" size={16} color={color.textGhost} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingBottom: sp.sm,
  },
  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: sp.h1,
    paddingBottom: sp.xs,
  },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    padding: sp.lg,
    borderRadius: radius.xl,
    backgroundColor: color.bgSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  pilha: { flexDirection: 'row', alignItems: 'center' },
  pilhaItem: { borderWidth: 2, borderColor: color.bgSoft, borderRadius: 13 },
});
