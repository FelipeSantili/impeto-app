/**
 * Leitura dos arquivos .tcx exportados pelo Mi Fitness.
 *
 * TCX é o formato da Garmin (Training Center Database v2), mas o que o Mi
 * Fitness escreve é uma versão frouxa dele. Num treino de musculação o arquivo
 * INTEIRO é isto — 622 bytes, sem trackpoint nenhum:
 *
 *   <Activity Sport="">
 *     <Id>2026-08-06T16:10:56.000Z</Id>    ← início, sempre em UTC
 *     <Calories>541</Calories>             ← totais; não existe no esquema oficial
 *     <Lap>
 *       <TotalTimeSeconds>3527</TotalTimeSeconds>
 *       <Calories>429</Calories>           ← só as ativas
 *       <HeartRateBpm>98</HeartRateBpm>    ← média; no esquema seria <Value>98</Value>
 *     </Lap>
 *   </Activity>
 *
 * Ou seja: média sim, máxima não, curva não, esporte em branco, `<Lap>` sem o
 * atributo `StartTime` que o esquema exige. Em atividades ao ar livre o mesmo
 * app escreve o TCX completo, com `<Trackpoint>` de poucos em poucos segundos.
 * O leitor aceita as duas formas e devolve `null` no que não veio — nunca zero,
 * porque zero seria uma medida, e a ausência de medida não é uma.
 *
 * Usamos expressão regular em vez de um parser de XML porque o React Native não
 * tem DOMParser, e o arquivo tem estrutura rasa e previsível. Toda marca aceita
 * prefixo de namespace (`ns3:Steps`), que é como as extensões da Garmin vêm.
 */

/** Uma leitura de frequência no tempo. Só existe quando o arquivo tem trackpoints. */
export interface AmostraFc {
  /** Instante em ms desde a época. */
  t: number;
  bpm: number;
}

export interface AtividadeTcx {
  /** O atributo `Sport`. Vem vazio na musculação do Mi Fitness. */
  esporte: string | null;
  inicio: number;
  fim: number;
  /** Cronometrada pelo relógio. Difere de `fim - inicio` quando houve pausa. */
  duracaoSeg: number | null;
  /** Calorias totais — o número que o Mi Fitness mostra na tela da atividade. */
  calorias: number | null;
  /** Só as de esforço, quando o arquivo separa. */
  caloriasAtivas: number | null;
  fcMedia: number | null;
  fcMaxima: number | null;
  distanciaKm: number | null;
  amostras: AmostraFc[];
}

/** Prefixo de namespace opcional: casa tanto `<Steps>` quanto `<ns3:Steps>`. */
const PFX = '(?:[A-Za-z0-9_.-]+:)?';

function re(nome: string, flags = ''): RegExp {
  return new RegExp(`<${PFX}${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${PFX}${nome}\\s*>`, flags);
}

/** Conteúdo de todas as ocorrências de uma marca. */
function blocos(xml: string, nome: string): string[] {
  const busca = re(nome, 'g');
  const achados: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = busca.exec(xml)) !== null) achados.push(m[1]);
  return achados;
}

/** Como `blocos`, mas com a marca de abertura junto — é onde vivem os atributos. */
function elementos(xml: string, nome: string): string[] {
  const busca = re(nome, 'g');
  const achados: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = busca.exec(xml)) !== null) achados.push(m[0]);
  return achados;
}

/** Conteúdo da primeira ocorrência. */
function texto(xml: string, nome: string): string | null {
  const m = re(nome).exec(xml);
  return m ? m[1].trim() : null;
}

/**
 * Número de uma marca, aceitando as duas escritas de frequência:
 * `<HeartRateBpm>98</HeartRateBpm>` (Mi Fitness) e
 * `<HeartRateBpm><Value>98</Value></HeartRateBpm>` (esquema da Garmin).
 *
 * String vazia devolve `null`, não zero — `Number('')` é 0, e essa conversão
 * silenciosa transformaria "o relógio não mediu" em "o relógio mediu zero".
 */
