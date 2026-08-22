import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { Chip, Rotulo, Tx, Vazio } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { EXERCICIOS, buscar } from '@/data/exercicios';
import { EQUIP_LABEL, GRUPO_LABEL, ORDEM_GRUPOS, type Exercicio, type Grupo } from '@/data/types';
import { color, radius, sp, type } from '@/design/tokens';

export interface FiltroProps {
  /** Ids marcados — quando definido, a lista entra em modo de seleção. */
  selecionados?: Set<string>;
  onPress: (ex: Exercicio) => void;
  rodape?: number;
  cabecalho?: React.ReactNode;
}

/**
 * Busca + filtro por grupo + lista seccionada.
 *
 * Compartilhada entre a aba Exercícios (navega para o detalhe) e o seletor
 * dentro do treino (marca e desmarca).
 */
export function ListaExercicios({ selecionados, onPress, rodape = 120, cabecalho }: FiltroProps) {
  const [termo, setTermo] = useState('');
  const [grupo, setGrupo] = useState<Grupo | null>(null);

  const secoes = useMemo(() => {
    const base = termo.trim() ? buscar(termo) : EXERCICIOS;
    const filtrados = grupo ? base.filter((e) => e.grupo === grupo) : base;

    const mapa = new Map<Grupo, Exercicio[]>();
    for (const e of filtrados) {
      const arr = mapa.get(e.grupo);
      if (arr) arr.push(e);
      else mapa.set(e.grupo, [e]);
    }
    return ORDEM_GRUPOS.filter((g) => mapa.has(g)).map((g) => ({
      title: GRUPO_LABEL[g],
      data: mapa.get(g)!.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    }));
  }, [termo, grupo]);

  const total = secoes.reduce((t, s) => t + s.data.length, 0);

  return (
    <View style={{ flex: 1 }}>
      {cabecalho}

      <View style={estilos.busca}>
        <Ionicons name="search" size={16} color={color.textFaint} />
        <TextInput
          value={termo}
          onChangeText={setTermo}
          placeholder="Buscar exercício ou máquina"
          placeholderTextColor={color.textGhost}
          style={estilos.input}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {termo.length > 0 ? (
          <Pressable hitSlop={8} onPress={() => setTermo('')}>
            <Ionicons name="close-circle" size={16} color={color.textFaint} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.chips}
        keyboardShouldPersistTaps="handled"
      >
        <Chip texto="Todos" ativo={grupo === null} onPress={() => setGrupo(null)} />
        {ORDEM_GRUPOS.map((g) => (
          <Chip
            key={g}
            texto={GRUPO_LABEL[g]}
            ativo={grupo === g}
            onPress={() => setGrupo(grupo === g ? null : g)}
          />
        ))}
      </ScrollView>

      <SectionList
        sections={secoes}
        keyExtractor={(e) => e.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: rodape, paddingHorizontal: sp.xl }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={9}
        renderSectionHeader={({ section }) => (
          <View style={estilos.secao}>
            <Rotulo>{section.title}</Rotulo>
            <View style={estilos.tracoSecao} />
          </View>
        )}
        renderItem={({ item }) => (
          <LinhaExercicio
            ex={item}
            marcado={selecionados?.has(item.id)}
            modoSelecao={!!selecionados}
            onPress={() => onPress(item)}
          />
        )}
        ListEmptyComponent={
          <Vazio
            icone="search-outline"
            titulo="Nada encontrado"
            texto={`Nenhum exercício para "${termo}". Tente outro termo ou limpe o filtro.`}
          />
        }
        ListFooterComponent={
          total > 0 ? (
            <Tx v="caption" cor={color.textGhost} center style={{ paddingTop: sp.xxl }}>
              {total} EXERCÍCIOS
            </Tx>
          ) : null
        }
      />
    </View>
  );
}

export function LinhaExercicio({
  ex,
  marcado,
  modoSelecao,
  onPress,
  style,
}: {
  ex: Exercicio;
  marcado?: boolean;
  modoSelecao?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [estilos.linha, pressed && { opacity: 0.6 }, style]}
    >
      <Miniatura ex={ex} />
      <View style={{ flex: 1, gap: 2 }}>
        <Tx v="bodyMed" numberOfLines={1}>
          {ex.nome}
        </Tx>
        <Tx v="small" cor={color.textFaint} numberOfLines={1}>
          {EQUIP_LABEL[ex.equip]}
          {ex.unilateral ? ' · unilateral' : ''}
        </Tx>
      </View>
      {modoSelecao ? (
        <View style={[estilos.marca, marcado && estilos.marcaAtiva]}>
          {marcado ? <Ionicons name="checkmark" size={14} color={color.bg} /> : null}
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={color.textGhost} />
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    height: 46,
    marginHorizontal: sp.xl,
    paddingHorizontal: sp.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  input: { flex: 1, color: color.text, ...type.body, padding: 0 },
  chips: { gap: sp.sm, paddingHorizontal: sp.xl, paddingVertical: sp.lg },
  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingTop: sp.xl,
    paddingBottom: sp.sm,
  },
  tracoSecao: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.lg,
    paddingVertical: sp.md,
  },
  marca: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcaAtiva: { backgroundColor: color.accent, borderColor: color.accent },
});
