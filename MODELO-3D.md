# O modelo 3D — receita do Z-Anatomy

<!-- Como trocar o écorché procedural por anatomia de verdade. -->

Hoje o modelo em [src/components/corpo-3d.tsx](src/components/corpo-3d.tsx) é
gerado em código: cada músculo é um tubo fusiforme varrido ao longo de uma
curva. Tem origem e inserção certas, mas é um **esquema anatômico**, não
anatomia. Este documento é o caminho para substituí-lo.

O que trava a qualidade não é o código de renderização — é a malha.

## A fonte

**[Z-Anatomy](https://www.z-anatomy.com)** — atlas 3D aberto do corpo humano,
derivado do BodyParts3D. É o mais preciso que existe de graça, e cada estrutura
já é um **objeto separado**, que é exatamente o requisito aqui.

- Template Blender: <https://github.com/Z-Anatomy/The-blend>
- Modelos: <https://github.com/Z-Anatomy/Models-of-human-anatomy>
- Licença: **CC BY-SA 4.0**

### O que a licença exige

CC BY-SA é *atribuição* mais *compartilha-igual*:

- **Atribuição:** o app precisa creditar o Z-Anatomy num lugar visível. Já há
  um lugar natural para isso: a tela de Ajustes.
- **Compartilha-igual:** o `.glb` derivado que sair do Blender continua sendo
  CC BY-SA e precisa ficar disponível sob essa licença. Isso vale para o
  **modelo**, não contamina o código do app — mas significa que o arquivo
  derivado não pode ser tratado como asset proprietário.

Se em algum momento isso incomodar, a alternativa é um écorché comprado
(Sketchfab / TurboSquid / CGTrader, US$ 20–150) com licença royalty-free, que
dispensa as duas obrigações. O resto desta receita vale igual.

## O contrato: o que o arquivo precisa entregar

O carregador não adivinha anatomia. Ele lê o **nome de cada malha** e mapeia
para o grupo muscular. Sem isso, não há como pintar um músculo de cada vez.

### Nomes das malhas

Cada malha precisa começar com uma destas chaves, exatamente:

```
peito        costas       ombros       biceps       triceps
antebraco    trapezio     lombar       quadriceps   posterior
gluteos      panturrilha  abdomen
```

Sufixo depois de `.` ou `_` é ignorado, então `peito.L`, `peito.R` e
`peito_001` caem todos em `peito`. Qualquer malha com outro nome (esqueleto,
crânio, mãos, pés) entra como **corpo** e nunca é pintada — o que é o
comportamento certo para o que serve de base.

Os treze nomes são os mesmos de `Grupo` em [src/data/types.ts](src/data/types.ts).
Se um dia um grupo for adicionado lá, ele precisa aparecer aqui também.

### Geometria

| exigência | valor | por quê |
|---|---|---|
| Formato | `.glb` binário | um arquivo só, sem texturas soltas |
| Triângulos | **≤ 60 mil no total** | é celular, e são ~26 malhas separadas |
| Tamanho | **≤ 8 MB** | entra no APK e no update OTA |
| Eixo | Y para cima, Z para frente | é o que o carregador assume |
| Escala | qualquer | o carregador normaliza pela altura |
| Origem | qualquer | o carregador centraliza pela caixa envolvente |
| Material | irrelevante | é substituído pela rampa térmica |
| Texturas | **nenhuma** | só engordam o arquivo; a cor vem do código |

Escala e posição são normalizadas de propósito: é a classe de erro mais comum
("exportei e não apareceu nada") e não custa nada resolver no carregador.

## A receita no Blender

1. **Instale o template.** Baixe `Z-Anatomy_Template.zip`, abra o Blender →
   ícone do Blender no canto superior esquerdo → *Install Application Template*
   → selecione o zip. Depois `File > New > Z-Anatomy`.

2. **Isole a musculatura.** Desligue todas as camadas menos os músculos. O
   esqueleto pode ficar — vira a base `corpo` e ajuda a leitura — mas conte os
   triângulos dele no orçamento.

3. **Junte por grupo.** Selecione todos os objetos de um grupo (por exemplo
   todas as cabeças do quadríceps: reto femoral, vasto lateral, vasto medial,
   vasto intermédio) e `Ctrl+J`. Renomeie o resultado para `quadriceps`.
   Repita para os treze.

   Mantenha esquerda e direita **separadas** se quiser (`quadriceps.L` e
   `quadriceps.R`) — o carregador aceita as duas formas.

4. **Decimate.** Em cada malha junta, adicione o modificador *Decimate* em modo
   *Collapse* e baixe o ratio até o grupo ficar em torno de 2–4 mil triângulos.
   Confira a silhueta girando: o que importa é o contorno, não a superfície.

5. **Limpe.** `Ctrl+A > All Transforms` em tudo, para que as transformações
   fiquem cravadas na geometria. Remova materiais e UVs.

6. **Exporte.** `File > Export > glTF 2.0 (.glb)`:
   - *Format*: **glTF Binary (.glb)**
   - *Include*: apenas *Selected Objects*, se tiver selecionado só o que quer
   - *Data > Mesh*: desmarque *UVs*, *Normals* pode ficar
   - *Data > Material*: **No export**
   - desmarque *Cameras*, *Punctual Lights*, *Animation*

7. **Confira o resultado** em <https://gltf-viewer.donmccurdy.com> — arraste o
   `.glb` e veja se as malhas aparecem com os nomes certos no painel lateral.
   Se os nomes não estiverem lá, o passo 3 não pegou.

## Onde o arquivo entra

Coloque em `assets/modelos/corpo.glb`.

Três coisas precisam ser ligadas quando o arquivo existir — nenhuma delas está
no código hoje, porque `require` de um arquivo inexistente quebra o bundler:

1. **`metro.config.js`** (não existe ainda) precisa aceitar `glb` como asset:

   ```js
   const { getDefaultConfig } = require('expo/metro-config');
   const config = getDefaultConfig(__dirname);
   config.resolver.assetExts.push('glb');
   module.exports = config;
   ```

2. **`expo-asset`** precisa voltar como dependência direta
   (`npx expo install expo-asset`). Ele já vem dentro do `expo` core, mas
   declará-lo muda o fingerprint — **e por isso um APK novo é obrigatório**
   nesse momento. Foi justamente para não gastar isso antes da hora que ele foi
   removido.

3. **O carregador**, em `corpo-3d.tsx`. O esqueleto dele:

   ```ts
   import { Asset } from 'expo-asset';
   import { File } from 'expo-file-system';
   import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

   const asset = Asset.fromModule(require('@/assets/modelos/corpo.glb'));
   await asset.downloadAsync();
   const bytes = await new File(asset.localUri!).bytes();

   new GLTFLoader().parse(bytes.buffer, '', (gltf) => {
     // Normaliza altura e centro — resolve escala e origem de uma vez.
     const caixa = new THREE.Box3().setFromObject(gltf.scene);
     const tam = caixa.getSize(new THREE.Vector3());
     gltf.scene.scale.setScalar(ALTURA / tam.y);
     // ...e então percorre as malhas mapeando nome → Grupo.
   });
   ```

   `File.bytes()` devolve um `Uint8Array` direto, sem passar por base64 — o que
   evita o único ponto onde carregar GLB em React Native costuma ficar lento.

## O que muda no comportamento

Nada, do lado de fora. A rampa térmica, o toque para identificar o músculo, a
órbita e o enquadramento continuam iguais: o carregador só troca de onde a
geometria vem. O `corpoBase()` procedural fica no código como **fallback** —
se o arquivo faltar, o app volta ao écorché em vez de abrir uma tela preta.
