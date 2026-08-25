// Destila o `Muscular system` do Z-Anatomy no asset que o app consome.
//
//   entrada: corpo.glb           669 nós, 1,08M triângulos, 22,5 MB
//   saída:   assets/modelos/…    14 malhas, ≤60k triângulos, ≤8 MB
//
// A base deixa de ser o esqueleto. Aqui `corpo` é O RESTO DA MUSCULATURA —
// face, pescoço, mãos, pés e músculos profundos — que fica na MESMA camada
// anatômica dos treze grupos. Osso sob carne atravessava a carne; músculo ao
// lado de músculo, não.
Object.defineProperty(globalThis, 'navigator', {
  value: { product: 'ReactNative', userAgent: 'RN' }, writable: true, configurable: true,
});
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ENTRADA = process.argv[2];
const SAIDA = process.argv[3];
const ALTURA = 175;                       // unidades finais, ~centímetros

/** Não é músculo: veio junto na coleção e só engorda o arquivo. */
const NAO_MUSCULO = /fascia|aponeuros|bursa|retinacul|septum|sheath|ligament|\btendon\b|arch\b|raphe|trochlea|annulus|pulley/i;

/**
 * Nome → grupo do app. A ORDEM importa: a primeira regra que casar vence, e é
 * por isso que as exclusões vêm antes das regras largas.
 *
 * As duas armadilhas do MODELO-3D.md estão codificadas aqui:
 *   · `digitorum longus` é da PERNA. Só `superficialis`/`profundus` é antebraço;
 *   · qualquer coisa `of foot` nunca é membro superior.
 */
const GRUPOS = [
  ['panturrilha', /gastrocnemius|soleus|plantaris|tibialis|fibularis|peroneus|(flexor|extensor) (digitorum|hallucis) longus/i],
  ['antebraco', /brachioradialis|(flexor|extensor) carpi|(flexor|extensor) digitorum (superficialis|profundus)|extensor digiti minimi|pronator|supinator|palmaris longus|extensor indicis|(abductor|extensor) pollicis (longus|brevis)/i],
  ['peito', /pectoralis major/i],
  ['costas', /latissimus dorsi|teres major|rhomboid/i],
  ['ombros', /deltoid|supraspinatus|infraspinatus|teres minor|subscapularis/i],
  ['biceps', /biceps brachii|brachialis|coracobrachialis/i],
  ['triceps', /triceps brachii|anconeus/i],
  ['trapezio', /trapezius|levator scapulae/i],
  ['lombar', /erector spinae|iliocostalis|longissimus|spinalis|quadratus lumborum|multifidus|semispinalis/i],
  ['quadriceps', /rectus femoris|vastus|sartorius|tensor fasciae latae/i],
  ['posterior', /biceps femoris|semitendinosus|semimembranosus|adductor magnus/i],
  ['gluteos', /gluteus|piriformis/i],
  ['abdomen', /rectus abdominis|abdominal oblique|transversus abdominis|serratus anterior/i],
];

/** Orçamento de triângulos. Soma 59 mil, sob o teto de 60. */
const ORCAMENTO = { corpo: 13000, _grupo: 3600 };

/**
 * O GLTFLoader higieniza nomes: espaco vira sublinhado. Sem desfazer isso, TODO
 * padrao de duas palavras falha em silencio — `pectoralis major` nunca casa com
 * `pectoralis_major`, e o grupo inteiro cai calado na base. Foi o que mandou
 * peito e abdomen para o `corpo` e deixou o triceps so com o anconeo.
 */
function normalizar(nome) {
  return (nome || "").replace(/_/g, " ");
}

function classificar(bruto) {
  const nome = normalizar(bruto);
  if (/\bof foot\b|\bof toe/i.test(nome)) {
    // pé é panturrilha ou base, nunca braço
    return /hallucis longus|digitorum longus/i.test(nome) ? 'panturrilha' : 'corpo';
  }
  for (const [g, re] of GRUPOS) if (re.test(nome)) return g;
  return 'corpo';
}

