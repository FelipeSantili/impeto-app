import { POR_ID } from '@/data/exercicios';
import type { Grupo, Medida } from '@/data/types';
import type { ExercicioTreino, Serie, Sessao } from '@/store/treino';

/** Só séries de trabalho entram no volume — aquecimento não conta. */
function contaVolume(s: Serie): boolean {
  return s.feita && s.tipo !== 'aquecimento';
}

export function volumeSerie(s: Serie, medida: Medida): number {
  if (medida === 'dist_tempo' || medida === 'tempo' || medida === 'peso_tempo') return 0;
  return (s.peso ?? 0) * (s.reps ?? 0);
}

export function volumeExercicio(e: ExercicioTreino): number {
  const medida = POR_ID[e.exId]?.medida ?? 'peso_rep';
  return e.series.filter(contaVolume).reduce((t, s) => t + volumeSerie(s, medida), 0);
}

export function volumeSessao(s: Sessao): number {
  return s.exercicios.reduce((t, e) => t + volumeExercicio(e), 0);
}

export function seriesFeitas(s: Sessao): number {
  return s.exercicios.reduce((t, e) => t + e.series.filter((x) => x.feita).length, 0);
}

export function duracaoMs(s: Sessao): number {
  return (s.fim ?? Date.now()) - s.inicio;
}

/** Epley — estimativa de 1RM. Acima de ~12 reps a fórmula perde precisão. */
export function estimar1RM(peso: number, reps: number): number {
  if (peso <= 0 || reps <= 0) return 0;
  if (reps === 1) return peso;
  return peso * (1 + reps / 30);
}

export interface RegistroExercicio {
  sessaoId: string;
  data: number;
  nomeSessao: string;
  series: Serie[];
}

/** Todas as vezes que o exercício apareceu, da mais recente para a mais antiga. */
export function historicoDoExercicio(historico: Sessao[], exId: string): RegistroExercicio[] {
  const out: RegistroExercicio[] = [];
  for (const s of historico) {
    for (const e of s.exercicios) {
      if (e.exId !== exId) continue;
      out.push({ sessaoId: s.id, data: s.fim ?? s.inicio, nomeSessao: s.nome, series: e.series });
    }
  }
  return out.sort((a, b) => b.data - a.data);
}

export interface Recordes {
  maiorCarga: number;
  melhorSerie: { peso: number; reps: number } | null;
  melhor1RM: number;
  maiorVolumeSessao: number;
  totalSeries: number;
}

export function recordesDoExercicio(historico: Sessao[], exId: string): Recordes {
  const r: Recordes = {
    maiorCarga: 0,
    melhorSerie: null,
    melhor1RM: 0,
    maiorVolumeSessao: 0,
    totalSeries: 0,
  };
  const medida = POR_ID[exId]?.medida ?? 'peso_rep';
  for (const s of historico) {
    for (const e of s.exercicios) {
      if (e.exId !== exId) continue;
      let vol = 0;
      for (const serie of e.series) {
        if (!serie.feita) continue;
        r.totalSeries += 1;
        vol += volumeSerie(serie, medida);
        const peso = serie.peso ?? 0;
        const reps = serie.reps ?? 0;
        if (peso > r.maiorCarga) r.maiorCarga = peso;
        const rm = estimar1RM(peso, reps);
        if (rm > r.melhor1RM) {
          r.melhor1RM = rm;
          r.melhorSerie = { peso, reps };
        }
      }
      if (vol > r.maiorVolumeSessao) r.maiorVolumeSessao = vol;
    }
  }
  return r;
}

/** Séries do último treino em que o exercício apareceu — vira o placeholder "anterior". */
export function ultimaExecucao(historico: Sessao[], exId: string): Serie[] | null {
  for (const s of historico) {
    const e = s.exercicios.find((x) => x.exId === exId);
    if (e && e.series.length) return e.series;
  }
  return null;
}

export interface ResumoSemana {
  treinos: number;
  volume: number;
  minutos: number;
  /** Segunda a domingo: houve treino naquele dia? */
  dias: boolean[];
}