function numero(xml: string, nome: string): number | null {
  const bruto = texto(xml, nome);
  if (bruto === null) return null;
  const cru = bruto.includes('<') ? texto(bruto, 'Value') : bruto;
  if (cru === null || cru.trim() === '') return null;
  const n = Number(cru);
  return Number.isFinite(n) ? n : null;
}

function atributo(xml: string, marca: string, nome: string): string | null {
  const m = new RegExp(`<${PFX}${marca}\\s[^>]*${nome}\\s*=\\s*"([^"]*)"`).exec(xml);
  return m ? m[1] : null;
}

function instante(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso.trim());
  return Number.isFinite(t) ? t : null;
}

/** Soma que continua `null` se nenhuma parcela existir. */
function soma(valores: (number | null)[]): number | null {
  const bons = valores.filter((v): v is number => v !== null && Number.isFinite(v));
  return bons.length ? bons.reduce((t, n) => t + n, 0) : null;
}

interface Volta {
  segundos: number | null;
  calorias: number | null;
  metros: number | null;
  fcMedia: number | null;
  fcMaxima: number | null;
  amostras: AmostraFc[];
}

function lerVolta(lap: string): Volta {
  const amostras: AmostraFc[] = [];
  for (const tp of blocos(lap, 'Trackpoint')) {
    const t = instante(texto(tp, 'Time'));
    const bpm = numero(tp, 'HeartRateBpm');
    // Sem hora a amostra não entra na curva; e 0 bpm é sensor sem contato.
    if (t !== null && bpm !== null && bpm > 0) amostras.push({ t, bpm });
  }

  return {
    segundos: numero(lap, 'TotalTimeSeconds'),
    calorias: numero(lap, 'Calories'),
    metros: numero(lap, 'DistanceMeters'),
    // `<AverageHeartRateBpm>` não casa com a busca por `HeartRateBpm`: a marca
    // teria de começar logo depois do `<` ou de um prefixo terminado em `:`.
    // Por isso a média do Mi Fitness (marca nua) e a do esquema convivem aqui.
    fcMedia: numero(lap, 'AverageHeartRateBpm') ?? numero(lap, 'HeartRateBpm'),
    fcMaxima: numero(lap, 'MaximumHeartRateBpm'),
    amostras,
  };
}

/** Média ponderada pela duração de cada volta; sem pesos, média simples. */
function mediaPonderada(voltas: Volta[]): number | null {
  const com = voltas.filter((v) => v.fcMedia !== null);
  if (!com.length) return null;
  const pesos = com.map((v) => v.segundos ?? 0);
  const total = pesos.reduce((t, n) => t + n, 0);
  if (total <= 0) {
    return Math.round(com.reduce((t, v) => t + v.fcMedia!, 0) / com.length);
  }
  return Math.round(com.reduce((t, v, i) => t + v.fcMedia! * pesos[i], 0) / total);
}

