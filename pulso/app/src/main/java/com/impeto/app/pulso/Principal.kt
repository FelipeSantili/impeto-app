package com.impeto.app.pulso

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * O ÍMPETO NO PULSO.
 *
 * A tela do relógio existe para uma coisa só: registrar a série que você acabou
 * de fazer sem tirar o celular do bolso. Tudo que não serve a isso ficou de
 * fora — não há catálogo, não há ficha, não há gráfico de exercício.
 *
 * O estado inteiro vem do celular (`Elo.retrato`) e nada é guardado aqui. O que
 * o dedo faz vira COMANDO, e o resultado só aparece quando o celular confirma
 * publicando o retrato de volta. É mais lento que fingir que deu certo na hora,
 * e é a diferença entre a tela mostrar o treino e a tela mostrar uma esperança
 * sobre o treino.
 *
 * A exceção é a POSIÇÃO: qual exercício e qual série estão abertos vive só
 * aqui. É navegação, não dado — o celular não tem opinião sobre onde o seu dedo
 * está, e mandá-la de volta pela ponte faria a tela saltar a cada publicação.
 */
class Principal : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent { App() }
  }
}

/** Rótulos das duas colunas de cada medida. Espelha `MEDIDA_LABEL` do celular. */
private fun rotulos(medida: String): Pair<String, String> = when (medida) {
  "rep" -> "kg+" to "reps"
  "tempo" -> "kg" to "s"
  "dist_tempo" -> "km" to "min"
  "peso_tempo" -> "kg" to "s"
  else -> "kg" to "reps"
}

/** Número como o app do celular escreve: vírgula decimal, sem zero à toa. */
private fun num(v: Double?): String {
  if (v == null) return "—"
  return if (v == v.roundToInt().toDouble()) v.roundToInt().toString()
  else String.format("%.1f", v).replace('.', ',')
}

/** Volume como o celular escreve: tonelada acima de mil quilos. */
private fun volume(kg: Double): String =
  if (kg >= 1000) String.format("%.1f", kg / 1000).replace('.', ',') + "t"
  else "${kg.roundToInt()}kg"

/** Passo de ajuste de cada campo. Cobre o incremento real da academia. */
private const val PASSO_PESO = 2.5
private const val PASSO_REPS = 1.0

