# Design — Ímpeto

<!-- Escrito a partir do que foi construído, não do que foi planejado. -->

O mundo visual tem **dois materiais do mesmo lugar**, um por tema:

- **Claro — o caderno.** Papel de gramatura, tinta grafite, caneta azul e vermelha.
- **Escuro — o quadro da academia.** Ardósia e giz, com giz azul e giz vermelho.

Escuro **não é o claro invertido**: é outro objeto real da mesma parede. Os papéis
não mudam de um para o outro — azul é sempre o que VOCÊ escreveu (cargas,
repetições, o ✓, a ação primária), vermelho é sempre o carimbo (recorde, sigla de
técnica, remoção).

A regra que organiza tudo: **estado se diz por marca e posição, nunca por cor.**
Isso não é estilo — é requisito. A academia às vezes está sob luz fluorescente
forte e às vezes quase escura, então nada que carregue significado pode depender
de matiz nem de contraste sutil. É também o que faz o app continuar legível ao
trocar de tema.

## Como a troca de tema funciona

Duas peças, e as duas existem por um motivo concreto.

**`criarEstilos`** — `StyleSheet.create` roda uma vez, quando o módulo carrega, e
**copia** os valores de cor para dentro do objeto. Mutar a paleta depois não muda
nada, e remontar a árvore também não, porque o módulo não é reavaliado. Por isso
toda folha de estilo do app é função da paleta, criada uma vez por tema e
memoizada:

```ts
const usarEstilos = criarEstilos((c) => ({
  linha: { backgroundColor: c.fundoAlto },
}));

function Componente() {
  const estilos = usarEstilos();
}
```

**`TemaProvider`** — o app inteiro lê a paleta por **contexto**, e só o provider
assina o store. Isso não é preferência de arquitetura: a primeira versão fazia
cada componente chamar `useTemaStore`, e como `usarPaleta` e `usarEstilos` andam
juntos, davam de duas a cinco assinaturas do mesmo store por componente. Com o
`persist` hidratando de forma assíncrona, isso desalinha a lista de hooks de quem
re-renderiza nessa janela: o índice escorrega para um slot que não é de efeito,
`prevDeps` vem `undefined`, e o `useEffect` seguinte estoura com *"Cannot read
properties of undefined (reading 'length')"* — derrubando a árvore inteira antes
do primeiro quadro, sem nada na tela e sem erro visível no console.

O layout raiz **não lê a paleta**: ele só segura a splash até os stores
hidratarem. Quem pinta é o `<Moldura>`, abaixo do provider.

Ambos em [src/design/tema.tsx](src/design/tema.tsx).

## Cores

As duas paletas vivem em [src/design/tokens.ts](src/design/tokens.ts), com as
mesmas chaves. Nenhum hex fora dali.

Os nomes são do **papel** que a cor cumpre, não do material: `fundo` é papel no
claro e ardósia no escuro. Nomear pelo material obrigaria a mentir num dos dois.

| | claro (caderno) | escuro (quadro) |
|---|---|---|
| `fundo` | `#E8E7E2` cinza de gramatura, **não** creme | `#1B1D1C` ardósia |
| `fundoAlto` | `#F2F1ED` | `#232624` |
| `fundoBaixo` | `#DBDAD3` faixa de cabeçalho de coluna | `#141615` |
| `tinta` | `#191B1C` · **13,8:1** | `#E9E9E4` giz · **13,9:1** |
| `tintaMid` | `#4A4E51` · 6,8:1 | `#A6A9A4` · 7,1:1 |
| `tintaFraca` | `#62666B` · **4,6:1** | `#878B86` · **4,9:1** |
| `tintaFantasma` | `#9A9C99` só decoração | `#5A5E5A` |
| `azul` | `#23368C` · 8,6:1 | `#8FAEF0` giz azul · 8,3:1 |
| `vermelho` | `#B4231F` · 5,3:1 | `#F0938A` giz vermelho · 7,5:1 |

