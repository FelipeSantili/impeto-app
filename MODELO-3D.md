# O modelo 3D — receita do Z-Anatomy

<!-- De onde vem a anatomia, como ela vira asset, e as armadilhas do caminho. -->

O corpo em [src/components/corpo-3d.tsx](src/components/corpo-3d.tsx) é
anatomia real, destilada do **[Z-Anatomy](https://www.z-anatomy.com)** — atlas
3D aberto derivado do BodyParts3D, e o mais preciso que existe de graça. Cada
estrutura é um objeto separado, que é exatamente o requisito aqui: sem isso não
há como pintar um músculo de cada vez.

- Template Blender: <https://github.com/Z-Anatomy/The-blend>
- Licença: **CC BY-SA 4.0**

CC BY-SA é *atribuição* mais *compartilha-igual*. A atribuição aparece em
Ajustes › Sobre — não é cortesia, sem ela o uso fica fora da licença. E o `.glb`
derivado continua CC BY-SA: vale para o **modelo**, não contamina o código.

## O que entra no app

Catorze malhas, ~57 mil triângulos, 0,6 MB. Treze grupos de músculo mais
`corpo`.

**`corpo` é o RESTO DA MUSCULATURA — não o esqueleto.** Face, pescoço, mãos,
pés e o que mais os treze grupos não cobrem. É a decisão que resolveu o
problema mais caro deste modelo, e o motivo está na seção seguinte.

### Nomes das malhas

Cada malha começa com uma destas chaves, exatamente:

```
peito        costas       ombros       biceps       triceps
antebraco    trapezio     lombar       quadriceps   posterior
gluteos      panturrilha  abdomen
```

Sufixo depois de `.` ou `_` é ignorado. Qualquer outro nome entra como `corpo`
e nunca é pintado. Os treze são os mesmos de `Grupo` em
[src/data/types.ts](src/data/types.ts) — se um grupo nascer lá, precisa nascer
aqui.

### Geometria

| exigência | valor | por quê |
|---|---|---|
| Formato | `.glb` binário | um arquivo só |
| Triângulos | **≤ 60 mil** | é celular, e são catorze malhas |
| Tamanho | **≤ 8 MB** | entra no APK e no update OTA |
| Eixo | Y para cima, Z para frente | é o que o carregador assume |
| Escala e origem | qualquer | o destilador normaliza para 175 |
| Material e textura | nenhum | a cor vem do código |

## Por que o esqueleto saiu

A primeira versão usava o esqueleto como base sob os músculos. Ficava coberta
de cacos: manchas de polígono brigando pelo corpo inteiro.

Não era z-fighting, não era malha duplicada, e não era o buffer de profundidade
— foram três hipóteses caras e todas erradas. Era **geometria**: 67% dos
vértices do esqueleto estavam FORA da camada muscular. O *Decimate* do Blender
arrebentou as costelas em farpas e empurrou rádio, ulna e tíbia para fora da
carne. O osso emergia através do músculo.

Nenhum ajuste de render conserta isso, porque não é problema de render.
Encolher o esqueleto ao longo das normais também não: 12 mm limpa o peito e
destrói mãos e cabeça.

A solução foi trocar a base. Com `corpo` sendo o resto da musculatura, tudo
está na MESMA camada anatômica e não existe nada por baixo para emergir. É um
écorché de verdade — e a musculatura sozinha já descreve o corpo inteiro, com
cabeça, mãos e pés, o que era justamente o que o esqueleto estava lá para dar.

Os músculos PROFUNDOS também saem. Intercostais, transverso e psoas nunca são
vistos nem pintados: existem só para furar os superficiais por baixo. O
destilador corta por distância, não por lista de nomes — o que está colado sob
um grupo some, e o que está longe de todos eles (face, mãos, pés) fica.

## A receita

### 1. Exportar a musculatura do Blender

Abra o template do Z-Anatomy. No Outliner, botão direito em **`Muscular
system`** → **Select Objects**. Depois `File > Export > glTF 2.0`:

- **Include → Limit to → ✅ Selected Objects** ← *é esta caixa que importa*
- desmarque *Cameras* e *Punctual Lights*
- `Data > Material`: **No export**

> **O olhinho do Outliner não afeta o export.** Esconder no viewport não tira
> nada do `.glb` — o exportador ignora visibilidade de viewport por padrão.
> Três exports seguidos "sem esqueleto" saíram byte a byte idênticos ao atlas
> inteiro por causa disso. A alternativa é a **caixinha** (Exclude from View
> Layer) em cada outra coleção, mais **Limit to → ✅ Visible Objects**.

Salve em `modelo-fonte/musculatura-crua.glb` (a pasta é ignorada pelo git e
pelo EAS — fonte, não asset).

### 2. Destilar

```sh
node --max-old-space-size=6144 ferramentas/destilar-modelo.mjs \
  modelo-fonte/musculatura-crua.glb assets/modelos/corpo.glb
```

O destilador filtra o que não é músculo, agrupa nos treze, corta os profundos,
decima dentro do orçamento e normaliza para 175 de altura com os pés em y=0.
Ele imprime a conta de cada grupo — vale conferir que nenhum saiu com um número
absurdamente baixo, que é o sintoma de uma regra de nome que não casou.

## As armadilhas

Três, todas silenciosas, todas custaram caro.

### `navigator.userAgent` — o GLTFLoader morre antes do primeiro callback

O construtor do `GLTFParser` fareja o navegador sem defesa:

```js
const userAgent = navigator.userAgent;
const safariMatch = userAgent.match( /Version\/(\d+)/ );   // ← estoura
```

O React Native instala `global.navigator = { product: 'ReactNative' }` e nada
mais. `userAgent` é `undefined` e o `.match` derruba o construtor com
`TypeError`, **de forma síncrona dentro de `parse()`** — nunca chega no
`onError`. Quem envolve `parse()` num `try/catch` recebe o mesmo sinal de um
arquivo corrompido, com o `.glb` perfeito no bundle.

A correção está em [src/lib/gltf.ts](src/lib/gltf.ts): dar um `userAgent` antes
do primeiro `parse()`. Qualquer string serve, desde que não contenha "Safari"
nem "Firefox".

**Corolário: nunca engula o erro do carregador.** Um `catch {}` vazio esconde
exatamente a classe de falha mais difícil de achar — a que deixa tudo com cara
de estar funcionando.

### O GLTFLoader troca espaço por sublinhado nos nomes

`pectoralis major` chega como `pectoralis_major`. Todo padrão de duas palavras
falha **em silêncio**, e o grupo inteiro cai calado na base. Foi o que mandou
peito e abdômen para o `corpo` e deixou o tríceps só com o ancôneo. O
destilador normaliza antes de casar.

### O buffer de profundidade tem 16 bits no Android

O `expo-gl` pede `EGL_DEPTH_SIZE, 16` em `GLContext.java`, cravado. A resolução
à distância `z` é `z²·(far−near)/(2^bits·far·near)`: com `near = 1` / `far =
1000` e a câmera a 335, isso dá **17 milímetros** num corpo de 175 cm.

Não foi a causa do mosaico, mas é uma bomba armada de verdade. Os planos são
colados no corpo (`near = d − raio`, `far = d + raio`) e refeitos a cada quadro,
porque o pinçar aproxima a câmera. Resultado: 0,03 mm em todo o zoom.

Nada disso aparece no desktop, onde o navegador dá 24 bits.

## Onde o corpo aparece

| lugar | tamanho | comportamento |
|---|---|---|
| `/corpo` (modal) | tela cheia | órbita, pinça, toque identifica o músculo |
| relatório da sessão | 280 pt | parado; toque abre o modal |
| cabeçalho do treino | 48 × 80 pt | parado, e esquenta a cada série marcada |

Os dois embutidos não têm órbita: vivem dentro de rolagem, e um `Pan` ali
engoliria o arrastar vertical da página. Também não giram sozinhos — movimento
é resposta ao toque, e um mostrador girando num cabeçalho compete com o treino
pela atenção.

O arquivo é lido do disco **uma vez por sessão do app**: `clone()` compartilha a
`BufferGeometry`, então o segundo e o terceiro corpo custam um punhado de
objetos em vez de 57 mil triângulos reconstruídos.

O **cartão de compartilhar** continua com a prancha 2D, e vai continuar: é
capturado como bitmap, e capturar conteúdo de GL é uma corrida entre o carregar
do modelo e o disparo da captura que não vale a pena para gerar imagem estática.

## A cor

Sai de `corDeCalor`, a MESMA rampa da prancha 2D e das barras de carga. Um
músculo âmbar aqui quer dizer exatamente o que âmbar quer dizer lá.

Duas consequências disso:

- **Sem mapeamento de tons.** ACES e companhia reescrevem matiz e luminância da
  imagem inteira. A luz fica num orçamento (soma perto de 1 na superfície
  virada para a chave) em vez de ser comprimida depois — superexpor estourava o
  âmbar do topo, ou seja, o músculo MAIS trabalhado era o único a perder a cor.
- **O degrau zero é a cor da carne, não `calor[0]`.** Músculo não trabalhado ao
  lado de uma base clareada faz de cada costura uma rachadura luminosa, e o
  corpo em repouso lê como estilhaçado. A rampa só fala do degrau 1 em diante.
