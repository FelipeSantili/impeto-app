import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { create } from 'zustand';

export type EstadoAtualizacao = 'ocioso' | 'verificando' | 'baixando' | 'pronta' | 'aplicando';

/** Guarda qual versão já foi anunciada, para não notificar duas vezes a mesma. */
const CHAVE_AVISADA = 'forja-atualizacao-avisada';

interface Estado {
  estado: EstadoAtualizacao;
  /** Id da atualização baixada — identifica a versão para o aviso. */
  id: string | null;
  /** O usuário mandou esperar: some o aviso até reabrir o app. */
  adiada: boolean;

  verificar: (silenciosa?: boolean) => Promise<void>;
  aplicar: () => Promise<void>;
  adiar: () => void;
}

async function notificar(id: string) {
  try {
    // Uma versão, um aviso — reabrir o app não repete a notificação.
    const jaAvisada = await AsyncStorage.getItem(CHAVE_AVISADA);
    if (jaAvisada === id) return;

    const permissao = await Notifications.getPermissionsAsync();
    let concedida = permissao.granted;
    if (!concedida && permissao.canAskAgain) {
      concedida = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!concedida) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('atualizacoes', {
        name: 'Atualizações do app',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nova versão do Forja',
        body: 'Toque para abrir e atualizar quando quiser.',
      },
      trigger: null, // imediata
    });
    await AsyncStorage.setItem(CHAVE_AVISADA, id);
  } catch {
    // Notificação é um extra: se falhar, o aviso dentro do app continua de pé.
  }
}

/**
 * Atualização pelo ar (EAS Update), aplicada só quando o usuário quiser.
 *
 * O app baixa a nova versão em segundo plano e para por aí: quem decide o
 * momento de reiniciar é o usuário, pelo aviso na tela. Reiniciar sozinho no
 * meio de uma série seria intrusivo.
 *
 * Em desenvolvimento e no Expo Go isto é inerte — `Updates.isEnabled` é falso.
 */
export const useAtualizacao = create<Estado>((set, get) => ({
  estado: 'ocioso',
  id: null,
  adiada: false,

  verificar: async (silenciosa = true) => {
    if (__DEV__ || !Updates.isEnabled) return;
    const atual = get().estado;
    if (atual !== 'ocioso') return; // já em andamento ou já baixada

    set({ estado: 'verificando' });
    try {
      const busca = await Updates.checkForUpdateAsync();
      if (!busca.isAvailable) {
        set({ estado: 'ocioso' });
        return;
      }

      set({ estado: 'baixando' });
      const baixada = await Updates.fetchUpdateAsync();
      if (!baixada.isNew) {
        set({ estado: 'ocioso' });
        return;
      }

      const id = baixada.manifest && 'id' in baixada.manifest ? String(baixada.manifest.id) : 'nova';
      set({ estado: 'pronta', id, adiada: false });
      if (silenciosa) await notificar(id);
    } catch {
      // Sem rede ou servidor fora: falhar em atualizar nunca bloqueia o app.
      set({ estado: 'ocioso' });
    }
  },

  aplicar: async () => {
    if (get().estado !== 'pronta') return;
    set({ estado: 'aplicando' });
    try {
      await Updates.reloadAsync();
    } catch {
      // Se o reload falhar, devolve o aviso para o usuário tentar de novo.
      set({ estado: 'pronta' });
    }
  },

  adiar: () => set({ adiada: true }),
}));
