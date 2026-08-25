import { EXERCICIOS, POR_ID } from './exercicios';
import type { Exercicio } from './types';

/**
 * Variações — quais exercícios servem à mesma finalidade.
 *
 * O catálogo já dizia COMO cada exercício é executado (`fam`, a família de
 * execução). O que faltava era dizer PARA QUE ele serve: supino reto, supino
 * inclinado, flexão e mergulho são quatro execuções diferentes de uma coisa
 * só — empurrar peso longe do peito. É essa camada que permite responder à
 * pergunta que se faz na academia com a máquina ocupada: "o que eu faço no
 * lugar disso?".
 *
 * A finalidade agrupa FAMÍLIAS, não exercícios, e uma família pode servir a
 * mais de uma finalidade — o mergulho é empurrada de peito e é extensão de
 * cotovelo, e é honesto que apareça nas duas listas.
 */
export interface Finalidade {
  /**
   * Nome em prosa, minúsculo: ele entra no meio de uma frase
   * ("Mesma finalidade: dobradiça de quadril").
   */
  nome: string;
  familias: string[];
}

export const FINALIDADES: Record<string, Finalidade> = {
  empurrar_peito: {
    nome: 'empurrada de peito',
    familias: ['supino_horizontal', 'supino_inclinado', 'supino_declinado', 'flexao', 'mergulho'],
  },
  abrir_peito: { nome: 'abertura de peito', familias: ['crucifixo', 'voador', 'crossover'] },
  dorsal_estendido: {
    nome: 'dorsal com braço estendido',
    familias: ['pulldown_reto', 'pullover'],
  },
  puxar_vertical: { nome: 'puxada vertical', familias: ['puxada', 'barra_fixa'] },
  puxar_horizontal: { nome: 'remada', familias: ['remada_horizontal', 'remada_unilateral'] },
  dobradica_quadril: {
    nome: 'dobradiça de quadril',
    familias: ['terra', 'stiff', 'hiperextensao', 'kettlebell_swing', 'flexora'],
  },
  agachar: {
    nome: 'agachamento',
    familias: ['agachamento', 'agachamento_frontal', 'leg_press', 'hack', 'extensora'],
  },
  passada: { nome: 'passada unilateral', familias: ['afundo', 'bulgaro'] },
  estender_joelho: { nome: 'extensão de joelho', familias: ['extensora'] },
  flexionar_joelho: { nome: 'flexão de joelho', familias: ['flexora'] },
  estender_quadril: {
    nome: 'extensão de quadril',
    familias: ['hip_thrust', 'coice_gluteo', 'kettlebell_swing', 'abducao'],
  },
  abrir_quadril: { nome: 'abdução de quadril', familias: ['abducao'] },
  fechar_quadril: { nome: 'adução de quadril', familias: ['aducao'] },
  panturrilha: { nome: 'panturrilha', familias: ['panturrilha'] },
  empurrar_ombro: { nome: 'desenvolvimento de ombro', familias: ['desenvolvimento'] },
  ombro_lateral: { nome: 'deltoide lateral', familias: ['elevacao_lateral', 'remada_alta'] },
  ombro_frontal: { nome: 'deltoide anterior', familias: ['elevacao_frontal'] },
  ombro_posterior: {
    nome: 'deltoide posterior',
    familias: ['crucifixo_inverso', 'face_pull', 'rotacao_externa'],
  },
  manguito: { nome: 'manguito rotador', familias: ['rotacao_externa'] },
  trapezio: { nome: 'trapézio', familias: ['encolhimento', 'remada_alta'] },
  flexionar_cotovelo: {
    nome: 'flexão de cotovelo',
    familias: ['rosca', 'rosca_martelo', 'rosca_scott'],
  },
  estender_cotovelo: {
    nome: 'extensão de cotovelo',
    familias: [
      'triceps_pulley',
      'triceps_testa',
      'triceps_frances',
      'triceps_coice',
      'supino_fechado',
      'mergulho',
    ],
  },
  punho: { nome: 'punho e antebraço', familias: ['punho'] },
  flexionar_tronco: { nome: 'flexão de tronco', familias: ['abdominal_crunch', 'abdominal_infra'] },
  estabilizar_tronco: { nome: 'estabilização do core', familias: ['prancha', 'carregamento'] },
  rotacionar_tronco: { nome: 'rotação de tronco', familias: ['rotacao_tronco'] },
  estender_lombar: { nome: 'extensão lombar', familias: ['hiperextensao'] },
  potencia: { nome: 'potência de corpo inteiro', familias: ['olimpico', 'kettlebell_swing'] },
  cardio: { nome: 'cardio', familias: ['cardio_esteira', 'cardio_bike', 'cardio_geral'] },
};