@Composable
private fun App() {
  val ctx = LocalContext.current
  val escopo = rememberCoroutineScope()
  val retrato by Elo.retrato.collectAsStateWithLifecycle()
  val aoAlcance by Elo.celularAoAlcance.collectAsStateWithLifecycle()
  val sessao = retrato?.sessao

  // ─── Posição do dedo. Só aqui; ver o cabeçalho do arquivo. ───
  var uidAberto by remember { mutableStateOf<String?>(null) }
  var indiceSerie by remember { mutableIntStateOf(0) }
  var listando by remember { mutableStateOf(false) }
  /** Instante em que o descanso acaba, no relógio do sistema. 0 = sem descanso. */
  var descansoAte by remember { mutableLongStateOf(0L) }
  /** Verdadeiro entre mandar `finalizar` e o usuário sair da tela de fim. */
  var mostrandoFim by remember { mutableStateOf(false) }

  LaunchedEffect(Unit) {
    Elo.carregar(ctx)
    Elo.conferirCelular(ctx)
  }

  val ouvinte = remember { OuvinteAoVivo(ctx) }
  val ouvinteCapacidade = remember { OuvinteCapacidade(ctx) }
  DisposableEffect(Unit) {
    ouvinte.ligar()
    ouvinteCapacidade.ligar()
    onDispose {
      ouvinte.desligar()
      ouvinteCapacidade.desligar()
    }
  }

  // O celular acabou de aparecer: pede o retrato de uma vez. Sem isto a
  // capacidade chega pelo ouvinte mas o retrato só viria na próxima publicação.
  LaunchedEffect(aoAlcance) {
    if (aoAlcance == true) Elo.carregar(ctx)
  }

  // Treino novo, dedo no começo. Sem isto, começar um treino depois de outro
  // abriria no exercício em que o anterior parou — que pode nem existir mais.
  LaunchedEffect(sessao?.id) {
    uidAberto = null
    indiceSerie = 0
    descansoAte = 0L
    if (sessao != null) mostrandoFim = false
  }

  fun mandar(comando: String) {
    escopo.launch { Elo.mandar(ctx, comando) }
  }

  val exercicio = sessao?.exercicios?.firstOrNull { it.uid == uidAberto }
    ?: sessao?.exercicios?.firstOrNull()

  /*
   * SEM a hora do sistema no topo.
   *
   * O `Scaffold` do Wear a oferece de graca e ela e convencao na plataforma —
   * mas aqui ela ocupa a faixa exata em que o cabecalho do exercicio vive, e as
   * duas se sobrepoem. Numa tela de quatro centimetros nao ha para onde
   * empurrar: ou a hora, ou saber em que serie voce esta. Quem esta com a barra
   * na mao ja tem a hora a um giro de pulso.
   */
  Scaffold(modifier = Modifier.fillMaxSize().background(Cor.fundo)) {
    when {
      // O descanso toma a tela: é o único momento em que a informação útil é
      // uma só, e dividir a atenção com a lista de séries não ajudaria ninguém.
      descansoAte > 0L -> TelaDescanso(
        ate = descansoAte,
        aoPular = { descansoAte = 0L },
      )

      mostrandoFim && sessao == null -> TelaFim(
        fim = retrato?.ultimo,
        aoVoltar = { mostrandoFim = false },
      )

      sessao == null -> TelaSemTreino(
        retrato = retrato,
        aoAlcance = aoAlcance,
        aoComecar = ::mandar,
      )

      listando && exercicio != null -> TelaExercicios(
        sessao = sessao,
        abertoUid = exercicio.uid,
        aoEscolher = { ex ->
          uidAberto = ex.uid
          indiceSerie = ex.proxima
          listando = false
        },
      )

      exercicio != null -> {
        val serie = exercicio.series.getOrNull(indiceSerie)
        TelaTreino(
          sessao = sessao,
          exercicio = exercicio,
          indiceSerie = indiceSerie.coerceIn(0, max(0, exercicio.series.lastIndex)),
          aoAbrirLista = { listando = true },
          aoEscolherSerie = { indiceSerie = it },
          aoAjustar = { campo, passo ->
            if (serie != null) {
              val atual = if (campo == "peso") serie.peso else serie.reps
              val novo = max(0.0, (atual ?: 0.0) + passo)
              mandar(Comando.editar(exercicio.uid, serie.id, campo, novo))
            }
          },
          aoMarcar = {
            if (serie != null) {
              mandar(Comando.marcar(exercicio.uid, serie.id))
              // Marcar é o fim de uma série e o começo de um descanso. Avançar
              // sozinho é o que evita dois toques onde um basta — e a série
              // seguinte é sempre para onde a pessoa ia.
              if (!serie.feita) {
                if (exercicio.descanso > 0) {
                  descansoAte = System.currentTimeMillis() + exercicio.descanso * 1000L
                }
                if (indiceSerie < exercicio.series.lastIndex) indiceSerie += 1
              }
            }
          },
          aoAdicionar = { mandar(Comando.addSerie(exercicio.uid)) },
          aoFinalizar = {
            mandar(Comando.finalizar())
            mostrandoFim = true
          },
        )
      }

      // Sessão aberta e sem exercício nenhum: só o celular resolve.
      else -> Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
      ) {
        Rotulo("Treino vazio", cor = Cor.tinta, tamanho = 11f)
        Text(
          text = "Adicione exercícios pelo celular.",
          color = Cor.tintaFraca,
          fontSize = 12.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(top = 6.dp),
        )
      }
    }
  }
}

