import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tx } from '@/components/base';
import { color, radius, shadow, sp } from '@/design/tokens';
import { useTreino } from '@/store/treino';

/**
 * Doca inferior: a barra de abas flutuante e, quando há treino em andamento,
 * a faixa de retomada logo acima dela.
 *
 * Recebe os `TabTrigger` como filhos via `<TabList asChild>`.
 */
export function Doca({
  children,
  ref,
  ...rest
}: ViewProps & { children?: ReactNode; ref?: Ref<View> }) {
  const insets = useSafeAreaInsets();
  const ativa = useTreino((s) => s.ativa);

  return (
    <View
      {...rest}
      ref={ref}
      style={[estilos.ancora, { paddingBottom: Math.max(insets.bottom, sp.md) }]}
    >
      {ativa ? (
        <Animated.View entering={FadeIn.duration(220)}>
          <Pressable
            onPress={() => router.push('/treino')}
            style={({ pressed }) => [estilos.retomar, { opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={estilos.pulso} />
            <Tx v="smallMed" style={{ flex: 1 }} numberOfLines={1}>
              {ativa.nome}
            </Tx>
            <Tx v="small" cor={color.accent}>
              Retomar
            </Tx>
            <Ionicons name="chevron-forward" size={14} color={color.accent} />
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={[estilos.barra, shadow.floating]}>{children}</View>
    </View>
  );
}

/** Um item da barra. Recebe `isFocused` do `TabTrigger asChild`. */
export function Aba({
  icone,
  rotulo,
  isFocused,
  onPress,
  ref,
  ...rest
}: TabTriggerSlotProps & {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  ref?: Ref<View>;
}) {
  return (
    <Pressable
      {...rest}
      ref={ref}
      onPress={(e) => {
        Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={estilos.aba}
    >
      <View style={[estilos.abaPilula, isFocused && estilos.abaPilulaAtiva]}>
        <Ionicons
          name={isFocused ? icone : (`${icone}-outline` as keyof typeof Ionicons.glyphMap)}
          size={20}
          color={isFocused ? color.text : color.textFaint}
        />
        <Tx v="caption" cor={isFocused ? color.text : color.textGhost} style={estilos.rotulo}>
          {rotulo}
        </Tx>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  ancora: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: sp.lg,
    gap: sp.sm,
    backgroundColor: 'transparent',
  },
  barra: {
    flexDirection: 'row',
    height: 62,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(24,21,32,0.97)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
    alignItems: 'center',
    paddingHorizontal: sp.xs,
  },
  aba: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  abaPilula: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 76,
    height: 50,
    borderRadius: radius.lg,
  },
  abaPilulaAtiva: {
    backgroundColor: color.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
  },
  rotulo: { textTransform: 'none', letterSpacing: 0 },
  retomar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    height: 42,
    paddingHorizontal: sp.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentLine,
  },
  pulso: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.accent },
});