/** Índice inverso: família de execução → finalidades a que ela serve. */
const FINALIDADES_DA_FAMILIA: Record<string, string[]> = (() => {
  const mapa: Record<string, string[]> = {};
  for (const [chave, f] of Object.entries(FINALIDADES)) {
    for (const fam of f.familias) (mapa[fam] ??= []).push(chave);
  }
  return mapa;
})();

export interface Variacao {
  ex: Exercicio;
  /** Mesma família de execução — o substituto mais próximo que existe. */
  mesmaExecucao: boolean;
  /** Registra nas mesmas duas colunas (kg × reps, km × min…). */
  mesmaMedida: boolean;
}

/** Finalidades que o exercício atende, na ordem em que foram declaradas. */
export function finalidadesDe(ex: Exercicio | undefined): Finalidade[] {
  if (!ex?.fam) return [];
  return (FINALIDADES_DA_FAMILIA[ex.fam] ?? []).map((chave) => FINALIDADES[chave]);
}

/**
 * O músculo tem que se repetir em algum lugar.
 *
 * A finalidade sozinha é generosa demais: "extensão de cotovelo" abriga tanto
 * o tríceps na polia quanto o mergulho, que para muita gente é peito. Exigir
 * que o grupo principal de um apareça no outro — como principal ou como
 * assistente — mantém a lista dentro do que você foi treinar.
 */
function musculoEmComum(a: Exercicio, b: Exercicio): boolean {
  if (a.grupo === b.grupo) return true;
  return !!a.aux?.includes(b.grupo) || !!b.aux?.includes(a.grupo);
}

/** Calculado uma vez por exercício: o catálogo é fixo em tempo de execução. */
const cache = new Map<string, Variacao[]>();

/**
 * Variações do exercício, da mais próxima à mais distante.
 *
 * A ordem é o que faz a lista útil, porque `rosca` tem 26 candidatas: primeiro
 * quem compartilha a execução, depois quem trabalha o mesmo grupo, depois quem
 * registra nas mesmas colunas — e só então o alfabeto, para a lista não dançar
 * entre duas aberturas.
 */
export function variacoesDe(exId: string): Variacao[] {
  const guardado = cache.get(exId);
  if (guardado) return guardado;

  const ex = POR_ID[exId];
  if (!ex) return [];

  const finalidades = new Set(FINALIDADES_DA_FAMILIA[ex.fam ?? ''] ?? []);
  const lista: Variacao[] = [];

  for (const outro of EXERCICIOS) {
    if (outro.id === ex.id) continue;
    const mesmaExecucao = !!ex.fam && outro.fam === ex.fam;
    if (!mesmaExecucao) {
      const serveAoMesmo = (FINALIDADES_DA_FAMILIA[outro.fam ?? ''] ?? []).some((f) =>
        finalidades.has(f),
      );
      if (!serveAoMesmo || !musculoEmComum(ex, outro)) continue;
    }
    lista.push({ ex: outro, mesmaExecucao, mesmaMedida: outro.medida === ex.medida });
  }

  lista.sort(
    (a, b) =>
      Number(b.mesmaExecucao) - Number(a.mesmaExecucao) ||
      Number(b.ex.grupo === ex.grupo) - Number(a.ex.grupo === ex.grupo) ||
      Number(b.mesmaMedida) - Number(a.mesmaMedida) ||
      a.ex.nome.localeCompare(b.ex.nome, 'pt-BR'),
  );

  cache.set(exId, lista);
  return lista;
}
