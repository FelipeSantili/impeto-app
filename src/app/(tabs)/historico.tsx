import { router } from 'expo-router';
import { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CabecaColuna, Pressavel, Regua, Rotulo, Tx, Vazio } from '@/components/base';
import { Glifo } from '@/components/glifos';
import { POR_ID } from '@/data/exercicios';
import { GRUPO_LABEL } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, sp } from '@/design/tokens';
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

/**
 * Progresso — o índice do caderno.
 *
 * Os totais deixaram de ser um cartão com bordas e separadores verticais e
 * viraram o que são: cabeça de coluna e uma linha de valores. O gráfico perdeu
 * a moldura e o degradê; ganhou uma LINHA DE BASE, que é o que faz barra
 * significar alguma coisa.
 */
export default function Historico() {
  const c = usarPaleta();
  const estilos = usarEstilos();
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
        const titulo = ano === agora.getFullYear() ? MESES[mes] : `${MESES[mes]} de ${ano}`;
        return { title: titulo, data };
      }),
      totalVolume: volume,
      totalMin: minutos,
    };
  }, [historico]);

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo, paddingTop: insets.top + sp.sm }}>
      <SectionList
        sections={secoes}
        keyExtractor={(s) => s.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        ListHeaderComponent={
          <View>
            <View style={estilos.cabecalho}>
              <Tx v="title">Progresso</Tx>
            </View>
            <Regua peso="forte" cor={c.tinta} style={{ marginHorizontal: margem.pagina }} />

            {historico.length > 0 ? (
              <>
                <CabecaColuna>
                  <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
                    Treinos
                  </Rotulo>
                  <Rotulo cor={c.tintaMid} style={{ flex: 1.3 }}>
                    Volume
                  </Rotulo>
                  <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
                    Tempo
                  </Rotulo>
                </CabecaColuna>
                {/* Encolhem em vez de quebrar: com anos de treino o volume
                    total e o tempo total ficam longos. */}
                <View style={estilos.totais}>
                  <Tx v="numeroXG" tab numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1 }}>
                    {historico.length}
                  </Tx>
                  {/* O volume é a leitura que resume tudo: vai em acento, que
                      é o topo da rampa. Os outros dois são contexto. */}
                  <Tx
                    v="numeroXG"
                    cor={c.acento}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{ flex: 1.3 }}
                  >
                    {fmtVolume(totalVolume)}
                  </Tx>
                  <Tx v="numeroXG" tab numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1 }}>
                    {fmtDuracaoCurta(totalMin * 60000)}
                  </Tx>
                </View>
                <Regua peso="forte" style={{ marginHorizontal: margem.pagina }} />
                <GraficoVolume />
              </>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={estilos.secao}>
            <Rotulo cor={c.tintaMid}>{section.title}</Rotulo>
            <Regua peso="forte" style={{ marginTop: sp.xs }} />
          </View>
        )}
        renderItem={({ item }) => <LinhaSessao sessao={item} />}
        ListEmptyComponent={
          <Vazio
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
 *
 * Barras a partir de uma linha de base, sem moldura e sem degradê. A semana
 * corrente é a única CHEIA; as anteriores ficam vazadas com contorno. Estado
 * por preenchimento, não por cor — a mesma regra da tabela de séries.
 */
function GraficoVolume() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const historico = useTreino((s) => s.historico);
  const semanas = useMemo(() => volumePorSemana(historico, 8), [historico]);
  const pico = Math.max(...semanas.map((s) => s.volume), 1);

  return (
    <View style={estilos.grafico}>
      <View style={estilos.cabecalhoGrafico}>
        <Rotulo cor={c.tintaMid}>Volume por semana</Rotulo>
        <Rotulo cor={c.tintaFraca}>Pico {fmtVolume(pico)}</Rotulo>
      </View>

      <View style={estilos.barras}>
        {semanas.map((s, i) => {
          const atual = i === semanas.length - 1;
          // 2% é o mínimo para uma semana vazia continuar legível.
          const altura = `${Math.max(s.volume > 0 ? 6 : 2, (s.volume / pico) * 100)}%` as const;
          return (
            <View key={s.inicio} style={estilos.colunaBarra}>
              <View style={estilos.trilho}>
                <View
                  style={[
                    estilos.barra,
                    {
                      height: altura,
                      // Semanas passadas cheias em tinta fraca, a corrente em
                      // acento. Vazadas com contorno liam como caixa vazia, não
                      // como barra.
                      backgroundColor: atual ? c.acento : c.reguaForte,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      {/* A linha de base vem imediatamente sob as barras — se os rótulos
          ficarem no meio, a barra perde de onde cresce e vira enfeite. */}
      <Regua peso="normal" cor={c.tinta} />
      <View style={estilos.rotulosBarras}>
        {semanas.map((s, i) => (
          <View key={s.inicio} style={estilos.colunaBarra}>
            <Rotulo cor={i === semanas.length - 1 ? c.tinta : c.tintaFraca}>
              {new Date(s.inicio).getDate()}
            </Rotulo>
          </View>
        ))}
      </View>
    </View>
  );
}

function LinhaSessao({ sessao }: { sessao: Sessao }) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const grupos = [
    ...new Set(sessao.exercicios.map((e) => POR_ID[e.exId]?.grupo).filter(Boolean)),
  ].map((g) => GRUPO_LABEL[g!]);

  return (
    <View>
      <Pressavel
        onPress={() => router.push(`/sessao/${sessao.id}`)}
        escala={0.995}
        fundoPressionado={c.fundoBaixo}
        accessibilityRole="button"
        accessibilityLabel={sessao.nome}
        style={estilos.linha}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Tx v="bodyMed" numberOfLines={1}>
            {sessao.nome}
          </Tx>
          <Tx v="small" cor={c.tintaFraca} numberOfLines={1}>
            {fmtData(sessao.fim ?? sessao.inicio)}
            {grupos.length ? ` · ${grupos.slice(0, 3).join(', ')}` : ''}
          </Tx>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Tx v="numero" tab>
            {fmtVolume(volumeSessao(sessao))}
          </Tx>
          <Tx v="small" tab cor={c.tintaFraca}>
            {seriesFeitas(sessao)} séries · {fmtDuracaoCurta(duracaoMs(sessao))}
          </Tx>
        </View>
        <Glifo nome="avancar" tamanho={13} cor={c.tintaFantasma} />
      </Pressavel>
      <Regua />
    </View>
  );
}

const usarEstilos = criarEstilos(() => ({
  cabecalho: { paddingHorizontal: margem.pagina, paddingBottom: sp.md },
  totais: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: margem.pagina,
    paddingVertical: sp.md,
  },
  secao: { paddingTop: sp.h1, paddingBottom: sp.sm, paddingHorizontal: margem.pagina },
  grafico: { paddingHorizontal: margem.pagina, paddingTop: sp.xxl },
  cabecalhoGrafico: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  barras: { flexDirection: 'row', alignItems: 'flex-end', gap: sp.sm, marginTop: sp.lg },
  rotulosBarras: { flexDirection: 'row', gap: sp.sm, paddingTop: sp.sm },
  colunaBarra: { flex: 1, alignItems: 'center' },
  trilho: { width: '100%', height: 72, justifyContent: 'flex-end' },
  barra: { width: '100%', minHeight: 2 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
}));
