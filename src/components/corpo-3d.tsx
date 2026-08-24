import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useCallback, useEffect, useRef } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as THREE from 'three';
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
 * ─── Como a malha é feita, e por quê assim ───────────────────────────────────
 *
 * Não há arquivo de modelo. Cada músculo é gerado em código como um TUBO
 * FUSIFORME varrido ao longo de uma curva — um ventre que engrossa no meio e
 * afina nas duas pontas, que é literalmente a forma de um músculo entre suas
 * duas inserções. Definir a anatomia como "esta curva, com estes raios" tem
 * três consequências práticas que um `.glb` não teria:
 *
 *   · o app continua offline e o APK não engorda alguns megabytes;
 *   · corrigir a origem de um músculo é mover um ponto no código, versionado
 *     junto com o resto, em vez de reabrir um Blender;
 *   · cada grupo já nasce como malha SEPARADA, que é o requisito de verdade
 *     aqui — pintar um músculo de cada vez pela rampa térmica.
 *
 * O preço é honesto: isto é um ÉCORCHÉ, o modelo de estudo com os músculos
 * expostos. Tem a forma, a origem e a inserção certas; não tem a textura nem a
 * fibra de um scan anatômico.
 *
 * ─── A regra de sempre ───────────────────────────────────────────────────────
 *
 * A cor sai de `corDeCalor`, a MESMA rampa da prancha 2D e das barras de carga.
 * Um músculo âmbar aqui quer dizer exatamente o que âmbar quer dizer lá.
 */

/** Ponto no espaço do corpo: X à direita, Y para cima, Z à frente. */
type P3 = [number, number, number];

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

/**
 * Varre uma seção elíptica ao longo de uma curva, com raio variável.
 *
 * `computeFrenetFrames` do three faz transporte paralelo, não Frenet puro — o
 * quadro não gira sozinho em trechos quase retos, que é justamente o caso da
 * maioria destes músculos. Fosse Frenet de verdade, o tubo torceria em torno do
 * próprio eixo e o achatamento sairia em direções diferentes ao longo da peça.
 */
function malhaFusiforme(via: P3[], raios: number[], segmentos = 26, lados = 14) {
  const curva = new THREE.CatmullRomCurve3(via.map((p) => new THREE.Vector3(...p)));
  const quadros = curva.computeFrenetFrames(segmentos, false);

  const posicoes: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segmentos; i++) {
    const t = i / segmentos;
    const centro = curva.getPointAt(t);
    const N = quadros.normals[i];
    const B = quadros.binormals[i];

    // Interpola o raio entre as estações e fecha as duas pontas em zero, que é
    // o que dá o afunilamento de tendão em vez de um cilindro cortado.
    const escala = (raios.length - 1) * t;
    const k = Math.min(raios.length - 2, Math.floor(escala));
    const f = escala - k;
    const base = raios[k] + (raios[k + 1] - raios[k]) * f;
    const ponta = Math.sin(Math.PI * Math.min(1, Math.max(0, t)) ** 0.55);
    const r = base * Math.max(0.12, ponta);

    for (let j = 0; j <= lados; j++) {
      const a = (j / lados) * Math.PI * 2;
      const cs = Math.cos(a) * r;
      const sn = Math.sin(a) * r;
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

/** Cápsula orientada de um ponto a outro — os ossos por baixo dos músculos. */
function osso(a: P3, b: P3, r: number) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const eixo = new THREE.Vector3().subVectors(vb, va);
  const geo = new THREE.CapsuleGeometry(r, eixo.length(), 4, 10);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    eixo.clone().normalize(),
  );
  geo.applyQuaternion(q);
  geo.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2);
  return geo;
}

function elipsoide(centro: P3, r: P3) {
  const geo = new THREE.SphereGeometry(1, 20, 14);
  geo.scale(r[0], r[1], r[2]);
  geo.translate(centro[0], centro[1], centro[2]);
  return geo;
}

/** O corpo por baixo: cabeça, tronco, ossos dos membros, mãos e pés. */
function corpoBase(): THREE.BufferGeometry[] {
  const g: THREE.BufferGeometry[] = [
    elipsoide([0, 162, 0], [11, 13, 11.5]), // cabeça
    osso([0, 145, 0], [0, 152, 0], 5), // pescoço
    elipsoide([0, 131, 0], [16, 15, 9.5]), // caixa torácica
    elipsoide([0, 112, 0], [12, 12, 8]), // abdômen
    elipsoide([0, 98, 0], [13.5, 10, 9]), // pelve
  ];
  for (const s of [-1, 1] as const) {
    g.push(
      osso([s * 19, 139, 0], [s * 25, 111, 1], 3.4), // úmero
      osso([s * 25, 111, 1], [s * 28, 87, 3], 2.6), // antebraço
      elipsoide([s * 29, 80, 4], [3, 5.5, 1.8]), // mão
      osso([s * 8, 96, 0], [s * 9.5, 54, 1], 4.6), // fêmur
      osso([s * 9.5, 54, 1], [s * 10, 11, -1], 3), // tíbia
      elipsoide([s * 10, 6.5, 3], [3.4, 3, 8]), // pé
    );
  }
  return g;
}

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
    (gl: ExpoWebGLRenderingContext) => {
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

      // Luz de instrumento: uma chave alta à frente-direita, um preenchimento
      // fraco atrás para a silhueta não fechar em preto quando gira.
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const chave = new THREE.DirectionalLight(0xffffff, 1.5);
      chave.position.set(40, 80, 90);
      scene.add(chave);
      const contra = new THREE.DirectionalLight(0xffffff, 0.5);
      contra.position.set(-60, 30, -70);
      scene.add(contra);

      const matBase = new THREE.MeshStandardMaterial({
        color: paleta.silhueta,
        roughness: 0.92,
        metalness: 0,
        flatShading: false,
      });
      for (const g of corpoBase()) pivo.add(new THREE.Mesh(g, matBase));

      const alvos: THREE.Mesh[] = [];
      for (const m of MUSCULOS) {
        const lados: (1 | -1)[] = m.par ? [1, -1] : [1];
        for (const s of lados) {
          const via = m.via.map(([x, y, z]) => [x * s, y, z] as P3);
          const geo = malhaFusiforme(via, m.raios);
          if (m.achatar) achatar(geo, m.achatar);
          const nivel = nivelDeCalor(intensidade.get(m.grupo) ?? 0);
          const mat = new THREE.MeshStandardMaterial({
            color: paleta.calor[nivel],
            roughness: 0.62,
            metalness: 0,
            emissive: new THREE.Color(nivel > 0 ? paleta.calor[nivel] : 0x000000),
            emissiveIntensity: nivel > 0 ? 0.06 * nivel : 0,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.userData = { grupo: m.grupo, nome: m.nome };
          pivo.add(mesh);
          alvos.push(mesh);
        }
      }

      // Centraliza o corpo no pivô para que girar seja girar em torno DELE, e
      // não em torno dos pés. `suporte.add` já desliga o pivô da cena.
      pivo.position.set(0, -92, 0);
      const suporte = new THREE.Group();
      suporte.add(pivo);
      scene.add(suporte);

      camera.position.set(0, 0, 230);
      camera.lookAt(0, 0, 0);

      const render = () => {
        const o = orbita.current;
        suporte.rotation.y = o.giroY;
        suporte.rotation.x = o.giroX;
        camera.position.z = 230 / o.zoom;
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
