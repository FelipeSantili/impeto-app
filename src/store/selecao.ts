import { create } from 'zustand';

interface Estado {
  /** Ids escolhidos no seletor, aguardando quem os pediu. */
  pendentes: string[] | null;
  entregar: (ids: string[]) => void;
  consumir: () => string[];
}

/**
 * Canal de retorno do seletor de exercícios.
 *
 * A tela de rotina abre `/selecionar` e precisa receber a escolha de volta.
 * Parâmetros de rota não sobrevivem bem ao `router.back()`, então a seleção
 * viaja por aqui e é consumida uma única vez.
 */
export const useSelecao = create<Estado>((set, get) => ({
  pendentes: null,
  entregar: (ids) => set({ pendentes: ids }),
  consumir: () => {
    const ids = get().pendentes ?? [];
    if (ids.length) set({ pendentes: null });
    return ids;
  },
}));