export function resumoDaSemana(historico: Sessao[], agora = Date.now()): ResumoSemana {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0 = domingo. Deslocamos para a semana começar na segunda.
  const desloc = (d.getDay() + 6) % 7;
  const inicio = d.getTime() - desloc * 86400000;

  const dias = [false, false, false, false, false, false, false];
  let treinos = 0;
  let volume = 0;
  let minutos = 0;

  for (const s of historico) {
    const t = s.fim ?? s.inicio;
    if (t < inicio) continue;
    const idx = Math.floor((t - inicio) / 86400000);
    if (idx < 0 || idx > 6) continue;
    dias[idx] = true;
    treinos += 1;
    volume += volumeSessao(s);
    minutos += Math.round(duracaoMs(s) / 60000);
  }
  return { treinos, volume, minutos, dias };
}

/**
 * Quanto uma série conta para um músculo assistente.
 *
 * No supino, o peitoral faz o trabalho principal e tríceps e ombro entram como
 * apoio. Contar tudo igual inflaria os auxiliares; ignorá-los esconderia carga
 * real. 0,4 é o meio-termo usado aqui — "séries efetivas", não séries brutas.
 */
const PESO_AUXILIAR = 0.4;

export interface MusculoTrabalhado {
  grupo: Grupo;
  /** Séries efetivas: integrais no grupo principal, parciais nos auxiliares. */
  series: number;
  volume: number;
  /** Participação no total da sessão, 0..1 — usado nas barras. */
  fracao: number;
}

/** Distribuição do esforço da sessão por grupo muscular, do maior para o menor. */
export function musculosDaSessao(s: Sessao): MusculoTrabalhado[] {
  const mapa = new Map<Grupo, { series: number; volume: number }>();

  for (const e of s.exercicios) {
    const ex = POR_ID[e.exId];
    if (!ex) continue;
    const feitas = e.series.filter((x) => x.feita).length;
    if (!feitas) continue;

    const vol = volumeExercicio(e);
    const alvos: [Grupo, number][] = [
      [ex.grupo, 1],
      ...(ex.aux ?? []).map((g) => [g, PESO_AUXILIAR] as [Grupo, number]),
    ];

    for (const [grupo, peso] of alvos) {
      const atual = mapa.get(grupo) ?? { series: 0, volume: 0 };
      atual.series += feitas * peso;
      atual.volume += vol * peso;
      mapa.set(grupo, atual);
    }
  }

  const total = [...mapa.values()].reduce((t, m) => t + m.series, 0);
  return [...mapa.entries()]
    .map(([grupo, m]) => ({
      grupo,
      series: m.series,
      volume: m.volume,
      fracao: total > 0 ? m.series / total : 0,
    }))
    .sort((a, b) => b.series - a.series);
}

export type TipoRecorde = 'carga' | 'forca';

export interface Recorde {
  exId: string;
  tipo: TipoRecorde;
  valor: number;
  anterior: number;
}

export interface Conquistas {
  /** Marcas superadas de verdade — o que merece troféu. */
  recordes: Recorde[];
  /** Exercícios feitos pela primeira vez: ainda não há com o que comparar. */
  estreias: string[];
}

/**
 * O que esta sessão superou em relação a tudo que veio antes dela.
 *
 * Estreia não entra como recorde de propósito: nos primeiros treinos todo
 * exercício seria "recorde" e o troféu perderia o sentido. Ela vira só uma nota
 * de rodapé, e a comparação real começa no treino seguinte.
 *
 * `carga` é a maior carga absoluta; `forca`, o melhor 1RM estimado — este pega
 * quem subiu repetição sem subir peso. Um por exercício, carga tem prioridade.
 */