// ─────────────────────────────  Sem treino  ──────────────────────────────

/**
 * As duas telas de quando não há treino aberto, lado a lado.
 *
 * Deslizar entre elas em vez de empilhar: num relógio, "voltar" é um gesto que
 * o sistema já usa para sair do app, e disputar com ele é perder. Duas páginas
 * irmãs não precisam de volta nenhuma.
 */
@Composable
private fun TelaSemTreino(
  retrato: Retrato?,
  aoAlcance: Boolean?,
  aoComecar: (String) -> Unit,
) {
  val paginas = rememberPagerState(pageCount = { 2 })
  Box(modifier = Modifier.fillMaxSize()) {
    HorizontalPager(state = paginas, modifier = Modifier.fillMaxSize()) { pagina ->
      if (pagina == 0) {
        TelaInicio(retrato = retrato, aoAlcance = aoAlcance, aoComecar = aoComecar)
      } else {
        TelaProgresso(retrato?.progresso)
      }
    }
    Paginas(
      total = 2,
      atual = paginas.currentPage,
      modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 14.dp),
    )
  }
}

/** A semana, o treino a começar, e o botão que começa. */
@Composable
private fun TelaInicio(retrato: Retrato?, aoAlcance: Boolean?, aoComecar: (String) -> Unit) {
  val rotinas = retrato?.rotinas ?: emptyList()
  var escolhida by remember { mutableIntStateOf(0) }
  val rotina = rotinas.getOrNull(escolhida.coerceIn(0, max(0, rotinas.lastIndex)))
  val dias = retrato?.semana ?: List(7) { false }
  val feitos = dias.count { it }

  Column(
    modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 20.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    FaixaDaSemana(dias)

    Anel(
      fracao = feitos / 7f,
      modifier = Modifier.size(88.dp).padding(top = 6.dp),
      espessura = 6.dp,
    ) {
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Rotulo("Semana", tamanho = 8f)
        Numero("$feitos/7", tamanho = 23f)
        Rotulo("Dias", cor = Cor.acento, tamanho = 8f)
      }
    }

    if (rotina != null) {
      Rotulo("Hoje", tamanho = 8f, modifier = Modifier.padding(top = 6.dp))
      /*
       * As setas ladeiam o NOME, não o botão.
       *
       * Embaixo do botão elas caíam fora do disco — e mesmo cabendo, ficariam
       * longe do que mudam. Ao lado do nome, o alvo é grande, a relação entre o
       * toque e o efeito é imediata, e a linha não custa altura nenhuma: ela
       * ocupa a que o nome já ocupava.
       */
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
      ) {
        if (rotinas.size > 1) {
          Text(
            "‹",
            color = Cor.tintaMid,
            fontSize = 18.sp,
            modifier = Modifier
              .clickable { escolhida = (escolhida - 1 + rotinas.size) % rotinas.size }
              .padding(horizontal = 8.dp, vertical = 2.dp),
          )
        }
        Text(
          text = rotina.nome,
          color = Cor.tinta,
          fontSize = 15.sp,
          fontWeight = FontWeight.Bold,
          textAlign = TextAlign.Center,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
          modifier = Modifier.weight(1f, fill = false),
        )
        if (rotinas.size > 1) {
          Text(
            "›",
            color = Cor.tintaMid,
            fontSize = 18.sp,
            modifier = Modifier
              .clickable { escolhida = (escolhida + 1) % rotinas.size }
              .padding(horizontal = 8.dp, vertical = 2.dp),
          )
        }
      }
      Text(
        text = "${rotina.exercicios} exercícios · ${rotina.series} séries",
        color = Cor.tintaFraca,
        fontFamily = FontFamily.Monospace,
        fontSize = 9.sp,
        modifier = Modifier.padding(bottom = 6.dp),
      )
      Pilula(
        texto = "+ INICIAR",
        aoTocar = { aoComecar(Comando.iniciarRotina(rotina.id)) },
        modifier = Modifier.fillMaxWidth(),
      )
    } else {
      Rotulo(
        texto = if (aoAlcance == false) "Celular fora de alcance" else "Nenhuma rotina salva",
        cor = if (aoAlcance == false) Cor.rec else Cor.tintaFraca,
        tamanho = 9f,
        modifier = Modifier.padding(top = 10.dp, bottom = 6.dp),
      )
      Pilula(
        texto = "+ INICIAR",
        aoTocar = { aoComecar(Comando.iniciar()) },
        modifier = Modifier.fillMaxWidth(),
      )
    }
  }
}

