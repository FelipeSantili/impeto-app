import { useEffect, useState } from 'react';
import {
  aoReceberComando,
  drenarFila,
  publicarSessao,
  relogioDisponivel,
  relogiosConectados,
} from '../../modules/impeto-pulso';
import { POR_ID } from '@/data/exercicios';
import type { Grupo, Medida } from '@/data/types';
import { useTreino, type Rotina, type Sessao, type TipoSerie } from '@/store/treino';

/**
 * O ÍMPETO NO PULSO — o contrato entre o celular e o relógio.
 *
 * Este arquivo é a única definição do que atravessa a ponte. Os dois lados
 * nativos (Kotlin do celular, Kotlin do relógio) só carregam texto; quem sabe o
 * que o texto significa é este módulo e o `Protocolo.kt` do relógio, que é a
 * tradução literal do que está aqui. Mudou um campo, mudam os dois — e só os
 * dois.
 *
 * ─── Quem manda ──────────────────────────────────────────────────────────────
 *
 * O celular. Sempre. O relógio não guarda treino: ele manda COMANDO e desenha o
 * RETRATO que volta.
 *
 * A alternativa — os dois escrevendo no mesmo estado — parece simétrica e
 * elegante até a primeira desconexão. O canal é Bluetooth, e Bluetooth cai:
 * dois donos numa rede que cai é resolução de conflito para cada série marcada,
 * e o preço de errar a reconciliação é carga registrada que some. Um dono só, e
 * a pergunta não se coloca.
 */

// ──────────────────────────────  O que vai  ──────────────────────────────

/** Uma série, como o relógio precisa vê-la. */
export interface SerieRetrato {
  id: string;
  peso: number | null;
  reps: number | null;
  feita: boolean;
  tipo: TipoSerie;
}

/**
 * Um exercício no retrato.
 *
 * O NOME vem resolvido do catálogo, não o `exId`: o relógio não carrega o
 * catálogo de exercícios, e não vai carregar — são milhares de linhas para uma
 * tela que mostra um nome por vez.
 */
export interface ExercicioRetrato {
  uid: string;
  nome: string;
  grupo: Grupo;
  medida: Medida;
  descanso: number;
  series: SerieRetrato[];
}

/**
 * Uma rotina, como o relógio precisa vê-la.
 *
 * Só a contagem, não os exercícios: a lista serve para ESCOLHER qual treino
 * começar, e ninguém escolhe lendo dezoito nomes numa tela de quatro
 * centímetros. Depois de começado, o retrato da sessão traz tudo.
 */
export interface RotinaRetrato {
  id: string;
  nome: string;
  exercicios: number;
  series: number;
}

/** O estado inteiro que o relógio desenha. `sessao: null` = nada aberto. */
export interface Retrato {
  sessao: {
    id: string;
    nome: string;
    inicio: number;
    exercicios: ExercicioRetrato[];
  } | null;
  /** Os modelos de treino salvos, para começar um sem tocar no celular. */
  rotinas: RotinaRetrato[];
}

// ─────────────────────────────  O que volta  ─────────────────────────────

/**
 * Um comando do relógio.
 *
 * Todo comando carrega `id` porque a entrega tem DOIS caminhos — o evento ao
 * vivo e a fila em disco — e nada garante que um comando não percorra os dois.
 * `marcar` é uma inversão: aplicá-lo duas vezes desmarca a série que o usuário
 * acabou de marcar, e ele não teria como saber por quê.
 */
export type Comando =
  | { id: string; tipo: 'iniciar'; nome?: string }
  | { id: string; tipo: 'iniciarRotina'; rotinaId: string }
  | { id: string; tipo: 'marcar'; uid: string; serieId: string }
  | {
      id: string;
      tipo: 'editar';
      uid: string;
      serieId: string;
      campo: 'peso' | 'reps';
      valor: number | null;
    }
  | { id: string; tipo: 'addSerie'; uid: string }
  | { id: string; tipo: 'finalizar' };

// ───────────────────────────────  Retrato  ───────────────────────────────