export function conquistasDaSessao(historico: Sessao[], sessao: Sessao): Conquistas {
  const marco = sessao.fim ?? sessao.inicio;
  const anteriores = historico.filter(
    (h) => h.id !== sessao.id && (h.fim ?? h.inicio) < marco,
  );

  const recordes: Recorde[] = [];
  const estreias: string[] = [];

  for (const e of sessao.exercicios) {
    const feitas = e.series.filter((x) => x.feita);
    if (!feitas.length) continue;
    // Exercícios sem carga (prancha, cardio) não têm recorde comparável aqui.
    const medida = POR_ID[e.exId]?.medida ?? 'peso_rep';
    if (medida !== 'peso_rep' && medida !== 'rep') continue;

    const cargaAgora = Math.max(...feitas.map((s) => s.peso ?? 0));
    const forcaAgora = Math.max(...feitas.map((s) => estimar1RM(s.peso ?? 0, s.reps ?? 0)));
    if (cargaAgora <= 0 && forcaAgora <= 0) continue;

    const antes = recordesDoExercicio(anteriores, e.exId);

    if (antes.totalSeries === 0) {
      estreias.push(e.exId);
    } else if (cargaAgora > antes.maiorCarga) {
      recordes.push({ exId: e.exId, tipo: 'carga', valor: cargaAgora, anterior: antes.maiorCarga });
    } else if (forcaAgora > antes.melhor1RM) {
      recordes.push({ exId: e.exId, tipo: 'forca', valor: forcaAgora, anterior: antes.melhor1RM });
    }
  }

  // Ganho maior primeiro — a melhor notícia abre a lista.
  recordes.sort((a, b) => b.valor - b.anterior - (a.valor - a.anterior));
  return { recordes, estreias };
}

export interface Semana {
  inicio: number;
  volume: number;
  treinos: number;
}

/**
 * Volume das últimas `n` semanas, da mais antiga para a mais recente.
 * A última posição é sempre a semana corrente, mesmo que ainda esteja vazia.
 */
export function volumePorSemana(historico: Sessao[], n = 8, agora = Date.now()): Semana[] {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  const inicioSemanaAtual = d.getTime() - ((d.getDay() + 6) % 7) * 86400000;

  const semanas: Semana[] = Array.from({ length: n }, (_, i) => ({
    inicio: inicioSemanaAtual - (n - 1 - i) * 7 * 86400000,
    volume: 0,
    treinos: 0,
  }));

  for (const s of historico) {
    // Comparamos início de semana com início de semana. Medir a distância a
    // partir do instante do treino erra por frações de semana — e jogaria a
    // própria semana corrente para fora do intervalo.
    const ds = new Date(s.fim ?? s.inicio);
    ds.setHours(0, 0, 0, 0);
    const inicioSemanaSessao = ds.getTime() - ((ds.getDay() + 6) % 7) * 86400000;
    const idx = n - 1 - Math.round((inicioSemanaAtual - inicioSemanaSessao) / (7 * 86400000));
    if (idx < 0 || idx >= n) continue;
    semanas[idx].volume += volumeSessao(s);
    semanas[idx].treinos += 1;
  }
  return semanas;
}

/** Dias consecutivos com treino, contando de hoje (ou de ontem) para trás. */
export function sequenciaDias(historico: Sessao[], agora = Date.now()): number {
  if (!historico.length) return 0;
  const diaDe = (t: number) => Math.floor(new Date(t).setHours(0, 0, 0, 0) / 86400000);
  const feitos = new Set(historico.map((s) => diaDe(s.fim ?? s.inicio)));
  const hoje = diaDe(agora);
  // A sequência não quebra antes do fim do dia: se hoje ainda não treinou,
  // começamos a contar de ontem.
  let cursor = feitos.has(hoje) ? hoje : hoje - 1;
  let n = 0;
  while (feitos.has(cursor)) {
    n += 1;
    cursor -= 1;
  }
  return n;
}

// ─────────────────────────────  formatação  ─────────────────────────────

export function fmtDuracao(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDuracaoCurta(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(kg >= 10000 ? 0 : 1)}t`;
  return `${Math.round(kg)}kg`;
}

export function fmtNumero(n: number | null): string {
  if (n === null || Number.isNaN(n)) return '';
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function fmtData(t: number): string {
  const d = new Date(t);
  const hoje = new Date();
  const mesmoDia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (mesmoDia(d, hoje)) return 'Hoje';
  const ontem = new Date(hoje.getTime() - 86400000);
  if (mesmoDia(d, ontem)) return 'Ontem';
  const ano = d.getFullYear() !== hoje.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MESES[d.getMonth()]}${ano}`;
}

export function fmtHora(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Segundos → "1:30" para os campos de tempo. */
export function fmtSegundos(seg: number | null): string {
  if (seg === null) return '';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function saudacao(agora = new Date()): string {
  const h = agora.getHours();
  if (h < 6) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
