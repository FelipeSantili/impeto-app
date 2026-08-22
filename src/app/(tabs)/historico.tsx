import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Rotulo, Tx, Vazio } from '@/components/base';
import { POR_ID } from '@/data/exercicios';
import { GRUPO_LABEL } from '@/data/types';
import { color, radius, sp } from '@/design/tokens';
import {
  duracaoMs,
  fmtData,
  fmtDuracaoCurta,
  fmtVolume,
  seriesFeitas,
  volumePorSemana,
  volumeSessao,
} from '@/lib/metricas';
import { useTreino, type Sessao } from '@/store/treino';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export default function Historico() {
  const insets = useSafeAreaInsets();
  const historico = useTreino((s) => s.historico);

  const { secoes, totalVolume, totalMin } = useMemo(() => {
    const mapa = new Map<string, Sessao[]>();
    let volume = 0;
    let minutos = 0;
    for (const s of historico) {
      const d = new Date(s.fim ?? s.inicio);
      const chave = `${d.getFullYear()}-${d.getMonth()}`;
      const arr = mapa.get(chave);
      if (arr) arr.push(s);
      else mapa.set(chave, [s]);
      volume += volumeSessao(s);
      minutos += Math.round(duracaoMs(s) / 60000);
    }
    return {
      secoes: [...mapa.entries()].map(([chave, data]) => {
        const [ano, mes] = chave.split('-').map(Number);
        const agora = new Date();
        const titulo =
          ano === agora.getFullYear() ? MESES[mes] : `${MESES[mes]} de ${ano}`;
        return { title: titulo, data };
      }),
      totalVolume: volume,
      totalMin: minutos,
    };
  }, [historico]);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top + sp.sm }}>
      <SectionList
        sections={secoes}
        keyExtractor={(s) => s.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp.xl, paddingBottom: 150 }}
        ListHeaderComponent={
          <View style={{ paddingTop: sp.lg, paddingBottom: sp.xl }}>
            <Tx v="title">Progresso</Tx>
            {historico.length > 0 ? (
              <>
                <View style={estilos.resumo}>
                  <Total valor={String(historico.length)} rotulo="Treinos" />
                  <View style={estilos.separador} />
                  <Total valor={fmtVolume(totalVolume)} rotulo="Volume" />
                  <View style={estilos.separador} />
                  <Total valor={fmtDuracaoCurta(totalMin * 60000)} rotulo="Tempo" />
                </View>
                <GraficoVolume />
              </>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={estilos.secao}>
            <Rotulo>{section.title}</Rotulo>
            <View style={estilos.traco} />
          </View>
        )}
        renderItem={({ item }) => <CartaoSessao sessao={item} />}
        ListEmptyComponent={
          <Vazio
            icone="stats-chart-outline"
            titulo="Nada por aqui ainda"
            texto="Seus treinos concluídos aparecem aqui, com volume, séries e recordes."
          />
        }
      />
    </View>
  );
}

/**
 * Volume das últimas 8 semanas.
 * Sem eixos nem grade: as barras já dizem se a carga total está subindo.
 */
function GraficoVolume() {
  const historico = useTreino((s) => s.historico);
  const semanas = useMemo(() => volumePorSemana(historico, 8), [historico]);
  const pico = Math.max(...semanas.map((s) => s.volume), 1);

  return (
    <View style={estilos.grafico}>
      <View style={estilos.cabecalhoGrafico}>
        <Rotulo>Volume por semana</Rotulo>
        <Tx v="caption" cor={color.textGhost}>
          PICO {fmtVolume(pico).toUpperCase()}
        </Tx>
      </View>

      <View style={estilos.barras}>
        {semanas.map((s, i) => {
          const atual = i === semanas.length - 1;
          return (
            <View key={s.inicio} style={estilos.colunaBarra}>
              <View style={estilos.trilho}>
                {atual ? (
                  // A semana corrente é a única com cor — e com um degradê leve.
                  <LinearGradient
                    colors={[color.accent, color.accentDeep]}
                    style={[
                      estilos.barra,
                      { height: `${Math.max(s.volume > 0 ? 6 : 2, (s.volume / pico) * 100)}%` },
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      estilos.barra,
                      {
                        // 2% é o mínimo para uma semana vazia continuar legível.
                        height: `${Math.max(s.volume > 0 ? 6 : 2, (s.volume / pico) * 100)}%`,
                        backgroundColor: color.surfaceHi,
                      },
                    ]}
                  />
                )}
              </View>
              <Tx v="caption" cor={atual ? color.textDim : color.textGhost}>
                {new Date(s.inicio).getDate()}
              </Tx>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Total({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Tx v="heading" tab>
        {valor}
      </Tx>
      <Tx v="caption" cor={color.textFaint}>
        {rotulo.toUpperCase()}
      </Tx>
    </View>
  );
}

function CartaoSessao({ sessao }: { sessao: Sessao }) {
  const grupos = [...new Set(sessao.exercicios.map((e) => POR_ID[e.exId]?.grupo).filter(Boolean))].map(
    (g) => GRUPO_LABEL[g!],
  );

  return (
    <Pressable
      onPress={() => router.push(`/sessao/${sessao.id}`)}
      style={({ pressed }) => [estilos.cartao, pressed && { backgroundColor: color.surfaceHi }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Tx v="bodyMed" numberOfLines={1}>
          {sessao.nome}
        </Tx>
        <Tx v="small" cor={color.textFaint} numberOfLines={1}>
          {fmtData(sessao.fim ?? sessao.inicio)} · {sessao.exercicios.length} exercícios ·{' '}
          {seriesFeitas(sessao)} séries
        </Tx>
        <Tx v="small" cor={color.textGhost} numberOfLines={1}>
          {fmtVolume(volumeSessao(sessao))} · {fmtDuracaoCurta(duracaoMs(sessao))}
          {grupos.length ? ` · ${grupos.slice(0, 3).join(', ')}` : ''}
        </Tx>
      </View>
      <Ionicons name="chevron-forward" size={16} color={color.textGhost} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  resumo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: sp.xl,
    paddingVertical: sp.lg,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  separador: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: color.lineMid },
  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingTop: sp.xl,
    paddingBottom: sp.sm,
  },
  traco: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  grafico: {
    marginTop: sp.md,
    padding: sp.xl,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  cabecalhoGrafico: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barras: { flexDirection: 'row', alignItems: 'flex-end', gap: sp.sm, marginTop: sp.lg },
  colunaBarra: { flex: 1, alignItems: 'center', gap: sp.sm },
  trilho: { width: '100%', height: 64, justifyContent: 'flex-end' },
  barra: { width: '100%', borderRadius: radius.sm, minHeight: 3 },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.lg,
    paddingHorizontal: sp.xl,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
    marginBottom: sp.sm,
  },
});
