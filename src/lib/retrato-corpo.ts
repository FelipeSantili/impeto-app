import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { montarCena, type Orbita } from '@/components/corpo-3d';
import type { Grupo } from '@/data/types';
import type { Paleta } from '@/design/tokens';
import {
  chaveDaIntensidade,
  intensidadePorGrupo,
  type MusculoTrabalhado,
} from '@/lib/metricas';

/**
 * OS DOIS RETRATOS DO CORPO PARA O CARTÃO DE COMPARTILHAR
 *
 * O cartão saía com a prancha 2D — duas silhuetas chapadas, a peça mais antiga
 * do app, que o relatório já tinha aposentado em favor do modelo em três
 * dimensões. A imagem que sai do app era a única que ainda mostrava o corpo
 * velho.
 *
 * ─── Por que não basta pôr uma `GLView` dentro do cartão ─────────────────────
 *
 * O cartão é capturado por `react-native-view-shot`, e ele vive FORA DA TELA —
 * `position: absolute` com deslocamento negativo, montado só para virar imagem.
 * Uma `GLView` ali é uma `TextureView` do Android que talvez nunca chegue a ser
 * desenhada: a textura só nasce na primeira passada de desenho da view, e uma
 * view fora dos limites da tela pode não receber nenhuma. Sem textura,
 * `getBitmap` devolve nada e o retângulo do corpo sai preto — no ARQUIVO que o
 * usuário posta, que é o pior lugar possível para descobrir isso.
 *
 * O caminho daqui não depende de view nenhuma: um contexto GL SEM PALCO
 * (`createContextAsync`), a mesma cena de sempre desenhada num framebuffer
 * próprio, e dois PNG lidos de volta com `takeSnapshotAsync`. O cartão recebe
 * dois arquivos e os mostra com `<Image>` — que a captura sabe capturar.
 *
 * ─── Dois quadros, não um giro ───────────────────────────────────────────────
 *
 * A pergunta que originou isto pedia um GIF do corpo girando. Não sai daqui:
 * codificar GIF exigiria ler cada quadro pixel a pixel de volta para o JS e
 * quantizar as cores na mão, na thread de JS, num aparelho — dezenas de
 * segundos para um botão que hoje responde em um. Frente e costas paradas
 * dizem a mesma coisa que o giro diz, e é o que Strava e Hevy publicam.
 */

export interface Retratos {
  /** `file://` de um PNG opaco, já na cor de fundo do cartão. */
  frente: string;
  costas: string;
}

/**
 * Tamanho de cada retrato em pixels.
 *
 * A proporção é a mesma da prancha 2D que ele substitui (220x560): o corpo é
 * uma figura de três cabeças de largura por oito de altura, e qualquer moldura
 * mais larga que isso é margem vazia dos dois lados.
 *
 * O número absoluto é SUPERAMOSTRAGEM, e a conta parte de onde a captura de
 * fato acontece: `react-native-view-shot` ignora a largura pedida e captura na
 * densidade da tela, então os 108 pontos que o cartão reserva podem virar 378
 * pixels num aparelho 3,5x. Renderizar a 440 e deixar a imagem reduzir é o que
 * faz o contorno do corpo sair liso — um framebuffer próprio não tem
 * multiamostragem, e sem essa folga cada borda do modelo sairia serrilhada.
 */
const PX = { l: 440, a: 1120 } as const;

/** Largura sobre altura. O cartão calcula a altura do retrato a partir disto. */
export const PROPORCAO_RETRATO = PX.l / PX.a;

/**
 * Um oitavo de volta a mais que o frontal exato.
 *
 * De frente cravada o modelo vira desenho — é a crítica que aposentou a prancha
 * 2D, e repeti-la em três dimensões seria trocar a peça sem trocar o problema.
 * O mesmo desvio nas costas é o corpo dando meia-volta de verdade: o lado que
 * estava perto passa a ser o de longe, como acontece quando alguém se vira.
 */
const GIRO_FRENTE = 0.17;
const GIRO_COSTAS = Math.PI + GIRO_FRENTE;

/** O `uri` do expo-gl é `string | Blob | null` — no aparelho é sempre arquivo. */
function arquivo(uri: string | Blob | null): string | null {
  return typeof uri === 'string' && uri.length > 0 ? uri : null;
}

