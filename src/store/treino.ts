import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { POR_ID } from '@/data/exercicios';

export type TipoSerie =
  | 'normal'
  | 'aquecimento'
  | 'falha'
  | 'drop'
  | 'rest_pause'
  | 'bi_set'
  | 'isometrica'
  | 'negativa'
  | 'parcial'
  | 'cluster';

export interface Serie {
  id: string;
  /** Carga em kg. Em cardio, guarda a distância em km. */
  peso: number | null;
  /** Repetições. Em exercícios por tempo, guarda os segundos. */
  reps: number | null;
  feita: boolean;
  tipo: TipoSerie;
}

export interface ExercicioTreino {
  /** Identidade da linha dentro do treino — permite o mesmo exercício duas vezes. */
  uid: string;
  exId: string;
  series: Serie[];
  nota?: string;
  /** Descanso alvo em segundos; 0 desliga o cronômetro. */
  descanso: number;
}

/**
 * Frequência cardíaca do treino, vinda da cinta, do Health Connect ou de um
 * arquivo .tcx exportado pelo relógio.
 *
 * Quase tudo é opcional porque cada fonte entrega um pedaço diferente: a cinta
 * dá a curva batida a batida e nenhuma caloria; o .tcx de musculação do Mi
 * Fitness dá calorias e média, mas nem máxima nem curva. Campo ausente é dado
 * que não existe — nunca zero.
 */
export interface Cardio {
  media?: number | null;
  maxima?: number | null;
  calorias?: number | null;
  /** Só as calorias de esforço, quando a fonte separa das totais. */
  caloriasAtivas?: number | null;
  /** Duração cronometrada pelo relógio, em segundos. */
  duracaoSeg?: number | null;
  /** Distância medida pelo relógio. Só vem em atividade ao ar livre. */
  distanciaKm?: number | null;
  /** Curva de FC reamostrada em pontos igualmente espaçados no tempo. */
  curva?: number[];
  /** De onde vieram os dados — muda o rótulo mostrado no relatório. */
  fonte: 'cinta' | 'saude' | 'relogio';
  /** Nome do .tcx de origem. Impede reimportar o mesmo arquivo em cima. */
  arquivo?: string;
}

export interface Sessao {
  id: string;
  nome: string;
  inicio: number;
  fim?: number;
  exercicios: ExercicioTreino[];
  rotinaId?: string;
  cardio?: Cardio;
}

export interface Rotina {
  id: string;
  nome: string;
  itens: { exId: string; series: number; descanso: number }[];
  criadaEm: number;
}

interface Estado {
  rotinas: Rotina[];
  historico: Sessao[];
  ativa: Sessao | null;
  /** Descanso padrão aplicado a exercícios recém-adicionados. */
  descansoPadrao: number;
  hidratado: boolean;

  iniciarVazio: (nome?: string) => void;
  iniciarDeRotina: (rotinaId: string) => void;
  descartar: () => void;
  finalizar: (cardio?: Cardio) => Sessao | null;
  anexarCardio: (id: string, cardio: Cardio) => void;
  renomearAtiva: (nome: string) => void;

  addExercicios: (exIds: string[]) => void;
  removerExercicio: (uid: string) => void;
  moverExercicio: (uid: string, dir: -1 | 1) => void;
  substituirExercicio: (uid: string, novoExId: string) => void;
  setNota: (uid: string, nota: string) => void;
  setDescanso: (uid: string, seg: number) => void;

  addSerie: (uid: string) => void;
  removerSerie: (uid: string, serieId: string) => void;
  editarSerie: (uid: string, serieId: string, campo: 'peso' | 'reps', valor: number | null) => void;
  alternarFeita: (uid: string, serieId: string) => boolean;
  definirTipo: (uid: string, serieId: string, tipo: TipoSerie) => void;

  salvarRotina: (nome: string, itens: Rotina['itens'], id?: string) => string;
  apagarRotina: (id: string) => void;
  rotinaDaAtiva: (nome: string) => void;
  apagarSessao: (id: string) => void;
}

const CHAVE = 'impeto-v1';
/** Chave usada quando o app se chamava Forja. Lida uma vez, depois descartada. */
const CHAVE_ANTIGA = 'forja-v1';

/**
 * Armazenamento com resgate da chave antiga.
 *
 * O app foi renomeado depois que já havia treinos gravados. Na primeira leitura
 * sob a chave nova, se ela estiver vazia, buscamos a antiga e a promovemos —
 * assim ninguém perde histórico por causa da troca de nome.
 */
const armazenamento = {
  getItem: async (nome: string) => {
    const atual = await AsyncStorage.getItem(nome);
    if (atual !== null) return atual;
    const antigo = await AsyncStorage.getItem(CHAVE_ANTIGA);
    if (antigo === null) return null;
    await AsyncStorage.setItem(nome, antigo);
    await AsyncStorage.removeItem(CHAVE_ANTIGA);
    return antigo;
  },
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
};