/**
 * Decimação por agrupamento em grade.
 *
 * Escolhida em vez do colapso de arestas por um motivo prático: são 1,08 milhão
 * de triângulos, e um colapso quádrico em JS levaria dezenas de minutos. Numa
 * peça orgânica reduzida a poucos milhares de faces o que importa é a
 * silhueta, e a grade preserva silhueta bem — foi como o modelo anterior
 * chegou aos 2,2 mil por grupo.
 */
function decimar(geo, alvoTris) {
  const pos = geo.attributes.position;
  const idx = geo.index;
  if (idx.count / 3 <= alvoTris) return geo;
  geo.computeBoundingBox();
  const min = geo.boundingBox.min;
  const diag = geo.boundingBox.getSize(new THREE.Vector3()).length();

  const agrupar = (cel) => {
    const mapa = new Map(); const rot = new Int32Array(pos.count); const acum = [];
    for (let i = 0; i < pos.count; i++) {
      const k = Math.floor((pos.getX(i) - min.x) / cel) + "_" + Math.floor((pos.getY(i) - min.y) / cel) + "_" + Math.floor((pos.getZ(i) - min.z) / cel);
      let id = mapa.get(k);
      if (id === undefined) { id = acum.length; mapa.set(k, id); acum.push([0, 0, 0, 0]); }
      const a = acum[id]; a[0] += pos.getX(i); a[1] += pos.getY(i); a[2] += pos.getZ(i); a[3]++; rot[i] = id;
    }
    const tri = [];
    for (let i = 0; i < idx.count; i += 3) {
      const a = rot[idx.getX(i)], b = rot[idx.getX(i + 1)], c = rot[idx.getX(i + 2)];
      if (a === b || b === c || a === c) continue;
      tri.push(a, b, c);
    }
    return { acum, tri };
  };

  // Bisseccao no lado da celula: quanto maior, menos triangulos. Buscar em vez
  // de multiplicar por um passo fixo e o que faz a peca POUSAR no orcamento —
  // subir de 1,22 em 1,22 passava direto e entregava um oitavo do permitido.
  let lo = diag / 400, hi = diag / 4, melhor = null;
  for (let i = 0; i < 18; i++) {
    const meio = Math.sqrt(lo * hi);
    const r = agrupar(meio); const n = r.tri.length / 3;
    if (n <= alvoTris) { melhor = r; hi = meio; } else { lo = meio; }
    if (melhor && n > alvoTris * 0.9 && n <= alvoTris) break;
  }
  if (!melhor) melhor = agrupar(hi);
  const p = new Float32Array(melhor.acum.length * 3);
  for (let i = 0; i < melhor.acum.length; i++) {
    p[i*3] = melhor.acum[i][0]/melhor.acum[i][3];
    p[i*3+1] = melhor.acum[i][1]/melhor.acum[i][3];
    p[i*3+2] = melhor.acum[i][2]/melhor.acum[i][3];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(melhor.tri); g.computeVertexNormals();
  return g;
}

const arq = fs.readFileSync(ENTRADA);
new GLTFLoader().parse(arq.buffer.slice(arq.byteOffset, arq.byteOffset + arq.byteLength), '', (gltf) => {
  gltf.scene.updateMatrixWorld(true);

  const porGrupo = new Map();
  let descartadas = 0, usadas = 0;
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const nome = o.name || '';
    if (NAO_MUSCULO.test(normalizar(nome))) { descartadas++; return; }
    const g = classificar(nome);
    // A transformação do MUNDO precisa entrar na geometria: esquerda e direita
    // são a MESMA malha espelhada por matriz, e ignorá-la colapsaria metade do
    // corpo em cima da outra.
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g).push(geo);
    usadas++;
  });
  console.log('malhas usadas:', usadas, '| descartadas (nao-musculo):', descartadas);

  // ── junta, decima ────────────────────────────────────────────────────────
  /**
   * Distancia minima que uma peca da base precisa manter dos treze grupos.
   *
   * O que sobrava de feio depois de trocar o esqueleto por musculo era musculo
   * PROFUNDO — intercostais, transverso, psoas — furando os superficiais por
   * baixo. Eles nunca sao vistos e nunca sao pintados: existem so para serem
   * atravessados. Cortar por DISTANCIA resolve sem lista de nomes: o que esta
   * colado sob um grupo some, e o que esta longe de todos eles — face, pescoco,
   * maos, pes — fica, porque e justamente o que preenche os vazios.
   */
  const LIMIAR = 0.035;

  const finais = new Map();
  const gradeSup = new Map();
  const CELG = LIMIAR * 2;
  const chaveG = (x,y,z) => Math.floor(x/CELG)+"_"+Math.floor(y/CELG)+"_"+Math.floor(z/CELG);
  const longeDosGrupos = (geo) => {
    geo.computeBoundingBox();
    const c = geo.boundingBox.getCenter(new THREE.Vector3());
    const cx=Math.floor(c.x/CELG), cy=Math.floor(c.y/CELG), cz=Math.floor(c.z/CELG);
    let m2 = Infinity;
    for (let a=-1;a<=1;a++) for (let b=-1;b<=1;b++) for (let d=-1;d<=1;d++) {
      const l = gradeSup.get((cx+a)+"_"+(cy+b)+"_"+(cz+d));
      if (!l) continue;
      for (let i=0;i<l.length;i+=3) {
        const s2=(l[i]-c.x)**2+(l[i+1]-c.y)**2+(l[i+2]-c.z)**2;
        if (s2<m2) m2=s2;
      }
    }
    return Math.sqrt(m2) > LIMIAR;
  };

  // os treze primeiro: a base so pode ser filtrada depois que eles existirem
  const ordem = [...porGrupo.keys()].filter((k) => k !== "corpo");
  if (porGrupo.has("corpo")) ordem.push("corpo");

  for (const g of ordem) {
    let lista = porGrupo.get(g);
    if (g === "corpo") {
      const antes = lista.length;
      lista = lista.filter(longeDosGrupos);
      console.log("  base filtrada: " + antes + " -> " + lista.length + " pecas (cortadas " + (antes-lista.length) + " profundas)");
    }
    let total = 0, verts = 0;
    for (const x of lista) { total += x.index ? x.index.count / 3 : x.attributes.position.count / 3; verts += x.attributes.position.count; }
    // concatena à mão: mergeGeometries exige atributos idênticos, e aqui variam
    const pos = new Float32Array(verts * 3);
    const ind = [];
    let vo = 0;
    for (const x of lista) {
      const p = x.attributes.position;
      const ix = x.index;
      for (let i = 0; i < p.count; i++) {
        pos[(vo + i) * 3] = p.getX(i); pos[(vo + i) * 3 + 1] = p.getY(i); pos[(vo + i) * 3 + 2] = p.getZ(i);
      }
      if (ix) for (let i = 0; i < ix.count; i++) ind.push(ix.getX(i) + vo);
      else for (let i = 0; i < p.count; i++) ind.push(i + vo);
      vo += p.count;
    }
    const juntada = new THREE.BufferGeometry();
    juntada.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    juntada.setIndex(ind);
    const alvo = g === 'corpo' ? ORCAMENTO.corpo : ORCAMENTO._grupo;
    const dec = decimar(juntada, alvo);
    const t = dec.index.count / 3;
    finais.set(g, dec);
    if (g !== "corpo") {
      const p = dec.attributes.position;
      for (let i=0;i<p.count;i++) {
        const k = chaveG(p.getX(i),p.getY(i),p.getZ(i));
        if (!gradeSup.has(k)) gradeSup.set(k,[]);
        gradeSup.get(k).push(p.getX(i),p.getY(i),p.getZ(i));
      }
    }
    console.log('  ' + g.padEnd(12), String(lista.length).padStart(3), 'pecas |', String(Math.round(total)).padStart(7), '->', String(t).padStart(6), 'tri');
  }

  // ── normaliza: 175 de altura, centrado em X/Z, pes em y=0 ────────────────
  const caixa = new THREE.Box3();
  for (const g of finais.values()) { g.computeBoundingBox(); caixa.union(g.boundingBox); }
  const tam = caixa.getSize(new THREE.Vector3());
  const escala = ALTURA / tam.y;
  const cx = (caixa.min.x + caixa.max.x) / 2, cz = (caixa.min.z + caixa.max.z) / 2;
  console.log('\ncaixa bruta:', tam.toArray().map((v) => v.toFixed(3)).join(' x '), '| escala:', escala.toFixed(2));
  for (const g of finais.values()) {
    g.translate(-cx, -caixa.min.y, -cz);
    g.scale(escala, escala, escala);
    g.computeVertexNormals();
  }

  // ── escreve o GLB ────────────────────────────────────────────────────────
  const ORDEM = ['peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco', 'trapezio',
    'lombar', 'quadriceps', 'posterior', 'gluteos', 'panturrilha', 'abdomen', 'corpo'];
  const pedacos = [];
  const bufferViews = [], accessors = [], meshes = [], nodes = [];
  let off = 0;
  const alinha = (n) => (4 - (n % 4)) % 4;
  for (const nome of ORDEM) {
    const g = finais.get(nome);
    if (!g) { console.log('!! grupo ausente:', nome); continue; }
    const p = g.attributes.position, n = g.attributes.normal, ix = g.index;
    const escreveBuf = (buf, tipo, count, compType, mm) => {
      bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, target: tipo === 'SCALAR' ? 34963 : 34962 });
      pedacos.push(buf);
      off += buf.length;
      const pad = alinha(off);
      if (pad) { pedacos.push(Buffer.alloc(pad)); off += pad; }
      const ac = { bufferView: bufferViews.length - 1, componentType: compType, count, type: tipo };
      if (mm) { ac.min = mm[0]; ac.max = mm[1]; }
      accessors.push(ac);
      return accessors.length - 1;
    };
    const fpos = Buffer.from(new Float32Array(p.array).buffer.slice(0));
    g.computeBoundingBox();
    const iPos = escreveBuf(fpos, 'VEC3', p.count, 5126, [g.boundingBox.min.toArray(), g.boundingBox.max.toArray()]);
    const iNor = escreveBuf(Buffer.from(new Float32Array(n.array).buffer.slice(0)), 'VEC3', n.count, 5126);
    const usaU32 = p.count > 65535;
    const arr = usaU32 ? new Uint32Array(ix.count) : new Uint16Array(ix.count);
    for (let i = 0; i < ix.count; i++) arr[i] = ix.getX(i);
    const iIdx = escreveBuf(Buffer.from(arr.buffer.slice(0)), 'SCALAR', ix.count, usaU32 ? 5125 : 5123);
    meshes.push({ name: nome, primitives: [{ attributes: { POSITION: iPos, NORMAL: iNor }, indices: iIdx }] });
    nodes.push({ name: nome, mesh: meshes.length - 1 });
  }
  const bin = Buffer.concat(pedacos);
  const J = {
    asset: { version: '2.0', generator: 'Impeto — destilado do Z-Anatomy (CC BY-SA 4.0)', copyright: 'Z-Anatomy, CC BY-SA 4.0' },
    scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes, meshes, accessors, bufferViews, buffers: [{ byteLength: bin.length }],
  };
  let jstr = JSON.stringify(J);
  let jbuf = Buffer.from(jstr, 'utf8');
  if (alinha(jbuf.length)) jbuf = Buffer.concat([jbuf, Buffer.alloc(alinha(jbuf.length), 0x20)]);
  const cab = Buffer.alloc(12);
  cab.write('glTF', 0, 'ascii');
  cab.writeUInt32LE(2, 4);
  cab.writeUInt32LE(12 + 8 + jbuf.length + 8 + bin.length, 8);
  const cj = Buffer.alloc(8); cj.writeUInt32LE(jbuf.length, 0); cj.write('JSON', 4, 'ascii');
  const cb = Buffer.alloc(8); cb.writeUInt32LE(bin.length, 0); cb.write('BIN\0', 4, 'ascii');
  const saida = Buffer.concat([cab, cj, jbuf, cb, bin]);
  fs.writeFileSync(SAIDA, saida);
  const totalTris = accessors.filter((a) => a.type === 'SCALAR').reduce((s, a) => s + a.count / 3, 0);
  console.log('\nescrito:', SAIDA);
  console.log('  malhas:', meshes.length, '| triangulos:', totalTris, '| tamanho:', (saida.length / 1024 / 1024).toFixed(2), 'MB');
}, (e) => { console.error(e); process.exit(1); });
