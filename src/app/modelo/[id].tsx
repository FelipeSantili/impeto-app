import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, BotaoIcone, Rotulo, Tx, Vazio } from '@/components/base';
import { abrirConfirmacao } from '@/components/folha';
import { Miniatura } from '@/components/demo';
import { POR_ID } from '@/data/exercicios';
import { MODELO_POR_ID } from '@/data/modelos';
import { EQUIP_LABEL } from '@/data/types';
import { color, radius, shadow, sp } from '@/design/tokens';
import { useTreino } from '@/store/treino';

/** Detalhe de um modelo pronto: lista completa + salvar / iniciar. */
export default function DetalheModelo() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entrada = MODELO_POR_ID[id ?? ''];

  const ativa = useTreino((s) => s.ativa);
  const salvarRotina = useTreino((s) => s.salvarRotina);
  const iniciarDeRotina = useTreino((s) => s.iniciarDeRotina);

  if (!entrada) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, paddingTop: insets.top + sp.sm }}>
        <View style={estilos.topo}>
          <BotaoIcone icone="chevron-back" onPress={() => router.back()} />
        </View>
        <Vazio icone="alert-circle-outline" titulo="Modelo não encontrado" />
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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.sm }]}>
        <BotaoIcone icone="chevron-back" onPress={() => router.back()} />
        <Tx v="caption" cor={color.textFaint} style={{ flex: 1, textAlign: 'center' }}>
          {programa.nome.toUpperCase()} · {programa.freq.toUpperCase()}
        </Tx>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: sp.xl, paddingBottom: insets.bottom + 150 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(280)}>
          <Tx v="title" style={{ marginTop: sp.sm }}>
            {modelo.nome}
          </Tx>
          <Tx v="body" cor={color.textFaint} style={{ marginTop: sp.xs }}>
            {modelo.foco}
          </Tx>
          <Tx v="caption" cor={color.textGhost} style={{ marginTop: sp.md }}>
            {modelo.itens.length} EXERCÍCIOS · {series} SÉRIES
          </Tx>
        </Animated.View>

        <View style={{ marginTop: sp.xl }}>
          <Rotulo>Sequência</Rotulo>
          <View style={{ marginTop: sp.sm }}>
            {modelo.itens.map((item, i) => {
              const ex = POR_ID[item.exId];
              return (
                <Animated.View key={`${item.exId}-${i}`} entering={FadeInDown.delay(50 + i * 35).duration(260)}>
                  <Pressable
                    onPress={() => router.push(`/exercicio/${item.exId}`)}
                    style={({ pressed }) => [estilos.linha, pressed && { opacity: 0.6 }]}
                  >
                    <Tx v="caption" tab cor={color.textGhost} style={{ width: 20 }}>
                      {String(i + 1).padStart(2, '0')}
                    </Tx>
                    <Miniatura ex={ex} tamanho={42} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Tx v="bodyMed" numberOfLines={1}>
                        {ex?.nome ?? item.exId}
                      </Tx>
                      <Tx v="small" cor={color.textFaint} numberOfLines={1}>
                        {ex ? EQUIP_LABEL[ex.equip] : ''} · {item.series}{' '}
                        {item.series === 1 ? 'série' : 'séries'} · descanso{' '}
                        {Math.floor(item.descanso / 60)}:{String(item.descanso % 60).padStart(2, '0')}
                      </Tx>
                    </View>
                    <Ionicons name="chevron-forward" size={15} color={color.textGhost} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[estilos.rodape, { paddingBottom: insets.bottom + sp.md }, shadow.soft]}>
        <Botao titulo="Salvar rotina" tom="contorno" onPress={usarModelo} style={{ flex: 1 }} />
        <Botao titulo="Iniciar agora" icone="play" onPress={iniciarAgora} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingBottom: sp.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
  rodape: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: sp.sm,
    paddingHorizontal: sp.xl,
    paddingTop: sp.md,
    backgroundColor: color.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
