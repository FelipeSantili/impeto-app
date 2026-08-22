import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Glifo } from '@/components/glifos';
import { quadroUrl } from '@/data/exercicios';
import type { Exercicio } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { radius, traco } from '@/design/tokens';

const HOLD = 780;
const FADE = 300;

/**
 * Demonstração do exercício, montada como PRANCHA de manual impresso:
 * moldura de régua, canto reto, fundo de papel.
 *
 * As fotos do free-exercise-db já vêm sobre fundo claro — o que era um
 * acidente no app escuro agora é coerência: a prancha e a página são o mesmo
 * papel.
 */
export function Demo({
  ex,
  style,
  animar = true,
  raio = radius.sm,
}: {
  ex: Exercicio | undefined;
  style?: ViewStyle;
  animar?: boolean;
  raio?: number;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const p = useSharedValue(0);
  const reduzido = useReducedMotion();
  const inicio = quadroUrl(ex, 0);
  const fim = quadroUrl(ex, 1);

  useEffect(() => {
    // Movimento reduzido: mostra o primeiro quadro parado. A demonstração
    // ainda informa; ela só deixa de alternar.
    if (!animar || !fim || reduzido) {
      p.set(0);
      return;
    }
    p.set(
      withRepeat(
        withSequence(
          withDelay(HOLD, withTiming(1, { duration: FADE, easing: Easing.inOut(Easing.quad) })),
          withDelay(HOLD, withTiming(0, { duration: FADE, easing: Easing.inOut(Easing.quad) })),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(p);
  }, [animar, fim, reduzido, p]);

  const estiloFim = useAnimatedStyle(() => ({ opacity: p.get() }));

  if (!inicio) {
    return (
      <View style={[estilos.prancha, { borderRadius: raio }, style]}>
        <Glifo nome="halter" tamanho={28} cor={c.tintaFantasma} />
      </View>
    );
  }

  return (
    <View style={[estilos.prancha, { borderRadius: raio }, style]}>
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

/** Miniatura estática das listas — não anima, para a rolagem ficar leve. */
export function Miniatura({ ex, tamanho = 44 }: { ex: Exercicio | undefined; tamanho?: number }) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const uri = quadroUrl(ex, 0);
  return (
    <View style={[estilos.prancha, { width: tamanho, height: tamanho, borderRadius: radius.sm }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
        />
      ) : (
        <Glifo nome="halter" tamanho={tamanho * 0.44} cor={c.tintaFantasma} />
      )}
    </View>
  );
}

const usarEstilos = criarEstilos((c) => ({
  prancha: {
    backgroundColor: c.fundoAlto,
    borderWidth: traco.normal,
    borderColor: c.reguaMid,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
