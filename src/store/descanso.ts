import { create } from 'zustand';

interface Estado {
  /** Momento em que o descanso termina, em ms. `null` = sem descanso ativo. */
  alvo: number | null;
  /** Duração total do ciclo atual, para desenhar a barra de progresso. */
  total: number;
  iniciar: (segundos: number) => void;
  somar: (segundos: number) => void;
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
  iniciar: (segundos) => {
    if (segundos <= 0) return;
    set({ alvo: Date.now() + segundos * 1000, total: segundos });
  },
  somar: (segundos) => {
    const { alvo, total } = get();
    if (!alvo) return;
    set({ alvo: alvo + segundos * 1000, total: total + segundos });
  },
  parar: () => set({ alvo: null, total: 0 }),
}));
