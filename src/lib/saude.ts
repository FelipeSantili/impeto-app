import { Platform } from 'react-native';
import {
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';
import { POR_ID } from '@/data/exercicios';
import type { Sessao } from '@/store/treino';
import { volumeSessao } from '@/lib/metricas';

/**
 * Ponte com o Health Connect (Android).
 *
 * É por aqui que os dados do relógio chegam: o Mi Fitness grava frequência
 * cardíaca e calorias no Health Connect, e nós lemos a janela de tempo do
 * treino. No caminho inverso, gravamos a sessão de musculação para ela aparecer
 * no histórico de saúde do aparelho.
 *
 * Só existe no Android. No iOS o equivalente seria o HealthKit.
 */

const PERMISSOES: Permission[] = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'ExerciseSession' },
];

export type StatusSaude =
  | 'indisponivel' // iOS, ou aparelho sem Health Connect
  | 'precisa_instalar' // Android sem o app Health Connect
  | 'sem_permissao'
  | 'pronto';

export async function statusHealthConnect(): Promise<StatusSaude> {
  if (Platform.OS !== 'android') return 'indisponivel';
  try {
    const iniciado = await initialize();
    if (!iniciado) return 'indisponivel';

    const sdk = await getSdkStatus();
    if (sdk === SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'indisponivel';
    if (sdk === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return 'precisa_instalar';
    }

    const concedidas = await getGrantedPermissions();
    const temLeitura = concedidas.some(
      (p) => p.accessType === 'read' && p.recordType === 'HeartRate',
    );
    return temLeitura ? 'pronto' : 'sem_permissao';
  } catch {
    return 'indisponivel';
  }
}

/** Abre o diálogo de permissões. Devolve o status resultante. */
export async function pedirPermissoes(): Promise<StatusSaude> {
  if (Platform.OS !== 'android') return 'indisponivel';
  try {
    await initialize();
    await requestPermission(PERMISSOES);
    return await statusHealthConnect();
  } catch {
    return 'sem_permissao';
  }
}

export function abrirAjustesSaude() {
  try {
    openHealthConnectSettings();
  } catch {
    // Sem Health Connect instalado não há tela para abrir.
  }
}

export interface DadosCardio {
  fcMedia: number;
  fcMaxima: number;
  /** Quantas amostras vieram — zero significa que o relógio não sincronizou. */
  amostras: number;
  calorias: number | null;
}

/**
 * Frequência cardíaca e calorias registradas entre `inicio` e `fim`.
 *
 * Os dados vêm de qualquer fonte que escreva no Health Connect — no seu caso,
 * o Mi Fitness sincronizando o relógio.
 */
export async function lerCardio(inicio: number, fim: number): Promise<DadosCardio | null> {
  if (Platform.OS !== 'android') return null;
  try {
    await initialize();
    const filtro = {
      timeRangeFilter: {
        operator: 'between' as const,
        startTime: new Date(inicio).toISOString(),
        endTime: new Date(fim).toISOString(),
      },
    };

    const fc = await readRecords('HeartRate', filtro);
    // Cada registro traz uma série de amostras; achatamos todas.
    const bpm: number[] = [];
    for (const reg of fc.records) {
      for (const amostra of reg.samples ?? []) {
        if (amostra.beatsPerMinute > 0) bpm.push(amostra.beatsPerMinute);
      }
    }

    let calorias: number | null = null;
    try {
      const cal = await readRecords('ActiveCaloriesBurned', filtro);
      const total = cal.records.reduce((t, r) => t + (r.energy?.inKilocalories ?? 0), 0);
      if (total > 0) calorias = Math.round(total);
    } catch {
      // Calorias são opcionais: nem toda fonte grava esse tipo.
    }

    if (!bpm.length) return { fcMedia: 0, fcMaxima: 0, amostras: 0, calorias };

    return {
      fcMedia: Math.round(bpm.reduce((t, n) => t + n, 0) / bpm.length),
      fcMaxima: Math.max(...bpm),
      amostras: bpm.length,
      calorias,
    };
  } catch {
    return null;
  }
}

/** Grava o treino como sessão de musculação no histórico de saúde do aparelho. */
export async function escreverTreino(sessao: Sessao): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await initialize();
    const grupos = [
      ...new Set(sessao.exercicios.map((e) => POR_ID[e.exId]?.grupo).filter(Boolean)),
    ];
    await insertRecords([
      {
        recordType: 'ExerciseSession',
        startTime: new Date(sessao.inicio).toISOString(),
        endTime: new Date(sessao.fim ?? Date.now()).toISOString(),
        exerciseType: 79, // STRENGTH_TRAINING
        title: sessao.nome,
        notes: `${sessao.exercicios.length} exercícios · ${Math.round(volumeSessao(sessao))} kg de volume${
          grupos.length ? ` · ${grupos.join(', ')}` : ''
        }`,
      },
    ]);
    return true;
  } catch {
    return false;
  }
}
