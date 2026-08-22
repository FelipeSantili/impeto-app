import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tx } from '@/components/base';
import { abrirConfirmacao } from '@/components/folha';
import { color, radius, shadow, sp } from '@/design/tokens';
import { useAtualizacao } from '@/store/atualizacao';
import { useTreino } from '@/store/treino';

/**
 * Aviso de versão nova, fixo no topo.
 *
 * Só aparece quando a atualização já está baixada — assim o botão "Atualizar"
 * reinicia na hora, sem espera nem risco de falhar por falta de rede.
 */
export function AvisoAtualizacao() {
  const insets = useSafeAreaInsets();
  const estado = useAtualizacao((s) => s.estado);
  const adiada = useAtualizacao((s) => s.adiada);
  const aplicar = useAtualizacao((s) => s.aplicar);
  const adiar = useAtualizacao((s) => s.adiar);
  const treinoAberto = useTreino((s) => !!s.ativa);

  const visivel = (estado === 'pronta' || estado === 'aplicando') && !adiada;
  if (!visivel) return null;

  function confirmar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // O treino em andamento é salvo em disco e volta depois do reinício; só o
    // cronômetro de descanso, que vive em memória, se perde.
    if (treinoAberto) {
      abrirConfirmacao({
        titulo: 'Atualizar agora?',
        descricao:
          'Você tem um treino aberto. Ele será restaurado depois do reinício — só o cronômetro de descanso zera.',
        confirmar: 'Atualizar',
        onConfirmar: aplicar,
      });
      return;
    }
    aplicar();
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(280)}
      exiting={FadeOutUp.duration(200)}
      style={[estilos.faixa, shadow.floating, { top: insets.top + sp.sm }]}
    >
      <View style={estilos.icone}>
        <Ionicons name="arrow-down" size={14} color={color.accent} />
      </View>

      <View style={{ flex: 1, gap: 1 }}>
        <Tx v="smallMed">Nova versão pronta</Tx>
        <Tx v="caption" cor={color.textFaint} style={{ textTransform: 'none' }}>
          {estado === 'aplicando' ? 'Reiniciando…' : 'Atualize quando quiser'}
        </Tx>
      </View>

      <Pressable
        onPress={confirmar}
        disabled={estado === 'aplicando'}
        style={({ pressed }) => [estilos.botao, pressed && { opacity: 0.8 }]}
      >
        <Tx v="smallMed" cor={color.accentText}>
          Atualizar
        </Tx>
      </Pressable>

      <Pressable
        hitSlop={8}
        onPress={() => {
          Haptics.selectionAsync();
          adiar();
        }}
        disabled={estado === 'aplicando'}
      >
        <Ionicons name="close" size={16} color={color.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    position: 'absolute',
    left: sp.lg,
    right: sp.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: sp.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentLine,
    zIndex: 50,
  },
  icone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accentSoft,
  },
  botao: {
    height: 32,
    paddingHorizontal: sp.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accent,
  },
});
