import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { lerTcx, reamostrar, type AtividadeTcx } from '@/lib/tcx';
import { useTreino, type Cardio, type Sessao } from '@/store/treino';

/**
 * Traz para dentro do treino os dados que o relógio guardou.
 *
 * O Mi Fitness exporta cada atividade como um .tcx em
 * `Android/data/com.xiaomi.wearable/files/ExportTrack/`. O arquivo traz o que o
 * app não tem como saber sozinho: quanto tempo o RELÓGIO cronometrou, a
 * frequência média e as calorias. O que ele não traz é a lista de exercícios —
 * isso é o caderno, e continua sendo digitado aqui.
 *
 * Por isso a operação é um CASAMENTO, não uma importação: o arquivo encosta num
 * treino que já existe no histórico e completa os campos vazios dele. O par é
 * achado pela sobreposição das janelas de tempo, que é o único critério que não
 * depende de nome nem de fuso.
 *
 * Um aviso sobre onde o arquivo mora: `Android/data` é área privada do app
 * desde o Android 11, e nenhum gerenciador de arquivos entra lá. Para o seletor
 * enxergar o .tcx ele precisa primeiro sair dessa pasta — o caminho que funciona
 * é conectar o celular ao computador e copiar de lá para `Download/`.
 */

export interface ResultadoRelogio {
  ok: boolean;
  erro?: string;
  /** Treinos que receberam dados. */
  aplicados: number;
  /** Nomes dos arquivos cuja atividade não achou treino no histórico. */
  semPar: string[];
  /** Arquivos que não eram .tcx legível. */
  ilegiveis: string[];
  /** Arquivos que já tinham sido importados naquele mesmo treino. */
  repetidos: number;
}

const VAZIO: ResultadoRelogio = {
  ok: false,
  aplicados: 0,
  semPar: [],
  ilegiveis: [],
  repetidos: 0,
};

const SEIS_HORAS = 6 * 60 * 60 * 1000;

/** Meia-noite local do dia de `t`. Comparar datas por string erra no fuso. */
function diaLocal(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function janela(s: Sessao): [number, number] {
  return [s.inicio, s.fim ?? s.inicio];
}

/** Milissegundos em que as duas janelas coexistem. Negativo quando não se tocam. */
export function sobreposicao(s: Sessao, a: AtividadeTcx): number {
  const [ini, fim] = janela(s);
  return Math.min(fim, a.fim) - Math.max(ini, a.inicio);
}

/**
 * O treino do histórico que corresponde a esta atividade.
 *
 * Primeiro critério: maior sobreposição de tempo — se o relógio estava gravando
 * enquanto o treino estava aberto, é o mesmo treino. Se nada se sobrepõe (o
 * cronômetro do app pode ter sido parado antes ou aberto depois), aceitamos o
 * treino do mesmo dia que começou mais perto, até seis horas de distância.
 *
 * `ocupados` são os treinos já casados nesta mesma rodada: dois arquivos do
 * mesmo dia não podem cair no mesmo treino.
 */
export function casarComSessao(
  historico: Sessao[],
  a: AtividadeTcx,
  ocupados: Set<string> = new Set(),
): Sessao | null {
  const livres = historico.filter((s) => !ocupados.has(s.id));

  let melhor: { s: Sessao; sobre: number } | null = null;
  for (const s of livres) {
    const sobre = sobreposicao(s, a);
    if (sobre > 0 && (melhor === null || sobre > melhor.sobre)) melhor = { s, sobre };
  }
  if (melhor) return melhor.s;

  let perto: { s: Sessao; dist: number } | null = null;
  for (const s of livres) {
    if (diaLocal(s.inicio) !== diaLocal(a.inicio)) continue;
    const dist = Math.abs(s.inicio - a.inicio);
    if (dist <= SEIS_HORAS && (perto === null || dist < perto.dist)) perto = { s, dist };
  }
  return perto?.s ?? null;
}

/**
 * O `Cardio` que esta atividade produz, preservando o que ela não sabe.
 *
 * A regra de mesclagem: o arquivo escolhido pelo usuário manda nos campos que
 * traz, e o que já estava lá sobrevive no resto. É o que faz sentido quando o
 * treino foi feito com a cinta (que tem curva e máxima) e o relógio traz as
 * calorias — juntando os dois o relatório fica mais completo do que com
 * qualquer um sozinho.
 */
export function cardioDaAtividade(
  a: AtividadeTcx,
  arquivo: string,
  anterior?: Cardio,
): Cardio | null {
  const curva = reamostrar(a.amostras);
  const novo: Cardio = {
    media: a.fcMedia ?? anterior?.media,
    maxima: a.fcMaxima ?? anterior?.maxima ?? null,
    calorias: a.calorias ?? anterior?.calorias ?? null,
    caloriasAtivas: a.caloriasAtivas ?? anterior?.caloriasAtivas ?? null,
    duracaoSeg: a.duracaoSeg ?? anterior?.duracaoSeg ?? null,
    distanciaKm: a.distanciaKm ?? anterior?.distanciaKm ?? null,
    curva: curva.length ? curva : anterior?.curva,
    fonte: 'relogio',
    arquivo,
  };
  // Arquivo que não trouxe nenhuma medida não vira registro: encostá-lo no
  // treino só acrescentaria um rótulo "do relógio" sem nada embaixo.
  const temAlgo =
    novo.media != null ||
    novo.maxima != null ||
    novo.calorias != null ||
    novo.duracaoSeg != null ||
    novo.distanciaKm != null ||
    (novo.curva?.length ?? 0) > 0;
  return temAlgo ? novo : null;
}

interface ArquivoLido {
  nome: string;
  atividades: AtividadeTcx[];
}

/** Abre o seletor e lê o conteúdo do que foi escolhido. */
async function escolher(multiplo: boolean): Promise<ArquivoLido[] | null> {
  // `*/*` de propósito: o Android quase nunca sabe o tipo MIME de um .tcx, e
  // filtrar por tipo deixaria o arquivo invisível — cinza — no seletor.
  const escolha = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    multiple: multiplo,
    copyToCacheDirectory: true,
  });
  if (escolha.canceled || !escolha.assets?.length) return null;

  const lidos: ArquivoLido[] = [];
  for (const item of escolha.assets) {
    let atividades: AtividadeTcx[] = [];
    try {
      atividades = lerTcx(await new File(item.uri).text());
    } catch {
      // Arquivo ilegível é indistinguível de arquivo que não é TCX: os dois
      // saem daqui com a lista vazia e são relatados juntos.
    }
    lidos.push({ nome: item.name ?? 'arquivo', atividades });
  }
  return lidos;
}

