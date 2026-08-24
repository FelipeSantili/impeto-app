import { useMemo, useState } from 'react';
import {
  ScrollView,
  SectionList,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { Chip, Pressavel, Regua, Rotulo, Tx, Vazio } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { Glifo } from '@/components/glifos';
import { buscar, EXERCICIOS } from '@/data/exercicios';
import { EQUIP_LABEL, GRUPO_LABEL, ORDEM_GRUPOS, type Exercicio, type Grupo } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, radius, sp, traco, type } from '@/design/tokens';

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
  const c = usarPaleta();
  const estilos = usarEstilos();
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

      {/* Campo de formulário: régua embaixo, sem caixa. */}
      <View style={estilos.busca}>
        <Glifo nome="busca" tamanho={16} cor={c.tintaFraca} />
        <TextInput
          value={termo}
          onChangeText={setTermo}
          placeholder="Buscar exercício ou máquina"
          placeholderTextColor={c.tintaFantasma}
          style={estilos.input}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {termo.length > 0 ? (
          <Pressavel hitSlop={12} onPress={() => setTermo('')} accessibilityLabel="Limpar busca">
            <Glifo nome="fechar" tamanho={14} cor={c.tintaFraca} />
          </Pressavel>
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
        contentContainerStyle={{ paddingBottom: rodape }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={9}
        renderSectionHeader={({ section }) => (
          <View style={estilos.secao}>
            <Rotulo cor={c.tintaMid}>{section.title}</Rotulo>
            <Regua peso="forte" style={{ marginTop: sp.xs }} />
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
            titulo="Nada encontrado"
            texto={`Nenhum exercício para "${termo}". Tente outro termo ou limpe o filtro.`}
          />
        }
        ListFooterComponent={
          total > 0 ? (
            <Rotulo cor={c.tintaFantasma} style={estilos.total}>
              {total} exercícios
            </Rotulo>
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
  const c = usarPaleta();
  const estilos = usarEstilos();
  return (
    <Pressavel
      onPress={onPress}
      escala={0.995}
      fundo={marcado ? c.acentoSuave : undefined}
      fundoPressionado={c.fundoBaixo}
      accessibilityRole="button"
      accessibilityState={modoSelecao ? { selected: !!marcado } : undefined}
      style={[estilos.linha, style]}
    >
      <Miniatura ex={ex} />
      <View style={{ flex: 1, gap: 2 }}>
        <Tx v="bodyMed" numberOfLines={1}>
          {ex.nome}
        </Tx>
        <Tx v="small" cor={c.tintaFraca} numberOfLines={1}>
          {EQUIP_LABEL[ex.equip]}
          {ex.unilateral ? ' · unilateral' : ''}
        </Tx>
      </View>
      {modoSelecao ? (
        // Caixa de marcar quadrada — o círculo com check dentro é forma de
        // biblioteca, não deste caderno.
        <View style={[estilos.caixa, marcado && estilos.caixaAtiva]}>
          {marcado ? <Glifo nome="confere" tamanho={13} cor={c.acentoTexto} /> : null}
        </View>
      ) : (
        <Glifo nome="avancar" tamanho={14} cor={c.tintaFantasma} />
      )}
    </Pressavel>
  );
}

const usarEstilos = criarEstilos((c) => ({
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    height: 46,
    marginHorizontal: margem.pagina,
    borderBottomWidth: traco.normal,
    borderBottomColor: c.reguaForte,
  },
  input: { flex: 1, color: c.tinta, ...type.body, padding: 0 },
  chips: { gap: sp.sm, paddingHorizontal: margem.pagina, paddingVertical: sp.lg },
  secao: { paddingTop: sp.xl, paddingBottom: sp.sm, paddingHorizontal: margem.pagina },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
    borderBottomWidth: traco.fina,
    borderBottomColor: c.regua,
  },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: traco.normal,
    borderColor: c.reguaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaAtiva: { backgroundColor: c.acento, borderColor: c.acento },
  total: { paddingTop: sp.xxl, paddingHorizontal: margem.pagina },
}));
