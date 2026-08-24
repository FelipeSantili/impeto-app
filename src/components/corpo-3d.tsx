import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useCallback, useEffect, useRef } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Grupo } from '@/data/types';
import type { Paleta } from '@/design/tokens';
import { nivelDeCalor } from '@/design/tokens';

/**
 * MODELO ANATÔMICO EM TRÊS DIMENSÕES
 *
 * A prancha 2D responde "quais músculos" — este responde "onde", que é uma
 * pergunta que desenho chapado não responde bem: ninguém entende onde termina o
 * dorsal e começa o redondo maior olhando uma silhueta de frente.
 *
 * ─── De onde vem a malha ─────────────────────────────────────────────────────
 *
 * De `assets/modelos/corpo.glb`: anatomia real, extraída do **Z-Anatomy**
 * (CC BY-SA 4.0). O atlas original tem 155 MB, 3.390 malhas e 6,4 milhões de
 * triângulos — corpo inteiro, com coração, artérias e nervos. O que entra aqui
 * é o destilado: catorze malhas, 43 mil triângulos, 610 KB. Treze grupos de
 * músculo mais `corpo`, que é o esqueleto e nunca acende.
 *
 * O recorte tem duas armadilhas que custaram para achar, e estão registradas
 * em MODELO-3D.md porque vão reaparecer se o modelo for regerado:
 *
 *   · o Z-Anatomy marca ORIGEM e INSERÇÃO de cada músculo com manchinhas
 *     coladas no osso, sufixadas `.o…` e `.e…`. Elas casam com o nome do
 *     músculo e estão espalhadas pelo esqueleto inteiro — puxavam o ombro e o
 *     antebraço até a altura dos pés;
 *   · `extensor digitorum longus` é da PERNA, não do antebraço. Casar
 *     `digitorum` sem qualificar mistura membro superior com inferior.
 *
 * ─── O écorché procedural continua aqui ──────────────────────────────────────
 *
 * Abaixo há um gerador que monta cada músculo como tubo fusiforme varrido ao
 * longo de uma curva. Ele não é código morto: é o que aparece se o `.glb`
 * faltar ou não carregar. Perder o arquivo degrada a fidelidade — não pode
 * apagar a tela.
 *
 * ─── A regra de sempre ───────────────────────────────────────────────────────
 *
 * A cor sai de `corDeCalor`, a MESMA rampa da prancha 2D e das barras de carga.
 * Um músculo âmbar aqui quer dizer exatamente o que âmbar quer dizer lá.
 */

/** Ponto no espaço do corpo: X à direita, Y para cima, Z à frente. */
type P3 = [number, number, number];

/** Altura do corpo, do pé (y=0) ao topo da cabeça. Enquadra a câmera. */
const ALTURA = 175;

/**
 * Estação de um músculo: onde a curva passa e qual é a espessura ali.
 * `r` é o semi-eixo circular; `achatado` estica a seção numa direção, que é o
 * que transforma um tubo em lâmina — peitoral, dorsal e trapézio são folhas,
 * não cordas.
 */
interface Musculo {
  grupo: Grupo;
  nome: string;
  /** Curva do ventre, da origem à inserção. */
  via: P3[];
  /** Raio em cada estação da curva. Precisa ter o mesmo tamanho de `via`. */
  raios: number[];
  /** Achatamento aplicado em torno do centro da peça: [x, y, z]. */
  achatar?: P3;
  /** Espelhar para o outro lado do corpo. Falso só no que é central. */
  par?: boolean;
}

/*
 * Marcos do esqueleto — todo músculo abaixo é escrito contra estes pontos.
 * Unidades aproximam centímetros num corpo de 175 cm.
 *
 *   topo da cabeça  y = 173      ombro    (±19, 139)
 *   queixo          y = 151      cotovelo (±25, 111)
 *   esterno         y = 132      punho    (±28,  87)
 *   umbigo          y = 112      quadril  (± 8,  96)
 *   púbis           y =  96      joelho   (±9.5, 54)
 *   tornozelo       y =  11
 */
