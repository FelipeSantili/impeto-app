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
import { abrirConfirmacao } from '@/components/folha';
import { Glifo } from '@/components/glifos';
import { POR_ID } from '@/data/exercicios';
import { MODELO_POR_ID } from '@/data/modelos';
import { EQUIP_LABEL } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, sp } from '@/design/tokens';
import { useTreino } from '@/store/treino';

function fmtDescanso(seg: number) {
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
}

/** Detalhe de um modelo pronto: sequência completa + salvar / iniciar. */
export default function DetalheModelo() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entrada = MODELO_POR_ID[id ?? ''];

  const ativa = useTreino((s) => s.ativa);
  const salvarRotina = useTreino((s) => s.salvarRotina);
  const iniciarDeRotina = useTreino((s) => s.iniciarDeRotina);

  if (!entrada) {
    return (
      <View style={{ flex: 1, backgroundColor: c.fundo, paddingTop: insets.top + sp.sm }}>
        <View style={estilos.topo}>
          <BotaoGlifo glifo="voltar" acessivel="Voltar" onPress={() => router.back()} />
        </View>
        <Vazio titulo="Modelo não encontrado" />
      </View>
    );
  }

  const { modelo, programa } = entrada;
  const series = modelo.itens.reduce((t, i) => t + i.series, 0);

  function salvar(): string {
    return salvarRotina(modelo.nome, modelo.itens);
  }

  function usarModelo() {
    salvar();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Volta direto para o Início, onde a rotina recém-criada aparece.
    router.dismissAll();
  }

  function iniciarAgora() {
    if (ativa) {
      abrirConfirmacao({
        titulo: 'Treino em andamento',
        descricao: 'Finalize ou descarte o treino atual antes de começar outro.',
        confirmar: 'Ver treino',
        onConfirmar: () => router.push('/treino'),
      });
      return;
    }
    const rid = salvar();
    iniciarDeRotina(rid);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissAll();
    router.push('/treino');
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.xs }]}>
        <View style={{ marginLeft: -sp.sm }}>
          <BotaoGlifo glifo="voltar" acessivel="Voltar" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1 }} />
        <Rotulo cor={c.tintaFraca}>
          {programa.nome} · {programa.freq}
        </Rotulo>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: margem.pagina, paddingBottom: sp.lg }}>
          <Tx v="display">{modelo.nome}</Tx>
          <Tx v="body" cor={c.tintaMid} style={{ marginTop: sp.xs }}>
            {modelo.foco}
          </Tx>
        </View>
        <Regua peso="forte" cor={c.tinta} style={{ marginHorizontal: margem.pagina }} />

        <CabecaColuna>
          <Rotulo cor={c.tintaMid} style={{ width: margem.calha }}>
            Nº
          </Rotulo>
          <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
            Sequência
          </Rotulo>
          <Rotulo cor={c.tintaMid} style={{ width: 86, textAlign: 'right' }}>
            {modelo.itens.length} ex · {series} sér
          </Rotulo>
        </CabecaColuna>

        {modelo.itens.map((item, i) => {
          const ex = POR_ID[item.exId];
          return (
            <View key={`${item.exId}-${i}`}>
              <Pressavel
                onPress={() => router.push(`/exercicio/${item.exId}`)}
                escala={0.995}
                fundoPressionado={c.fundoBaixo}
                accessibilityRole="button"
                accessibilityLabel={ex?.nome ?? item.exId}
                style={estilos.linha}
              >
                <Tx v="numero" tab cor={c.tintaFantasma} style={{ width: margem.calha }}>
                  {i + 1}
                </Tx>
                <Miniatura ex={ex} tamanho={40} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Tx v="bodyMed" numberOfLines={1}>
                    {ex?.nome ?? item.exId}
                  </Tx>
                  <Tx v="small" cor={c.tintaFraca} numberOfLines={1}>
                    {ex ? EQUIP_LABEL[ex.equip] : ''} · descanso {fmtDescanso(item.descanso)}
                  </Tx>
                </View>
                <Tx v="numero" tab style={{ width: 46, textAlign: 'right' }}>
                  {item.series}
                  <Tx v="small" cor={c.tintaFraca}> sér</Tx>
                </Tx>
                <Glifo nome="avancar" tamanho={13} cor={c.tintaFantasma} />
              </Pressavel>
              <Regua />
            </View>
          );
        })}
      </ScrollView>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }]}>
        <Regua peso="forte" cor={c.tinta} />
        <View style={estilos.rodapeCorpo}>
          <Botao titulo="Salvar rotina" tom="contorno" grande onPress={usarModelo} style={{ flex: 1 }} />
          <Botao titulo="Iniciar agora" glifo="play" grande onPress={iniciarAgora} style={{ flex: 1 }} />
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
    paddingBottom: sp.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.fundo,
  },
  rodapeCorpo: {
    flexDirection: 'row',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingTop: sp.md,
  },
}));
