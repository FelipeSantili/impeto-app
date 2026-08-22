import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { usarPaleta } from '@/design/tema';
import { traco } from '@/design/tokens';

/**
 * Régua de progresso.
 *
 * Substituiu o anel de progresso que havia aqui. Anel de progresso e brilho
 * radial eram as duas peças decorativas do app antigo, e as duas são
 * assinatura de interface gerada — anel fingindo ser conteúdo, halo colorido
 * fingindo ser profundidade. No mundo do caderno, progresso é uma régua que
 * encurta: a mesma régua que separa as seções, agora medindo.
 */
export function ReguaProgresso({
  fracao,
  cor,
  altura = 2,
  animar = false,
}: {
  fracao: number;
  cor?: string;
  altura?: number;
  animar?: boolean;
}) {
  const c = usarPaleta();
  const alvo = Math.max(0, Math.min(1, fracao));
  const p = useSharedValue(animar ? 0 : alvo);

  useEffect(() => {
    if (animar) {
      p.set(withTiming(alvo, { duration: 700, easing: Easing.out(Easing.cubic) }));
    } else {
      // O cronômetro atualiza a cada 250ms; animar cada passo faria a régua
      // parecer travada. Ela salta direto para a posição real.
      p.set(alvo);
    }
  }, [alvo, animar, p]);

  const estilo = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }));

  return (
    <View style={{ height: altura, backgroundColor: c.regua, overflow: 'hidden' }}>
      <Animated.View style={[{ height: altura, backgroundColor: cor }, estilo]} />
    </View>
  );
}

/** Moldura de prancha: o quadro impresso onde a demonstração vive. */
export function Prancha({ children, style }: { children?: React.ReactNode; style?: object }) {
  const c = usarPaleta();
  return (
    <View
      style={[
        {
          backgroundColor: c.fundoAlto,
          borderWidth: traco.normal,
          borderColor: c.reguaMid,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