const MUSCULOS: Musculo[] = [
  {
    grupo: 'ombros',
    nome: 'Deltoide',
    // Capuz que cobre a articulação: entra pela clavícula, passa por cima e
    // desce por fora do úmero.
    via: [[-12, 143, 5], [-18.5, 143.5, 0], [-21, 136, -1], [-21.5, 128, 0.5]],
    raios: [2.6, 5.4, 5, 3],
    par: true,
  },
  {
    grupo: 'peito',
    nome: 'Peitoral maior',
    // Do esterno abrindo em leque até o úmero. Achatado porque é lâmina.
    via: [[-1.5, 135, 9.5], [-7, 133.5, 9], [-13, 134.5, 6], [-17, 136.5, 2.5]],
    raios: [5.8, 6.6, 5.2, 2.6],
    achatar: [1, 1, 0.5],
    par: true,
  },
  {
    grupo: 'biceps',
    nome: 'Bíceps braquial',
    via: [[-17, 137, 3], [-21, 126, 4.2], [-24, 114, 3]],
    raios: [1.9, 4.1, 2],
    par: true,
  },
  {
    grupo: 'triceps',
    nome: 'Tríceps braquial',
    via: [[-18, 138, -3], [-22, 126, -4.2], [-24.8, 113, -2]],
    raios: [2.1, 4.3, 2.2],
    par: true,
  },
  {
    grupo: 'antebraco',
    nome: 'Antebraço',
    via: [[-25, 111, 1], [-26.5, 100, 2], [-28, 88, 3]],
    raios: [4.3, 3.5, 2.2],
    par: true,
  },
  {
    grupo: 'trapezio',
    nome: 'Trapézio (porção superior)',
    via: [[-1, 151, -3], [-9, 145.5, -4], [-17, 141, -3]],
    raios: [3, 3.6, 3],
    achatar: [1, 0.7, 1],
    par: true,
  },
  {
    grupo: 'trapezio',
    nome: 'Trapézio (losango)',
    via: [[-2, 146, -6], [-5.5, 132, -8], [-2, 116, -7]],
    raios: [3.4, 5, 2.4],
    achatar: [1, 1, 0.55],
    par: true,
  },
  {
    grupo: 'costas',
    nome: 'Latíssimo do dorso',
    // A asa: da axila abrindo até a cintura. É ela que faz o V.
    via: [[-15, 133, -5], [-13, 122, -7], [-6, 110, -8], [-2.5, 104, -7]],
    raios: [3.2, 5.4, 5.2, 3],
    achatar: [1, 1, 0.45],
    par: true,
  },
  {
    grupo: 'lombar',
    nome: 'Eretor da espinha',
    via: [[-3.5, 118, -8], [-4, 108, -8.6], [-4, 99, -8]],
    raios: [2.1, 3.1, 2.2],
    par: true,
  },
  {
    grupo: 'abdomen',
    nome: 'Reto abdominal',
    via: [[-3.5, 128, 9], [-4, 116, 9.6], [-4, 103, 9]],
    raios: [3, 3.5, 2.8],
    achatar: [1, 1, 0.55],
    par: true,
  },
  {
    grupo: 'gluteos',
    nome: 'Glúteo máximo',
    via: [[-6, 100, -7], [-9, 94, -9.5], [-8, 87.5, -7]],
    raios: [4.2, 6.6, 4.6],
    par: true,
  },
  {
    grupo: 'quadriceps',
    nome: 'Quadríceps femoral',
    via: [[-8.5, 94, 4], [-9.5, 74, 5], [-9.5, 58, 3]],
    raios: [6, 7, 4],
    par: true,
  },
  {
    grupo: 'posterior',
    nome: 'Isquiotibiais',
    via: [[-8.5, 94, -5], [-9.5, 76, -5.5], [-9.5, 60, -3.5]],
    raios: [5, 5.9, 3.5],
    par: true,
  },
  {
    grupo: 'panturrilha',
    nome: 'Tríceps sural',
    via: [[-9.5, 53, -3], [-10, 42, -5.2], [-10, 27, -3], [-10, 17, -1]],
    raios: [3.6, 5.5, 3, 1.9],
    par: true,
  },
];

