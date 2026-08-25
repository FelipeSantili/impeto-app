import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import type * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * CARREGAR `.glb` DENTRO DO REACT NATIVE
 *
 * Existe separado do componente porque o difícil aqui não é three nem anatomia:
 * é que o GLTFLoader nasceu para o navegador e faz duas suposições que o React
 * Native não cumpre. As duas estão documentadas abaixo, porque as duas custaram
 * caro e nenhuma das duas se anuncia.
 */

/**
 * O GLTFLoader fareja o navegador para decidir entre `ImageBitmapLoader` e
 * `TextureLoader`, e fareja sem defesa — GLTFLoader.js, construtor do
 * `GLTFParser`:
 *
 *     if ( typeof navigator !== 'undefined' ) {
 *       const userAgent = navigator.userAgent;
 *       isSafari = /…safari/i.test( userAgent ) === true;
 *       const safariMatch = userAgent.match( /Version\/(\d+)/ );   // ← estoura
 *
 * O React Native instala `global.navigator = { product: 'ReactNative' }` e nada
 * além disso. O `typeof` passa, `userAgent` é `undefined`, o `.test` sobrevive
 * (coage para a string "undefined") e o `.match` derruba o construtor com
 * `TypeError: Cannot read property 'match' of undefined`.
 *
 * O detalhe que transforma um bug de três linhas em mistério: isso acontece
 * DENTRO de `parse()`, de forma síncrona, antes de qualquer callback. Não chega
 * no `onError`. Quem envolve `parse()` num `try/catch` recebe o mesmo sinal que
 * receberia de um arquivo corrompido — e foi exatamente assim que a anatomia
 * ficou invisível enquanto o `.glb` no bundle estava perfeito, byte a byte.
 *
 * Qualquer string resolve, desde que não contenha "Safari" nem "Firefox": as
 * duas comparações caem no ramo falso, o loader escolhe `TextureLoader`, e é o
 * certo — não há textura nenhuma neste modelo para carregar.
 */
function ajustarNavigator() {
  const nav = globalThis.navigator as unknown as { userAgent?: string } | undefined;
  if (!nav || typeof nav.userAgent === 'string') return;
  try {
    nav.userAgent = 'ReactNative';
  } catch {
    // `navigator` selado. Sem o que fazer aqui — mas o erro real do parse vai
    // subir com a mensagem certa em vez de virar "arquivo inválido".
  }
}

/**
 * Os bytes do asset, pelo caminho mais curto que funcionar.
 *
 * `File.bytes()` devolve `Uint8Array` direto do disco: é o caminho rápido e
 * evita o base64, que triplicaria o arquivo em memória e custaria uma
 * decodificação de meio megabyte na thread de JS.
 *
 * Só que `File` lê `file://` — e nem todo asset chega como arquivo local. Na
 * web, e em qualquer situação em que o asset continue servido pela rede, quem
 * alcança é `fetch`. Tentar os dois é mais barato que descobrir em produção
 * qual dos dois valia.
 */
async function bytesDe(uri: string): Promise<ArrayBuffer> {
  try {
    const dados = await new File(uri).bytes();
    // Fatiar copiaria o arquivo inteiro à toa quando a view já cobre o buffer
    // todo, que é o caso normal de um arquivo lido do disco.
    return dados.byteOffset === 0 && dados.byteLength === dados.buffer.byteLength
      ? (dados.buffer as ArrayBuffer)
      : (dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength) as ArrayBuffer);
  } catch (erro) {
    const resposta = await fetch(uri);
    if (!resposta.ok) throw erro;
    return await resposta.arrayBuffer();
  }
}

/**
 * Carrega um `.glb` empacotado no app e devolve a cena.
 *
 * `modulo` é o resultado de `require('…/arquivo.glb')` — precisa ser literal no
 * chamador, porque é o Metro que resolve isso em tempo de bundling.
 *
 * Lança em qualquer falha, de propósito. Quem chama decide o que fazer com o
 * erro; o que não pode voltar a acontecer é a falha sumir sem deixar rastro.
 */
export async function carregarGLB(modulo: number): Promise<THREE.Group> {
  ajustarNavigator();

  const asset = Asset.fromModule(modulo);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('asset sem uri depois de downloadAsync()');

  const buffer = await bytesDe(uri);
  return await new Promise((resolver, rejeitar) => {
    new GLTFLoader().parse(buffer, '', (gltf) => resolver(gltf.scene), rejeitar);
  });
}