/**
 * Obriga os comandos de desenho a EXECUTAR antes de alguém ler o quadro.
 *
 * O expo-gl não executa cada chamada de GL na hora: ele as enfileira num lote e
 * despacha para a thread de GL depois. `takeSnapshotAsync` pede um flush antes
 * de ler, mas esse flush e o desenho que acabou de ser enfileirado não têm
 * ordem garantida entre si — e quando perde a corrida, a captura lê o quadro
 * ANTERIOR, que ainda está no framebuffer.
 *
 * É um bug que só aparece a partir da segunda captura, porque a primeira não
 * tem quadro anterior para pegar por engano. O sintoma foi exato: frente certa,
 * costas idênticas à frente.
 *
 * `readPixels` é síncrona — ela tem que devolver dados, então não há como
 * responder sem antes executar tudo que está na fila. Um pixel basta; o que
 * importa aqui não é o valor lido, é a espera.
 */
function sincronizar(gl: ExpoWebGLRenderingContext): void {
  try {
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  } catch {
    // Sem sincronia explícita a captura pode sair com o quadro anterior, mas
    // ainda sai. Não é motivo para derrubar o compartilhamento inteiro.
  }
}

/**
 * O corpo chegou mesmo a ser desenhado?
 *
 * Lê de volta um bloco no MEIO do quadro, que é onde o tronco cai em qualquer
 * enquadramento que faça sentido, e pergunta se há VARIAÇÃO ali. Fundo liso não
 * varia; corpo iluminado varia sempre, porque a luz de três pontos não deixa
 * dois pixels vizinhos iguais numa superfície curva.
 *
 * Existe porque a falha que este arquivo produz é muda: um quadro vazio vira um
 * PNG válido, de tamanho certo, que o cartão desenha sem reclamar — e o usuário
 * descobre o problema num retângulo preto dentro da imagem que acabou de postar.
 *
 * A leitura custa uma sincronia com a GPU. É uma por compartilhamento; o
 * silêncio custava mais.
 */
function desenhouCorpo(gl: ExpoWebGLRenderingContext): boolean {
  try {
    const lado = 8;
    const px = new Uint8Array(lado * lado * 4);
    gl.readPixels(
      Math.floor(PX.l / 2) - lado / 2,
      Math.floor(PX.a / 2) - lado / 2,
      lado,
      lado,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      px,
    );
    let variou = false;
    for (let i = 4; i < px.length; i += 4) {
      if (px[i] !== px[0] || px[i + 1] !== px[1] || px[i + 2] !== px[2]) {
        variou = true;
        break;
      }
    }
    if (!variou) {
      // A amostra distingue os dois modos de falha que saem IGUAIS na tela:
      // preto puro significa framebuffer errado — lemos um buffer que ninguém
      // limpou; a cor de fundo exata significa que limpou mas não desenhou
      // geometria nenhuma. São consertos diferentes.
      const a = `rgba(${px[0]},${px[1]},${px[2]},${px[3]})`;
      console.warn(`[retrato] quadro sem corpo no centro — amostra ${a}`);
    }
    return variou;
  } catch (e) {
    // Sem leitura não dá para afirmar que falhou. Na dúvida deixa passar: um
    // retrato bom descartado é pior que um ruim publicado, já que o plano B
    // existe justamente para o caso ruim.
    console.warn('[retrato] não deu para conferir o quadro:', e);
    return true;
  }
}

/**
 * Desenha o corpo de frente e de costas e devolve os dois PNG.
 *
 * `null` quando qualquer parte falha — sem contexto GL, sem framebuffer, sem
 * arquivo. Quem chama tem que ter um plano B desenhado: um cartão com um
 * buraco preto no meio é pior que um cartão com a prancha antiga.
 */
