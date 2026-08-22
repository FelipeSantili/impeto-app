import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Tx } from '@/components/base';
import { Anel } from '@/components/decor';
import { color, radius, shadow, sp } from '@/design/tokens';
import { useDescanso } from '@/store/descanso';
import { fmtDuracao } from '@/lib/metricas';

/**
 * Barra de descanso flutuante.
 *
 * Aparece sozinha quando uma série é concluída e some quando o tempo acaba.
 * O anel à esquerda esvazia conforme o descanso passa.
 * `bottom` é passado pela tela para ela pousar acima da barra de ações.
 */
export function BarraDescanso({ bottom }: { bottom: number }) {
  const { alvo, total, somar, parar } = useDescanso();
  const [restante, setRestante] = useState(0);
  const avisou = useRef(false);

  useEffect(() => {
    if (!alvo) return;
    avisou.current = false;
    const tick = () => {
      const ms = alvo - Date.now();
      setRestante(Math.max(0, ms));
      if (ms <= 0 && !avisou.current) {
        avisou.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        parar();
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [alvo, parar]);

  if (!alvo) return null;

  const progresso = total > 0 ? Math.max(0, Math.min(1, restante / (total * 1000))) : 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      style={[estilos.barra, shadow.floating, { bottom }]}
    >
      <View style={estilos.anel}>
        <Anel tamanho={36} espessura={3} progresso={progresso} />
        <Ionicons name="timer-outline" size={14} color={color.textDim} style={estilos.anelIcone} />
      </View>

      <View style={{ flex: 1 }}>
        <Tx v="caption" cor={color.textFaint}>
          DESCANSO
        </Tx>
        <Tx v="heading" tab>
          {fmtDuracao(restante)}
        </Tx>
      </View>

      <Pressable
        hitSlop={10}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          somar(15);
        }}
        style={estilos.acao}
      >
        <Tx v="smallMed" cor={color.text}>
          +15s
        </Tx>
      </Pressable>
      <Pressable
        hitSlop={10}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          parar();
        }}
        style={estilos.acao}
      >
        <Tx v="smallMed" cor={color.textDim}>
          Pular
        </Tx>
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    position: 'absolute',
    left: sp.lg,
    right: sp.lg,
    height: 62,
    borderRadius: radius.xl,
    backgroundColor: color.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingHorizontal: sp.lg,
  },
  anel: { alignItems: 'center', justifyContent: 'center' },
  anelIcone: { position: 'absolute' },
  acao: {
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    borderRadius: radius.pill,
    backgroundColor: color.surfacePress,
  },
});
