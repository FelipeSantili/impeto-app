import { create } from 'zustand';

interface Estado {
  /** Momento em que o descanso termina, em ms. `null` = sem descanso ativo. */
  alvo: number | null;
  /** Duração total do ciclo atual, para desenhar a barra de progresso. */
  total: number;
  /**
   * Uid da linha do treino que pediu este descanso.
   *
   * Existe para que a correção feita no ar possa virar o alvo DAQUELE
   * exercício: descobrir na terceira série que 90 s é pouco e ter que reabrir
   * menu a cada série é o que fazia o cronômetro parecer fixo.
   */
  origem: string | null;
  iniciar: (segundos: number, origem?: string) => void;
  /** Estica ou encurta o ciclo em andamento. Devolve o novo total, em segundos. */
  somar: (segundos: number) => number;
  parar: () => void;
}

/**
 * Cronômetro de descanso.
 *
 * Guardamos o instante-alvo em vez de um contador decrescente: assim o tempo
 * continua correto mesmo que a tela seja desmontada ou o app fique em segundo
 * plano entre uma série e outra.
 */
export const useDescanso = create<Estado>((set, get) => ({
  alvo: null,
  total: 0,
  origem: null,
  iniciar: (segundos, origem) => {
    if (segundos <= 0) return;
    set({ alvo: Date.now() + segundos * 1000, total: segundos, origem: origem ?? null });
  },
  somar: (segundos) => {
    const { alvo, total } = get();
    if (!alvo) return 0;
    const restante = alvo - Date.now();
    // Encurtar não passa do fim: o piso é zero e o tique da tira cuida do
    // resto — ele já sabe apitar e encerrar quando o tempo chega a zero.
    const novoRestante = Math.max(0, restante + segundos * 1000);
    // O total acompanha o que REALMENTE mudou, não o que foi pedido. Sem isso,
    // dois toques em −15 s com 8 s no relógio deixariam a régua de progresso
    // descrevendo um ciclo que nunca existiu.
    const delta = Math.round((novoRestante - restante) / 1000);
    const novoTotal = Math.max(1, total + delta);
    set({ alvo: Date.now() + novoRestante, total: novoTotal });
    return novoTotal;
  },
  parar: () => set({ alvo: null, total: 0, origem: null }),
}));
