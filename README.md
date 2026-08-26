# Ímpeto

App mobile de treino de academia. Registra carga e repetições série a série, guarda
rotinas e mostra a demonstração de cada exercício.

Feito em React Native (Expo SDK 54) — roda em **Android e iPhone**.

## Continuar em outro computador

```bash
git clone https://github.com/FelipeSantili/impeto-app.git
cd impeto-app
npm install
npx expo start
```

Só isso. Não há variável de ambiente, chave nem arquivo de configuração fora do
repositório — o app não tem conta nem servidor, e tudo que ele guarda fica no
aparelho.

Para gerar APK a partir da nova máquina, falta só entrar na conta da Expo:

```bash
npm install -g eas-cli
eas login
```

O vínculo com o projeto já está no `app.json` (`extra.eas.projectId`), então
`eas build` funciona direto, sem `eas init`.

**O que NÃO vem no clone:** as skills de design em `.agents/` e `.claude/skills/`
estão no `.gitignore`, porque `.claude/skills` são symlinks com caminho absoluto
da máquina de origem e chegariam quebrados. O que está versionado é o
`skills-lock.json`, que registra de qual repositório e com qual hash cada skill
veio — é a partir dele que se reinstala. O app compila e roda sem elas; são
ferramenta de autoria, não dependência.

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

## Tema

Claro e escuro, escolhidos em **Ajustes › Aparência**: Sistema (padrão), Claro ou
Escuro. "Sistema" acompanha o aparelho e muda sozinho de dia para noite.

Claro é o caderno — papel, tinta grafite, caneta azul e vermelha. Escuro é o
quadro da academia — ardósia e giz. Não é uma inversão: é outro objeto do mesmo
lugar, e os papéis das cores não mudam entre os dois.

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

