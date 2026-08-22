# Ímpeto

App mobile de treino de academia. Registra carga e repetições série a série, guarda
rotinas e mostra a demonstração de cada exercício.

Feito em React Native (Expo SDK 54) — roda em **Android e iPhone**.

## Rodar no celular

```bash
npm install
npx expo start
```

Instale o app **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) ·
[iPhone](https://apps.apple.com/app/expo-go/id982107779)), abra e escaneie o QR Code que
aparece no terminal. O celular e o computador precisam estar no mesmo Wi-Fi.

Se a rede da casa bloquear a conexão, use o túnel:

```bash
npx expo start --tunnel
```

## Conexões

Tudo em **Ajustes** (engrenagem no canto superior do Início).

**Health Connect** (Android) — o caminho para os dados do relógio. O Mi Fitness
sincroniza o Redmi Watch com o Health Connect, e o Ímpeto lê a frequência cardíaca e
as calorias da janela de tempo do treino, anexando ao relatório. Também grava a sessão
de musculação no seu histórico de saúde.

**Cinta cardíaca Bluetooth** — Polar, Garmin, Wahoo, Magene e similares. Usa o Heart
Rate Service, padrão aberto do Bluetooth, então não precisa do app do fabricante.
É o único caminho com **frequência ao vivo**: aparece no topo da tela de treino,
batendo em tempo real.

**Backup em JSON** — exporta rotinas e histórico num arquivo que você guarda onde
quiser. A importação soma ao que existe e ignora ids repetidos, então reimportar o
mesmo arquivo não duplica treinos.

### Por que o relógio não dá frequência ao vivo

O Redmi Watch fala um protocolo proprietário com o Mi Fitness — ele não expõe o Heart
Rate Service do Bluetooth, então o app não consegue conectar direto nele. Os dados
passam pelo Mi Fitness e só chegam ao Health Connect quando ele sincroniza, o que
acontece periodicamente, não em tempo real.

Na prática: o relógio serve para enriquecer o **relatório depois do treino**. Para ver
os batimentos durante a série, é preciso uma cinta.

## Compatibilidade do Expo Go

O projeto está no **SDK 54**, que casa com o Expo Go 54.x. O Expo Go só roda uma versão
de SDK por vez — se o app for atualizado na loja para o SDK 57, este projeto para de
abrir nele. Nesse caso, ou se atualiza o projeto (`npx expo install expo@latest --fix`),
ou se gera um build próprio com EAS, que não depende do Expo Go.

## Gerar o APK (app instalado, sem servidor)

O Expo Go depende do servidor de desenvolvimento rodando no computador. O APK não:
todo o código vai compilado dentro do arquivo, com ícone próprio na tela inicial.

O app funciona inteiramente offline. O servidor da Expo só é consultado para perguntar
se existe versão nova (veja a seção de atualização abaixo) — sem rede, ou com o serviço
fora do ar, o app abre e funciona normal com o que está instalado.

A build acontece nos servidores da Expo (conta gratuita) porque compilar localmente
exigiria Android Studio e JDK instalados na máquina.

```bash
npm install -g eas-cli
eas login          # conta gratuita em expo.dev
eas init           # só na primeira vez: vincula o projeto
eas build -p android --profile apk
```

Ao terminar (~10-20 min) o terminal mostra um link de download e um QR Code. Baixe o
`.apk` no celular e abra — o Android vai pedir para autorizar "instalar de fontes
desconhecidas" uma única vez.

Para publicar na Play Store um dia, o perfil `production` gera `.aab` em vez de `.apk`.

## Atualizar o app sem reinstalar

O projeto usa **EAS Update**: mudanças de JS e imagens chegam ao celular pelo ar,
sem gerar APK novo nem reinstalar nada.

```bash
eas update --branch apk --message "o que mudou"
```

O app procura por versão nova ao abrir e ao voltar do segundo plano. Quando encontra,
baixa em segundo plano e mostra uma faixa no topo — **quem decide a hora de reiniciar
é você**. Também dispara uma notificação do sistema, uma única vez por versão.

O que **não** vai por atualização pelo ar: mudança de dependência nativa, de
configuração nativa (`app.json`) ou de versão do SDK. Nesses casos é preciso gerar um
APK novo. A política `runtimeVersion: fingerprint` cuida disso sozinha — ela calcula um
hash da camada nativa, então um pacote incompatível simplesmente não é oferecido a uma
build antiga.

Sobre a notificação: ela é local, disparada quando o app detecta a nova versão. Ou
seja, chega quando o app é aberto ou volta do segundo plano — não é um push que acorda
o aparelho sozinho. Push real exigiria servidor e token por aparelho.

### Versão do app

`eas.json` usa `appVersionSource: "local"`, então a versão mora no `app.json` e não em
estado na nuvem. Ao gerar uma build nova para o mesmo aparelho, suba o
`android.versionCode` (1 → 2 → 3…), senão o Android recusa a instalação por cima.

### Imagens dos exercícios

As demonstrações são baixadas da CDN na primeira vez que você abre cada exercício e
ficam em cache no aparelho. Ou seja: o APK não precisa do computador, mas precisa de
internet para carregar uma demonstração inédita. Registrar treino, séries, carga,
rotinas e histórico funciona offline desde sempre.

Embutir as 598 imagens no APK deixaria tudo offline ao custo de ~42 MB a mais no
arquivo.

## Como o app funciona

**Início** — a semana em sete pontos (o de hoje com anel), um botão para começar e a
lista de rotinas. Toque numa rotina para iniciá-la já montada; segure para editar ou
apagar.

**Modelos prontos** — 14 treinos em 5 divisões clássicas: Upper · Lower (A e B),
Push · Pull · Legs, ABC, Full Body e Primeiras semanas (só máquinas, para quem está
começando). Cada modelo já vem com exercícios, número de séries e descanso definidos.
Ao salvar, vira uma rotina sua — dali em diante você edita à vontade, sem vínculo com
o original.

**Treino** — cada exercício vira uma tabela: número da série, o que você fez da última
vez, carga, repetições e o ✓. Tocar no ✓ sem digitar nada repete o desempenho anterior
e dispara o cronômetro de descanso. Tocar no número da série abre o seletor de técnica;
segurar remove a série.

**Exercícios** — 299 movimentos em português, cobrindo as máquinas de uma academia
comum (leg press, hack, extensora, flexora, peck deck, crossover, graviton, Smith,
adutora/abdutora, panturrilheira, cardio) além de barra, halteres, cabos, kettlebell e
peso corporal. Cada um traz demonstração animada, execução passo a passo, o erro mais
comum, seus recordes e o histórico.

**Técnicas de execução** — cada série pode ser marcada como normal, aquecimento, falha,
drop set, rest-pause, bi-set, cluster, isometria, negativa ou parcial. Toque no número
da série para escolher. Aquecimento é a única que não entra no volume.

**Relatório de fim de treino** — ao concluir, abre um resumo animado: selo de conclusão,
duração, volume e séries subindo de zero, recordes batidos, frequência cardíaca e o
**mapa dos músculos trabalhados sobre uma figura humana** (frente e costas), com cada
região pintada pela intensidade do esforço. Dá para **compartilhar como imagem**, no
estilo Strava. O mesmo relatório, sem a encenação, é o que você vê ao abrir um treino
pelo histórico.

**Progresso** — total de treinos, volume e tempo, o volume das últimas oito semanas e
todos os treinos concluídos.

### Como os músculos são contados

Cada exercício credita **série cheia** ao grupo principal e **0,4** a cada assistente.
No supino, o peitoral leva 1,0 por série e tríceps e ombro levam 0,4 cada. Contar tudo
igual inflaria os auxiliares; ignorá-los esconderia carga real. Por isso o rótulo é
"séries efetivas", e a soma dos grupos passa do total de séries da sessão — é o
esperado.

### Como os recordes são detectados

Comparando a sessão com todos os treinos anteriores a ela:

- **Carga** — maior peso absoluto já usado no exercício.
- **Força** — melhor 1RM estimado (fórmula de Epley). Pega quem subiu repetição sem
  subir peso. O número é estimativa, não peso levantado, e o app diz isso na tela.

Um recorde por exercício, carga tem prioridade. **Estreia não conta como recorde**: nos
primeiros treinos todo exercício seria "recorde" e o troféu perderia o sentido — ela
vira só uma nota de rodapé.

## Estrutura

```
src/
  app/            rotas (expo-router)
    (tabs)/       Início · Exercícios · Progresso
    treino.tsx    treino em andamento
    selecionar.tsx  seletor múltiplo de exercícios
    modelos.tsx · modelo/[id].tsx    vitrine e detalhe dos treinos prontos
    ajustes.tsx   conexões (Health Connect, cinta) e backup
    exercicio/[id].tsx · rotina/[id].tsx · sessao/[id].tsx
  components/     base (texto, botões, folhas modais), demo, decor, animado
  data/           catálogo, modelos prontos, tipos e execução por família de movimento
  design/tokens.ts  cores, tipografia, espaçamento
  lib/            metricas, saude (Health Connect), backup, atualizacao
  store/          treino, cinta (Bluetooth), descanso, atualizacao
  lib/metricas.ts   volume, 1RM, recordes, formatação
  store/          estado persistido (zustand + AsyncStorage)
```

## Dados dos exercícios

As demonstrações vêm do [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(domínio público), servido por CDN. Cada exercício tem dois quadros — início e fim do
movimento — que o app alterna para formar a animação. As imagens ficam em cache no
aparelho depois da primeira visualização.

Nomes, agrupamentos e instruções de execução são próprios, escritos em português.

## Limitação conhecida: export web estático

`npx expo export --platform web` gera uma página em branco no SDK 54. O middleware
`devtools` do zustand vem junto com o `persist` e usa `import.meta.env`, que o build web
do SDK 54 emite sem transformar — e `import.meta` é erro de sintaxe fora de um módulo ES.
Não afeta Android nem iOS: no bundle nativo o Metro transforma `import.meta`
corretamente (verificado no bundle gerado).

Se algum dia o alvo web importar, as saídas são servir o bundle com
`<script type="module">` ou trocar o `persist` do zustand por uma persistência própria.

## Onde ficam os dados

Tudo é salvo localmente no aparelho (AsyncStorage). Não há conta, servidor nem envio de
informação para fora. Desinstalar o app apaga o histórico.