const uid = (() => {
  let n = 0;
  return () => `${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
})();

function serieVazia(tipo: TipoSerie = 'normal'): Serie {
  return { id: uid(), peso: null, reps: null, feita: false, tipo };
}

function novoExercicio(exId: string, series: number, descanso: number): ExercicioTreino {
  return {
    uid: uid(),
    exId,
    descanso,
    series: Array.from({ length: Math.max(1, series) }, () => serieVazia()),
  };
}

/** Aplica `fn` ao exercício `alvo` da sessão ativa, devolvendo um novo estado. */
function mapAtiva(
  s: Estado,
  alvo: string,
  fn: (e: ExercicioTreino) => ExercicioTreino,
): Partial<Estado> {
  if (!s.ativa) return {};
  return {
    ativa: {
      ...s.ativa,
      exercicios: s.ativa.exercicios.map((e) => (e.uid === alvo ? fn(e) : e)),
    },
  };
}

function nomePadrao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Treino da manhã';
  if (h < 18) return 'Treino da tarde';
  return 'Treino da noite';
}

export const useTreino = create<Estado>()(
  persist(
    (set, get) => ({
      rotinas: [],
      historico: [],
      ativa: null,
      descansoPadrao: 90,
      hidratado: false,

      iniciarVazio: (nome) =>
        set({
          ativa: {
            id: uid(),
            nome: nome?.trim() || nomePadrao(),
            inicio: Date.now(),
            exercicios: [],
          },
        }),

      iniciarDeRotina: (rotinaId) => {
        const r = get().rotinas.find((x) => x.id === rotinaId);
        if (!r) return;
        set({
          ativa: {
            id: uid(),
            nome: r.nome,
            inicio: Date.now(),
            rotinaId: r.id,
            exercicios: r.itens.map((i) => novoExercicio(i.exId, i.series, i.descanso)),
          },
        });
      },

      descartar: () => set({ ativa: null }),

      finalizar: (cardio) => {
        const a = get().ativa;
        if (!a) return null;
        // Séries em branco não viram registro — só o que foi marcado conta.
        const exercicios = a.exercicios
          .map((e) => ({ ...e, series: e.series.filter((s) => s.feita) }))
          .filter((e) => e.series.length > 0);
        if (exercicios.length === 0) {
          set({ ativa: null });
          return null;
        }
        const sessao: Sessao = { ...a, exercicios, fim: Date.now(), cardio };
        set((s) => ({ ativa: null, historico: [sessao, ...s.historico] }));
        return sessao;
      },

      anexarCardio: (id, cardio) =>
        set((s) => ({
          historico: s.historico.map((h) => (h.id === id ? { ...h, cardio } : h)),
        })),

      renomearAtiva: (nome) =>
        set((s) => (s.ativa ? { ativa: { ...s.ativa, nome } } : {})),

      addExercicios: (exIds) =>
        set((s) => {
          if (!s.ativa) return {};
          const novos = exIds
            .filter((id) => POR_ID[id])
            .map((id) => novoExercicio(id, 3, s.descansoPadrao));
          return { ativa: { ...s.ativa, exercicios: [...s.ativa.exercicios, ...novos] } };
        }),

      removerExercicio: (alvo) =>
        set((s) =>
          s.ativa
            ? { ativa: { ...s.ativa, exercicios: s.ativa.exercicios.filter((e) => e.uid !== alvo) } }
            : {},
        ),

      moverExercicio: (alvo, dir) =>
        set((s) => {
          if (!s.ativa) return {};
          const lista = [...s.ativa.exercicios];
          const i = lista.findIndex((e) => e.uid === alvo);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= lista.length) return {};
          [lista[i], lista[j]] = [lista[j], lista[i]];
          return { ativa: { ...s.ativa, exercicios: lista } };
        }),

      /*
       * Troca o exercício de uma linha do treino por outro — a variação que
       * você escolheu porque a máquina estava ocupada.
       *
       * Viajam para o exercício novo as séries EM BRANCO: mesma quantidade,
       * mesma técnica, valores zerados. Carga de outro exercício não vale aqui,
       * e a coluna "anterior" passa a mostrar o histórico do exercício novo
       * sozinha. A anotação também não viaja — "pino 4, banco na altura 3" era
       * daquela máquina.
       *
       * Série já MARCADA não viaja de jeito nenhum: ela é registro do que foi
       * feito, e trocar o nome em cima dela seria mentir no relatório. Quando
       * existe alguma, a linha se parte em duas — o que foi feito continua no
       * exercício antigo, o que falta segue no novo, logo abaixo.
       */
      substituirExercicio: (alvo, novoExId) =>
        set((s) => {
          if (!s.ativa || !POR_ID[novoExId]) return {};
          const lista = s.ativa.exercicios;
          const i = lista.findIndex((e) => e.uid === alvo);
          if (i < 0 || lista[i].exId === novoExId) return {};

          const atual = lista[i];
          const feitas = atual.series.filter((x) => x.feita);
          const pendentes = atual.series.filter((x) => !x.feita);
          // Exercício todo concluído: o substituto entra com uma série em branco.
          const molde = pendentes.length ? pendentes : [serieVazia()];
          const series = molde.map((x) => serieVazia(x.tipo));

          const exercicios = [...lista];
          if (feitas.length === 0) {
            exercicios[i] = {
              uid: atual.uid,
              exId: novoExId,
              descanso: atual.descanso,
              series,
            };
          } else {
            exercicios[i] = { ...atual, series: feitas };
            exercicios.splice(i + 1, 0, {
              uid: uid(),
              exId: novoExId,
              descanso: atual.descanso,
              series,
            });
          }
          return { ativa: { ...s.ativa, exercicios } };
        }),

      setNota: (alvo, nota) => set((s) => mapAtiva(s, alvo, (e) => ({ ...e, nota }))),

      setDescanso: (alvo, seg) => set((s) => mapAtiva(s, alvo, (e) => ({ ...e, descanso: seg }))),

      addSerie: (alvo) =>
        set((s) =>
          mapAtiva(s, alvo, (e) => {
            // A nova série herda a carga da anterior — é o palpite certo na maioria das vezes.
            const ult = e.series[e.series.length - 1];
            const nova = serieVazia();
            if (ult) {
              nova.peso = ult.peso;
              nova.reps = ult.reps;
            }
            return { ...e, series: [...e.series, nova] };
          }),
        ),

      removerSerie: (alvo, serieId) =>
        set((s) =>
          mapAtiva(s, alvo, (e) => ({ ...e, series: e.series.filter((x) => x.id !== serieId) })),
        ),

      editarSerie: (alvo, serieId, campo, valor) =>
        set((s) =>
          mapAtiva(s, alvo, (e) => ({
            ...e,
            series: e.series.map((x) => (x.id === serieId ? { ...x, [campo]: valor } : x)),
          })),
        ),

      alternarFeita: (alvo, serieId) => {
        let virouFeita = false;
        set((s) =>
          mapAtiva(s, alvo, (e) => {
            const i = e.series.findIndex((x) => x.id === serieId);
            if (i < 0) return e;

            const atual = e.series[i];
            virouFeita = !atual.feita;
            const series = [...e.series];
            series[i] = { ...atual, feita: virouFeita };

            /*
             * A carga marcada desce para a próxima série.
             *
             * Quem treina repete a carga: você ajusta uma vez no primeiro
             * trabalho do exercício e as seguintes saem iguais. Antes, cada
             * série nascia vazia e caía no desempenho da SESSÃO PASSADA, o que
             * está errado no dia em que você sobe ou desce a carga — a
             * sugestão continuava mostrando a semana anterior enquanto você já
             * tinha decidido outra coisa hoje.
             *
             * Só preenche campo VAZIO, e só na série imediatamente seguinte: o
             * que você digitou à mão em uma série adiante é uma decisão, não um
             * espaço em branco esperando palpite. Como cada série propaga ao
             * ser marcada, a carga cascateia sozinha pelo exercício inteiro sem
             * nunca sobrescrever nada.
             */
            const prox = series[i + 1];
            if (virouFeita && prox && !prox.feita) {
              const herdada = { ...prox };
              if (herdada.peso === null) herdada.peso = atual.peso;
              if (herdada.reps === null) herdada.reps = atual.reps;
              series[i + 1] = herdada;
            }

            return { ...e, series };
          }),
        );
        return virouFeita;
      },

      definirTipo: (alvo, serieId, tipo) =>
        set((s) =>
          mapAtiva(s, alvo, (e) => ({
            ...e,
            series: e.series.map((x) => (x.id === serieId ? { ...x, tipo } : x)),
          })),
        ),

      salvarRotina: (nome, itens, id) => {
        const rid = id ?? uid();
        set((s) => {
          const r: Rotina = {
            id: rid,
            nome: nome.trim() || 'Rotina sem nome',
            itens,
            criadaEm: s.rotinas.find((x) => x.id === rid)?.criadaEm ?? Date.now(),
          };
          const existe = s.rotinas.some((x) => x.id === rid);
          return {
            rotinas: existe ? s.rotinas.map((x) => (x.id === rid ? r : x)) : [...s.rotinas, r],
          };
        });
        return rid;
      },

      apagarRotina: (id) => set((s) => ({ rotinas: s.rotinas.filter((r) => r.id !== id) })),

      rotinaDaAtiva: (nome) => {
        const a = get().ativa;
        if (!a) return;
        get().salvarRotina(
          nome,
          a.exercicios.map((e) => ({
            exId: e.exId,
            series: e.series.length,
            descanso: e.descanso,
          })),
        );
      },

      apagarSessao: (id) => set((s) => ({ historico: s.historico.filter((h) => h.id !== id) })),
    }),
    {
      name: CHAVE,
      storage: createJSONStorage(() => armazenamento),
      partialize: (s) => ({
        rotinas: s.rotinas,
        historico: s.historico,
        ativa: s.ativa,
        descansoPadrao: s.descansoPadrao,
      }),
      // `hidratado` fica fora do `partialize` de propósito: ele descreve esta
      // execução, não os dados salvos. Serve para segurar a splash até os
      // treinos estarem em memória.
      onRehydrateStorage: () => () => {
        useTreino.setState({ hidratado: true });
      },
    },
  ),
);