/** Raio de uma estação: circular, ou elíptico `[largura, profundidade]`. */
type Raio = number | [number, number];

/**
 * Varre uma seção elíptica ao longo de uma curva, com raio variável.
 *
 * `computeFrenetFrames` do three faz transporte paralelo, não Frenet puro — o
 * quadro não gira sozinho em trechos quase retos, que é justamente o caso da
 * maioria destas peças. Fosse Frenet de verdade, o tubo torceria em torno do
 * próprio eixo e a seção elíptica sairia em direções diferentes ao longo dela.
 *
 * `pontas` fecha as duas extremidades em ponta. É o que dá o afunilamento de
 * tendão num músculo — e é exatamente o que o TRONCO não pode ter, porque ele
 * continua no pescoço e na pelve em vez de terminar.
 */
function malhaFusiforme(
  via: P3[],
  raios: Raio[],
  { segmentos = 34, lados = 20, pontas = true } = {},
) {
  const curva = new THREE.CatmullRomCurve3(via.map((p) => new THREE.Vector3(...p)));
  const quadros = curva.computeFrenetFrames(segmentos, false);

  const posicoes: number[] = [];
  const indices: number[] = [];
  const par = (r: Raio): [number, number] => (typeof r === 'number' ? [r, r] : r);

  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;
    const centro = curva.getPointAt(t);
    const N = quadros.normals[i];
    const B = quadros.binormals[i];

    const escala = (raios.length - 1) * t;
    const k = Math.min(raios.length - 2, Math.floor(escala));
    const f = escala - k;
    const [an, ab] = par(raios[k]);
    const [bn, bb] = par(raios[k + 1]);
    // Suaviza a interpolação entre estações: linear deixa uma quina visível na
    // silhueta exatamente onde duas estações se encontram.
    const s = f * f * (3 - 2 * f);
    let rn = an + (bn - an) * s;
    let rb = ab + (bb - ab) * s;

    if (pontas) {
      const ponta = Math.sin(Math.PI * Math.min(1, Math.max(0, t)) ** 0.55);
      const m = Math.max(0.1, ponta);
      rn *= m;
      rb *= m;
    }

    for (let j = 0; j <= lados; j++) {
      const a = (j / lados) * Math.PI * 2;
      const cs = Math.cos(a) * rn;
      const sn = Math.sin(a) * rb;
      posicoes.push(
        centro.x + N.x * cs + B.x * sn,
        centro.y + N.y * cs + B.y * sn,
        centro.z + N.z * cs + B.z * sn,
      );
    }
  }

  for (let i = 0; i < segmentos; i++) {
    for (let j = 0; j < lados; j++) {
      const a = i * (lados + 1) + j;
      const b = a + lados + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posicoes, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Achata a peça em torno do próprio centro — sem isso, ela sairia do lugar. */
function achatar(geo: THREE.BufferGeometry, [sx, sy, sz]: P3) {
  geo.computeBoundingBox();
  const c = new THREE.Vector3();
  geo.boundingBox!.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  geo.scale(sx, sy, sz);
  geo.translate(c.x, c.y, c.z);
}

function elipsoide(centro: P3, r: P3, seg = 26) {
  const geo = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
  geo.scale(r[0], r[1], r[2]);
  geo.translate(centro[0], centro[1], centro[2]);
  return geo;
}

/**
 * O corpo por baixo dos músculos.
 *
 * A primeira versão empilhava cinco elipsoides e umas cápsulas: cada par se
 * cruzava numa costura visível, e o conjunto lia como boneco de balões com
 * salsichas em cima. Agora tronco, braços e pernas são cada um uma peça VARRIDA
 * ÚNICA, com seção elíptica que muda de estação em estação — ombro largo e raso,
 * cintura estreita, quadril médio. É o mesmo gerador dos músculos, sem as
 * pontas fechadas, e é o que faz a silhueta ser contínua.
 *
 * O corpo é deliberadamente um pouco mais MAGRO que a posição dos músculos:
 * assim eles se apoiam sobre ele em vez de afundar e sumir.
 */
function corpoBase(): THREE.BufferGeometry[] {
  const g: THREE.BufferGeometry[] = [
    elipsoide([0, 162, 0], [10.4, 12.6, 11]), // cabeça
    // Pescoço → tronco → pelve: uma peça só, sem costura no meio.
    malhaFusiforme(
      [[0, 150, 0], [0, 141, -0.5], [0, 131, -0.5], [0, 119, 0], [0, 110, 0], [0, 99, 0], [0, 92, 0]],
      [[4.6, 4.6], [12.5, 8.2], [14.2, 8.6], [11.2, 7.4], [10.6, 7.2], [12.4, 8.2], [11.4, 7.6]],
      { pontas: false },
    ),
  ];
  for (const s of [-1, 1] as const) {
    g.push(
      // Braço inteiro, do ombro à mão, afinando no cotovelo e no punho.
      malhaFusiforme(
        [[s * 17, 141, 0], [s * 21, 126, 1], [s * 25, 111, 1], [s * 26.5, 99, 2], [s * 28, 87, 3], [s * 29, 80, 3.5]],
        [[4.4, 4.4], [3.6, 3.6], [2.9, 3.1], [2.6, 2.7], [2.1, 2.3], [2.4, 1.6]],
        { pontas: false, segmentos: 26 },
      ),
      // Perna inteira, do quadril ao tornozelo.
      malhaFusiforme(
        [[s * 8, 96, 0], [s * 9, 78, 1], [s * 9.5, 60, 1], [s * 9.5, 54, 1], [s * 10, 38, -0.5], [s * 10, 18, -1], [s * 10, 11, -1]],
        [[6.6, 6.8], [5.6, 5.8], [4.2, 4.4], [4, 4.2], [3.6, 3.8], [2.3, 2.6], [2, 2.4]],
        { pontas: false, segmentos: 30 },
      ),
      elipsoide([s * 10, 6.5, 3], [3.2, 2.8, 7.6], 18), // pé
    );
  }
  return g;
}

/**
 * Carrega a anatomia real, extraída do Z-Anatomy.
 *
 * O arquivo tem catorze malhas nomeadas pelos grupos do app — treze de músculo
 * mais `corpo`, que é o esqueleto e nunca acende. Já sai do processamento com
 * 175 unidades de altura e centrado, então não há normalização a fazer aqui.
 *
 * Devolve `null` em qualquer falha, de propósito: perder o arquivo não pode
 * abrir uma tela preta. O écorché procedural continua no código exatamente
 * para esse caso.
 */
async function carregarAnatomia(): Promise<THREE.Object3D | null> {
  try {
    const asset = Asset.fromModule(require('@/assets/modelos/corpo.glb'));
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return null;

    // `bytes()` entrega Uint8Array direto. Passar por base64 aqui — que é o
    // caminho mais divulgado — triplica o tamanho em memória e custa uma
    // decodificação de alguns megabytes na thread de JS.
    const dados = await new File(uri).bytes();
    const buffer = dados.buffer.slice(
      dados.byteOffset,
      dados.byteOffset + dados.byteLength,
    ) as ArrayBuffer;

    return await new Promise((resolver, rejeitar) => {
      new GLTFLoader().parse(buffer, '', (gltf) => resolver(gltf.scene), rejeitar);
    });
  } catch {
    return null;
  }
}

/** Nome da malha → grupo. Sufixo depois de `.` ou `_` é ignorado. */
function grupoDaMalha(nome: string): Grupo | null {
  const chave = nome.toLowerCase().split(/[._\s-]/)[0];
  return (GRUPOS_VALIDOS as readonly string[]).includes(chave) ? (chave as Grupo) : null;
}

const GRUPOS_VALIDOS = [
  'peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco', 'trapezio',
  'lombar', 'quadriceps', 'posterior', 'gluteos', 'panturrilha', 'abdomen',
] as const;

/**
 * O nome que aparece ao tocar o músculo.
 *
 * É o nome anatômico, não o rótulo do app: quem abre o modelo em 3D e toca numa
 * peça quer saber que peça é aquela, e "Latíssimo do dorso" responde isso melhor
 * que "Costas".
 */
const NOME_ANATOMICO: Record<Grupo, string> = {
  peito: 'Peitoral maior',
  costas: 'Latíssimo do dorso',
  ombros: 'Deltoide',
  biceps: 'Bíceps braquial',
  triceps: 'Tríceps braquial',
  antebraco: 'Flexores e extensores do antebraço',
  trapezio: 'Trapézio',
  lombar: 'Eretor da espinha',
  quadriceps: 'Quadríceps femoral',
  posterior: 'Isquiotibiais',
  gluteos: 'Glúteos',
  panturrilha: 'Tríceps sural',
  abdomen: 'Reto abdominal e oblíquos',
  corpo: 'Corpo',
  cardio: 'Cardio',
};

export interface CorpoProps {
  /** Fração de esforço por grupo, 0..1. Ausente = não trabalhado. */
  intensidade: Map<Grupo, number>;
  paleta: Paleta;
  /** Chamado quando o usuário toca um músculo. `null` ao tocar o vazio. */
  onTocar?: (m: { grupo: Grupo; nome: string } | null) => void;
  /** Gira sozinho enquanto ninguém encosta. */
  girarSozinho?: boolean;
}

export function Corpo3D({ intensidade, paleta, onTocar, girarSozinho = true }: CorpoProps) {
  const cena = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    pivo: THREE.Group;
    render: () => void;
    gl: ExpoWebGLRenderingContext;
    alvos: THREE.Mesh[];
  } | null>(null);

  // Estado da órbita fora do React: o laço de render lê isto 60 vezes por
  // segundo, e passar por estado faria uma re-renderização por quadro.
  const orbita = useRef({ giroY: 0.35, giroX: 0, zoom: 1, tocando: false, mexeu: false });
  const medida = useRef({ l: 0, a: 0 });

  // O laço de render não pode sobreviver à tela. Sem esta bandeira o
  // `requestAnimationFrame` continua desenhando numa cena desmontada depois que
  // o modal fecha — o contexto GL some, o three tenta desenhar nele mesmo
  // assim, e o app trava sem erro visível.
  const vivo = useRef(true);
  /** Verdadeiro quando o laço se encerrou e a cena está parada num quadro. */
  const parado = useRef(false);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const aoMedir = useCallback((e: LayoutChangeEvent) => {
    medida.current = { l: e.nativeEvent.layout.width, a: e.nativeEvent.layout.height };
  }, []);

  /** Repinta os músculos quando a intensidade muda, sem remontar a cena. */
  useEffect(() => {
    const ref = cena.current;
    if (!ref) return;
    for (const m of ref.alvos) {
      const grupo = m.userData.grupo as Grupo;
      const nivel = nivelDeCalor(intensidade.get(grupo) ?? 0);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.color.set(paleta.calor[nivel]);
      // O que foi trabalhado brilha um pouco mais: num écorché escuro, só a
      // matiz não separa o degrau 1 do 2.
      mat.emissive.set(nivel > 0 ? paleta.calor[nivel] : '#000000');
      mat.emissiveIntensity = nivel > 0 ? 0.06 * nivel : 0;
    }
    ref.render();
  }, [intensidade, paleta]);

  const aoCriarContexto = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      const l = gl.drawingBufferWidth;
      const a = gl.drawingBufferHeight;

      /*
       * O three espera um <canvas> do DOM. O expo-gl entrega só o contexto, e
       * este objeto é o mínimo que o WebGLRenderer toca — sem ele o construtor
       * quebra antes do primeiro quadro.
       */
      const canvas = {
        width: l,
        height: a,
        clientWidth: l,
        clientHeight: a,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: () => gl,
      } as unknown as HTMLCanvasElement;

      const renderer = new THREE.WebGLRenderer({ canvas, context: gl as never, antialias: true });
      renderer.setSize(l, a);
      renderer.setClearColor(paleta.fundo, 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, l / a, 1, 1000);

      const pivo = new THREE.Group();
      scene.add(pivo);

      /*
       * Luz de estúdio de três pontos, não de app.
       *
       * A ambiente é baixa de propósito: ambiente alta achata tudo, e era o que
       * fazia os músculos parecerem adesivos colados no corpo. O volume vem da
       * CHAVE alta à frente-direita, e a definição da borda vem da CONTRALUZ
       * atrás — é ela que separa o contorno do fundo preto quando a figura gira
       * de costas, que era o pior ângulo da versão anterior.
       */
      const hemi = new THREE.HemisphereLight(0xdfe6ea, 0x0a0b0c, 0.55);
      scene.add(hemi);
      const chave = new THREE.DirectionalLight(0xfff4e2, 1.8);
      chave.position.set(55, 90, 80);
      scene.add(chave);
      const preenche = new THREE.DirectionalLight(0xcfe0ee, 0.45);
      preenche.position.set(-70, 20, 55);
      scene.add(preenche);
      const contra = new THREE.DirectionalLight(0xffffff, 1.1);
      contra.position.set(-30, 60, -110);
      scene.add(contra);

      const matBase = new THREE.MeshStandardMaterial({
        color: paleta.silhueta,
        roughness: 0.95,
        metalness: 0,
        flatShading: false,
      });
      const alvos: THREE.Mesh[] = [];

      /** Material de um músculo, no degrau da rampa que a intensidade pede. */
      const matMusculo = (grupo: Grupo) => {
        const nivel = nivelDeCalor(intensidade.get(grupo) ?? 0);
        return new THREE.MeshStandardMaterial({
          color: paleta.calor[nivel],
          // Músculo é úmido: um pouco de brilho especular é o que dá a
          // leitura de fibra em vez de massa de modelar fosca.
          roughness: 0.48,
          metalness: 0,
          emissive: new THREE.Color(nivel > 0 ? paleta.calor[nivel] : 0x000000),
          emissiveIntensity: nivel > 0 ? 0.05 * nivel : 0,
        });
      };

      const anatomia = await carregarAnatomia();

      if (anatomia) {
        // Anatomia real: cada malha do arquivo já é um grupo, e o que não casa
        // com nenhum é o esqueleto — estrutura, nunca acende.
        anatomia.traverse((o) => {
          const malha = o as THREE.Mesh;
          if (!malha.isMesh) return;
          const grupo = grupoDaMalha(malha.name);
          if (grupo) {
            malha.material = matMusculo(grupo);
            malha.userData = { grupo, nome: NOME_ANATOMICO[grupo] };
            alvos.push(malha);
          } else {
            malha.material = matBase;
          }
        });
        pivo.add(anatomia);
      } else {
        // Sem o arquivo, o écorché gerado em código. Perder o modelo degrada a
        // fidelidade; não pode apagar a tela.
        for (const g of corpoBase()) pivo.add(new THREE.Mesh(g, matBase));
        for (const m of MUSCULOS) {
          const lados: (1 | -1)[] = m.par ? [1, -1] : [1];
          for (const s of lados) {
            const via = m.via.map(([x, y, z]) => [x * s, y, z] as P3);
            const geo = malhaFusiforme(via, m.raios, { segmentos: 30, lados: 18 });
            if (m.achatar) achatar(geo, m.achatar);
            const mesh = new THREE.Mesh(geo, matMusculo(m.grupo));
            mesh.userData = { grupo: m.grupo, nome: m.nome };
            pivo.add(mesh);
            alvos.push(mesh);
          }
        }
      }

      /*
       * Centraliza o corpo no pivô: girar tem que ser girar em torno DELE, não
       * em torno dos pés. O corpo vai de y=0 (pé) a y=173 (topo da cabeça),
       * então o meio é 86,5 — errar isso faz a figura descrever um círculo em
       * vez de girar no lugar.
       */
      pivo.position.set(0, -ALTURA / 2, 0);
      const suporte = new THREE.Group();
      suporte.add(pivo);
      scene.add(suporte);

      /*
       * Distância de enquadramento, calculada em vez de chutada.
       *
       * A versão anterior tinha a câmera cravada em z=230 com FOV de 32°: cabem
       * 2·230·tan(16°) ≈ 132 unidades de altura, e o corpo tem 173. A cabeça e
       * os pés ficavam FORA do quadro, o que é boa parte do "está estranho".
       *
       * Aqui a distância sai da altura que se quer enquadrar, com folga — e o
       * `min` com a razão de aspecto garante que numa tela estreita o corpo não
       * encoste nas laterais ao girar de perfil.
       */
      const meiaAltura = (ALTURA * 1.12) / 2;
      const meiaLargura = 34;
      const tg = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(meiaAltura / tg, meiaLargura / (tg * camera.aspect));

      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);

      const render = () => {
        const o = orbita.current;
        suporte.rotation.y = o.giroY;
        suporte.rotation.x = o.giroX;
        camera.position.z = dist / o.zoom;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      cena.current = { scene, camera, pivo: suporte, render, gl, alvos };

      /*
       * O giro de apresentação existe para dizer, sem texto, que a figura é
       * girável — e para nada além disso. Ele para no primeiro toque e não
       * volta: manter um laço a 60 quadros por segundo enquanto o usuário
       * estuda a anatomia parada só esquentaria o aparelho.
       */
      const laco = () => {
        if (!vivo.current) return;
        const o = orbita.current;
        const apresentando = girarSozinho && !o.mexeu;
        if (apresentando) o.giroY += 0.0035;
        render();
        if (apresentando || o.tocando) requestAnimationFrame(laco);
        else parado.current = true;
      };
      laco();
    },
    [paleta, intensidade, girarSozinho],
  );

  /** Religa o laço quando o dedo encosta depois de a cena ter parado. */
  const acordar = useCallback(() => {
    const ref = cena.current;
    if (!ref || !parado.current) return;
    parado.current = false;
    const laco = () => {
      if (!vivo.current) return;
      ref.render();
      if (orbita.current.tocando) requestAnimationFrame(laco);
      else parado.current = true;
    };
    laco();
  }, []);

  /** Toque: dispara um raio na direção do dedo e diz que músculo foi atingido. */
  const identificar = useCallback(
    (x: number, y: number) => {
      const ref = cena.current;
      const { l, a } = medida.current;
      if (!ref || !l || !a || !onTocar) return;
      const ponteiro = new THREE.Vector2((x / l) * 2 - 1, -(y / a) * 2 + 1);
      const raio = new THREE.Raycaster();
      raio.setFromCamera(ponteiro, ref.camera);
      const acertos = raio.intersectObjects(ref.alvos, false);
      const alvo = acertos[0]?.object;
      onTocar(
        alvo ? { grupo: alvo.userData.grupo as Grupo, nome: alvo.userData.nome as string } : null,
      );
    },
    [onTocar],
  );

  // `runOnJS(true)`: o laço de render já é JS (o three desenha no JS), então
  // manter o gesto na thread de UI só somaria uma ponte sem ganho nenhum.
  const arrastar = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      orbita.current.tocando = true;
      orbita.current.mexeu = true;
      acordar();
    })
    .onChange((e) => {
      const o = orbita.current;
      o.giroY += e.changeX * 0.011;
      // Trava a inclinação: passar do topo vira o corpo de cabeça para baixo e
      // o usuário perde a referência de frente e costas.
      o.giroX = Math.max(-0.7, Math.min(0.7, o.giroX + e.changeY * 0.008));
    })
    .onFinalize(() => {
      orbita.current.tocando = false;
    });

  const pincar = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      orbita.current.tocando = true;
      orbita.current.mexeu = true;
      acordar();
    })
    .onChange((e) => {
      const o = orbita.current;
      o.zoom = Math.max(0.6, Math.min(2.6, o.zoom * (1 + (e.scaleChange - 1) * 0.9)));
    })
    .onFinalize(() => {
      orbita.current.tocando = false;
    });

  const tocar = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(260)
    .onEnd((e) => {
      orbita.current.mexeu = true;
      identificar(e.x, e.y);
    });

  const gestos = Gesture.Simultaneous(arrastar, pincar, tocar);

  return (
    <GestureDetector gesture={gestos}>
      <View style={{ flex: 1 }} onLayout={aoMedir} collapsable={false}>
        <GLView style={{ flex: 1 }} onContextCreate={aoCriarContexto} />
      </View>
    </GestureDetector>
  );
}
