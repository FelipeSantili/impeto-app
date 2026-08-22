import type { Rotina } from '@/store/treino';

/**
 * Modelos de treino prontos.
 *
 * São rotinas de partida: ao usar um modelo, o app copia os itens para as
 * rotinas do usuário — dali em diante ele edita à vontade, sem vínculo com o
 * original. Divisões clássicas, com séries e descansos sensatos por padrão.
 */
export interface Modelo {
  id: string;
  nome: string;
  /** Uma linha dizendo o que o treino cobre. */
  foco: string;
  itens: Rotina['itens'][number][];
}

export interface Programa {
  id: string;
  nome: string;
  /** Frequência sugerida, ex.: "4x por semana". */
  freq: string;
  descricao: string;
  modelos: Modelo[];
}

const m = (exId: string, series: number, descanso: number) => ({ exId, series, descanso });

export const PROGRAMAS: Programa[] = [
  {
    id: 'upper-lower',
    nome: 'Upper · Lower',
    freq: '4x por semana',
    descricao: 'Metade superior e metade inferior em dias alternados. O clássico de quem quer frequência 2x por músculo.',
    modelos: [
      {
        id: 'upper-a',
        nome: 'Upper A',
        foco: 'Peito, costas e ombros — ênfase em força',
        itens: [
          m('supino-reto-barra', 4, 120),
          m('remada-curvada-barra', 4, 120),
          m('desenvolvimento-halter', 3, 90),
          m('puxada-frente', 3, 90),
          m('elevacao-lateral', 3, 45),
          m('triceps-corda', 3, 60),
          m('rosca-direta-barra', 3, 60),
        ],
      },
      {
        id: 'lower-a',
        nome: 'Lower A',
        foco: 'Quadríceps na frente do palco',
        itens: [
          m('agachamento-livre', 4, 150),
          m('leg-press-45', 3, 120),
          m('cadeira-extensora', 3, 60),
          m('mesa-flexora', 3, 60),
          m('panturrilha-em-pe', 4, 45),
          m('abdominal-cabo', 3, 60),
        ],
      },
      {
        id: 'upper-b',
        nome: 'Upper B',
        foco: 'Superior com ângulos diferentes do dia A',
        itens: [
          m('supino-inclinado-halter', 4, 90),
          m('remada-baixa', 4, 90),
          m('desenvolvimento-militar', 3, 120),
          m('puxada-supinada', 3, 90),
          m('crucifixo-inverso-halter', 3, 45),
          m('rosca-martelo', 3, 60),
          m('triceps-frances-corda', 3, 60),
        ],
      },
      {
        id: 'lower-b',
        nome: 'Lower B',
        foco: 'Posterior e glúteos no comando',
        itens: [
          m('terra-romeno', 4, 120),
          m('bulgaro-halteres', 3, 90),
          m('cadeira-flexora', 3, 60),
          m('elevacao-pelvica', 3, 90),
          m('cadeira-abdutora', 3, 45),
          m('panturrilha-sentado', 4, 45),
        ],
      },
    ],
  },
  {
    id: 'ppl',
    nome: 'Push · Pull · Legs',
    freq: '3 a 6x por semana',
    descricao: 'Empurrar, puxar e pernas. Rode uma vez por semana ou duas, conforme a agenda.',
    modelos: [
      {
        id: 'push',
        nome: 'Push',
        foco: 'Peito, ombros e tríceps',
        itens: [
          m('supino-reto-barra', 4, 120),
          m('desenvolvimento-halter', 3, 90),
          m('supino-inclinado-halter', 3, 90),
          m('elevacao-lateral', 4, 45),
          m('triceps-corda', 3, 60),
          m('triceps-frances-halter', 3, 60),
        ],
      },
      {
        id: 'pull',
        nome: 'Pull',
        foco: 'Costas, trapézio e bíceps',
        itens: [
          m('puxada-frente', 4, 90),
          m('remada-curvada-barra', 4, 120),
          m('remada-serrote', 3, 90),
          m('face-pull', 3, 45),
          m('rosca-direta-w', 3, 60),
          m('rosca-martelo', 3, 60),
        ],
      },
      {
        id: 'legs',
        nome: 'Legs',
        foco: 'Pernas completas e abdômen',
        itens: [
          m('agachamento-livre', 4, 150),
          m('leg-press-45', 3, 120),
          m('mesa-flexora', 3, 60),
          m('cadeira-extensora', 3, 60),
          m('panturrilha-em-pe', 4, 45),
          m('abdominal-supra', 3, 45),
        ],
      },
    ],
  },
  {
    id: 'abc',
    nome: 'ABC clássico',
    freq: '3x por semana',
    descricao: 'A divisão mais comum das academias brasileiras: peito e tríceps, costas e bíceps, pernas e ombros.',
    modelos: [
      {
        id: 'abc-a',
        nome: 'Treino A',
        foco: 'Peito e tríceps',
        itens: [
          m('supino-reto-barra', 4, 120),
          m('supino-inclinado-halter', 3, 90),
          m('voador-peck-deck', 3, 60),
          m('crossover-alto', 3, 60),
          m('triceps-corda', 3, 60),
          m('triceps-testa-w', 3, 60),
        ],
      },
      {
        id: 'abc-b',
        nome: 'Treino B',
        foco: 'Costas e bíceps',
        itens: [
          m('puxada-frente', 4, 90),
          m('remada-curvada-barra', 4, 120),
          m('remada-baixa', 3, 90),
          m('pulldown-braco-reto', 3, 60),
          m('rosca-direta-w', 3, 60),
          m('rosca-concentrada', 3, 60),
        ],
      },
      {
        id: 'abc-c',
        nome: 'Treino C',
        foco: 'Pernas e ombros',
        itens: [
          m('agachamento-livre', 4, 150),
          m('leg-press-45', 3, 120),
          m('mesa-flexora', 3, 60),
          m('panturrilha-em-pe', 4, 45),
          m('desenvolvimento-halter', 3, 90),
          m('elevacao-lateral', 4, 45),
        ],
      },
    ],
  },
  {
    id: 'fullbody',
    nome: 'Full Body',
    freq: '2 a 3x por semana',
    descricao: 'O corpo inteiro em cada sessão. Ideal para quem treina poucas vezes na semana.',
    modelos: [
      {
        id: 'full-a',
        nome: 'Full Body A',
        foco: 'Básicos com barra',
        itens: [
          m('agachamento-livre', 3, 150),
          m('supino-reto-barra', 3, 120),
          m('remada-curvada-barra', 3, 120),
          m('desenvolvimento-halter', 3, 90),
          m('rosca-direta-barra', 2, 60),
          m('prancha', 3, 45),
        ],
      },
      {
        id: 'full-b',
        nome: 'Full Body B',
        foco: 'Variação com máquinas e halteres',
        itens: [
          m('leg-press-45', 3, 120),
          m('supino-inclinado-halter', 3, 90),
          m('puxada-frente', 3, 90),
          m('stiff-barra', 3, 90),
          m('elevacao-lateral', 3, 45),
          m('abdominal-infra', 3, 45),
        ],
      },
    ],
  },
  {
    id: 'adaptacao',
    nome: 'Primeiras semanas',
    freq: '2 a 3x por semana',
    descricao: 'Só máquinas, movimentos guiados. Para quem está começando ou voltando de uma pausa longa.',
    modelos: [
      {
        id: 'adapta-a',
        nome: 'Adaptação A',
        foco: 'Corpo inteiro nas máquinas',
        itens: [
          m('leg-press-45', 3, 90),
          m('supino-reto-maquina', 3, 90),
          m('puxada-frente', 3, 90),
          m('cadeira-extensora', 2, 60),
          m('desenvolvimento-maquina', 2, 60),
          m('abdominal-maquina', 2, 45),
        ],
      },
      {
        id: 'adapta-b',
        nome: 'Adaptação B',
        foco: 'Corpo inteiro, ângulos complementares',
        itens: [
          m('cadeira-flexora', 3, 60),
          m('voador-peck-deck', 3, 60),
          m('remada-articulada', 3, 90),
          m('cadeira-abdutora', 2, 45),
          m('panturrilha-leg-press', 2, 45),
          m('puxada-triangulo', 2, 60),
        ],
      },
    ],
  },
];

export const MODELO_POR_ID: Record<string, { modelo: Modelo; programa: Programa }> =
  Object.fromEntries(
    PROGRAMAS.flatMap((p) => p.modelos.map((mo) => [mo.id, { modelo: mo, programa: p }])),
  );