export async function gerarRetratos({
  intensidade,
  paleta,
  fundo,
}: {
  /** Fração de esforço por grupo, 0..1. A mesma que a tela usa. */
  intensidade: Map<Grupo, number>;
  paleta: Paleta;
  /** Cor com que o palco é limpo — a do cartão, para o corpo não vir em caixa. */
  fundo: string;
}): Promise<Retratos | null> {
  let gl: ExpoWebGLRenderingContext | null = null;
  try {
    gl = await GLView.createContextAsync();
    const orbita: Orbita = { giroY: GIRO_FRENTE, giroX: 0, zoom: 1 };
    const cena = await montarCena(gl, { intensidade, paleta, fundo, orbita, tamanho: PX });

    /*
     * O contexto sem palco tem um pbuffer de um pixel de lado: desenhar nele
     * devolveria um PNG de 1x1. Todo o desenho vai para este alvo, que tem o
     * tamanho que queremos capturar.
     *
     * `generateMipmaps: false` porque ninguém vai amostrar esta textura como
     * textura — ela é lida de volta e vira arquivo. Gerar a pirâmide seria
     * trabalho de GPU jogado fora.
     */
    const alvo = new THREE.WebGLRenderTarget(PX.l, PX.a, {
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    cena.renderer.setRenderTarget(alvo);

    /*
     * O framebuffer que o three criou para o alvo, dito à captura de forma
     * EXPLÍCITA.
     *
     * Sem ele a captura cai no ramo "usa o que estiver ligado agora", e esse
     * ramo tem um defeito no iOS do expo-gl: `defaultFramebuffer || prev` é um
     * OU LÓGICO em C, que devolve 1 — o nome de um framebuffer qualquer, não o
     * nosso. No Android funcionaria por acaso; passar o nome certo funciona nos
     * dois.
     */
    const props = cena.renderer.properties.get(alvo) as
      | { __webglFramebuffer?: WebGLFramebuffer | WebGLFramebuffer[] }
      | undefined;
    /*
     * O three guarda isto de DUAS formas, e a escolha é dele, não nossa: um
     * framebuffer só, ou um array indexado por nível de mipmap. O próprio
     * `setRenderTarget` testa `Array.isArray` antes de usar.
     *
     * Passar o array adiante seria pior que não passar nada: o lado nativo
     * espera um objeto com `id`, e um array vira uma lista que estoura na
     * primeira leitura de chave — trocando um quadro preto por uma exceção.
     */
    const bruto = props?.__webglFramebuffer;
    const framebuffer = (Array.isArray(bruto) ? bruto[0] : bruto) ?? undefined;
    // Sem o nome certo, a captura cai no "usa o que estiver ligado agora" — que
    // funciona por acaso no Android e lê o buffer errado no iOS. Vale um aviso:
    // é a diferença entre um retrato e um retângulo preto.
    if (!framebuffer) console.warn('[retrato] o three não deu o framebuffer do alvo');

    let desenhou = false;

    const capturar = async (giro: number) => {
      orbita.giroY = giro;
      // `false`: nada de `endFrameEXP` aqui. Ele marca o contexto para trocar os
      // buffers, e a captura leria o quadro anterior — preto, no primeiro.
      cena.render(false);
      // TODA captura precisa desta espera, não só a primeira. Ver `sincronizar`:
      // sem ela, o segundo retrato sai igual ao primeiro.
      sincronizar(gl!);
      // A conferência, essa sim, basta uma vez: os dois quadros saem da mesma
      // cena e do mesmo alvo, e um deles vazio significa os dois vazios.
      if (!desenhou) desenhou = desenhouCorpo(gl!);
      const foto = await GLView.takeSnapshotAsync(gl!, {
        format: 'png',
        framebuffer,
        rect: { x: 0, y: 0, width: PX.l, height: PX.a },
      });
      return arquivo(foto.uri);
    };

    const frente = await capturar(GIRO_FRENTE);
    const costas = await capturar(GIRO_COSTAS);

    alvo.dispose();
    cena.renderer.dispose();

    // Quadro vazio: o cartão volta para a prancha 2D. Ela é a peça velha, mas
    // desenha um corpo — e é a única das duas que não sai como um buraco preto
    // na imagem que vai para fora do app.
    if (!desenhou) return null;

    return frente && costas ? { frente, costas } : null;
  } catch (e) {
    // Silêncio aqui foi o que fez a anatomia sumir sem sintoma uma vez. O
    // cartão volta para a prancha 2D, mas o log diz por quê.
    console.warn('[retrato] não deu para renderizar o corpo do cartão:', e);
    return null;
  } finally {
    // O contexto sem palco não morre com nenhuma tela: se ninguém o destruir,
    // a thread GL dele fica viva pelo resto da sessão, uma por compartilhamento.
    if (gl) {
      try {
        await GLView.destroyContextAsync(gl);
      } catch {
        // Já morto, ou o módulo sumiu com a tela. Não há o que fazer nem o que
        // dizer — o trabalho desta função já terminou.
      }
    }
  }
}

/** Teto para a renderização. O botão de compartilhar não pode ficar preso. */
const LIMITE_RENDER_MS = 12000;
/** Teto para o cartão desenhar os dois arquivos. */
const LIMITE_DESENHO_MS = 4000;

/**
 * Os retratos do cartão de um treino, e a coreografia de deixá-lo pronto.
 *
 * Três coisas precisam acontecer em ordem antes de o cartão poder virar imagem,
 * e é para não espalhar essa ordem pela tela que elas moram aqui:
 *
 *   1. renderizar os dois PNG — leva um instante, e o `.glb` pode nem estar
 *      lido ainda na primeira vez;
 *   2. entregá-los ao cartão, que é uma re-renderização do React;
 *   3. esperar as duas `<Image>` DESENHAREM. Este é o passo que se esquece:
 *      arquivo local ainda carrega de forma assíncrona, e capturar antes disso
 *      exporta dois retângulos vazios onde deveria estar o corpo.
 *
 * Nada disso começa até alguém pedir. A tentação era gerar tudo ao abrir o
 * relatório, para o botão responder na hora — mas isso põe um segundo contexto
 * GL, um clone da malha e dois arquivos em disco em TODA visita ao histórico,
 * para um botão que a maioria das visitas não toca. O botão já tem estado de
 * carregando; o aparelho não tem bateria de sobra.
 */
export function usarRetratos({
  musculos,
  paleta,
  fundo,
}: {
  musculos: MusculoTrabalhado[];
  paleta: Paleta;
  fundo: string;
}) {
  const [retratos, setRetratos] = useState<Retratos | null>(null);
  /** A geração em curso. Uma só, por mais vezes que peçam. */
  const trabalho = useRef<Promise<Retratos | null> | null>(null);
  /** Verdadeiro quando as duas imagens já estão desenhadas no cartão. */
  const desenhado = useRef(false);
  const aguardando = useRef<(() => void) | null>(null);

  // Memoizado pelo CONTEÚDO: `musculosDaSessao` devolve um array novo a cada
  // chamada, e comparar por identidade regeraria os dois PNG a cada quadro.
  const chave = chaveDaIntensidade(musculos);
  const intensidade = useMemo(
    () => intensidadePorGrupo(musculos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave],
  );

  // Outro treino, ou o tema trocado no meio: o que estava pronto mostra a cor
  // errada, e a próxima preparação começa do zero.
  useEffect(() => {
    trabalho.current = null;
    desenhado.current = false;
    setRetratos(null);
  }, [intensidade, paleta, fundo]);

  /** O cartão chama isto quando as duas imagens terminaram de aparecer. */
  const aoDesenhar = useCallback(() => {
    desenhado.current = true;
    aguardando.current?.();
    aguardando.current = null;
  }, []);

  /**
   * Deixa o cartão pronto para ser capturado. Chamada pelo botão de
   * compartilhar, e só volta quando não há mais nada a esperar.
   *
   * Chamar duas vezes não gera duas vezes: a promessa fica guardada, e a
   * segunda chamada espera a mesma.
   */
  const preparar = useCallback(async () => {
    const meu = (trabalho.current ??= gerarRetratos({ intensidade, paleta, fundo }));
    const r = await comLimite(meu, LIMITE_RENDER_MS, null);
    // Tema ou treino trocados enquanto renderizava: o que saiu é de outro
    // cartão. Deixa o que está na tela e sai.
    if (trabalho.current !== meu) return;
    setRetratos(r);
    // Sem retrato o cartão desenha a prancha 2D, que já está montada: não há
    // imagem nenhuma para esperar.
    if (!r || desenhado.current) return;
    await new Promise<void>((ok) => {
      aguardando.current = ok;
      setTimeout(() => {
        if (aguardando.current === ok) {
          aguardando.current = null;
          ok();
        }
      }, LIMITE_DESENHO_MS);
    });
    // `onLoad` diz que a imagem chegou, não que ela já foi composta. Dois
    // quadros de folga é o que separa o cartão certo de um cartão em branco.
    await proximoQuadro();
    await proximoQuadro();
  }, [intensidade, paleta, fundo]);

  return { retratos, aoDesenhar, preparar };
}

function proximoQuadro(): Promise<void> {
  return new Promise((ok) => requestAnimationFrame(() => ok()));
}

/** A promessa, ou `reserva` se ela demorar demais. Nunca rejeita. */
async function comLimite<T>(p: Promise<T>, ms: number, reserva: T): Promise<T> {
  let relogio: ReturnType<typeof setTimeout>;
  const espera = new Promise<T>((ok) => {
    relogio = setTimeout(() => ok(reserva), ms);
  });
  try {
    return await Promise.race([p, espera]);
  } finally {
    clearTimeout(relogio!);
  }
}
