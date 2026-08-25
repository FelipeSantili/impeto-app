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

O arquivo vive em `assets/modelos/corpo.glb`, e as três peças que o ligam já
estão no lugar:

1. **`metro.config.js`** registra `glb` em `assetExts`. Sem isso o `require`
   resolve como módulo JavaScript e o bundle quebra.

2. **`expo-asset`** é dependência direta. Ele já vem dentro do `expo` core, mas
   declará-lo muda o fingerprint — e com `runtimeVersion.policy: fingerprint`
   isso significa que **um APK novo é obrigatório**. Um aparelho com o APK
   anterior não recebe esta versão por OTA: continua rodando o código velho, com
   o esquema procedural, e sem nenhum erro para ver.

3. **O carregador** vive em [src/lib/gltf.ts](src/lib/gltf.ts), separado do
   componente. Separado porque o difícil ali não é anatomia nem three — é que o
   GLTFLoader nasceu para o navegador.

### A armadilha do `navigator` — leia antes de mexer no carregador

O construtor do `GLTFParser` fareja o navegador para escolher entre
`ImageBitmapLoader` e `TextureLoader`, e fareja sem defesa:

```js
if ( typeof navigator !== 'undefined' ) {
  const userAgent = navigator.userAgent;
  isSafari = /…safari/i.test( userAgent ) === true;
  const safariMatch = userAgent.match( /Version\/(\d+)/ );   // ← estoura
```

O React Native instala `global.navigator = { product: 'ReactNative' }` e nada
além disso. O `typeof` passa, `userAgent` é `undefined`, o `.test` sobrevive
(coage para a string `"undefined"`) e o `.match` derruba o construtor com
`TypeError: Cannot read property 'match' of undefined`.

Três coisas fazem disso um bug caro:

- acontece **dentro de `parse()`, de forma síncrona**, antes de qualquer
  callback — nunca chega no `onError`;
- quem envolve `parse()` num `try/catch` recebe o mesmo sinal que receberia de
  um arquivo corrompido;
- e o `.glb` está **perfeito** no bundle, então a investigação começa inteira no
  lugar errado.

A correção é dar um `userAgent` ao `navigator` antes do primeiro `parse()`.
Qualquer string serve, desde que não contenha "Safari" nem "Firefox": as duas
comparações caem no ramo falso e o loader escolhe `TextureLoader`, que é o certo
aqui — não há textura nenhuma para carregar.

**Corolário:** nunca engula o erro do carregador. `carregarGLB` lança, o
componente registra no log e avisa a tela por `onFonte`, e a tela diz que está
exibindo o esquema. Um `catch {}` vazio esconde exatamente a classe de falha
mais difícil de achar — a que deixa tudo com cara de estar funcionando.

### Sobre os bytes

`File.bytes()` devolve um `Uint8Array` direto, sem passar por base64 — o que
evita o único ponto onde carregar GLB em React Native costuma ficar lento. Só
que `File` lê `file://`, e nem todo asset chega como arquivo local; quando não
chega, `fetch` é a reserva.

## O que muda no comportamento

Nada, do lado de fora. A rampa térmica, o toque e a órbita continuam iguais: o
carregador só troca de onde a geometria vem. O `corpoBase()` procedural fica no
código como **fallback** — se o arquivo faltar, o app volta ao écorché em vez de
abrir uma tela preta, e diz na tela que foi isso que aconteceu.

O **enquadramento** deixou de ser cravado: a câmera mede a caixa envolvente do
que entrou em cena. É o que faz o mesmo código enquadrar o `.glb` e o esquema de
reserva, que têm proporções diferentes — e o que faz um `.glb` regerado com
outro recorte continuar cabendo no quadro sem ninguém reajustar constante
nenhuma.
