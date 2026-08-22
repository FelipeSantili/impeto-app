import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Preferencia = 'sistema' | 'claro' | 'escuro';
export type Esquema = 'claro' | 'escuro';

interface EstadoTema {
  preferencia: Preferencia;
  /** O que o aparelho está pedindo agora. Não é persistido: é do sistema. */
  sistema: Esquema;
  /** Falso até o disco responder — o layout raiz segura a splash até virar. */
  hidratado: boolean;
  definir: (p: Preferencia) => void;
}

const doSistema = (): Esquema => (Appearance.getColorScheme() === 'dark' ? 'escuro' : 'claro');

/**
 * Preferência de tema.
 *
 * Guardada separada do resto porque é ajuste de aparência, não dado de treino:
 * um backup restaurado noutro aparelho não deve arrastar junto o tema de quem
 * exportou.
 *
 * O esquema do sistema também mora aqui, e não num `useColorScheme` dentro do
 * hook de paleta. Assim `usarPaleta` gasta UM hook em vez de dois — e a
 * quantidade de hooks que ele consome deixa de depender de qual biblioteca
 * implementa `useColorScheme` em cada plataforma.
 */
export const useTemaStore = create<EstadoTema>()(
  persist(
    (set) => ({
      preferencia: 'sistema',
      sistema: doSistema(),
      hidratado: false,
      definir: (preferencia) => set({ preferencia }),
    }),
    {
      name: 'impeto-tema',
      storage: createJSONStorage(() => AsyncStorage),
      // Só a preferência é do usuário; `sistema` e `hidratado` descrevem esta
      // execução e são recalculados a cada abertura.
      partialize: (s) => ({ preferencia: s.preferencia }),
      onRehydrateStorage: () => () => {
        useTemaStore.setState({ hidratado: true });
      },
    },
  ),
);

// Uma assinatura só, no módulo, em vez de uma por componente que pinta algo.
Appearance.addChangeListener(({ colorScheme }) => {
  useTemaStore.setState({ sistema: colorScheme === 'dark' ? 'escuro' : 'claro' });
});
