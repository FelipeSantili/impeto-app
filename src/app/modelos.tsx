import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoGlifo, Pressavel, Regua, Rotulo, Secao, Tx } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { Glifo } from '@/components/glifos';
import { POR_ID } from '@/data/exercicios';
import { PROGRAMAS, type Modelo } from '@/data/modelos';
import { color, margem, sp } from '@/design/tokens';

/** Vitrine de treinos prontos, agrupados por divisão. */
export default function Modelos() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: color.papel }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.xs }]}>
        <View style={{ marginLeft: -sp.sm }}>
          <BotaoGlifo glifo="fechar" acessivel="Fechar" onPress={() => router.back()} />
        </View>
        <Tx v="title" style={{ flex: 1 }}>
          Modelos prontos
        </Tx>
      </View>
      <Regua peso="forte" cor={color.tinta} style={{ marginHorizontal: margem.pagina }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + sp.h2 }}
        showsVerticalScrollIndicator={false}
      >
        <Tx v="small" cor={color.tintaMid} style={estilos.intro}>
          Divisões clássicas com séries e descansos já definidos. Use como estão ou ajuste depois
          de salvar — viram rotinas suas.
        </Tx>

        {PROGRAMAS.map((prog) => (
          <Secao
            key={prog.id}
            titulo={prog.nome}
            direita={<Rotulo cor={color.tintaFraca}>{prog.freq}</Rotulo>}
          >
            <Tx v="small" cor={color.tintaFraca} style={estilos.descricao}>
              {prog.descricao}
            </Tx>
            {prog.modelos.map((mo, i) => (
              <LinhaModelo key={mo.id} modelo={mo} numero={i + 1} />
            ))}
          </Secao>
        ))}
      </ScrollView>
    </View>
  );
}

function LinhaModelo({ modelo, numero }: { modelo: Modelo; numero: number }) {
  const exs = modelo.itens.map((i) => POR_ID[i.exId]).filter(Boolean);
  const series = modelo.itens.reduce((t, i) => t + i.series, 0);

  return (
    <View>
      <Pressavel
        onPress={() => router.push(`/modelo/${modelo.id}`)}
        escala={0.995}
        fundoPressionado={color.papelBaixo}
        accessibilityRole="button"
        accessibilityLabel={modelo.nome}
        style={estilos.linha}
      >
        <Tx v="numero" tab cor={color.tintaFantasma} style={{ width: margem.calha }}>
          {numero}
        </Tx>
        <View style={estilos.pilha}>
          {exs.slice(0, 3).map((e, i) => (
            <View key={`${e.id}-${i}`} style={i > 0 ? { marginLeft: -10 } : null}>
              <Miniatura ex={e} tamanho={32} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Tx v="bodyMed" numberOfLines={1}>
            {modelo.nome}
          </Tx>
          <Tx v="small" cor={color.tintaFraca} numberOfLines={1}>
            {modelo.foco}
          </Tx>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Tx v="numero" tab>
            {modelo.itens.length}
            <Tx v="small" cor={color.tintaFraca}> ex</Tx>
          </Tx>
          <Tx v="small" tab cor={color.tintaFraca}>
            {series} séries
          </Tx>
        </View>
        <Glifo nome="avancar" tamanho={13} cor={color.tintaFantasma} />
      </Pressavel>
      <Regua />
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
  intro: { paddingHorizontal: margem.pagina, paddingTop: sp.lg },
  descricao: { paddingHorizontal: margem.pagina, paddingTop: sp.sm, paddingBottom: sp.md },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  pilha: { flexDirection: 'row', alignItems: 'center' },
});
