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
import { useTreino } from '@/store/treino';

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
  const { alvo, total, origem, somar, parar } = useDescanso();
  const setDescanso = useTreino((s) => s.setDescanso);
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

  /**
   * Corrigir o descanso NO AR, e a correção fica.
   *
   * Antes só existia +15 s, e ela morria com o ciclo: quem descobria na terceira
   * série que 90 s era pouco tinha que reabrir o menu do exercício a cada série,
   * e o cronômetro parecia cravado. Agora o ajuste vale para as PRÓXIMAS séries
   * daquele exercício — é o alvo dele que muda, e o cabeçalho mostra o novo
   * valor no mesmo instante.
   */
  function ajustar(segundos: number) {
    const novoTotal = somar(segundos);
    if (origem && novoTotal > 0) setDescanso(origem, novoTotal);
  }

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
      <ReguaProgresso fracao={fracao} altura={2} cor={c.acento} />
      <View style={estilos.corpo}>
        <View style={{ flex: 1 }}>
          {/* O alvo entra no rótulo: é o retorno visível de que o ajuste ficou. */}
          <Rotulo cor={c.tintaFraca}>Descanso · alvo {fmtDuracao(total * 1000)}</Rotulo>
          <Tx v="numeroXG" tab style={{ marginTop: -2 }}>
            {fmtDuracao(restante)}
          </Tx>
        </View>

        <Pressavel
          haptico="leve"
          onPress={() => ajustar(-15)}
          accessibilityLabel="Descansar 15 segundos menos"
          style={estilos.acao}
        >
          <Rotulo cor={c.tinta}>−15s</Rotulo>
        </Pressavel>
        <Pressavel
          haptico="leve"
          onPress={() => ajustar(15)}
          accessibilityLabel="Descansar 15 segundos mais"
          style={estilos.acao}
        >
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
    gap: sp.xs,
    paddingHorizontal: margem.pagina,
    paddingTop: sp.sm,
    paddingBottom: sp.md,
  },
  // Três teclas onde antes havia duas: a largura mínima cede para caber sem
  // apertar o número, que é o que se lê com o celular largado no banco.
  acao: {
    minWidth: 46,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: traco.normal,
    borderColor: c.reguaMid,
    paddingHorizontal: sp.xs,
  },
}));
