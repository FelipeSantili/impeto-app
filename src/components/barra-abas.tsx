import { router } from 'expo-router';
import type { TabTriggerSlotProps } from 'expo-router/ui';
import type { ReactNode, Ref } from 'react';
import { Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressavel, Regua, Tx } from '@/components/base';
import { Glifo, type NomeGlifo } from '@/components/glifos';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, sp, traco, type as typeScale } from '@/design/tokens';
import { useTreino } from '@/store/treino';

/**
 * Rodapé da página: as abas e, quando há treino aberto, a tira de retomada.
 *
 * Antes isto era uma pílula flutuante com sombra e cantos de 28px — a forma
 * mais gerada que existe em app mobile. Agora é o pé da folha: encostado na
 * borda, separado por régua forte, e a aba ativa é marcada por uma BARRA DE
 * TINTA em cima do rótulo, como aba de índice impressa. Sem sombra, porque
 * papel não flutua.
 *
 * Recebe os `TabTrigger` como filhos via `<TabList asChild>`.
 */
export function Doca({
  children,
  ref,
  ...rest
}: ViewProps & { children?: ReactNode; ref?: Ref<View> }) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const insets = useSafeAreaInsets();
  const ativa = useTreino((s) => s.ativa);

  return (
    <View {...rest} ref={ref} style={estilos.ancora}>
      {ativa ? (
        // Tira de tinta: o treino aberto é a única coisa que interrompe a
        // página, então é sólida e ocupa a largura toda.
        <Pressavel
          onPress={() => router.push('/treino')}
          style={estilos.retomar}
          escala={1}
          fundo={c.acento}
          fundoPressionado={c.acentoPress}
          accessibilityRole="button"
          accessibilityLabel={`Retomar treino ${ativa.nome}`}
        >
          <Tx v="smallMed" cor={c.acentoTexto} style={{ flex: 1 }} numberOfLines={1}>
            {ativa.nome}
          </Tx>
          <Text
            style={[
              typeScale.carimbo,
              { color: c.acentoTexto, fontSize: 11, textTransform: 'uppercase' },
            ]}
          >
            Retomar
          </Text>
          <Glifo nome="avancar" tamanho={13} cor={c.acentoTexto} />
        </Pressavel>
      ) : null}

      <Regua peso="forte" />
      <View style={[estilos.barra, { paddingBottom: Math.max(insets.bottom, sp.sm) }]}>
        {children}
      </View>
    </View>
  );
}

/** Uma aba. Recebe `isFocused` do `TabTrigger asChild`. */
export function Aba({
  glifo,
  rotulo,
  isFocused,
  ref,
  ...rest
}: TabTriggerSlotProps & {
  glifo: NomeGlifo;
  rotulo: string;
  ref?: Ref<View>;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  // A aba da vez é ACENTO, não tinta cheia: no vocabulário do app o acento é o
  // que está ativo agora, e a doca é só mais um lugar onde isso vale.
  const cor = isFocused ? c.acento : c.tintaFraca;
  return (
    <Pressavel
      {...rest}
      ref={ref}
      // Trocar de aba acontece dezenas de vezes por sessão: sem animação de
      // transição e sem háptico. Só a marca muda.
      escala={1}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={estilos.aba}
    >
      <View style={[estilos.barraAtiva, isFocused && { backgroundColor: c.acento }]} />
      <Glifo nome={glifo} tamanho={19} cor={cor} />
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.25}
        style={[typeScale.coluna, { color: cor, textTransform: 'uppercase', fontSize: 11 }]}
      >
        {rotulo}
      </Text>
    </Pressavel>
  );
}

const usarEstilos = criarEstilos((c) => ({
  ancora: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.fundo,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingTop: sp.sm,
    paddingHorizontal: sp.sm,
  },
  aba: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
    // 48dp de alvo mesmo com o rodapé compacto.
    minHeight: 52,
    paddingTop: sp.sm,
  },
  // A marca da aba ativa: barra de tinta encostada na régua de cima.
  barraAtiva: {
    position: 'absolute',
    top: 0,
    height: 2.5,
    width: 34,
    backgroundColor: 'transparent',
  },
  retomar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    height: 44,
    paddingHorizontal: margem.pagina,
    backgroundColor: c.acento,
    borderTopWidth: traco.normal,
    borderTopColor: c.acento,
  },
}));
