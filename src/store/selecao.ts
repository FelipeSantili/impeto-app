import { create } from 'zustand';

interface Estado {
  /** Ids escolhidos no seletor, aguardando quem os pediu. */
  pendentes: string[] | null;
  /**
   * Posição a substituir, quando o seletor foi aberto para TROCAR um item em
   * vez de acrescentar. `null` significa "acrescente ao fim".
   */
  alvo: number | null;
  entregar: (ids: string[], alvo?: number) => void;
  consumir: () => { ids: string[]; alvo: number | null };
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
  alvo: null,
  entregar: (ids, alvo) => set({ pendentes: ids, alvo: alvo ?? null }),
  consumir: () => {
    const { pendentes, alvo } = get();
    const ids = pendentes ?? [];
    if (ids.length) set({ pendentes: null, alvo: null });
    return { ids, alvo };
  },
}));