/** O mês em números, e o volume das últimas semanas. */
@Composable
private fun TelaProgresso(p: Progresso?) {
  val meses = listOf("JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ")
  val mes = meses[java.util.Calendar.getInstance().get(java.util.Calendar.MONTH)]
  val semanas = p?.semanas ?: emptyList()
  val teto = semanas.maxOrNull()?.takeIf { it > 0 } ?: 1.0

  Column(
    modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 20.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Rotulo("Progresso · $mes", cor = Cor.acento, tamanho = 9f)

    Anel(
      // Contra uma meta implícita de doze treinos no mês — três por semana, que
      // é o que a literatura chama de mínimo para hipertrofia. O anel não
      // promete nada: cheio é "bateu", e é só isso que ele diz.
      fracao = (p?.treinos ?: 0) / 12f,
      modifier = Modifier.size(84.dp).padding(top = 4.dp),
      espessura = 5.dp,
    ) {
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Numero("${p?.treinos ?: 0}", tamanho = 28f)
        Rotulo("Treinos", cor = Cor.acento, tamanho = 8f)
      }
    }

    Row(
      modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
      horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
      Coluna("Volume", volume(p?.volume ?: 0.0))
      Coluna("Séries", "${p?.series ?: 0}")
      Coluna("Tempo", "${p?.minutos ?: 0}min")
    }

    if (semanas.isNotEmpty()) {
      Rotulo("Vol. por semana", tamanho = 8f, modifier = Modifier.padding(top = 8.dp))
      Row(
        modifier = Modifier.fillMaxWidth().height(24.dp).padding(top = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalAlignment = Alignment.Bottom,
      ) {
        semanas.forEachIndexed { i, v ->
          Box(
            modifier = Modifier
              .weight(1f)
              .height((3 + 21 * (v / teto)).dp)
              .background(if (i == semanas.lastIndex) Cor.acento else Cor.fundoBorda),
          )
        }
      }
    }
  }
}

@Composable
private fun Coluna(rotulo: String, valor: String) {
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Rotulo(rotulo, tamanho = 8f)
    Numero(valor, tamanho = 14f)
  }
}

// ──────────────────────────────  Com treino  ─────────────────────────────

/**
 * A TELA DE TREINO — a razão de o app existir.
 *
 * Tudo que ela faz cabe num polegar, sem teclado e sem menu: subir e descer
 * carga, subir e descer repetição, marcar a série, acrescentar uma, trocar de
 * exercício. Digitar num relógio com a mão suada, no meio de uma série, é pedir
 * para a pessoa desistir e pegar o celular — que é exatamente o que este app
 * existe para evitar.
 *
 * O cabeçalho é um BOTÃO, e é o único jeito de trocar de exercício: gesto
 * horizontal aqui competiria com o deslizar do sistema, e vertical com a
 * rolagem. Um alvo largo no topo é mais honesto que um gesto escondido.
 */