`tintaFraca` é o **piso**: abaixo dele nada carrega significado, nos dois temas.

O azul atende aos dois papéis que uma cor de ação precisa atender — texto sobre
o fundo *e* preenchimento com texto por cima (10,7:1 no claro, 8,6:1 no escuro).

Réguas (`regua`, `reguaMid`, `reguaForte`) são a tinta com transparência, não
cinzas próprios — assim acompanham o fundo em vez de brigar com ele.

## Tipografia

Idêntica nos dois temas. Duas famílias, um princípio: **prosa em Archivo, todo
número em Barlow Condensed.** Condensada lê como impressa em formulário e deixa
número grande caber em coluna estreita. Ambas trazem `tnum` (verificado no
binário), então `fontVariant: ['tabular-nums']` alinha de verdade.

Hierarquia vem de tinta e entrelinha, não de inflar corpo. Só `monumento` escapa
disso, de propósito.

| | uso |
|---|---|
| `monumento` 104 | reservado ao número que se lê a um braço de distância |
| `numeroXG` 44 · `numeroG` 28 · `numero` 20 | totais, células de carga e repetição |
| `display` 30 · `title` 22 · `heading` 16 | títulos, sempre **alinhados à esquerda** |
| `body` / `bodyMed` 15 · `small` / `smallMed` 13 | prosa |
| `coluna` 12 · `carimbo` 12 | cabeçalho de coluna e carimbo, sempre em caixa alta |

Todo valor grande em coluna leva `numberOfLines={1}` + `adjustsFontSizeToFit`: o
cartão de compartilhar vira imagem, e uma quebra de linha ali desmonta a
composição.

## Estrutura

- **Não existe cartão.** Seções se separam por **régua** e espaço. `Cartao` foi
  removido do vocabulário; no lugar entraram `Secao`, `Linha`, `CabecaColuna` e
  `Regua`.
- **Margem fixa** (`margem.pagina` 20, `margem.calha` 26). A calha é a coluna
  reservada ao ordinal, à barra da linha ativa e ao carimbo de recorde. Toda tela
  registra contra ela.
- **Canto reto.** `radius` vai de 0 a 4 — nem papel nem ardósia são arredondados.
  Não há `pill`.
- **Zero sombra**, com uma exceção honesta: a folha modal, que é literalmente uma
  folha sobre a página.
- Composição assimétrica: título à esquerda, meta carimbada à direita na mesma
  linha de base.

## Vocabulário de marcas

| estado | marca |
|---|---|
| feita | escrita em azul, fundo `fundoAlto`, ✓ preenchido |
| ativa | **barra de tinta** de 3px na margem |
| pendente | pontilhado de campo não preenchido, régua embaixo da célula |
| aquecimento | ordinal **entre parênteses** — livro-caixa marca assim a linha que não soma |
| técnica | sigla carimbada em vermelho |
| recorde | traço vermelho na margem, como correção de professor |

Nenhuma dessas marcas precisa de cor para ser entendida. É por isso que o app
sobrevive à troca de tema sem reinterpretação.

## Prancha anatômica

[src/components/mapa-muscular.tsx](src/components/mapa-muscular.tsx) desenha a
figura de frente e de costas com a **forma real de cada músculo**: peitoral em
leque, deltoide em capuz sobre o ombro, dorsal em asa da axila à cintura,
quadríceps em gota até o joelho, trapézio em losango.

Dois princípios:

- **Os músculos SÃO o corpo**, não pintura sobre uma silhueta. O que não foi
  trabalhado fica no tom neutro, contornado — a prancha já se lê como anatomia
  mesmo sem nenhum destaque.
- **Intensidade é densidade de tinta, nunca matiz.** Cada músculo destacado leva
  um contorno na cor do corpo, e a opacidade vai só no preenchimento: sem isso o
  contorno desbotaria junto e grupos vizinhos que se encostam (deltoide e
  peitoral, glúteo e isquiotibial) virariam uma mancha só.

