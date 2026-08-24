# Design — Ímpeto

<!-- Escrito a partir do que foi construído, não do que foi planejado. -->

O Ímpeto não é um app de treino: é um **instrumento de medição** que por acaso
mede treino. Preto neutro sem matiz, fios de 1px, coluna alinhada, tudo
monoespaçado — e um LED vermelho que diz uma coisa só: está gravando.

A direção se chama **Telemetria**, e nasceu do cruzamento de duas propostas: o
instrumento de bancada (densidade, monoespaçada, precisão) e o corpo como mapa
(a rampa térmica, a prancha anatômica). Da segunda ficou o que ela tinha de
próprio — a escala de calor e a figura humana; da primeira, tudo o mais.

## A regra que organiza o sistema inteiro

**As duas cores têm trabalhos que não se confundem.**

| cor | diz | onde aparece |
|---|---|---|
| **`rec`** vermelho | **ESTADO** — está rodando, ou não. Binário. | O LED de sessão aberta e a marca de recorde. **Em nenhum outro lugar.** |
| **`acento`** âmbar | **QUANTIDADE** — é o topo da rampa térmica, não uma cor independente. | Tudo que você escreveu, tudo que está feito, tudo que é alto. |

Se o vermelho começar a aparecer em botão, em ícone de aba ou em destaque de
texto, o sistema morre — vermelho que aparece em todo lugar deixa de significar
"atenção". Foi por isso que o campo `cor` das dez técnicas de série foi
**removido** de [src/data/tecnicas.ts](src/data/tecnicas.ts): dez cores pastel
identificando técnicas destruiriam a regra. Técnica se identifica pela sigla.

## A rampa térmica

`calor` é uma escala de seis degraus, do inerte ao âmbar, e é o **vocabulário de
intensidade do app inteiro**: a prancha anatômica, o modelo 3D, as barras de
carga muscular e o estado "feito" saem todos dela.

```ts
corDeCalor(paleta, fracao) // fração de esforço 0..1 → cor
nivelDeCalor(fracao)       // → 0..5, para quem precisa do degrau
```

A raiz quadrada dentro de `nivelDeCalor` abre o meio da escala: sem ela um grupo
com 10% do esforço cairia no primeiro degrau e a prancha pareceria vazia num
treino bem distribuído. `0,45` é o teto prático — acima disso o grupo já domina
a sessão.

A rampa passa por um verde-azulado frio antes de chegar ao âmbar. Uma rampa que
vai direto de cinza a laranja passa por marrom no meio e fica suja.

Um músculo âmbar quer dizer a mesma coisa em qualquer lugar do app. É por isso
que a tela do modelo 3D mostra a régua da rampa no rodapé: sem ela a cor seria
decoração.

## Cores

As duas paletas vivem em [src/design/tokens.ts](src/design/tokens.ts), com as
mesmas chaves. Nenhum hex fora dali — o que é o que torna a troca de mundo
viável em um arquivo só.

| | escuro (a casa) | claro (com sol na tela) |
|---|---|---|
| `fundo` | `#0A0B0C` preto **neutro** | `#F3F4F4` |
| `fundoAlto` | `#16191B` | `#FFFFFF` |
| `tinta` | `#E9ECEE` · **15,8:1** | `#0E1113` · **17,2:1** |
| `tintaMid` | `#9AA2A7` · 7,9:1 | `#4C5457` · 7,6:1 |
| `tintaFraca` | `#6A7276` · **4,6:1** | `#6B7376` · **4,6:1** |
| `acento` | `#E8A13D` âmbar · 9,7:1 | `#8A5510` ocre · 6,4:1 |
| `rec` | `#FF3B30` · 5,5:1 | `#C1261C` · 6,1:1 |

`tintaFraca` é o **piso**: abaixo dele nada carrega significado.

O fundo escuro é neutro **de propósito**. Qualquer viés de matiz faz a rampa
térmica mentir, porque ela passa a ser lida contra uma cor em vez de contra o
vazio — e é isso que separa "aparelho de medição" de "app escuro com acento".