@Composable
private fun TelaTreino(
  sessao: Sessao,
  exercicio: Exercicio,
  indiceSerie: Int,
  aoAbrirLista: () -> Unit,
  aoEscolherSerie: (Int) -> Unit,
  aoAjustar: (String, Double) -> Unit,
  aoMarcar: () -> Unit,
  aoAdicionar: () -> Unit,
  aoFinalizar: () -> Unit,
) {
  val (rotuloA, rotuloB) = rotulos(exercicio.medida)
  val serie = exercicio.series.getOrNull(indiceSerie)
  val ordem = sessao.exercicios.indexOfFirst { it.uid == exercicio.uid } + 1
  val peso = serie?.peso ?: 0.0
  val reps = serie?.reps ?: 0.0
  val tudoFeito = sessao.exercicios.all { it.series.isNotEmpty() && it.feitas == it.series.size }

  Column(
    modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp, vertical = 16.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Column(
      modifier = Modifier.clickable(onClick = aoAbrirLista).fillMaxWidth(),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      Rotulo(
        texto = "$ordem/${sessao.exercicios.size} · série ${indiceSerie + 1}/${exercicio.series.size}",
        cor = Cor.acento,
        tamanho = 9f,
      )
      Text(
        text = exercicio.nome,
        color = Cor.tinta,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
      )
    }

    Box(
      modifier = Modifier
        .fillMaxWidth()
        .padding(vertical = 5.dp)
        .height(1.dp)
        .background(Cor.regua),
    )

    Row(verticalAlignment = Alignment.CenterVertically) {
      Passo(
        valor = num(peso),
        acima = num(peso + PASSO_PESO),
        abaixo = num(max(0.0, peso - PASSO_PESO)),
        rotulo = rotuloA,
        aoSubir = { aoAjustar("peso", PASSO_PESO) },
        aoDescer = { aoAjustar("peso", -PASSO_PESO) },
        destacado = serie?.feita != true,
      )
      Text(
        "×",
        color = Cor.tintaFraca,
        fontSize = 13.sp,
        modifier = Modifier.width(18.dp),
        textAlign = TextAlign.Center,
      )
      Passo(
        valor = num(reps),
        acima = num(reps + PASSO_REPS),
        abaixo = num(max(0.0, reps - PASSO_REPS)),
        rotulo = rotuloB,
        aoSubir = { aoAjustar("reps", PASSO_REPS) },
        aoDescer = { aoAjustar("reps", -PASSO_REPS) },
        destacado = serie?.feita != true,
      )
    }

    PontosDeSerie(
      total = exercicio.series.size,
      atual = indiceSerie,
      feitas = exercicio.series.indices.filter { exercicio.series[it].feita }.toSet(),
      aoEscolher = aoEscolherSerie,
      aoAdicionar = aoAdicionar,
      modifier = Modifier.padding(top = 8.dp),
    )

    Spacer(modifier = Modifier.height(6.dp))

    // Com tudo marcado, o botão deixa de ser "marcar" e passa a ser "encerrar":
    // é a única ação que sobra, e oferecê-la aqui poupa a viagem ao celular.
    if (tudoFeito) {
      Pilula("ENCERRAR", aoFinalizar, modifier = Modifier.width(120.dp), altura = 34.dp)
    } else {
      Pilula(
        texto = if (serie?.feita == true) "✓ FEITA" else "✔",
        aoTocar = aoMarcar,
        modifier = Modifier.width(if (serie?.feita == true) 104.dp else 74.dp),
        cheia = serie?.feita != true,
        altura = 34.dp,
      )
    }
  }
}

