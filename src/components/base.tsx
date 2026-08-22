import * as Haptics from 'expo-haptics';
import type { ReactNode, Ref } from 'react';
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
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glifo, type NomeGlifo } from '@/components/glifos';
import { color, margem, motion, radius, sp, traco, type as typeScale } from '@/design/tokens';

/**
 * Vocabulário do caderno.
 *
 * Não existe `Cartao` aqui, e isso é deliberado: cartão é o recipiente
 * preguiçoso, e empilhar cartões foi o que deu ao app a cara genérica. Uma
 * página de livro-caixa separa por RÉGUA e por espaço. As peças abaixo são
 * seção, linha, cabeçalho de coluna e régua — nada flutua, nada tem sombra.
 */

// ───────────────────────────────  Texto  ───────────────────────────────

type Variante = keyof typeof typeScale;

interface TxProps extends TextProps {
  v?: Variante;
  cor?: string;
  center?: boolean;
  right?: boolean;
  /** Numerais tabulares — obrigatório em qualquer coluna de números. */
  tab?: boolean;
  alta?: boolean;
}

export function Tx({
  v = 'body',
  cor = color.tinta,
  center,
  right,
  tab,
  alta,
  style,
  ...rest
}: TxProps) {
  return (
    <Text
      // Boa parte da interface tem altura fixa (linhas de série, colunas).
      // Sem teto, a fonte grande do sistema quebra esses layouts.
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        typeScale[v],
        { color: cor },
        center && { textAlign: 'center' },
        right && { textAlign: 'right' },
        tab && { fontVariant: ['tabular-nums'] },
        alta && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}

/**
 * Carimbo: rótulo de seção, sigla, marca. Sempre caixa alta e destravado.
 * É o que um formulário impresso usa para nomear um campo.
 */
export function Rotulo({
  children,
  cor = color.tintaFraca,
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
      style={[typeScale.carimbo, { color: cor, textTransform: 'uppercase' }, style]}
    >
      {children}
    </Text>
  );
}

/** Pontilhado de campo não preenchido. Decoração — nunca carrega significado. */
export function Pontilhado({ largura = 34 }: { largura?: number }) {
  return (
    <Text
      style={[typeScale.numero, { color: color.tintaFantasma, width: largura, textAlign: 'center' }]}
      numberOfLines={1}
    >
      ·····
    </Text>
  );
}

// ───────────────────────────────  Toque  ───────────────────────────────

const SAIDA = Easing.bezier(0.23, 1, 0.32, 1);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Haptico = 'selecao' | 'leve' | 'medio' | 'sucesso' | 'erro';

function bater(h: Haptico) {
  switch (h) {
    case 'selecao':
      return Haptics.selectionAsync();
    case 'leve':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'medio':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'sucesso':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'erro':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

interface PressavelProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Repassado ao Pressable — o `TabTrigger asChild` injeta um ref nas abas. */
  ref?: Ref<View>;
  /**
   * Cor de fundo em repouso. Precisa vir por aqui, e não dentro de `style`,
   * quando houver `fundoPressionado`: a transição entre as duas é interpolada
   * na thread de UI e o ponto de partida tem que ser conhecido.
   */
  fundo?: string;
  /** Fundo aplicado enquanto o dedo está em cima. */
  fundoPressionado?: string;
  escala?: number;
  /**
   * Retorno tátil. Sem valor não vibra: háptico em toda navegação vira ruído e
   * o usuário desliga no sistema. Fica reservado para o que confirma algo.
   */
  haptico?: Haptico;
  children?: ReactNode;
}

/**
 * Pressionável do app.
 *
 * Existe para que o retorno ao toque seja um só, correto, em um lugar só:
 * escala 0,97 em 110ms com ease-out forte, na thread de UI. Opacidade sozinha
 * — que era o que o app usava — lê como morto, porque nada no mundo físico
 * fica translúcido quando você aperta.
 */
export function Pressavel({
  style,
  fundo,
  fundoPressionado,
  escala = 0.97,
  haptico,
  onPress,
  disabled,
  children,
  ref,
  ...rest
}: PressavelProps) {
  const p = useSharedValue(0);
  const animado = useAnimatedStyle(() => {
    const v = p.get();
    return {
      transform: [{ scale: 1 - v * (1 - escala) }],
      ...(fundoPressionado
        ? {
            backgroundColor: interpolateColor(
              v,
              [0, 1],
              [fundo ?? 'transparent', fundoPressionado],
            ),
          }
        : fundo
          ? { backgroundColor: fundo }
          : null),
    };
  });

  return (
    <AnimatedPressable
      {...rest}
      ref={ref}
      disabled={disabled}
      // O retorno começa no press-in: esperar o toque completar para mostrar
      // algo é exatamente a latência que o usuário percebe.
      onPressIn={(e) => {
        p.set(withTiming(1, { duration: motion.toque, easing: SAIDA }));
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.set(withTiming(0, { duration: motion.toque, easing: SAIDA }));
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptico) bater(haptico);
        onPress?.(e);
      }}
      // Um dedo que escorrega alguns pixels não deve cancelar um toque
      // que o usuário quis dar.
      pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
      // Array simples, nunca a forma de função do Pressable: dentro de um
      // componente animado do Reanimated, o `style={({pressed}) => …}` é
      // descartado inteiro — o botão perde fundo, direção e espaçamento e só
      // sobra o texto. O estado de toque vive na `useAnimatedStyle` acima.
      style={[style, disabled ? { opacity: 0.35 } : null, animado]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ───────────────────────────────  Botões  ──────────────────────────────

type Tom = 'tinta' | 'contorno' | 'texto' | 'perigo';

interface BotaoProps extends Omit<PressableProps, 'style' | 'children'> {
  titulo: string;
  tom?: Tom;
  glifo?: NomeGlifo;
  grande?: boolean;
  carregando?: boolean;
  haptico?: Haptico;
  style?: StyleProp<ViewStyle>;
}

const TONS: Record<Tom, { fundo: string; tinta: string; borda?: string }> = {
  // A ação primária é uma BARRA CHEIA de tinta azul, retangular. É a massa de
  // tinta que impede a página de ficar mole — e o único preenchimento saturado
  // da tela.
  tinta: { fundo: color.azul, tinta: color.azulTexto },
  contorno: { fundo: 'transparent', tinta: color.tinta, borda: color.reguaForte },
  texto: { fundo: 'transparent', tinta: color.tintaMid },
  perigo: { fundo: 'transparent', tinta: color.vermelho, borda: color.vermelhoLinha },
};

export function Botao({
  titulo,
  tom = 'tinta',
  glifo,
  grande,
  carregando,
  haptico = 'leve',
  style,
  disabled,
  ...rest
}: BotaoProps) {
  const t = TONS[tom];
  return (
    <Pressavel
      {...rest}
      haptico={haptico}
      disabled={disabled || carregando}
      style={[
        estilos.botao,
        {
          backgroundColor: t.fundo,
          borderColor: t.borda ?? 'transparent',
          borderWidth: t.borda ? traco.normal : 0,
          height: grande ? 54 : 44,
          paddingHorizontal: grande ? sp.xxl : sp.lg,
        },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={t.tinta} size="small" />
      ) : (
        <>
          {glifo ? <Glifo nome={glifo} tamanho={grande ? 19 : 16} cor={t.tinta} /> : null}
          {/*
            Rótulo em condensada carimbada. Além de ser a voz do formulário,
            resolve de forma estrutural o bug antigo do "Concluir / Treino"
            quebrando em duas linhas: condensada + uma linha só + teto de
            escala cabe em qualquer ajuste de fonte do sistema.
          */}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.25}
            style={[
              typeScale.carimbo,
              {
                color: t.tinta,
                fontSize: grande ? 15 : 13,
                letterSpacing: grande ? 1.8 : 1.4,
                textTransform: 'uppercase',
                flexShrink: 1,
              },
            ]}
          >
            {titulo}
          </Text>
        </>
      )}
    </Pressavel>
  );
}

/**
 * Botão só de marca. Quadrado, não redondo: o círculo com ícone dentro é o
 * componente mais gerado do mundo e foi um dos motivos da cara de template.
 */
export function BotaoGlifo({
  glifo,
  onPress,
  cor = color.tintaMid,
  tamanho = 40,
  disabled,
  haptico,
  acessivel,
}: {
  glifo: NomeGlifo;
  onPress?: () => void;
  cor?: string;
  tamanho?: number;
  disabled?: boolean;
  haptico?: Haptico;
  acessivel?: string;
}) {
  return (
    <Pressavel
      disabled={disabled}
      haptico={haptico}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={acessivel}
      // Alvo de 48dp mesmo quando a marca é menor — o app é usado com uma mão
      // só, às vezes com a mão suada.
      hitSlop={Math.max(0, (48 - tamanho) / 2)}
      style={{
        width: tamanho,
        height: tamanho,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Glifo nome={glifo} tamanho={Math.round(tamanho * 0.52)} cor={cor} />
    </Pressavel>
  );
}

/** Filtro. Caixa de formulário, não pílula. O ativo é preenchido a tinta. */
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
    <Pressavel
      haptico="selecao"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      style={[
        estilos.chip,
        {
          backgroundColor: ativo ? color.tinta : 'transparent',
          borderColor: ativo ? color.tinta : color.reguaMid,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.25}
        style={[
          typeScale.coluna,
          { color: ativo ? color.papel : color.tintaMid, textTransform: 'uppercase' },
        ]}
      >
        {texto}
      </Text>
    </Pressavel>
  );
}

// ───────────────────────────────  Página  ──────────────────────────────

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
  const base: ViewStyle = { flex: 1, backgroundColor: color.papel };
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

/** Régua. Substitui a borda de cartão como separador do app inteiro. */
export function Regua({
  peso = 'fina',
  cor,
  style,
}: {
  peso?: keyof typeof traco;
  cor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const forte = peso === 'forte';
  return (
    <View
      style={[
        {
          height: traco[peso],
          backgroundColor: cor ?? (forte ? color.reguaForte : color.regua),
        },
        style,
      ]}
    />
  );
}

/**
 * Cabeçalho de seção sobre régua forte.
 *
 * Esta é a única estrutura de agrupamento do app. Onde antes havia um cartão
 * com borda e cantos, agora há um carimbo, uma régua e o conteúdo abaixo dela.
 */
export function Secao({
  titulo,
  direita,
  children,
  style,
  espaco = sp.h1,
}: {
  titulo?: string;
  direita?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  espaco?: number;
}) {
  return (
    <View style={[{ marginTop: espaco }, style]}>
      {titulo || direita ? (
        <View style={estilos.secaoTopo}>
          {titulo ? <Rotulo cor={color.tintaMid}>{titulo}</Rotulo> : <View />}
          {direita}
        </View>
      ) : null}
      <Regua peso="forte" />
      {children}
    </View>
  );
}

/**
 * Linha do livro-caixa.
 *
 * `calha` é a margem esquerda reservada: é onde vive o ordinal, a barra da
 * linha ativa e o carimbo de recorde. Todas as telas registram contra ela, o
 * que dá ao app uma espinha vertical única em vez de composições soltas.
 */
export function Linha({
  calha,
  children,
  direita,
  onPress,
  onLongPress,
  ativa,
  feita,
  style,
  acessivel,
}: {
  calha?: ReactNode;
  children: ReactNode;
  direita?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  ativa?: boolean;
  feita?: boolean;
  style?: StyleProp<ViewStyle>;
  acessivel?: string;
}) {
  const repouso = ativa ? color.azulSuave : feita ? color.papelAlto : undefined;

  const conteudo = (
    <>
      {/* Barra de tinta na margem: a marca de "é aqui que você está". */}
      {ativa ? <View style={estilos.barraAtiva} /> : null}
      <View style={estilos.calha}>{calha}</View>
      <View style={{ flex: 1, justifyContent: 'center' }}>{children}</View>
      {direita ? <View style={estilos.linhaDireita}>{direita}</View> : null}
    </>
  );

  if (!onPress && !onLongPress) {
    return (
      <View style={[estilos.linha, repouso ? { backgroundColor: repouso } : null, style]}>
        {conteudo}
      </View>
    );
  }

  // O pressionável É a linha, não um invólucro: se ele envolvesse uma View com
  // fundo próprio, o fundo do toque ficaria escondido atrás dela.
  return (
    <Pressavel
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={acessivel}
      fundo={repouso}
      fundoPressionado={color.papelBaixo}
      escala={0.995}
      style={[estilos.linha, style]}
    >
      {conteudo}
    </Pressavel>
  );
}

/**
 * Cabeçalho de coluna: faixa mais escura, rótulos condensados, régua embaixo.
 * É o que transforma uma lista de valores em uma tabela lida de relance.
 */
export function CabecaColuna({ children }: { children: ReactNode }) {
  return (
    <View>
      <View style={estilos.cabecaColuna}>{children}</View>
      <Regua peso="normal" cor={color.reguaMid} />
    </View>
  );
}

/**
 * Cabeçalho de tela.
 *
 * Alinhado à esquerda, com a meta carimbada à direita na mesma linha de base.
 * O título centralizado que havia antes é simétrico e sem tensão — e simetria
 * total foi um dos itens da auditoria.
 */
export function Cabecalho({
  titulo,
  meta,
  esquerda,
  direita,
  semRegua,
}: {
  titulo?: string;
  meta?: string;
  esquerda?: ReactNode;
  direita?: ReactNode;
  semRegua?: boolean;
}) {
  return (
    <View>
      <View style={estilos.cabecalho}>
        {esquerda ? <View style={{ marginLeft: -sp.sm }}>{esquerda}</View> : null}
        <View style={{ flex: 1 }}>
          {titulo ? (
            <Tx v="title" numberOfLines={1}>
              {titulo}
            </Tx>
          ) : null}
        </View>
        {meta ? <Rotulo cor={color.tintaFraca}>{meta}</Rotulo> : null}
        {direita}
      </View>
      {semRegua ? null : <Regua peso="forte" style={{ marginHorizontal: margem.pagina }} />}
    </View>
  );
}

/**
 * Estado vazio: um formulário em branco, não uma ilustração.
 * Sem a marca dentro de um círculo tingido — esse componente foi um dos
 * maiores denunciadores de interface gerada.
 */
export function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}) {
  return (
    <View style={estilos.vazio}>
      <Regua peso="normal" cor={color.reguaMid} style={{ width: 28 }} />
      <Tx v="heading" style={{ marginTop: sp.lg }}>
        {titulo}
      </Tx>
      {texto ? (
        <Tx v="small" cor={color.tintaFraca} style={{ marginTop: sp.xs, maxWidth: 300 }}>
          {texto}
        </Tx>
      ) : null}
      {acao ? <View style={{ marginTop: sp.xl, alignSelf: 'stretch' }}>{acao}</View> : null}
    </View>
  );
}

/** Carimbo vermelho: recorde, alerta, correção. */
export function Carimbo({ texto, cor = color.vermelho }: { texto: string; cor?: string }) {
  return (
    <View style={[estilos.carimbo, { borderColor: cor }]}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        style={[typeScale.carimbo, { color: cor, fontSize: 10, textTransform: 'uppercase' }]}
      >
        {texto}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    borderRadius: radius.md,
  },
  chip: {
    height: 34,
    paddingHorizontal: sp.md,
    borderRadius: radius.sm,
    borderWidth: traco.normal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secaoTopo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: margem.pagina,
    marginBottom: sp.sm,
    minHeight: 22,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingRight: margem.pagina,
    paddingLeft: margem.pagina,
  },
  barraAtiva: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: color.tinta,
  },
  calha: { width: margem.calha, justifyContent: 'center' },
  linhaDireita: { alignItems: 'flex-end', justifyContent: 'center' },
  cabecaColuna: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    paddingHorizontal: margem.pagina,
    backgroundColor: color.papelBaixo,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    minHeight: 52,
    paddingHorizontal: margem.pagina,
  },
  vazio: {
    alignItems: 'flex-start',
    paddingVertical: sp.h2,
    paddingHorizontal: margem.pagina,
  },
  carimbo: {
    alignSelf: 'flex-start',
    borderWidth: traco.normal,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
});