/** Monta o retrato a partir do estado do treino. */
export function retratoDe(sessao: Sessao | null, rotinas: Rotina[]): Retrato {
  const modelos = rotinas.map((r) => ({
    id: r.id,
    nome: r.nome,
    exercicios: r.itens.length,
    series: r.itens.reduce((t, i) => t + i.series, 0),
  }));
  if (!sessao) return { sessao: null, rotinas: modelos };
  return {
    rotinas: modelos,
    sessao: {
      id: sessao.id,
      nome: sessao.nome,
      inicio: sessao.inicio,
      exercicios: sessao.exercicios.map((e) => {
        const ex = POR_ID[e.exId];
        return {
          uid: e.uid,
          nome: ex?.nome ?? e.exId,
          grupo: ex?.grupo ?? 'corpo',
          medida: ex?.medida ?? 'peso_rep',
          descanso: e.descanso,
          series: e.series.map((s) => ({
            id: s.id,
            peso: s.peso,
            reps: s.reps,
            feita: s.feita,
            tipo: s.tipo,
          })),
        };
      }),
    },
  };
}

// ──────────────────────────────  Comandos  ───────────────────────────────

/**
 * Comandos já aplicados.
 *
 * Vive em memória e não em disco de propósito: a fila em disco é drenada uma
 * vez, na montagem, e some. O que este conjunto protege é a janela em que os
 * dois caminhos de entrega se cruzam — segundos, dentro de uma execução do app.
 */
const aplicados = new Set<string>();

/** Teto do conjunto de vistos. Um treino longo não passa de algumas centenas. */
const TETO_VISTOS = 500;

function jaAplicado(id: string): boolean {
  if (aplicados.has(id)) return true;
  aplicados.add(id);
  if (aplicados.size > TETO_VISTOS) {
    // `Set` itera na ordem de inserção: o primeiro é o mais velho.
    const velho = aplicados.values().next().value;
    if (velho !== undefined) aplicados.delete(velho);
  }
  return false;
}

/**
 * Aplica um comando ao treino aberto.
 *
 * Tudo aqui é tolerante a comando que não faz mais sentido — o relógio pode ter
 * mandado "marca a terceira série" de um treino que o usuário já finalizou no
 * celular. Nesses casos o comando é DESCARTADO em silêncio: reclamar de um
 * comando velho numa tela que a pessoa não está olhando não ajuda ninguém.
 */
export function aplicar(cmd: Comando): void {
  if (jaAplicado(cmd.id)) return;
  const s = useTreino.getState();

  // Os dois jeitos de começar. Já há treino aberto: o relógio provavelmente não
  // sabia. Manter o que está em curso é sempre a escolha certa — o outro caminho
  // descarta séries que alguém acabou de fazer.
  if (cmd.tipo === 'iniciar') {
    if (s.ativa) return;
    s.iniciarVazio(cmd.nome);
    return;
  }

  if (cmd.tipo === 'iniciarRotina') {
    if (s.ativa) return;
    // Rotina apagada no celular entre o retrato e o toque. Silêncio: o próximo
    // retrato já vai sem ela, e a lista do relógio se conserta sozinha.
    if (!s.rotinas.some((r) => r.id === cmd.rotinaId)) return;
    s.iniciarDeRotina(cmd.rotinaId);
    return;
  }

  if (!s.ativa) return;

  switch (cmd.tipo) {
    case 'marcar':
      if (temSerie(cmd.uid, cmd.serieId)) s.alternarFeita(cmd.uid, cmd.serieId);
      return;
    case 'editar':
      if (temSerie(cmd.uid, cmd.serieId)) {
        s.editarSerie(cmd.uid, cmd.serieId, cmd.campo, cmd.valor);
      }
      return;
    case 'addSerie':
      if (s.ativa.exercicios.some((e) => e.uid === cmd.uid)) s.addSerie(cmd.uid);
      return;
    case 'finalizar':
      s.finalizar();
      return;
  }
}

/** O par exercício/série ainda existe no treino aberto? */
function temSerie(uid: string, serieId: string): boolean {
  const ativa = useTreino.getState().ativa;
  const ex = ativa?.exercicios.find((e) => e.uid === uid);
  return !!ex?.series.some((x) => x.id === serieId);
}

