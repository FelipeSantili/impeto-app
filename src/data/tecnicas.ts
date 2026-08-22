import type { TipoSerie } from '@/store/treino';

/**
 * Técnicas de execução aplicáveis a uma série.
 *
 * `sigla` é o que aparece na coluna estreita da tabela de séries, então precisa
 * caber em um caractere. `contaVolume` marca as que entram no volume total:
 * aquecimento fica de fora porque não é trabalho efetivo.
 */
export interface Tecnica {
  tipo: TipoSerie;
  nome: string;
  sigla: string | null;
  cor: string;
  descricao: string;
  contaVolume: boolean;
}

export const TECNICAS: Tecnica[] = [
  {
    tipo: 'normal',
    nome: 'Série normal',
    sigla: null,
    cor: '#9C98A8',
    descricao: 'Execução padrão, com carga e repetições planejadas.',
    contaVolume: true,
  },
  {
    tipo: 'aquecimento',
    nome: 'Aquecimento',
    sigla: 'A',
    cor: '#F5B942',
    descricao: 'Carga leve para preparar a articulação. Não entra no volume.',
    contaVolume: false,
  },
  {
    tipo: 'falha',
    nome: 'Até a falha',
    sigla: 'F',
    cor: '#FF6B6B',
    descricao: 'Repetições até não conseguir completar mais nenhuma com boa forma.',
    contaVolume: true,
  },
  {
    tipo: 'drop',
    nome: 'Drop set',
    sigla: 'D',
    cor: '#4FD1C5',
    descricao: 'Chega à falha, reduz a carga na hora e continua sem descansar.',
    contaVolume: true,
  },
  {
    tipo: 'rest_pause',
    nome: 'Rest-pause',
    sigla: 'R',
    cor: '#7FA8FF',
    descricao: 'Falha, 10 a 20 segundos de pausa e mais repetições com a mesma carga.',
    contaVolume: true,
  },
  {
    tipo: 'bi_set',
    nome: 'Bi-set',
    sigla: 'B',
    cor: '#C084FC',
    descricao: 'Emendada no exercício seguinte, sem descanso entre os dois.',
    contaVolume: true,
  },
  {
    tipo: 'cluster',
    nome: 'Cluster',
    sigla: 'C',
    cor: '#F0A6D8',
    descricao: 'A série é quebrada em blocos curtos com 15 a 30 segundos entre eles.',
    contaVolume: true,
  },
  {
    tipo: 'isometrica',
    nome: 'Isometria',
    sigla: 'I',
    cor: '#8FD98F',
    descricao: 'Sustenta a posição parado por tempo, sem completar repetições.',
    contaVolume: true,
  },
  {
    tipo: 'negativa',
    nome: 'Negativa',
    sigla: 'N',
    cor: '#FFB088',
    descricao: 'Foco na fase excêntrica: desce em 3 a 5 segundos, controlando.',
    contaVolume: true,
  },
  {
    tipo: 'parcial',
    nome: 'Repetição parcial',
    sigla: 'P',
    cor: '#B8B8C8',
    descricao: 'Amplitude reduzida, geralmente após a falha na amplitude completa.',
    contaVolume: true,
  },
];

export const TECNICA_POR_TIPO: Record<TipoSerie, Tecnica> = Object.fromEntries(
  TECNICAS.map((t) => [t.tipo, t]),
) as Record<TipoSerie, Tecnica>;

/** Técnica de um tipo, com retorno seguro para dados antigos ou corrompidos. */
export function tecnicaDe(tipo: TipoSerie | undefined): Tecnica {
  return TECNICA_POR_TIPO[tipo ?? 'normal'] ?? TECNICA_POR_TIPO.normal;
}