No claro o âmbar desce para ocre. Âmbar claro sobre branco tem 2:1 e sumiria: a
**posição na rampa** é a mesma, a luminância é a que o fundo exige.

## Tipografia

**Todo dado em IBM Plex Mono, prosa em Archivo.** Monoespaçada não é estilo
aqui — é o que faz coluna de carga alinhar sozinha, sem `fontVariant`, e o que
faz um valor mudando de 82,5 para 100 não empurrar a coluna inteira.

Archivo escapa só nos títulos de tela e na prosa corrida (execução de exercício,
descrições). Monoespaçada em texto longo é castigo.

| | uso |
|---|---|
| `monumento` 76 | o número que se lê a um braço de distância |
| `numeroXG` 36 · `numeroG` 24 · `numero` 16 | leituras, células, teclas |
| `display` 27 · `title` 20 · `heading` 15 | títulos, sempre à esquerda |
| `body` / `bodyMed` 15 · `small` / `smallMed` 13 | prosa, em Archivo |
| `coluna` 10 · `carimbo` 10,5 | cabeça de coluna e carimbo, sempre caixa alta |

Barlow Condensed foi **removida** do projeto: a monoespaçada assumiu todo o
papel dela.

## Geometria e estrutura

- **Canto de 4 a 8px** (`radius`). Não é quadrado e não é macio: é a chanfradura
  de um painel fresado.
- **Densidade alta.** A sessão é uma **tabela**, com cabeça de coluna e valores
  alinhados. Linha de 48px.
- **Zero sombra**, com duas exceções honestas: a folha modal e o teclado de
  carga — as duas superfícies que de fato estão *por cima* da página.
- **Margem fixa** (`margem.pagina` 18, `margem.calha` 24).

### O risco desta direção, e o corretivo

Monoespaçada come largura, e densidade alta briga com dedo suado. O corretivo é
estrutural, não cosmético:

- o ✓ tem `hitSlop`, e a célula de valor tem `hitSlop` assimétrico;
- **a entrada de carga saiu da célula** e foi para um teclado próprio.

## Movimento

[src/design/movimento.ts](src/design/movimento.ts). A personalidade vem antes de
qualquer valor: **instrumento não tem elasticidade.** A curva padrão do app é
`linear`, o que em quase todo outro produto seria erro — a varredura de um
scanner corre em velocidade constante porque está medindo, não porque está
animada.

Molas existem e têm endereço: só o selo de exercício fechado e a marca de
recorde. Ali o movimento comemora, não mede.

### A regra que não se negocia

O estado muda no `onPressIn`. A animação **acompanha** o que já aconteceu, nunca
decide quando acontece. Um ✓ que espera 500ms de varredura para registrar a
série é um bug, não um efeito.

### Escalonamento por raridade

"Retorno em tudo" só não cansa se o tamanho do retorno for proporcional à
raridade do evento.

| faixa | evento | tempo |
|---|---|---|
| constante | toque, digitação | 90–140ms |
| frequente | concluir série, descanso | 320–500ms |
| raro | exercício fechado, recorde | 520ms–1,6s |

Trocar de aba não anima nada além da própria marca da aba: acontece dezenas de
vezes por sessão.

## A prancha anatômica

[src/components/mapa-muscular.tsx](src/components/mapa-muscular.tsx) — **33
regiões**, cada uma desenhada da origem à inserção do músculo real. Proporção
pelo cânone de oito cabeças, ombro em 2,3 cabeças.

O que faz a diferença entre prancha e boneco:

- o peitoral em **duas porções** (clavicular e esternal), convergindo na axila;
- o **serrátil** em dedos entrelaçados sobre as costelas;
- o reto abdominal **segmentado** pelas intersecções tendíneas;
- o quadríceps em três ventres, com o **vasto medial** descendo mais — a gota
  logo acima do joelho;
- o **sartório** cruzando a coxa na diagonal;
- o trapézio de costas como losango inteiro e o dorsal em asa: juntos, o V.

Dois princípios que não mudaram:

- **Os músculos SÃO o corpo**, não pintura sobre uma silhueta. A prancha se lê
  como anatomia mesmo numa sessão vazia; o treino apenas *acende* partes de um
  desenho que já estava inteiro.
