import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { quadroUrl } from '@/data/exercicios';
import type { Exercicio } from '@/data/types';
import { color, radius } from '@/design/tokens';

/** As fotos vêm sobre fundo claro; a placa clara faz isso parecer intencional. */
const PLACA = '#EFEEE9';

const HOLD = 780;
const FADE = 300;

/**
 * Demonstração animada do exercício.
 *
 * O free-exercise-db traz dois quadros por movimento — início e fim. Alternar
 * entre eles com uma pausa em cada extremo lê como o gesto real do exercício.
 */
export function Demo({
  ex,
  style,
  animar = true,
  raio = radius.xl,
}: {
  ex: Exercicio | undefined;
  style?: ViewStyle;
  animar?: boolean;
  raio?: number;
}) {
  const p = useSharedValue(0);
  const inicio = quadroUrl(ex, 0);
  const fim = quadroUrl(ex, 1);

  useEffect(() => {
    if (!animar || !fim) {
      p.value = 0;
      return;
    }
    p.value = withRepeat(
      withSequence(
        withDelay(HOLD, withTiming(1, { duration: FADE, easing: Easing.inOut(Easing.quad) })),
        withDelay(HOLD, withTiming(0, { duration: FADE, easing: Easing.inOut(Easing.quad) })),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, [animar, fim, p]);

  const estiloFim = useAnimatedStyle(() => ({ opacity: p.value }));

  if (!inicio) {
    return (
      <View style={[estilos.placa, { borderRadius: raio, backgroundColor: color.surface }, style]}>
        <Ionicons name="barbell-outline" size={30} color={color.textGhost} />
      </View>
    );
  }

  return (
    <View style={[estilos.placa, { borderRadius: raio }, style]}>
      <Image
        source={{ uri: inicio }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={220}
        cachePolicy="memory-disk"
      />
      {fim ? (
        <Animated.View style={[StyleSheet.absoluteFill, estiloFim]}>
          <Image
            source={{ uri: fim }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Miniatura estática usada nas listas — não anima, para a rolagem ficar leve. */
export function Miniatura({ ex, tamanho = 46 }: { ex: Exercicio | undefined; tamanho?: number }) {
  const uri = quadroUrl(ex, 0);
  return (
    <View
      style={[
        estilos.mini,
        { width: tamanho, height: tamanho, borderRadius: tamanho * 0.32 },
        !uri && { backgroundColor: color.surfaceHi },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
        />
      ) : (
        <Ionicons name="barbell-outline" size={tamanho * 0.42} color={color.textGhost} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  placa: {
    backgroundColor: PLACA,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mini: {
    backgroundColor: PLACA,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
