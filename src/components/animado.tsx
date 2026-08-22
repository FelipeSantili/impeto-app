import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { color, type as typeScale } from '@/design/tokens';

const CampoAnimado = Animated.createAnimatedComponent(TextInput);
const CirculoAnimado = Animated.createAnimatedComponent(Circle);

/**
 * Número que sobe de zero até o valor final.
 *
 * Um `Text` comum não anima sem re-renderizar a cada quadro. Usamos um
 * `TextInput` desabilitado porque o Reanimated consegue escrever direto na sua
 * prop `text` pela UI thread, sem passar pelo JS.
 */
export function Contador({
  valor,
  duracao = 1100,
  atraso = 0,
  casas = 0,
  prefixo = '',
  sufixo = '',
  style,
}: {
  valor: number;
  duracao?: number;
  atraso?: number;
  casas?: number;
  prefixo?: string;
  sufixo?: string;
  style?: StyleProp<TextStyle>;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(
      atraso,
      withTiming(valor, { duration: duracao, easing: Easing.out(Easing.cubic) }),
    );
  }, [valor, duracao, atraso, p]);

  const props = useAnimatedProps(() => {
    const n = casas > 0 ? p.value.toFixed(casas) : String(Math.round(p.value));
    return { text: `${prefixo}${n}${sufixo}` } as never;
  });

  return (
    <CampoAnimado
      editable={false}
      // Sem valor inicial o campo pisca vazio antes do primeiro quadro.
      defaultValue={`${prefixo}${casas > 0 ? (0).toFixed(casas) : '0'}${sufixo}`}
      animatedProps={props}
      style={[estilos.contador, style]}
      pointerEvents="none"
    />
  );
}

/** Barra horizontal que cresce até `fracao` (0..1). */
export function BarraAnimada({
  fracao,
  atraso = 0,
  cor = color.accent,
  altura = 8,
}: {
  fracao: number;
  atraso?: number;
  cor?: string;
  altura?: number;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(
      atraso,
      withTiming(Math.max(0, Math.min(1, fracao)), {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [fracao, atraso, p]);

  const estilo = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <View style={[estilos.trilho, { height: altura, borderRadius: altura / 2 }]}>
      <Animated.View
        style={[{ height: altura, borderRadius: altura / 2, backgroundColor: cor }, estilo]}
      />
    </View>
  );
}

/**
 * Selo de treino concluído: o anel se fecha e o check entra com um salto.
 * É o primeiro elemento do relatório — dá o tom de recompensa.
 */
export function SeloConcluido({ tamanho = 92 }: { tamanho?: number }) {
  const traco = 4;
  const r = (tamanho - traco) / 2;
  const circunferencia = 2 * Math.PI * r;

  const anel = useSharedValue(0);
  const check = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    anel.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) });
    check.value = withDelay(520, withSpring(1, { damping: 9, stiffness: 150 }));
    halo.value = withDelay(
      520,
      withSequence(
        withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 620, easing: Easing.in(Easing.quad) }),
      ),
    );
  }, [anel, check, halo]);

  const propsAnel = useAnimatedProps(() => ({
    strokeDashoffset: circunferencia * (1 - anel.value),
  }));

  const estiloCheck = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: check.value }],
  }));

  const estiloHalo = useAnimatedStyle(() => ({
    opacity: halo.value * 0.5,
    transform: [{ scale: 1 + halo.value * 0.55 }],
  }));

  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          estilos.halo,
          { width: tamanho, height: tamanho, borderRadius: tamanho / 2 },
          estiloHalo,
        ]}
      />
      <Svg width={tamanho} height={tamanho} style={StyleSheet.absoluteFill}>
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          stroke={color.surfaceHi}
          strokeWidth={traco}
          fill="none"
        />
        <CirculoAnimado
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          stroke={color.accent}
          strokeWidth={traco}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          animatedProps={propsAnel}
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </Svg>
      <Animated.View style={estiloCheck}>
        <Ionicons name="checkmark" size={tamanho * 0.42} color={color.accent} />
      </Animated.View>
    </View>
  );
}

/** Cartão que entra deslizando e com leve escala. Usado nas métricas do topo. */
export function EntradaCartao({
  atraso = 0,
  children,
  style,
}: {
  atraso?: number;
  children: React.ReactNode;
  style?: StyleProp<import('react-native').ViewStyle>;
}) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(atraso, withSpring(1, { damping: 16, stiffness: 120 }));
  }, [atraso, p]);

  const estilo = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * 18 }, { scale: 0.96 + p.value * 0.04 }],
  }));

  return <Animated.View style={[estilo, style]}>{children}</Animated.View>;
}

const estilos = StyleSheet.create({
  contador: {
    ...typeScale.title,
    color: color.text,
    padding: 0,
    margin: 0,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  trilho: {
    flex: 1,
    backgroundColor: color.surfaceHi,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    backgroundColor: color.accentSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentLine,
  },
});
