import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Pressavel, Regua, Rotulo, Tx } from '@/components/base';
import { ReguaProgresso } from '@/components/decor';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, sp, traco } from '@/design/tokens';
import { fmtDuracao } from '@/lib/metricas';
import { useDescanso } from '@/store/descanso';

/**
 * Tira de descanso.
 *
 * Era um cartão flutuante com cantos de 22px, sombra preta e um anel de
 * progresso. Virou o que a página pede: uma tira encostada no rodapé, largura
 * cheia, separada por régua forte, com o tempo em condensada grande — legível
 * com o celular largado no banco, a um braço de distância — e uma RÉGUA QUE
 * ENCURTA no lugar do anel.
 *
 * O tempo restante é o número que importa aqui, então ele é o único elemento
 * grande; os controles ficam pequenos e à direita.
 */
export function TiraDescanso({ bottom }: { bottom: number }) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const { alvo, total, somar, parar } = useDescanso();
  const [restante, setRestante] = useState(0);
  const avisou = useRef(false);

  useEffect(() => {
    if (!alvo) return;
    avisou.current = false;
    const tick = () => {
      const ms = alvo - Date.now();
      setRestante(Math.max(0, ms));
      if (ms <= 0 && !avisou.current) {
        avisou.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        parar();
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [alvo, parar]);

  if (!alvo) return null;

  const fracao = total > 0 ? Math.max(0, Math.min(1, restante / (total * 1000))) : 0;

  return (
    <Animated.View
      // Aparece e some sem deslocamento: a tira ocupa a largura toda e
      // deslizar uma faixa de rodapé a cada série — dezenas de vezes por
      // treino — cansa. Só opacidade.
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={[estilos.tira, { bottom }]}
    >
      <Regua peso="forte" />
      <ReguaProgresso fracao={fracao} altura={2} cor={c.azul} />
      <View style={estilos.corpo}>
        <View style={{ flex: 1 }}>
          <Rotulo cor={c.tintaFraca}>Descanso</Rotulo>
          <Tx v="numeroXG" tab style={{ marginTop: -2 }}>
            {fmtDuracao(restante)}
          </Tx>
        </View>

        <Pressavel haptico="leve" onPress={() => somar(15)} style={estilos.acao}>
          <Rotulo cor={c.tinta}>+15s</Rotulo>
        </Pressavel>
        <Pressavel haptico="leve" onPress={parar} style={estilos.acao}>
          <Rotulo cor={c.tintaMid}>Pular</Rotulo>
        </Pressavel>
      </View>
    </Animated.View>
  );
}

const usarEstilos = criarEstilos((c) => ({
  tira: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: c.fundoAlto,
  },
  corpo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingTop: sp.sm,
    paddingBottom: sp.md,
  },
  acao: {
    minWidth: 54,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: traco.normal,
    borderColor: c.reguaMid,
    paddingHorizontal: sp.sm,
  },
}));
