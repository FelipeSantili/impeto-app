import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import {
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { criarEstilos } from '@/design/tema';
import { radius, traco, type as typeScale } from '@/design/tokens';

const CampoAnimado = Animated.createAnimatedComponent(TextInput);
const SAIDA = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Número que sobe de zero até o valor final.
 *
 * Um `Text` comum não anima sem re-renderizar a cada quadro. Usamos um
 * `TextInput` desabilitado porque o Reanimated escreve direto na prop `text`
 * pela thread de UI, sem passar pelo JS — nenhuma re-renderização do React.
 */
export function Contador({
  valor,
  duracao = 1000,
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
  const estilos = usarEstilos();
  const p = useSharedValue(0);
  const reduzido = useReducedMotion();

  useEffect(() => {
    if (reduzido) {
      p.set(valor);
      return;
    }
    p.set(0);
    p.set(withDelay(atraso, withTiming(valor, { duration: duracao, easing: SAIDA })));
  }, [valor, duracao, atraso, reduzido, p]);

  const props = useAnimatedProps(() => {
    // Vírgula decimal, igual ao resto do app — `toFixed` sempre devolve ponto.
    const n = casas > 0 ? p.get().toFixed(casas).replace('.', ',') : String(Math.round(p.get()));
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

/** Barra que cresce até `fracao` (0..1). Retangular — é uma coluna impressa. */
export function BarraAnimada({
  fracao,
  atraso = 0,
  cor,
  altura = 10,
}: {
  fracao: number;
  atraso?: number;
  cor?: string;
  altura?: number;
}) {
  const estilos = usarEstilos();
  const p = useSharedValue(0);
  const reduzido = useReducedMotion();
  const alvo = Math.max(0, Math.min(1, fracao));

  useEffect(() => {
    if (reduzido) {
      p.set(alvo);
      return;
    }
    p.set(0);
    p.set(withDelay(atraso, withTiming(alvo, { duration: 800, easing: SAIDA })));
  }, [alvo, atraso, reduzido, p]);

  const estilo = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }));

  return (
    <View style={[estilos.trilho, { height: altura }]}>
      <Animated.View style={[{ height: altura, backgroundColor: cor }, estilo]} />
    </View>
  );
}

/**
 * Carimbo de treino concluído.
 *
 * Este é O momento de movimento do app — o único que tem licença para ser
 * expressivo, porque acontece uma vez por treino (a faixa "raro" do orçamento
 * de deleite). Antes havia aqui um anel de progresso que fechava com um check
 * no meio: a comemoração mais gerada que existe, e um anel fingindo ser
 * conteúdo.
 *
 * Agora é o que um livro de registro faz de verdade quando a página fecha: um
 * carimbo de borracha desce sobre o papel. Vem de perto (escala 1,7 → 1),
 * assenta com uma sobra mínima e crava torto, porque carimbo humano nunca sai
 * reto. O háptico dispara no quadro em que ele encosta, não quando a animação
 * termina — háptico atrasado lê como defeito, não como retorno.
 */
export function CarimboConcluido({
  texto = 'Concluído',
  detalhe,
  cor,
  atraso = 120,
}: {
  texto?: string;
  detalhe?: string;
  cor?: string;
  atraso?: number;
}) {
  const estilos = usarEstilos();
  const p = useSharedValue(0);
  const reduzido = useReducedMotion();

  useEffect(() => {
    if (reduzido) {
      p.set(withTiming(1, { duration: 200 }));
      return;
    }
    p.set(
      withDelay(
        atraso,
        withSpring(1, {
          duration: 520,
          dampingRatio: 0.68,
          // Sem isto o carimbo passa de 1 e cresce demais antes de assentar.
          overshootClamping: false,
        }),
      ),
    );
    const t = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      // O instante do impacto: quando a escala cruza o papel, não no fim.
      atraso + 180,
    );
    return () => clearTimeout(t);
  }, [atraso, reduzido, p]);

  const estilo = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: Math.min(1, v * 2.2),
      transform: [{ rotate: `${-3.5 * v}deg` }, { scale: 1.7 - 0.7 * v }],
    };
  });

  return (
    <Animated.View style={[estilos.carimbo, { borderColor: cor }, estilo]}>
      <View style={[estilos.carimboInterno, { borderColor: cor }]}>
        <Text style={[typeScale.carimbo, estilos.carimboTexto, { color: cor }]}>
          {texto.toUpperCase()}
        </Text>
        {detalhe ? (
          <Text style={[typeScale.coluna, estilos.carimboDetalhe, { color: cor }]}>
            {detalhe.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/**
 * Entrada discreta: sobe 10px e aparece.
 *
 * Sem escala. Escalar um bloco de texto na entrada é o tique de animação
 * genérica — e a mesma entrada repetida em toda seção da tela é o que o piso
 * de qualidade chama de "efeito espalhado" em vez de um momento autoral.
 * Aqui ela existe só onde há uma cascata curta e proposital.
 */
export function Entrada({
  atraso = 0,
  children,
  style,
}: {
  atraso?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useSharedValue(0);
  const reduzido = useReducedMotion();

  useEffect(() => {
    if (reduzido) {
      p.set(1);
      return;
    }
    p.set(withDelay(atraso, withTiming(1, { duration: 260, easing: SAIDA })));
  }, [atraso, reduzido, p]);

  const estilo = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * 10 }],
  }));

  return <Animated.View style={[estilo, style]}>{children}</Animated.View>;
}

const usarEstilos = criarEstilos((c) => ({
  contador: {
    ...typeScale.numeroG,
    color: c.tinta,
    padding: 0,
    margin: 0,
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
  },
  trilho: {
    flex: 1,
    backgroundColor: c.fundoBaixo,
    overflow: 'hidden',
  },
  carimbo: {
    alignSelf: 'center',
    borderWidth: 2.5,
    borderRadius: radius.sm,
    padding: 3,
  },
  carimboInterno: {
    borderWidth: traco.normal,
    borderRadius: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    gap: 2,
  },
  carimboTexto: { fontSize: 17, letterSpacing: 2.6 },
  carimboDetalhe: { fontSize: 10, letterSpacing: 1.6 },
}));
