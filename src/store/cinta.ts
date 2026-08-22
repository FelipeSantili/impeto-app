import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';
import { create } from 'zustand';

/**
 * Cinta de frequência cardíaca por Bluetooth.
 *
 * Usa o Heart Rate Service, que é padrão aberto do Bluetooth SIG — funciona com
 * Polar, Garmin, Wahoo, Magene e similares sem precisar do app do fabricante.
 *
 * Vale o aviso: relógios Xiaomi/Redmi NÃO expõem esse serviço; eles falam um
 * protocolo proprietário com o Mi Fitness. Para o relógio, o caminho é o Health
 * Connect (`lib/saude.ts`), que entrega os dados depois do treino.
 */
const SERVICO_FC = '0000180d-0000-1000-8000-00805f9b34fb';
const CARACTERISTICA_FC = '00002a37-0000-1000-8000-00805f9b34fb';

export type EstadoCinta = 'desligada' | 'procurando' | 'conectando' | 'conectada' | 'erro';

export interface CintaEncontrada {
  id: string;
  nome: string;
}

interface Estado {
  estado: EstadoCinta;
  bpm: number | null;
  dispositivo: CintaEncontrada | null;
  encontradas: CintaEncontrada[];
  erro: string | null;
  /** Amostras do treino atual, para calcular média e máxima no relatório. */
  amostras: number[];

  procurar: () => Promise<void>;
  pararBusca: () => void;
  conectar: (id: string) => Promise<void>;
  desconectar: () => Promise<void>;
  zerarAmostras: () => void;
}

let manager: BleManager | null = null;
let inscricao: Subscription | null = null;
let conectado: Device | null = null;

/** O BleManager só é criado quando alguém realmente vai usar Bluetooth. */
function obterManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

async function permissoesAndroid(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // Android 12+ separou as permissões de Bluetooth; antes disso o scan exigia
  // localização. Pedimos o conjunto certo para a versão do aparelho.
  const alvos =
    Number(Platform.Version) >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const r = await PermissionsAndroid.requestMultiple(alvos);
  return alvos.every((p) => r[p] === PermissionsAndroid.RESULTS.GRANTED);
}

/**
 * O valor de FC vem no primeiro byte de dados; o bit 0 do flag diz se o número
 * ocupa 8 ou 16 bits. Formato definido pela especificação do Bluetooth SIG.
 */
function lerBpm(base64: string): number | null {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    if (bytes.length < 2) return null;
    const dezesseisBits = (bytes[0] & 0x01) === 1;
    const valor = dezesseisBits ? bytes[1] | (bytes[2] << 8) : bytes[1];
    return valor > 0 && valor < 300 ? valor : null;
  } catch {
    return null;
  }
}

export const useCinta = create<Estado>((set, get) => ({
  estado: 'desligada',
  bpm: null,
  dispositivo: null,
  encontradas: [],
  erro: null,
  amostras: [],

  procurar: async () => {
    const ok = await permissoesAndroid();
    if (!ok) {
      set({ estado: 'erro', erro: 'Permissão de Bluetooth negada.' });
      return;
    }
    set({ estado: 'procurando', encontradas: [], erro: null });

    try {
      obterManager().startDeviceScan([SERVICO_FC], null, (erro, dispositivo) => {
        if (erro) {
          set({ estado: 'erro', erro: 'Falha ao procurar. O Bluetooth está ligado?' });
          return;
        }
        if (!dispositivo) return;
        const nome = dispositivo.name ?? dispositivo.localName;
        if (!nome) return;
        set((s) =>
          s.encontradas.some((d) => d.id === dispositivo.id)
            ? s
            : { encontradas: [...s.encontradas, { id: dispositivo.id, nome }] },
        );
      });
    } catch {
      set({ estado: 'erro', erro: 'Bluetooth indisponível neste aparelho.' });
    }
  },

  pararBusca: () => {
    try {
      obterManager().stopDeviceScan();
    } catch {
      // Sem busca ativa não há nada a parar.
    }
    if (get().estado === 'procurando') set({ estado: 'desligada' });
  },

  conectar: async (id) => {
    const alvo = get().encontradas.find((d) => d.id === id);
    set({ estado: 'conectando', erro: null });
    try {
      obterManager().stopDeviceScan();
      const d = await obterManager().connectToDevice(id);
      await d.discoverAllServicesAndCharacteristics();
      conectado = d;

      inscricao = d.monitorCharacteristicForService(
        SERVICO_FC,
        CARACTERISTICA_FC,
        (erro, caracteristica) => {
          if (erro || !caracteristica?.value) return;
          const bpm = lerBpm(caracteristica.value);
          if (bpm === null) return;
          set((s) => ({ bpm, amostras: [...s.amostras, bpm] }));
        },
      );

      // Se a cinta sair do alcance ou a bateria acabar, a UI precisa saber.
      d.onDisconnected(() => {
        set({ estado: 'desligada', bpm: null, dispositivo: null });
      });

      set({
        estado: 'conectada',
        dispositivo: alvo ?? { id, nome: d.name ?? 'Cinta' },
      });
    } catch {
      set({ estado: 'erro', erro: 'Não foi possível conectar. Aproxime a cinta e tente de novo.' });
    }
  },

  desconectar: async () => {
    inscricao?.remove();
    inscricao = null;
    try {
      if (conectado) await conectado.cancelConnection();
    } catch {
      // Já pode ter caído sozinha.
    }
    conectado = null;
    set({ estado: 'desligada', bpm: null, dispositivo: null });
  },

  zerarAmostras: () => set({ amostras: [] }),
}));