/** A lista de exercícios do treino, para trocar de um para outro. */
@Composable
private fun TelaExercicios(sessao: Sessao, abertoUid: String, aoEscolher: (Exercicio) -> Unit) {
  val estado = rememberScalingLazyListState()
  ScalingLazyColumn(
    state = estado,
    modifier = Modifier.fillMaxSize(),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    item {
      Text(
        text = sessao.nome,
        color = Cor.tinta,
        fontSize = 14.sp,
        fontWeight = FontWeight.SemiBold,
        textAlign = TextAlign.Center,
        maxLines = 2,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
      )
    }
    items(sessao.exercicios, key = { it.uid }) { ex ->
      val completo = ex.series.isNotEmpty() && ex.feitas == ex.series.size
      Chip(
        onClick = { aoEscolher(ex) },
        colors = ChipDefaults.chipColors(
          backgroundColor = if (ex.uid == abertoUid) Cor.acentoSuave else Cor.fundoAlto,
        ),
        modifier = Modifier.fillMaxWidth(),
        label = {
          Text(
            text = ex.nome,
            color = Cor.tinta,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
          )
        },
        secondaryLabel = {
          Text(
            text = "${ex.feitas}/${ex.series.size} séries",
            color = if (completo) Cor.acento else Cor.tintaFraca,
            fontSize = 10.sp,
            fontFamily = FontFamily.Monospace,
          )
        },
      )
    }
  }
}

/**
 * O descanso.
 *
 * O anel esvazia em vez de encher: aqui o que interessa é o que FALTA, e um
 * arco encolhendo diz isso sem precisar de número. O número fica no meio para
 * quem quer a precisão.
 */
@Composable
private fun TelaDescanso(ate: Long, aoPular: () -> Unit) {
  var agora by remember { mutableLongStateOf(System.currentTimeMillis()) }
  val total = remember(ate) { max(1L, ate - System.currentTimeMillis()) }

  LaunchedEffect(ate) {
    while (System.currentTimeMillis() < ate) {
      agora = System.currentTimeMillis()
      delay(250)
    }
    agora = ate
    aoPular()
  }

  val faltam = max(0L, ate - agora)
  val seg = (faltam / 1000).toInt()

  Column(
    modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 18.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Rotulo("Descanso", tamanho = 9f)
    Anel(
      fracao = faltam.toFloat() / total.toFloat(),
      modifier = Modifier.size(122.dp).padding(top = 6.dp),
      espessura = 8.dp,
    ) {
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Numero(String.format("%d:%02d", seg / 60, seg % 60), tamanho = 30f)
        Rotulo("min · seg", tamanho = 8f)
      }
    }
    Pilula(
      texto = "PULAR",
      aoTocar = aoPular,
      cheia = false,
      cor = Cor.tintaMid,
      altura = 32.dp,
      modifier = Modifier.padding(top = 10.dp).width(104.dp),
    )
  }
}

/** O treino fechado: o total, e onde ele pegou. */
@Composable
private fun TelaFim(fim: Fim?, aoVoltar: () -> Unit) {
  Column(
    modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 18.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Rotulo("Treino concluído", cor = Cor.acento, tamanho = 9f)

    Anel(
      fracao = 1f,
      modifier = Modifier.size(92.dp).padding(top = 6.dp),
      espessura = 6.dp,
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Numero(volume(fim?.volume ?: 0.0), tamanho = 17f)
          Rotulo("Vol", tamanho = 7f)
        }
        Box(
          modifier = Modifier
            .padding(horizontal = 6.dp)
            .width(1.dp)
            .height(22.dp)
            .background(Cor.regua),
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Numero("${fim?.series ?: 0}", tamanho = 17f)
          Rotulo("Sér", tamanho = 7f)
        }
      }
    }

    fim?.musculos?.forEach { m ->
      Row(
        modifier = Modifier.fillMaxWidth().padding(top = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
      ) {
        Text(
          text = m.nome,
          color = Cor.tintaMid,
          fontSize = 9.sp,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis,
          modifier = Modifier.width(56.dp),
        )
        Barra(m.fracao.toFloat(), modifier = Modifier.weight(1f).padding(horizontal = 6.dp))
        Text(
          text = num(m.series),
          color = Cor.tintaFraca,
          fontFamily = FontFamily.Monospace,
          fontSize = 9.sp,
        )
      }
    }

    Pilula(
      texto = "INÍCIO",
      aoTocar = aoVoltar,
      modifier = Modifier.padding(top = 10.dp).width(110.dp),
      altura = 34.dp,
    )
  }
}