/**
 * Escolhe um ou mais .tcx e encaixa cada um no treino correspondente.
 *
 * Nada é criado nem apagado: um arquivo sem treino do mesmo dia é relatado, não
 * vira um treino vazio no histórico.
 */
export async function importarDoRelogio(): Promise<ResultadoRelogio> {
  const lidos = await escolher(true);
  if (lidos === null) return VAZIO;

  const { historico } = useTreino.getState();
  const ocupados = new Set<string>();
  const alteracoes: { id: string; cardio: Cardio }[] = [];
  const resultado: ResultadoRelogio = { ...VAZIO, ok: true, semPar: [], ilegiveis: [] };

  for (const arquivo of lidos) {
    if (!arquivo.atividades.length) {
      resultado.ilegiveis.push(arquivo.nome);
      continue;
    }
    for (const atividade of arquivo.atividades) {
      const sessao = casarComSessao(historico, atividade, ocupados);
      if (!sessao) {
        resultado.semPar.push(arquivo.nome);
        continue;
      }
      if (sessao.cardio?.arquivo === arquivo.nome) {
        resultado.repetidos += 1;
        ocupados.add(sessao.id);
        continue;
      }
      const cardio = cardioDaAtividade(atividade, arquivo.nome, sessao.cardio);
      if (!cardio) {
        resultado.ilegiveis.push(arquivo.nome);
        continue;
      }
      alteracoes.push({ id: sessao.id, cardio });
      ocupados.add(sessao.id);
      resultado.aplicados += 1;
    }
  }

  aplicar(alteracoes);
  return resultado;
}

export interface ResultadoSessao {
  ok: boolean;
  erro?: string;
  /** Preenchido quando o arquivo é de outro momento que não o deste treino. */
  aviso?: string;
}

/**
 * Escolhe um .tcx e encaixa neste treino, sem procurar par.
 *
 * Aqui o usuário já disse a qual treino o arquivo pertence, então não cabe
 * recusar por causa da data — cabe avisar quando as janelas não se tocam, que
 * é o sinal de que o arquivo escolhido foi o errado.
 */
export async function importarParaSessao(sessaoId: string): Promise<ResultadoSessao> {
  const lidos = await escolher(false);
  if (lidos === null) return { ok: false };

  const arquivo = lidos[0];
  const atividade = arquivo.atividades[0];
  if (!atividade) {
    return { ok: false, erro: `"${arquivo.nome}" não é um arquivo .tcx do relógio.` };
  }

  const sessao = useTreino.getState().historico.find((s) => s.id === sessaoId);
  if (!sessao) return { ok: false, erro: 'Este treino não está mais no histórico.' };

  const cardio = cardioDaAtividade(atividade, arquivo.nome, sessao.cardio);
  if (!cardio) {
    return { ok: false, erro: 'O arquivo não tem frequência, calorias nem duração.' };
  }

  aplicar([{ id: sessao.id, cardio }]);

  if (sobreposicao(sessao, atividade) <= 0) {
    const d = new Date(atividade.inicio);
    const p = (n: number) => String(n).padStart(2, '0');
    return {
      ok: true,
      aviso: `O arquivo é de ${p(d.getDate())}/${p(d.getMonth() + 1)} às ${p(d.getHours())}:${p(
        d.getMinutes(),
      )}, fora do horário deste treino.`,
    };
  }
  return { ok: true };
}

/** Uma escrita só no armazenamento, mesmo com vários treinos alterados. */
function aplicar(alteracoes: { id: string; cardio: Cardio }[]) {
  if (!alteracoes.length) return;
  const mapa = new Map(alteracoes.map((a) => [a.id, a.cardio]));
  useTreino.setState((s) => ({
    historico: s.historico.map((h) => {
      const cardio = mapa.get(h.id);
      return cardio ? { ...h, cardio } : h;
    }),
  }));
}
