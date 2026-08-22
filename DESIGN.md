# Design — Ímpeto

<!-- Escrito a partir do que foi construído, não do que foi planejado. -->

O mundo visual é **o caderno de treino**: papel de gramatura, tinta grafite e
duas canetas. Um livro-caixa, não um painel.

A regra que organiza tudo: **estado se diz por marca e posição, nunca por cor.**
Isso não é estilo — é requisito. A academia às vezes está sob luz fluorescente
forte e às vezes quase escura, então nada que carregue significado pode depender
de matiz nem de contraste sutil.

## Cores

Definidas em [src/design/tokens.ts](src/design/tokens.ts). Nenhum hex fora dali.

| Papel | | |
|---|---|---|
| `papel` | `#E8E7E2` | a página. Cinza de gramatura, **não** creme |
| `papelAlto` | `#F2F1ED` | encaixe claro: campo preenchido, linha concluída, folha modal |
| `papelBaixo` | `#DBDAD3` | faixa de cabeçalho de coluna, fundo de toque |
| `papelBorda` | `#D0CFC7` | borda da folha destacada (cartão de compartilhar) |

| Tinta impressa | | contraste sobre papel |
|---|---|---|
| `tinta` | `#191B1C` | 13,8:1 |
| `tintaMid` | `#4A4E51` | 6,8:1 |
| `tintaFraca` | `#62666B` | 4,6:1 — **piso**: abaixo disto nada carrega significado |
| `tintaFantasma` | `#9A9C99` | só decoração (pontilhado de campo vazio) |

| Canetas | | |
|---|---|---|
| `azul` | `#23368C` | **o que você escreveu**: cargas, repetições, o ✓, a ação primária |
| `vermelho` | `#B4231F` | **o carimbo**: recorde, sigla de técnica, remoção |

O azul atende aos dois papéis que uma cor de ação precisa atender: 8,6:1 como
texto sobre papel e 10,7:1 com papel por cima quando vira preenchimento.

Réguas (`regua`, `reguaMid`, `reguaForte`) são preto tingido por transparência,
não cinzas próprios — assim escurecem junto com qualquer fundo.

## Tipografia

Duas famílias, um princípio: **prosa em Archivo, todo número em Barlow
Condensed.** Condensada lê como impressa em formulário e deixa número grande
caber em coluna estreita. Ambas trazem `tnum` (verificado no binário), então
`fontVariant: ['tabular-nums']` alinha de verdade.

Hierarquia vem de tinta e entrelinha, não de inflar corpo. Só `monumento`
escapa disso, de propósito.

| | uso |
|---|---|
| `monumento` 104 | reservado ao número que se lê a um braço de distância |
| `numeroXG` 44 · `numeroG` 28 · `numero` 20 | totais, células de carga e repetição |
| `display` 30 · `title` 22 · `heading` 16 | títulos, sempre **alinhados à esquerda** |
| `body` / `bodyMed` 15 · `small` / `smallMed` 13 | prosa |
| `coluna` 12 · `carimbo` 12 | cabeçalho de coluna e carimbo, sempre em caixa alta |

Todo valor grande em coluna leva `numberOfLines={1}` + `adjustsFontSizeToFit`:
o cartão de compartilhar vira imagem, e uma quebra de linha ali desmonta a
composição.

## Estrutura

- **Não existe cartão.** Seções se separam por **régua** e espaço. `Cartao` foi
  removido do vocabulário; no lugar entraram `Secao`, `Linha`, `CabecaColuna` e
  `Regua`.
- **Margem fixa** (`margem.pagina` 20, `margem.calha` 26). A calha é a coluna
  reservada ao ordinal, à barra da linha ativa e ao carimbo de recorde. Toda
  tela registra contra ela.
- **Canto reto.** `radius` vai de 0 a 4 — papel não é arredondado. Não há
  `pill`.
- **Zero sombra**, com uma exceção honesta: a folha modal, que é literalmente
  uma folha sobre a página, e cuja sombra é tingida com o cinza do papel.
- Composição assimétrica: título à esquerda, meta carimbada à direita na mesma
  linha de base.

## Vocabulário de marcas

Definido em `marca` nos tokens e usado igual em todas as telas:

| estado | marca |
|---|---|
| feita | escrita em azul, fundo `papelAlto`, ✓ preenchido |
| ativa | **barra de tinta** de 3px na margem |
| pendente | pontilhado de campo não preenchido, régua embaixo da célula |
| aquecimento | ordinal **entre parênteses** — livro-caixa marca assim a linha que não soma |
| técnica | sigla carimbada em vermelho |
| recorde | traço vermelho na margem, como correção de professor |

Nenhuma dessas marcas precisa de cor para ser entendida.

## Marcas desenhadas

Não há conjunto de ícones pronto. [src/components/glifos.tsx](src/components/glifos.tsx)
desenha 26 glifos na mesma grade de 24, com **ponta reta e junta em esquadria**
— ponta arredondada é a assinatura das bibliotecas prontas. Um só peso de traço
em todo o app, reescalado opticamente.

## Movimento

Um momento autoral, não efeitos espalhados.

- **O carimbo de conclusão** é esse momento: desce de escala 1,7 → 1 com mola,
  crava a −3,5° porque carimbo humano não sai reto, e dispara o háptico no
  quadro em que encosta — não quando a animação acaba.
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

## Verificação

O alvo é Android. O `expo export --platform web` serve só como banco de provas
visual, e tem duas armadilhas registradas:

1. O bundle web do SDK 54 emite `import.meta` sem transformar (vem do middleware
   `devtools` do zustand, que acompanha o `persist`). Corrige-se servindo o
   script como `type="module"`. Nativo não é afetado.
2. O headless do Edge **não abre janela menor que ~492px**. Sem travar
   `html/body/#root` em 412px por CSS, toda captura "de celular" mente.