- Cada músculo aceso leva um **contorno na cor do corpo**. Sem ele, vizinhos que
  se encostam viram uma mancha só no momento em que ambos acendem.

Todo traçado é autorado uma vez, na metade esquerda, e espelhado.

## O modelo 3D

[src/components/corpo-3d.tsx](src/components/corpo-3d.tsx), aberto tocando a
prancha, na rota [src/app/corpo.tsx](src/app/corpo.tsx).

A prancha responde "quais músculos"; o modelo responde "**onde**", que é uma
pergunta que desenho chapado não responde bem.

**Não há arquivo de modelo.** Cada músculo é gerado em código como um tubo
fusiforme varrido ao longo de uma curva — um ventre que engrossa no meio e afina
nas pontas, que é a forma de um músculo entre suas duas inserções. Três
consequências práticas:

- o app continua offline e o APK não engorda megabytes;
- corrigir a origem de um músculo é mover um ponto no código, versionado;
- cada grupo já nasce como malha **separada**, que é o requisito real: pintar um
  músculo de cada vez pela rampa térmica.

O preço é honesto: isto é um **écorché**, o modelo de estudo. Tem a forma, a
origem e a inserção certas; não tem a textura de um scan anatômico.

Detalhes que custaram para acertar:

- `computeFrenetFrames` do three faz **transporte paralelo**, não Frenet puro —
  o quadro não gira sozinho em trechos quase retos. Fosse Frenet de verdade, o
  tubo torceria e o achatamento sairia em direções diferentes ao longo da peça.
- O achatamento das lâminas (peitoral, dorsal, trapézio) é aplicado **em torno
  do centro da própria peça**; escalar direto a moveria de lugar.
- O three espera um `<canvas>` do DOM e o `expo-gl` entrega só o contexto. O
  objeto `canvas` no `onContextCreate` é o mínimo que o `WebGLRenderer` toca —
  sem ele o construtor quebra antes do primeiro quadro.
- O laço de render **precisa** morrer no desmonte. Sem a bandeira `vivo`, o
  `requestAnimationFrame` segue desenhando numa cena desmontada depois que o
  modal fecha: o contexto GL some, o three desenha nele mesmo assim, e o app
  trava sem erro visível.
- O giro de apresentação existe só para dizer que a figura é girável. **Para no
  primeiro toque e não volta** — 60 quadros por segundo enquanto o usuário
  estuda a anatomia parada só esquentaria o aparelho.

## O teclado de carga

[src/components/teclado.tsx](src/components/teclado.tsx). A célula da tabela
virou **mostrador**; o toque abre um painel embaixo, ao alcance do polegar.

Por que a entrada saiu de dentro da linha:

1. o alvo era pequeno — 62×34 entre duas outras, com o dedo úmido;
2. o teclado do sistema subia e **tapava a linha que estava sendo editada**;
3. o teclado do sistema não sabe nada sobre musculação: não tem incremento de
   anilha, não pula de campo e não conclui a série.

O painel cobre boa parte da tela, e isso é aceitável por um motivo específico:
ele **mostra o que você está editando** no próprio cabeçalho. Não há nada atrás
dele que você precise ver — o contrário exato do que tornava o teclado do
sistema ruim aqui.

O caminho quente inteiro sem fechar o teclado: **KG → REPS → CONCLUIR → KG da
próxima série.**

## A carga desce para a próxima série

Em `alternarFeita`, [src/store/treino.ts](src/store/treino.ts).

Quem treina repete a carga: você ajusta uma vez no primeiro trabalho e as
seguintes saem iguais. Antes, cada série nascia vazia e caía no desempenho da
**sessão passada** — o que está errado no dia em que você sobe ou desce a carga,
porque a sugestão continuava mostrando a semana anterior enquanto você já tinha
decidido outra coisa hoje.

Duas travas:

- só preenche campo **vazio** — o que você digitou à mão numa série adiante é
  uma decisão, não um espaço em branco esperando palpite;