function lerAtividade(corpo: string): AtividadeTcx | null {
  const laps = blocos(corpo, 'Lap');
  // As voltas saem do corpo antes de lermos o nível da atividade: senão o
  // `<Calories>` do `<Lap>` (ativas) seria lido como o total quando a atividade
  // não trouxer o seu.
  const semLaps = corpo.replace(new RegExp(`<${PFX}Lap(?:\\s[^>]*)?>[\\s\\S]*?</${PFX}Lap\\s*>`, 'g'), '');
  const voltas = laps.map(lerVolta);

  const inicio =
    instante(texto(semLaps, 'Id')) ??
    instante(atributo(corpo, 'Lap', 'StartTime')) ??
    voltas.flatMap((v) => v.amostras).map((a) => a.t).sort((a, b) => a - b)[0] ??
    null;
  if (inicio === null) return null;

  const amostras = voltas.flatMap((v) => v.amostras).sort((a, b) => a.t - b.t);
  const duracaoSeg = soma(voltas.map((v) => v.segundos));
  const ultima = amostras.length ? amostras[amostras.length - 1].t : null;
  const fim = ultima ?? (duracaoSeg !== null ? inicio + duracaoSeg * 1000 : inicio);

  const bpms = amostras.map((a) => a.bpm);
  // O que o relógio DECLARA vale mais do que o que somamos dos trackpoints: o
  // aparelho calculou sobre todos os batimentos, e o arquivo costuma trazer
  // uma amostra a cada poucos segundos. Só calculamos quando ele não declarou.
  const mediaDeclarada = mediaPonderada(voltas);
  const maximaDeclarada = maiorMaxima(voltas);
  const caloriasAtivas = soma(voltas.map((v) => v.calorias));
  // O `<Calories>` solto na atividade é invenção do Mi Fitness e guarda o
  // total (gasto basal incluído); o da volta guarda só o esforço.
  const totalDeclarado = numero(semLaps, 'Calories');
  const metros = soma(voltas.map((v) => v.metros));
  const esporte = atributo(corpo, 'Activity', 'Sport')?.trim() || null;

  return {
    esporte,
    inicio,
    fim,
    duracaoSeg,
    calorias: totalDeclarado ?? caloriasAtivas,
    caloriasAtivas: totalDeclarado !== null ? caloriasAtivas : null,
    fcMedia:
      mediaDeclarada ??
      (bpms.length ? Math.round(bpms.reduce((t, n) => t + n, 0) / bpms.length) : null),
    // `reduce` em vez de `Math.max(...bpms)`: uma hora de amostras é um espalha
    // de milhares de argumentos, e isso estoura a pilha em aparelho fraco.
    fcMaxima: maximaDeclarada ?? (bpms.length ? bpms.reduce((a, b) => (b > a ? b : a), 0) : null),
    distanciaKm: metros !== null && metros > 0 ? metros / 1000 : null,
    amostras,
  };
}

function maiorMaxima(voltas: Volta[]): number | null {
  const maximas = voltas.map((v) => v.fcMaxima).filter((n): n is number => n !== null);
  return maximas.length ? Math.max(...maximas) : null;
}

/**
 * Todas as atividades de um arquivo .tcx.
 *
 * O Mi Fitness grava uma por arquivo, mas o formato permite várias e ler todas
 * custa o mesmo. Devolve lista vazia quando o conteúdo não é um TCX.
 */
export function lerTcx(xml: string): AtividadeTcx[] {
  if (!xml || !/TrainingCenterDatabase/i.test(xml)) return [];
  // `elementos` e não `blocos`: `Sport` mora na marca de abertura.
  const corpos = elementos(xml, 'Activity');
  // Arquivo com <Activities> mas sem <Activity> fechada: ainda assim tentamos
  // ler o documento inteiro como uma atividade só.
  const alvos = corpos.length ? corpos : [xml];
  return alvos
    .map(lerAtividade)
    .filter((a): a is AtividadeTcx => a !== null && a.fim >= a.inicio);
}

/**
 * Reamostra a curva de FC em `pontos` valores igualmente espaçados no tempo.
 *
 * Uma hora de treino a cada segundo são 3600 números; guardar isso por treino
 * incharia o AsyncStorage, que serializa a base inteira a cada escrita. Noventa
 * pontos desenham a mesma silhueta e cabem em meio kilobyte.
 *
 * O espaçamento é por TEMPO, não por índice: se o relógio perder amostras num
 * trecho, a curva continua com a largura certa em vez de comprimir o buraco.
 */
export function reamostrar(amostras: AmostraFc[], pontos = 90): number[] {
  if (amostras.length === 0) return [];
  if (amostras.length <= pontos) return amostras.map((a) => a.bpm);

  const t0 = amostras[0].t;
  const t1 = amostras[amostras.length - 1].t;
  const span = t1 - t0;
  if (span <= 0) return [amostras[0].bpm];

  const baldes: number[][] = Array.from({ length: pontos }, () => []);
  for (const a of amostras) {
    const i = Math.min(pontos - 1, Math.floor(((a.t - t0) / span) * pontos));
    baldes[i].push(a.bpm);
  }

  const saida: number[] = [];
  let ultimo = amostras[0].bpm;
  for (const balde of baldes) {
    // Balde vazio repete o anterior: um zero abriria um vale que não aconteceu.
    if (balde.length) ultimo = Math.round(balde.reduce((t, n) => t + n, 0) / balde.length);
    saida.push(ultimo);
  }
  return saida;
}