Todo traçado é autorado uma vez, na metade esquerda, e espelhado — corrigir um
lado e esquecer o outro seria questão de tempo.

## Marcas desenhadas

Não há conjunto de ícones pronto. [src/components/glifos.tsx](src/components/glifos.tsx)
desenha 26 glifos na mesma grade de 24, com **ponta reta e junta em esquadria** —
ponta arredondada é a assinatura das bibliotecas prontas. Um só peso de traço em
todo o app, reescalado opticamente.

## Movimento

Um momento autoral, não efeitos espalhados.

- **O carimbo de conclusão** é esse momento: desce de escala 1,7 → 1 com mola,
  crava a −3,5° porque carimbo humano não sai reto, e dispara o háptico no quadro
  em que encosta — não quando a animação acaba.
- **Toque**: escala 0,97 em 110ms com ease-out forte (`cubic-bezier(.23,1,.32,1)`),
  na thread de UI. Opacidade sozinha lê como morto.
- **Abas não deslizam** e não vibram: acontecem dezenas de vezes por sessão.
- **Háptico é reservado ao que confirma algo.** Sem valor, `Pressavel` não vibra.
- `useReducedMotion` desliga deslocamento e escala em todo componente animado.

O `Pressavel` **nunca** usa a forma de função do `style` do Pressable: dentro de
um componente animado do Reanimated ela é descartada inteira, e o botão perde
fundo, direção e espaçamento. Estado de toque vive na `useAnimatedStyle`.

## Números em português

`fmtVolume` e `fmtNumero` usam **vírgula decimal** e espaço antes da unidade
(`82,5 kg`, `5,0 t`). `fmtDuracaoCurta` é compacta (`1h05`, `45min`) porque a
forma antiga (`1h 5min`) quebrava em duas linhas nas colunas de total.

## O que foi recusado, e por quê

O visual anterior era preto `#09080C` com violeta `#A78BFA` e halo radial. Cada
peça dele estava na lista de assinaturas de interface gerada:

| recusado | motivo |
|---|---|
| violeta sobre quase-preto com brilho | é literalmente a impressão digital mais comum de design gerado por IA; `#A78BFA` é o `violet-400` do Tailwind |
| Inter | tipografia padrão de software gerado |
| Ionicons + `sparkles` para "modelos" | conjunto padrão, metáfora clichê |
| cartão com borda e canto de 22px como estrutura da página | o recipiente preguiçoso |
| tudo centralizado | simetria total, nenhuma tensão |
| marca dentro de círculo tingido | o componente mais gerado que existe |
| anel de progresso e halo radial | anel fingindo ser conteúdo, halo fingindo ser profundidade |
| um `FadeInDown` idêntico em toda seção | efeito espalhado no lugar de um momento |
| degradê na barra da semana corrente | decoração sem função |
| borda tracejada em estado vazio | o vazio genérico |
| interruptor sol/lua para o tema | o par de ícones mais gerado que existe — e um interruptor de duas posições não sabe dizer "siga o sistema" |

O tema escuro **não** voltou ao preto-com-neon: a ardósia é o oposto deliberado
daquilo, e o giz azul é claro justamente para não virar acento neon sobre preto.

## Verificação

O alvo é Android. O `expo export --platform web` serve só como banco de provas
visual, e tem três armadilhas registradas:

1. O bundle web do SDK 54 emite `import.meta` sem transformar (vem do middleware
   `devtools` do zustand, que acompanha o `persist`). Corrige-se servindo o script
   como `type="module"`. Nativo não é afetado.
2. O headless do Edge **não abre janela menor que ~492px**. Sem travar
   `html/body/#root` em 412px por CSS, toda captura "de celular" mente.
3. Uma tela em branco no web export raramente é falta de conteúdo — é a árvore
   caindo. Vale capturar `window.onerror` em fase de captura antes de investigar
   qualquer outra coisa, e comparar com um build do commit anterior para saber se
   a regressão é sua.
