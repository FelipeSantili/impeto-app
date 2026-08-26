import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Botao,
  BotaoGlifo,
  CabecaColuna,
  Pressavel,
  Regua,
  Rotulo,
  Tx,
  Vazio,
} from '@/components/base';
import { Miniatura } from '@/components/demo';
import { Glifo } from '@/components/glifos';
import { POR_ID } from '@/data/exercicios';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, sp } from '@/design/tokens';
import { fmtData, fmtDuracaoCurta } from '@/lib/metricas';
import { useTreino } from '@/store/treino';

function fmtDescanso(seg: number) {
  return seg > 0 ? `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}` : '—';
}

/**
 * A ANTESSALA DA ROTINA.
 *
 * Existe por uma razão só: tocar numa rotina começava a contar o tempo. Um
 * toque errado na lista do Início abria uma sessão, o LED vermelho acendia e o
 * cronômetro já estava correndo — e treino que começou sozinho estraga o
 * histórico, porque duração é dado.
 *
 * Então a lista passa a ABRIR a rotina, e quem começa é o botão. Enquanto isso,
 * a tela paga o pedágio de existir sendo útil: mostra o que vem no dia, quantas
 * séries, o descanso de cada exercício e quando foi a última vez. É a conferida
 * que se faz no vestiário antes de entrar no salão.
 */
export default function IniciarRotina() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const rotinas = useTreino((s) => s.rotinas);
  const historico = useTreino((s) => s.historico);
  const ativa = useTreino((s) => s.ativa);
  const iniciarDeRotina = useTreino((s) => s.iniciarDeRotina);

  const rotina = rotinas.find((r) => r.id === id);

  if (!rotina) {
    return (
      <View style={{ flex: 1, backgroundColor: c.fundo, paddingTop: insets.top + sp.xs }}>
        <View style={estilos.topo}>
          <View style={{ marginLeft: -sp.sm }}>
            <BotaoGlifo glifo="fechar" acessivel="Fechar" onPress={() => router.back()} />
          </View>
        </View>
        <Vazio titulo="Rotina não encontrada" texto="Ela pode ter sido apagada." />
      </View>
    );
  }

  const series = rotina.itens.reduce((t, i) => t + i.series, 0);
  // Lido aqui, fora do closure: dentro de `iniciar` o TypeScript já não sabe
  // que a guarda acima descartou o `undefined`.
  const rotinaId = rotina.id;
  // O histórico já vem do mais novo para o mais velho: o primeiro que casar é
  // a última vez que esta rotina virou treino.
  const ultima = historico.find((h) => h.rotinaId === rotina.id);

  function iniciar() {
    // Com sessão aberta o botão diz outra coisa e leva para ela — o aviso acima
    // já explicou o porquê, então não cabe folha de confirmação em cima.
    if (ativa) {
      router.push('/treino');
      return;
    }
    iniciarDeRotina(rotinaId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // `replace`: voltar do treino cai no Início, não nesta antessala.
    router.replace('/treino');
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.xs }]}>
        <View style={{ marginLeft: -sp.sm }}>
          <BotaoGlifo glifo="fechar" acessivel="Fechar" onPress={() => router.back()} />
        </View>
        <Rotulo cor={c.tintaFraca} style={{ flex: 1 }}>
          Rotina
        </Rotulo>
        <BotaoGlifo
          glifo="lista"
          acessivel="Editar rotina"
          onPress={() => router.push(`/rotina/${rotina.id}`)}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: margem.pagina }}>
          <Tx v="display">{rotina.nome}</Tx>
          <Rotulo cor={c.tintaMid} style={{ marginTop: sp.sm }}>
            {rotina.itens.length} exercícios · {series} séries
          </Rotulo>
          {ultima ? (
            <Tx v="small" cor={c.tintaFraca} style={{ marginTop: sp.sm }}>
              Última vez em {fmtData(ultima.inicio)}
              {ultima.fim ? ` · ${fmtDuracaoCurta(ultima.fim - ultima.inicio)}` : ''}.
            </Tx>
          ) : (
            <Tx v="small" cor={c.tintaFraca} style={{ marginTop: sp.sm }}>
              Você ainda não treinou esta rotina.
            </Tx>
          )}
        </View>

        <View style={{ marginTop: sp.h1 }}>
          <CabecaColuna>
            <Rotulo cor={c.tintaMid} style={{ width: margem.calha }}>
              Nº
            </Rotulo>
            <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
              Exercício
            </Rotulo>
            <Rotulo cor={c.tintaMid} style={{ width: 52, textAlign: 'right' }}>
              Séries
            </Rotulo>
            <Rotulo cor={c.tintaMid} style={{ width: 54, textAlign: 'right' }}>
              Desc
            </Rotulo>
          </CabecaColuna>

          {rotina.itens.map((it, i) => {
            const ex = POR_ID[it.exId];
            return (
              <View key={`${it.exId}-${i}`}>
                <Pressavel
                  onPress={() => router.push(`/exercicio/${it.exId}`)}
                  escala={0.995}
                  fundoPressionado={c.fundoBaixo}
                  accessibilityLabel={`${ex?.nome ?? it.exId}, ${it.series} séries. Ver ficha.`}
                  style={estilos.item}
                >
                  <Tx v="numero" tab cor={c.tintaFantasma} style={{ width: margem.calha }}>
                    {i + 1}
                  </Tx>
                  <Miniatura ex={ex} tamanho={36} />
                  <View style={{ flex: 1 }}>
                    <Tx v="bodyMed" numberOfLines={1}>
                      {ex?.nome ?? it.exId}
                    </Tx>
                  </View>
                  <Tx v="numero" tab right style={{ width: 52 }}>
                    {it.series}
                  </Tx>
                  <Tx v="numero" tab right cor={c.tintaMid} style={{ width: 54 }}>
                    {fmtDescanso(it.descanso)}
                  </Tx>
                </Pressavel>
                <Regua />
              </View>
            );
          })}
        </View>

        {/*
          O aviso de sessão aberta vem ANTES do botão, não depois do toque: quem
          já tem treino correndo precisa saber disso olhando, não descobrindo.
        */}
        {ativa ? (
          <View style={estilos.aviso}>
            <Glifo nome="alerta" tamanho={15} cor={c.rec} />
            <Tx v="small" cor={c.tintaMid} style={{ flex: 1 }}>
              Existe um treino em andamento. Finalize ou descarte antes de começar esta rotina.
            </Tx>
          </View>
        ) : null}
      </ScrollView>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}>
        <Regua peso="forte" cor={c.tinta} />
        <View style={estilos.rodapeCorpo}>
          <Botao
            titulo={ativa ? 'Ver treino em andamento' : 'Iniciar treino'}
            glifo="play"
            grande
            haptico="medio"
            onPress={iniciar}
            style={{ flex: 1 }}
          />
        </View>
      </View>
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  aviso: {
    flexDirection: 'row',
    gap: sp.md,
    marginTop: sp.h1,
    marginHorizontal: margem.pagina,
    padding: sp.md,
    backgroundColor: c.recSuave,
    borderLeftWidth: 2,
    borderLeftColor: c.rec,
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