**Importar do relógio (.tcx)** — o segundo caminho para os dados do Redmi Watch,
para quando o Health Connect não trouxe nada. O Mi Fitness exporta cada atividade
como um arquivo TCX; o Ímpeto lê e **encaixa no treino já registrado**, casando pela
sobreposição das janelas de tempo. Dá para escolher vários arquivos de uma vez.
Detalhes e armadilhas em [Arquivo .tcx do Mi Fitness](#arquivo-tcx-do-mi-fitness).

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

### Arquivo .tcx do Mi Fitness

TCX é o formato da Garmin (Training Center Database v2), mas o que o Mi Fitness
escreve é uma versão frouxa dele. Num treino de musculação o arquivo INTEIRO tem
622 bytes e é isto:

```xml
<Activity Sport="">
  <Id>2026-08-06T16:10:56.000Z</Id>    <!-- início, sempre em UTC -->
  <Calories>541</Calories>             <!-- totais; não existe no esquema oficial -->
  <Lap>
    <TotalTimeSeconds>3527</TotalTimeSeconds>
    <Calories>429</Calories>           <!-- só as ativas -->
    <HeartRateBpm>98</HeartRateBpm>    <!-- média; no esquema seria <Value>98</Value> -->
  </Lap>
</Activity>
```

Ou seja: **média sim, máxima não, curva não**, esporte em branco e `<Lap>` sem o
atributo `StartTime` que o esquema exige. Em atividade ao ar livre o mesmo app
escreve o TCX completo, com `<Trackpoint>` de poucos em poucos segundos — daí saem
máxima, distância e a curva de frequência. `lib/tcx.ts` lê as duas formas e devolve
`null` no que não veio, nunca zero: zero é uma medida, e a ausência de medida não é.

Por isso o bloco do relatório monta as **colunas a partir do que existe**. Uma coluna
fixa com travessão no lugar do número afirmaria ter medido algo que ninguém mediu.

**A armadilha do caminho.** O Mi Fitness salva em
`Android/data/com.xiaomi.wearable/files/ExportTrack/`, que desde o Android 11 é área
privada do app: nenhum gerenciador de arquivos entra lá, o seletor de documentos não
enxerga, e o MTP do Windows tampouco — a pasta simplesmente não aparece. Para
importar, o arquivo precisa primeiro sair de lá. O caminho que funciona é ligar o
celular ao computador e mover os `.tcx` para `Download/` pelo Explorer.

**Como o par é achado.** Pela sobreposição das janelas de tempo — é o único critério
que não depende de nome de arquivo nem de fuso horário. Sem sobreposição, aceita o
treino do mesmo dia que começou até seis horas de distância. Nada é criado: arquivo
sem treino correspondente é relatado, não vira treino vazio no histórico.

**Como os dados se juntam.** O arquivo manda nos campos que traz e o que já estava lá
sobrevive no resto. Treino feito com a cinta (que tem curva e máxima) mais o arquivo
do relógio (que tem calorias) fica mais completo do que com qualquer um dos dois
sozinho. O nome do arquivo fica gravado, então reimportar o mesmo não duplica.

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

### Quando a cota da Expo acaba

O plano free tem um teto mensal de builds Android. Estourado o teto, `eas build` é
recusado antes de entrar na fila e só volta na virada do mês. A saída não é esperar:

```bash
gh workflow run apk.yml -f perfil=apk
```

[.github/workflows/apk.yml](.github/workflows/apk.yml) roda `eas build --local` — a
mesma receita da nuvem, executada no runner do GitHub, que **não consome a cota**.
Repositório público tem minutos ilimitados, então sai de graça e sem fila. O APK aparece
como artefato da execução.

Por que no CI e não aqui: o plugin de build local **não roda no Windows** ("macOS or
Linux is required"). O runner é Ubuntu.

Duas coisas o workflow ajusta por conta própria, escrevendo no `gradle.properties` do
HOME — que vence o do projeto na precedência do Gradle e é o único que sobrevive ao
`expo prebuild`:

- **Memória.** O teto do template (`-Xmx2048m`, metaspace 512m) não aguenta o KSP: o
  daemon do Kotlin estoura o metaspace em `expo-updates` e derruba o build depois de
  meia hora. Os workers da EAS levantam esse teto por padrão; o runner, não.
- **ABIs.** O padrão compila quatro arquiteturas, ou seja quatro passagens de CMake em
  reanimated, screens e worklets. O workflow usa `arm64-v8a` sozinho, o que corta o
  tempo em três quartos. **O APK sai só para arm64** — serve em qualquer celular
  moderno, mas não em aparelho 32 bits. Para um universal, escolha a outra opção de
  `arquiteturas` ao disparar.

O keystore de release continua vindo da conta da Expo, buscado pelo secret `EXPO_TOKEN`
(criado em expo.dev/settings/access-tokens e gravado com `gh secret set EXPO_TOKEN`).
É o que garante que o APK instale por cima do que já está no aparelho. Para cortar
também esse laço, o caminho é guardar o `.jks` e as três senhas como secrets e trocar o
passo do `eas` por `npx expo prebuild` + `gradlew assembleRelease`.

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

### A armadilha do fingerprint

`runtimeVersion: fingerprint` compara o hash da camada nativa calculado **na sua
máquina** com o calculado **no servidor do EAS**. Se os dois não baterem, o build morre
antes de gerar o APK com "runtime version mismatch" — e o culpado provável não é o seu
código, é sobra de compilação dentro de `node_modules`.

Um `expo run:android` local deixa saída do Gradle em `node_modules/<lib>/android/build/`.
O EAS instala limpo e não tem nada disso. Na maioria das bibliotecas isso é inofensivo,
porque o `@expo/fingerprint` já ignora `**/android/build/**` por padrão — mas o
`react-native-health-connect` traz um SEGUNDO projeto Android (`android-expo/`), fora
do padrão, e é justamente por ele que o hash divergia.

O `.fingerprintignore` na raiz fecha esse caminho (e mais os `.cxx`/`.gradle` das outras
bibliotecas). Ele não altera o hash — só impede que sobra local entre na conta. Para
conferir a qualquer momento:

```bash
node node_modules/expo-updates/bin/cli.js fingerprint:generate --platform android
```

O `hash` do fim da saída é o que o EAS tem que reproduzir.

### Imagens dos exercícios

As demonstrações são baixadas da CDN na primeira vez que você abre cada exercício e
ficam em cache no aparelho. Ou seja: o APK não precisa do computador, mas precisa de
internet para carregar uma demonstração inédita. Registrar treino, séries, carga,
rotinas e histórico funciona offline desde sempre.

Embutir as 598 imagens no APK deixaria tudo offline ao custo de ~42 MB a mais no
arquivo.

## Como o app funciona

**Início** — a semana como linha pautada de sete células (o dia treinado recebe um bloco
de tinta, hoje fica emoldurado), um botão para começar e a lista de rotinas. Toque numa
rotina para **abrir** a antessala dela; segure para editar ou apagar.

**Antessala da rotina** — nenhum treino começa por toque de lista. Tocar numa rotina
abre uma tela que mostra o que vem no dia: exercícios em ordem, séries e descanso de
cada um, e quando foi a última vez que ela virou treino. Quem começa o cronômetro é o
botão **Iniciar treino**, e só ele. Toque num exercício para ler a ficha antes de
entrar no salão.

**Modelos prontos** — 14 treinos em 5 divisões clássicas: Upper · Lower (A e B),
Push · Pull · Legs, ABC, Full Body e Primeiras semanas (só máquinas, para quem está
começando). Cada modelo já vem com exercícios, número de séries e descanso definidos.
Ao salvar, vira uma rotina sua — dali em diante você edita à vontade, sem vínculo com
o original.

**Treino** — cada exercício vira uma tabela: número da série, o que você fez da última
vez, carga, repetições e o ✓. Tocar no ✓ sem digitar nada repete o desempenho anterior
e dispara o cronômetro de descanso. Tocar no número da série abre o seletor de técnica;
segurar remove a série.

**Descanso, editável no meio do treino** — o tempo é uma TECLA no cabeçalho de cada
exercício, não uma legenda: um toque abre as oito opções, e "outro tempo" aceita
qualquer valor digitado. Com o cronômetro correndo, **−15s** e **+15s** corrigem o
relógio e o ALVO do exercício ao mesmo tempo — a correção vale para as séries
seguintes, em vez de morrer no fim daquele descanso. A tira mostra o alvo ao lado do
tempo restante, para o ajuste ser visível.

**Exercícios** — 299 movimentos em português, cobrindo as máquinas de uma academia
comum (leg press, hack, extensora, flexora, peck deck, crossover, graviton, Smith,
adutora/abdutora, panturrilheira, cardio) além de barra, halteres, cabos, kettlebell e
peso corporal. Cada um traz demonstração animada, execução passo a passo, o erro mais
comum, seus recordes e o histórico.

**Variações** — a ficha de cada exercício lista o que serve no lugar dele: primeiro
quem compartilha a execução (supino reto com barra, halteres, máquina, Smith), depois
quem serve à mesma finalidade por outro caminho (mergulho, flexão, supino inclinado).
É a resposta à pergunta que se faz de pé, com a máquina ocupada. Com um treino aberto,
cada variação vem com botão de **trocar**: a linha do treino passa a ser o exercício
novo na hora, com o mesmo número de séries e o mesmo descanso. O mesmo botão está no
menu (⋯) de cada exercício do treino e de cada linha do editor de rotina. Série já
marcada nunca muda de nome — quando existe alguma, a linha se parte em duas e o que foi
feito continua registrado no exercício antigo.

**Técnicas de execução** — cada série pode ser marcada como normal, aquecimento, falha,
drop set, rest-pause, bi-set, cluster, isometria, negativa ou parcial. Toque no número
da série para escolher. Aquecimento é a única que não entra no volume.

**Relatório de fim de treino** — ao concluir, um **carimbo de borracha desce sobre a
página** e o resumo se abre: duração, volume e séries subindo de zero, recordes batidos
marcados a vermelho na margem, frequência cardíaca e a **prancha dos músculos
trabalhados sobre uma figura humana** (frente e costas), cada região com a densidade de
tinta proporcional ao esforço. Dá para **compartilhar como imagem**, no estilo Strava. O
mesmo relatório, sem a encenação, é o que você vê ao abrir um treino pelo histórico.

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

O visual — paleta, tipografia, vocabulário de marcas de estado e o que foi
deliberadamente recusado — está documentado em [DESIGN.md](DESIGN.md).

```
src/
  app/            rotas (expo-router)
    (tabs)/       Início · Exercícios · Progresso
    treino.tsx    treino em andamento
    selecionar.tsx  seletor múltiplo de exercícios
    modelos.tsx · modelo/[id].tsx    vitrine e detalhe dos treinos prontos
    ajustes.tsx   conexões (Health Connect, cinta, .tcx do relógio) e backup
    corpo.tsx     a musculatura da sessão em três dimensões (modal)
    iniciar/[id].tsx  a antessala: o que vem no dia, antes de o relógio correr
    exercicio/[id].tsx · rotina/[id].tsx · sessao/[id].tsx
  components/
    base.tsx      vocabulário do caderno: texto, botões, régua, seção, linha,
                  cabeça de coluna, carimbo, pressionável
    glifos.tsx    as 27 marcas desenhadas do app (não há biblioteca de ícones)
    variacoes.tsx as variações na ficha e a folha de trocar exercício
    demo · folha · descanso · animado · mapa-muscular · cartao-compartilhar
    corpo-3d.tsx  o modelo anatômico do Z-Anatomy, em tela cheia e embutido
                  no relatório e no treino; receita em MODELO-3D.md
    curva-fc.tsx  a curva de frequência do treino, quando a fonte manda amostras
  data/           catálogo, modelos prontos, tipos, execução por família de movimento
                  e variacoes.ts: que exercícios servem à mesma finalidade
  design/
    tokens.ts   contrato de direção, as DUAS paletas, tipografia, marcas
    tema.tsx    TemaProvider, usarPaleta e criarEstilos (folhas por tema)
  lib/            metricas, saude (Health Connect), backup, atualizacao, compartilhar
    gltf.ts       carrega .glb no React Native (e a armadilha do navigator)
  ferramentas/    destilar-modelo.mjs: do atlas Z-Anatomy ao asset do app
    tcx.ts        leitor dos arquivos .tcx do Mi Fitness (as duas formas dele)
    relogio.ts    escolhe os arquivos e casa cada um com o treino do histórico
  store/          estado persistido (zustand + AsyncStorage): treino, cinta,
                  descanso, selecao, atualizacao, tema
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
