import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { color } from '@/design/tokens';

/**
 * Brilho radial — a única "luz" do app.
 * Vive atrás de títulos e momentos-chave; nunca compete com o conteúdo.
 */
export function Brilho({
  tamanho = 380,
  cor = color.accent,
  intensidade = 0.13,
  style,
}: {
  tamanho?: number;
  cor?: string;
  intensidade?: number;
  style?: StyleProp<ViewStyle>;
}) {
  // Cada instância precisa do seu gradiente — ids repetidos fazem um SVG
  // pintar com o gradiente de outro.
  const id = useId();
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      style={[{ position: 'absolute' }, style]}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={cor} stopOpacity={intensidade} />
          <Stop offset="55%" stopColor={cor} stopOpacity={intensidade * 0.35} />
          <Stop offset="100%" stopColor={cor} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={tamanho / 2} cy={tamanho / 2} r={tamanho / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/** Anel de progresso — usado no cronômetro de descanso. `progresso` em 0..1. */
export function Anel({
  tamanho = 34,
  espessura = 3,
  progresso,
  cor = color.accent,
  trilha = color.surfacePress,
}: {
  tamanho?: number;
  espessura?: number;
  progresso: number;
  cor?: string;
  trilha?: string;
}) {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progresso));
  return (
    <Svg width={tamanho} height={tamanho}>
      <Circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={r}
        stroke={trilha}
        strokeWidth={espessura}
        fill="none"
      />
      <Circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={r}
        stroke={cor}
        strokeWidth={espessura}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        strokeLinecap="round"
        transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
      />
    </Svg>
  );
}
