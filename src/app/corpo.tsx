import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoGlifo, Regua, Rotulo, Tx } from '@/components/base';
import { Corpo3D, type FonteDoModelo } from '@/components/corpo-3d';
import { GRUPO_LABEL, type Grupo } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, nivelDeCalor, radius, sp, traco } from '@/design/tokens';
import { musculosDaSessao } from '@/lib/metricas';
import { useTreino } from '@/store/treino';

/**
 * O modelo em três dimensões.
 *
 * Chega por cima da prancha 2D que o abriu — é a mesma informação vista de
 * outro ângulo, não outra tela. Por isso sobe como modal e volta para onde
 * estava, em vez de empilhar na navegação.
 *
 * A sessão vem por parâmetro para que o modelo funcione tanto no relatório de
 * um treino antigo quanto no treino aberto agora. Sem parâmetro, mostra a
 * sessão em curso; sem nenhuma das duas, mostra o corpo em repouso, que ainda
 * é útil: dá para girar e estudar a anatomia sem ter treinado.
 */
export default function TelaCorpo() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const insets = useSafeAreaInsets();

  const { sessao: idSessao } = useLocalSearchParams<{ sessao?: string }>();
  const historico = useTreino((s) => s.historico);
  const ativa = useTreino((s) => s.ativa);

  const [tocado, setTocado] = useState<{ grupo: Grupo; nome: string } | null>(null);
  // `null` enquanto o `.glb` não respondeu. O modelo leva um instante para
  // chegar, e um instante sem nenhuma palavra lê como tela quebrada.
  const [fonte, setFonte] = useState<FonteDoModelo | null>(null);

  const musculos = useMemo(() => {
    const alvo = idSessao ? historico.find((h) => h.id === idSessao) : ativa;
    return alvo ? musculosDaSessao(alvo) : [];
  }, [idSessao, historico, ativa]);

  const intensidade = useMemo(() => {
    const m = new Map<Grupo, number>();
    for (const x of musculos) {
      // 'corpo' e 'cardio' não têm região no modelo; pintá-los seria inventar.
      if (x.grupo === 'corpo' || x.grupo === 'cardio') continue;
      m.set(x.grupo, x.fracao);
    }
    return m;
  }, [musculos]);

  const listados = musculos.filter((m) => m.grupo !== 'corpo' && m.grupo !== 'cardio');

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.fundo }}>
      <View style={[estilos.cabeca, { paddingTop: insets.top + sp.sm }]}>
        <BotaoGlifo glifo="fechar" tamanho={34} acessivel="Fechar" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Rotulo cor={c.tinta}>Musculatura</Rotulo>
        </View>
        <Rotulo cor={c.tintaFraca}>
          {listados.length ? `${listados.length} grupos` : 'em repouso'}
        </Rotulo>
      </View>
      <Regua peso="forte" style={{ marginHorizontal: margem.pagina }} />

      <View style={estilos.palco}>
        <Corpo3D
          intensidade={intensidade}
          paleta={c}
          onTocar={setTocado}
          onFonte={setFonte}
        />

        {/* Leitura do toque: fica sobre o modelo porque é resposta ao dedo,
            não conteúdo da página. Some sozinha ao tocar o vazio. */}
        <View style={estilos.leitura} pointerEvents="none">
          {tocado ? (
            <View style={estilos.balao}>
              <Tx v="heading" cor={c.tinta}>
                {tocado.nome}
              </Tx>
              <Rotulo cor={c.acento} style={{ marginTop: 2 }}>
                {GRUPO_LABEL[tocado.grupo]}
                {intensidade.has(tocado.grupo)
                  ? ` · ${Math.round(intensidade.get(tocado.grupo)! * 100)}% da sessão`
                  : ' · não trabalhado'}
              </Rotulo>
            </View>
          ) : fonte === null ? (
            <Rotulo cor={c.tintaFantasma}>Carregando a anatomia…</Rotulo>
          ) : fonte === 'reserva' ? (
            // Degradação visível de propósito: quem está olhando um esquema
            // precisa saber que é um esquema, e não que a anatomia é aquilo.
            <Rotulo cor={c.tintaFraca}>Anatomia indisponível · exibindo o esquema</Rotulo>
          ) : (
            <Rotulo cor={c.tintaFantasma}>Arraste para girar · pince para aproximar</Rotulo>
          )}
        </View>
      </View>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.lg }]}>
        <Regua peso="forte" />

        {/* A régua da rampa térmica. Sem ela a cor é decoração; com ela o
            usuário sabe que âmbar quer dizer "carga alta" e não "bonito". */}
        <View style={estilos.rampa}>
          <Rotulo cor={c.tintaFraca}>Carga</Rotulo>
          <View style={estilos.degraus}>
            {c.calor.map((cor, i) => (
              <View key={i} style={[estilos.degrau, { backgroundColor: cor }]} />
            ))}
          </View>
          <Rotulo cor={c.tintaFraca}>Alta</Rotulo>
        </View>

        {listados.length ? (
          <View style={estilos.lista}>
            {listados.map((m) => (
              <View key={m.grupo} style={estilos.item}>
                <View
                  style={[estilos.ponto, { backgroundColor: c.calor[nivelDeCalor(m.fracao)] }]}
                />
                <Tx v="small" cor={c.tintaMid} style={{ flex: 1 }} numberOfLines={1}>
                  {GRUPO_LABEL[m.grupo]}
                </Tx>
                <Tx v="numero" cor={c.tinta}>
                  {m.series.toFixed(1).replace('.', ',')}
                </Tx>
                <Rotulo cor={c.tintaFraca} style={{ width: 44 }}>
                  séries
                </Rotulo>
              </View>
            ))}
          </View>
        ) : (
          <Tx v="small" cor={c.tintaFraca} style={estilos.vazio}>
            Nenhuma série registrada ainda. Gire o modelo para estudar a anatomia.
          </Tx>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const usarEstilos = criarEstilos((c) => ({
  cabeca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: margem.pagina - sp.sm,
    paddingBottom: sp.md,
  },
  palco: { flex: 1, minHeight: 0 },
  leitura: {
    position: 'absolute',
    left: margem.pagina,
    right: margem.pagina,
    bottom: sp.lg,
    alignItems: 'center',
  },
  balao: {
    backgroundColor: c.fundoAlto,
    borderWidth: traco.normal,
    borderColor: c.acentoLinha,
    borderRadius: radius.lg,
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
    alignItems: 'center',
  },
  rodape: { paddingTop: 0 },
  rampa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingHorizontal: margem.pagina,
    paddingTop: sp.lg,
    paddingBottom: sp.md,
  },
  degraus: { flex: 1, flexDirection: 'row', gap: 2 },
  degrau: { flex: 1, height: 6, borderRadius: radius.sm },
  lista: { paddingHorizontal: margem.pagina, gap: sp.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: sp.md, height: 30 },
  ponto: { width: 10, height: 10, borderRadius: radius.sm },
  vazio: { paddingHorizontal: margem.pagina, paddingTop: sp.sm, maxWidth: 320 },
}));