- só a série **imediatamente seguinte**. Como cada série propaga ao ser marcada,
  a carga cascateia sozinha pelo exercício inteiro sem sobrescrever nada.

## Como a troca de tema funciona

Duas peças, e as duas existem por um motivo concreto — nada disto mudou na
refatoração, e **não se mexe nele**: mexer aqui já derrubou a árvore inteira uma
vez neste projeto.

**`criarEstilos`** — `StyleSheet.create` roda uma vez, quando o módulo carrega, e
**copia** os valores de cor para dentro do objeto. Mutar a paleta depois não muda
nada, e remontar a árvore também não. Por isso toda folha de estilo do app é
função da paleta, criada uma vez por tema e memoizada.

**`TemaProvider`** — o app inteiro lê a paleta por **contexto**, e só o provider
assina o store. A primeira versão fazia cada componente chamar `useTemaStore`, e
como `usarPaleta` e `usarEstilos` andam juntos, davam de duas a cinco
assinaturas do mesmo store por componente. Com o `persist` hidratando de forma
assíncrona, isso desalinha a lista de hooks de quem re-renderiza nessa janela: o
índice escorrega para um slot que não é de efeito, `prevDeps` vem `undefined`, e
o `useEffect` seguinte estoura com *"Cannot read properties of undefined
(reading 'length')"* — derrubando a árvore inteira antes do primeiro quadro, sem
nada na tela e sem erro no console.

Ambos em [src/design/tema.tsx](src/design/tema.tsx).

## Marcas desenhadas

Não há conjunto de ícones pronto. [src/components/glifos.tsx](src/components/glifos.tsx)
desenha 26 glifos na mesma grade de 24, com ponta reta e junta em esquadria —
ponta arredondada é a assinatura das bibliotecas prontas.

## Números em português

`fmtVolume` e `fmtNumero` usam **vírgula decimal** e espaço antes da unidade
(`82,5 kg`, `5,0 t`). `fmtDuracaoCurta` é compacta (`1h05`, `45min`) porque a
forma antiga quebrava em duas linhas nas colunas de total.

## Consequência de build

`expo-gl` e `three` são dependências **nativas**, e `runtimeVersion.policy` é
`fingerprint`. Isso significa que:

- **um APK novo é obrigatório**;
- instalações na build anterior **param de receber EAS Update** até instalarem a
  nova.

Foi o único custo de build de toda a refatoração — o resto (paleta, tipografia,
movimento, prancha, teclado, propagação de carga) sai por OTA.

## O que foi recusado, e por quê

| recusado | motivo |
|---|---|
| roxo lavanda sobre quase-preto com brilho | a assinatura mais reconhecível de interface gerada por IA; `#A78BFA` sobre `#09080C` já tinha sido recusado neste projeto uma vez |
| fundo escuro com viés de matiz | faz a rampa térmica ser lida contra uma cor em vez do vazio |
| dez cores pastel identificando técnicas de série | destruiria a regra das duas cores; sigla resolve |
| `TextInput` na célula da tabela | teclado do sistema tapa a linha que se está editando |
| mola em movimento de interface | instrumento não tem elasticidade; mola fica para o que comemora |
| `.glb` de anatomia | megabytes no APK e uma correção de anatomia vira sessão de Blender |
| giro automático permanente no 3D | 60 quadros por segundo com o usuário parado, olhando |

## Verificação

O alvo é Android. `expo export --platform web` serve só como banco de provas
visual, e tem três armadilhas registradas:

1. O bundle web do SDK 54 emite `import.meta` sem transformar (vem do middleware
   `devtools` do zustand, que acompanha o `persist`). Corrige-se servindo o
   script como `type="module"`. Nativo não é afetado.
2. O headless do Edge **não abre janela menor que ~492px**. Sem travar
   `html/body/#root` em 412px por CSS, toda captura "de celular" mente.
3. Uma tela em branco no web export raramente é falta de conteúdo — é a árvore
   caindo. Vale capturar `window.onerror` em fase de captura antes de investigar
   qualquer outra coisa.

O modelo 3D **não** aparece no banco de provas web: `expo-gl` é nativo. Ele só
pode ser verificado em aparelho.
