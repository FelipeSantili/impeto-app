import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, shadow, sp, type as typeScale } from '@/design/tokens';

// ───────────────────────────────  Texto  ───────────────────────────────

type Variante = keyof typeof typeScale;

interface TxProps extends TextProps {
  v?: Variante;
  cor?: string;
  center?: boolean;
  /** Ativa numerais tabulares — obrigatório em qualquer coluna de números. */
  tab?: boolean;
}

export function Tx({ v = 'body', cor = color.text, center, tab, style, ...rest }: TxProps) {
  return (
    <Text
      // Boa parte da interface tem altura fixa (linhas de série, abas, pílulas).
      // Sem teto, a fonte grande do sistema quebra esses layouts. 1.4 ainda
      // acomoda quem aumenta a fonte, sem estourar as caixas.
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        typeScale[v],
        { color: cor },
        center && { textAlign: 'center' },
        tab && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}

/** Rótulo miúdo em caixa alta — usado nos cabeçalhos de seção e colunas. */
export function Rotulo({
  children,
  cor = color.textFaint,
  style,
}: {
  children: ReactNode;
  cor?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      numberOfLines={1}
      maxFontSizeMultiplier={1.3}
      style={[typeScale.caption, { color: cor, textTransform: 'uppercase' }, style]}
    >
      {children}
    </Text>
  );
}

// ───────────────────────────────  Botões  ──────────────────────────────

type Tom = 'primario' | 'suave' | 'fantasma' | 'perigo' | 'contorno';

interface BotaoProps extends Omit<PressableProps, 'style' | 'children'> {
  titulo: string;
  tom?: Tom;
  icone?: keyof typeof Ionicons.glyphMap;
  grande?: boolean;
  carregando?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONS: Record<Tom, { fundo: string; texto: string; borda?: string }> = {
  // O primário é o único elemento verde-limão de peso na tela — é a assinatura.
  primario: { fundo: color.accent, texto: color.accentText },
  suave: { fundo: color.surfaceHi, texto: color.text },
  fantasma: { fundo: 'transparent', texto: color.textDim },
  perigo: { fundo: color.dangerSoft, texto: color.danger },
  contorno: { fundo: 'transparent', texto: color.text, borda: color.lineMid },
};

export function Botao({
  titulo,
  tom = 'primario',
  icone,
  grande,
  carregando,
  style,
  disabled,
  onPress,
  ...rest
}: BotaoProps) {
  const t = TONS[tom];
  return (
    <Pressable
      {...rest}
      disabled={disabled || carregando}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        estilos.botao,
        {
          backgroundColor: t.fundo,
          borderColor: t.borda ?? 'transparent',
          borderWidth: t.borda ? StyleSheet.hairlineWidth * 2 : 0,
          height: grande ? 58 : 46,
          paddingHorizontal: grande ? sp.xxl : sp.lg,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        grande && tom === 'primario' && !disabled ? shadow.glow : null,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={t.texto} size="small" />
      ) : (
        <>
          {icone ? <Ionicons name={icone} size={grande ? 19 : 16} color={t.texto} /> : null}
          {/*
            O botão tem altura fixa, então o rótulo nunca pode quebrar linha: com
            fonte grande do sistema ele empilharia dentro da pílula e sairia do
            centro. Uma linha só, encolhendo se precisar.
          */}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[
              grande ? typeScale.heading : typeScale.bodyMed,
              { color: t.texto, letterSpacing: -0.3, flexShrink: 1 },
            ]}
          >
            {titulo}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Botão circular só com ícone — o formato padrão dos cantos da tela. */
export function BotaoIcone({
  icone,
  onPress,
  cor = color.textDim,
  fundo = 'transparent',
  tamanho = 40,
  disabled,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  cor?: string;
  fundo?: string;
  tamanho?: number;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => ({
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fundo,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icone} size={tamanho * 0.48} color={cor} />
    </Pressable>
  );
}

/** Pílula de filtro. */
export function Chip({
  texto,
  ativo,
  onPress,
}: {
  texto: string;
  ativo?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        estilos.chip,
        {
          backgroundColor: ativo ? color.text : color.surface,
          borderColor: ativo ? color.text : color.line,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[typeScale.smallMed, { color: ativo ? color.bg : color.textDim }]}
        numberOfLines={1}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

// ───────────────────────────────  Layout  ──────────────────────────────

export function Tela({
  children,
  scroll,
  style,
  padTopo = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  padTopo?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const base: ViewStyle = { flex: 1, backgroundColor: color.bg };
  const pad: ViewStyle = { paddingTop: padTopo ? insets.top + sp.sm : 0 };

  if (scroll) {
    return (
      <View style={[base, style]}>
        <ScrollView
          contentContainerStyle={[pad, { paddingBottom: insets.bottom + 120 }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }
  return <View style={[base, pad, style]}>{children}</View>;
}

export function Cartao({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const conteudo = <View style={[estilos.cartao, style]}>{children}</View>;
  if (!onPress) return conteudo;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {conteudo}
    </Pressable>
  );
}

export function Divisor({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color.line }, style]} />;
}

/** Cabeçalho de tela: título centralizado com ações opcionais nas laterais. */
export function Cabecalho({
  titulo,
  esquerda,
  direita,
  subtitulo,
}: {
  titulo?: string;
  subtitulo?: string;
  esquerda?: ReactNode;
  direita?: ReactNode;
}) {
  return (
    <View style={estilos.cabecalho}>
      <View style={estilos.cabecalhoLado}>{esquerda}</View>
      <View style={estilos.cabecalhoCentro}>
        {titulo ? (
          <Tx v="bodyMed" center numberOfLines={1}>
            {titulo}
          </Tx>
        ) : null}
        {subtitulo ? (
          <Tx v="caption" cor={color.textFaint} center>
            {subtitulo}
          </Tx>
        ) : null}
      </View>
      <View style={[estilos.cabecalhoLado, { alignItems: 'flex-end' }]}>{direita}</View>
    </View>
  );
}

/** Estado vazio centralizado — a mesma forma em todas as listas. */
export function Vazio({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}) {
  return (
    <View style={estilos.vazio}>
      <View style={estilos.vazioIcone}>
        <Ionicons name={icone} size={22} color={color.textFaint} />
      </View>
      <Tx v="heading" center>
        {titulo}
      </Tx>
      {texto ? (
        <Tx v="small" cor={color.textFaint} center style={{ maxWidth: 260 }}>
          {texto}
        </Tx>
      ) : null}
      {acao ? <View style={{ marginTop: sp.sm }}>{acao}</View> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    borderRadius: radius.pill,
  },
  chip: {
    height: 34,
    paddingHorizontal: sp.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartao: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
    padding: sp.xl,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: sp.md,
  },
  cabecalhoLado: { width: 84, justifyContent: 'center' },
  cabecalhoCentro: { flex: 1, alignItems: 'center', gap: 2 },
  vazio: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    paddingVertical: sp.h4,
    paddingHorizontal: sp.xxl,
  },
  vazioIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
    marginBottom: sp.xs,
  },
});