/** Lê um comando cru da ponte. `null` quando o texto não é um comando. */
export function lerComando(json: string): Comando | null {
  try {
    const c = JSON.parse(json) as Comando;
    return typeof c?.id === 'string' && typeof c?.tipo === 'string' ? c : null;
  } catch {
    return null;
  }
}

// ────────────────────────────────  Ligação  ──────────────────────────────

/**
 * Espera antes de publicar o retrato.
 *
 * Digitar carga no celular dispara uma mudança de store por TECLA. Publicar
 * cada uma seria uma escrita de Data Layer por dígito, num canal que é
 * Bluetooth — e o relógio veria "8", "82", "82,5" piscando. Um quarto de
 * segundo de silêncio é o bastante para o dedo parar, e curto o bastante para
 * marcar uma série continuar parecendo instantâneo do outro lado.
 */
const ESPERA_MS = 250;

/**
 * Mantém o relógio em dia com o treino aberto, e aplica o que vem dele.
 *
 * Montado uma vez, na moldura do app. Não desenha nada.
 */
export function usarPulso(): void {
  useEffect(() => {
    if (!relogioDisponivel) return;

    let vivo = true;

    // O que chegou com o app fechado, antes de qualquer coisa: são comandos
    // mais VELHOS que qualquer um que chegue ao vivo daqui em diante, e aplicar
    // fora de ordem inverteria séries.
    drenarFila().then((guardados) => {
      if (!vivo) return;
      for (const bruto of guardados) {
        const cmd = lerComando(bruto);
        if (cmd) aplicar(cmd);
      }
      publicar();
    });

    const assinatura = aoReceberComando((bruto) => {
      const cmd = lerComando(bruto);
      if (cmd) aplicar(cmd);
    });

    let relogio: ReturnType<typeof setTimeout> | null = null;
    let ultimo = '';

    function publicar() {
      const e = useTreino.getState();
      const json = JSON.stringify(retratoDe(e.ativa, e.rotinas));
      // O Data Layer já deduplica por conteúdo do outro lado; comparar aqui
      // evita até a travessia da ponte, que é o caro.
      if (json === ultimo) return;
      ultimo = json;
      publicarSessao(json).catch(() => {
        // Relógio fora de alcance. O Data Layer guarda e entrega quando ele
        // voltar — não há nada a fazer, e nada a dizer ao usuário.
      });
    }

    const desassinar = useTreino.subscribe(() => {
      if (relogio) clearTimeout(relogio);
      relogio = setTimeout(publicar, ESPERA_MS);
    });

    publicar();

    return () => {
      vivo = false;
      if (relogio) clearTimeout(relogio);
      assinatura?.remove();
      desassinar();
    };
  }, []);
}

/**
 * Que relógio está ao alcance AGORA, para a tela de ajustes dizer.
 *
 * Perguntado por sondagem e não por evento, e é uma escolha: o Data Layer avisa
 * quando um nó entra ou sai, mas assinar isso obriga a manter um ouvinte vivo
 * enquanto a tela existe, para uma informação que muda uma vez por dia. Oito
 * segundos numa tela que ninguém deixa aberta é mais barato que o ouvinte.
 *
 * A lista vem vazia por três motivos que a tela não distingue, de propósito:
 * não há relógio pareado, há mas está fora de alcance, ou há e está ao alcance
 * mas SEM o Ímpeto instalado. Para quem lê "nenhum relógio", os três pedem a
 * mesma coisa — ir ver o relógio.
 */
export function usarRelogio(): { nomes: string[]; verificando: boolean } {
  const [nomes, setNomes] = useState<string[]>([]);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (!relogioDisponivel) {
      setVerificando(false);
      return;
    }
    let vivo = true;
    const perguntar = () =>
      relogiosConectados().then((r) => {
        if (!vivo) return;
        setNomes(r);
        setVerificando(false);
      });
    perguntar();
    const relogio = setInterval(perguntar, 8000);
    return () => {
      vivo = false;
      clearInterval(relogio);
    };
  }, []);

  return { nomes, verificando };
}
