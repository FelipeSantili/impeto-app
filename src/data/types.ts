export type Grupo =
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'antebraco'
  | 'trapezio'
  | 'lombar'
  | 'quadriceps'
  | 'posterior'
  | 'gluteos'
  | 'panturrilha'
  | 'abdomen'
  | 'corpo'
  | 'cardio';

export type Equip =
  | 'maquina'
  | 'smith'
  | 'cabo'
  | 'barra'
  | 'halter'
  | 'kettlebell'
  | 'anilha'
  | 'corporal'
  | 'elastico'
  | 'cardio'
  | 'outro';

/** Como as séries deste exercício são registradas. */
export type Medida = 'peso_rep' | 'rep' | 'tempo' | 'dist_tempo' | 'peso_tempo';

export interface Exercicio {
  id: string;
  nome: string;
  grupo: Grupo;
  equip: Equip;
  /** Grupos assistentes, na ordem de relevância. */
  aux?: Grupo[];
  /** Pasta no free-exercise-db — origem dos dois quadros da demonstração. */
  img?: string;
  /** Chave da família de execução em `familias`. */
  fam?: string;
  medida: Medida;
  /** Exercício unilateral: as séries valem por lado. */
  unilateral?: boolean;
}

export const GRUPO_LABEL: Record<Grupo, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebraco: 'Antebraço',
  trapezio: 'Trapézio',
  lombar: 'Lombar',
  quadriceps: 'Quadríceps',
  posterior: 'Posterior',
  gluteos: 'Glúteos',
  panturrilha: 'Panturrilha',
  abdomen: 'Abdômen',
  corpo: 'Corpo inteiro',
  cardio: 'Cardio',
};

export const EQUIP_LABEL: Record<Equip, string> = {
  maquina: 'Máquina',
  smith: 'Smith',
  cabo: 'Cabo',
  barra: 'Barra',
  halter: 'Halteres',
  kettlebell: 'Kettlebell',
  anilha: 'Anilha',
  corporal: 'Peso corporal',
  elastico: 'Elástico',
  cardio: 'Cardio',
  outro: 'Outro',
};

/**
 * Rótulos das duas colunas de registro.
 * O campo de tempo é digitado em segundos (ou minutos, no cardio) porque um
 * teclado numérico simples é mais rápido do que um seletor de duração.
 */
export const MEDIDA_LABEL: Record<Medida, { a: string; b: string }> = {
  peso_rep: { a: 'KG', b: 'REPS' },
  rep: { a: 'KG+', b: 'REPS' },
  tempo: { a: 'KG', b: 'SEG' },
  dist_tempo: { a: 'KM', b: 'MIN' },
  peso_tempo: { a: 'KG', b: 'SEG' },
};

export const ORDEM_GRUPOS: Grupo[] = [
  'peito',
  'costas',
  'ombros',
  'biceps',
  'triceps',
  'quadriceps',
  'posterior',
  'gluteos',
  'panturrilha',
  'abdomen',
  'trapezio',
  'lombar',
  'antebraco',
  'corpo',
  'cardio',
];
