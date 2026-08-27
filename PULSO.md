# O Ímpeto no pulso

<!-- Escrito a partir do que foi construído, não do que foi planejado. -->

Um app de Wear OS que não é o Ímpeto numa tela menor: é o **registro da série**,
e nada mais. Sem histórico, sem catálogo, sem gráfico. Quem quer olhar treino
olha no celular; quem está com a barra na mão quer dois toques.

## As três restrições que desenharam tudo

Nenhuma delas foi escolha. Vale começar por elas porque cada decisão estranha
deste projeto sai de uma das três.

**1. O `android/` do celular é descartável.** O app é Expo managed: a pasta está
no `.gitignore` e o `prebuild` a regenera do zero a cada build. Código nativo
solto lá seria apagado na compilação seguinte, toda vez. Por isso a ponte do
celular é um **módulo Expo local** em `modules/impeto-pulso/` — o autolinking o
encontra (`nativeModulesDir` aponta para `./modules` por padrão) e o prebuild
não o toca.

**2. O relógio tem que ser nativo.** Kotlin e Wear Compose, em
`pulso/` — projeto Gradle próprio, que compila com `./gradlew` comum e não sabe
que o Expo existe. React Native no Wear OS não é caminho: não há componentes
Wear, a coroa e o bezel rotativo não chegam, e a tela redonda vira um retângulo
com os cantos desperdiçados.

**3. Mesma identidade nos dois binários.** O Wearable Data Layer só entrega
mensagens entre apps de **mesmo `applicationId`** e **mesma assinatura**. Não é
recomendação de organização — é como o sistema decide que os dois binários, em
dois aparelhos, são o mesmo app.

> Errar qualquer um dos dois não dá erro. Dá **silêncio**, com os dois lados
> jurando que não há nada conectado. É o pior modo de falhar que existe, e é por
> isso que `pulso/app/build.gradle.kts` assina até o build de debug com a chave
> de release quando ela está presente.

## Quem manda

O **celular**, sempre. O relógio não guarda treino: manda COMANDO e desenha o
RETRATO que volta.

```
  relógio  ──  MessageClient  ──▶  celular      comando: marca, edita, inicia
  relógio  ◀──  DataClient    ──   celular      retrato: a sessão inteira
```

A alternativa — os dois escrevendo no mesmo estado e reconciliando depois —
parece simétrica e elegante até a primeira desconexão. O canal é Bluetooth, e
Bluetooth cai: dois donos numa rede que cai é resolução de conflito para cada
série marcada, e o preço de errar a reconciliação é carga registrada que some.
Um dono só, e a pergunta não se coloca.

Os dois canais do Data Layer fazem coisas diferentes de propósito:

| canal | sentido | leva | por quê |
|---|---|---|---|
| `MessageClient` | relógio → celular | comandos | baratos, ordenados, sem estado |
| `DataClient` | celular → relógio | o retrato | persistente, deduplicado por conteúdo, e reaparece sozinho quando o relógio volta ao alcance |

O retrato ser um `DataItem` é o que faz o app do relógio abrir **já** com o
treino em curso: o último publicado continua no Data Layer depois de o relógio
reiniciar, sem o celular precisar republicar.

## O buraco, e o que tapa ele

O `WearableListenerService` do celular é acordado pelo Play Services mesmo com o
app fechado — o processo sobe, o serviço roda, e o **React Native não está lá**.
O treino mora no zustand, que mora no JS: não há para quem entregar o comando.

Então há dois destinos, e qual atende depende de algo fora do nosso controle:

- **módulo vivo** → o comando vai direto para o JS;
- **módulo morto** → vai para uma **fila em `SharedPreferences`**, e o módulo a
  esvazia quando nascer.

Marcar uma série no relógio com o celular no bolso, tela apagada e app morto
continua valendo. Só aparece quando o app abrir.

O serviço **não tenta abrir o app**. Android 10 em diante barra início de
activity a partir do fundo, e insistir daria um comando engolido sem aviso.

### Por que todo comando tem `id`

A entrega tem dois caminhos e nada impede que um comando percorra os dois.
`marcar` é uma **inversão**: aplicada duas vezes, desmarca a série que a pessoa
acabou de marcar, e ela não teria como saber por quê. `aplicar` em
[src/lib/pulso.ts](src/lib/pulso.ts) guarda os ids já vistos.

## O contrato

Uma definição, duas linguagens, e elas se leem lado a lado:

- [src/lib/pulso.ts](src/lib/pulso.ts) — TypeScript, no celular
- [pulso/app/.../Protocolo.kt](pulso/app/src/main/java/com/impeto/app/pulso/Protocolo.kt) — Kotlin, no relógio

O que atravessa é sempre **string de JSON**, nos dois sentidos. O Data Layer
transportaria campos avulsos num `DataMap` sem problema, mas aí cada campo novo
numa série viraria mexida em três arquivos em vez de dois — e o esquecimento
silencioso de um deles é indistinguível de uma falha de rede.

O nome do exercício vai **resolvido** do catálogo no retrato. O relógio não
carrega o catálogo, e não vai: são milhares de linhas para uma tela que mostra
um nome por vez.

## Compilar e instalar

### 1. A chave

Exporte o keystore de release da EAS **uma vez**, num terminal interativo:

```
npx eas-cli credentials --platform android
#  → production → Keystore → Download
```

Depois, `pulso/keystore.properties` (gitignorado):

```properties
storeFile=../impeto.jks
storePassword=...
keyAlias=...
keyPassword=...
```

Sem esse arquivo o build cai no keystore de debug — compila e instala, mas fica
**mudo** diante do app de release que está no celular.

### 2. O relógio

```
adb connect <ip-do-relogio>:<porta>
cd pulso && ./gradlew :app:installDebug
```

O IP e a porta saem de *Ajustes → Opções do desenvolvedor → Depuração sem fio*
no relógio.

### 3. O celular

O app do celular precisa ser **reinstalado** depois de ganhar o módulo nativo —
o JS sozinho não traz `play-services-wearable` nem o serviço do manifesto. Como
a chave é a mesma, instala por cima e o histórico continua onde está.

## O que ainda não existe

- **Cronômetro de descanso no pulso.** É o próximo candidato óbvio: o relógio já
  recebe `descanso` de cada exercício no retrato, e vibração no pulso é melhor
  que apito no bolso.
- **Adicionar exercício pelo relógio.** Precisaria do catálogo, ou de uma busca
  que atravesse a ponte. Nenhum dos dois cabe bem numa tela dessas.
- **Cardio.** O Galaxy Watch já mede frequência; hoje ela chega ao Ímpeto pelo
  Health Connect, depois do treino. Lê-la ao vivo daqui é possível e é outra
  história.
