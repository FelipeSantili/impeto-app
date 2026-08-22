import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Botao, Carimbo, Pressavel, Regua, Tx } from '@/components/base';
import { abrirConfirmacao } from '@/components/folha';
import { Glifo } from '@/components/glifos';
import { color, margem, sp } from '@/design/tokens';
import { useAtualizacao } from '@/store/atualizacao';
import { useTreino } from '@/store/treino';

/**
 * Aviso de versão nova, fixo no topo.
 *
 * Só aparece quando a atualização já está baixada — assim o botão "Atualizar"
 * reinicia na hora, sem espera nem risco de falhar por falta de rede.
 *
 * A forma é de errata colada no alto da página: largura cheia, encostada,
 * fechada por régua forte. Não é um cartão flutuante com sombra — não há nada
 * flutuando neste app.
 */
export function AvisoAtualizacao() {
  const insets = useSafeAreaInsets();
  const estado = useAtualizacao((s) => s.estado);
  const adiada = useAtualizacao((s) => s.adiada);
  const aplicar = useAtualizacao((s) => s.aplicar);
  const adiar = useAtualizacao((s) => s.adiar);
  const treinoAberto = useTreino((s) => !!s.ativa);

  const visivel = (estado === 'pronta' || estado === 'aplicando') && !adiada;
  if (!visivel) return null;

  function confirmar() {
    // O treino em andamento é salvo em disco e volta depois do reinício; só o
    // cronômetro de descanso, que vive em memória, se perde.
    if (treinoAberto) {
      abrirConfirmacao({
        titulo: 'Atualizar agora?',
        descricao:
          'Você tem um treino aberto. Ele será restaurado depois do reinício — só o cronômetro de descanso zera.',
        confirmar: 'Atualizar',
        onConfirmar: aplicar,
      });
      return;
    }
    aplicar();
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(240)}
      exiting={FadeOutUp.duration(180)}
      style={[estilos.faixa, { paddingTop: insets.top + sp.md }]}
    >
      <View style={estilos.corpo}>
        <View style={{ flex: 1, gap: sp.xs }}>
          <Carimbo texto="Nova versão" />
          <Tx v="small" cor={color.tintaMid}>
            {estado === 'aplicando' ? 'Reiniciando…' : 'Pronta. Atualize quando quiser.'}
          </Tx>
        </View>

        <Botao
          titulo="Atualizar"
          haptico="medio"
          onPress={confirmar}
          disabled={estado === 'aplicando'}
        />
        <Pressavel
          hitSlop={12}
          haptico="selecao"
          onPress={adiar}
          disabled={estado === 'aplicando'}
          accessibilityLabel="Dispensar aviso"
          style={{ padding: sp.xs }}
        >
          <Glifo nome="fechar" tamanho={15} cor={color.tintaFraca} />
        </Pressavel>
      </View>
      <Regua peso="forte" cor={color.tinta} />
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: color.papelAlto,
    zIndex: 50,
  },
  corpo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.md,
  },
});
