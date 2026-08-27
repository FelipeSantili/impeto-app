package com.impeto.app.pulso

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.ButtonDefaults
import androidx.wear.compose.material.Chip
import androidx.wear.compose.material.ChipDefaults
import androidx.wear.compose.material.Scaffold
import androidx.wear.compose.material.Text
import androidx.wear.compose.material.TimeText
import androidx.wear.compose.material.Vignette
import androidx.wear.compose.material.VignettePosition
import kotlinx.coroutines.launch
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * O ÍMPETO NO PULSO.
 *
 * A tela do relógio existe para uma coisa só: registrar a série que você acabou
 * de fazer sem tirar o celular do bolso. Tudo que não serve a isso ficou de
 * fora — não há histórico, não há catálogo, não há gráfico. Quem quer olhar
 * treino olha no celular; quem está com a barra na mão quer dois toques.
 *
 * O estado inteiro vem do celular (`Elo.sessao`) e nada é guardado aqui. O que
 * o dedo faz vira COMANDO, e o resultado só aparece quando o celular confirma
 * publicando o retrato de volta. É mais lento que fingir que deu certo na hora,
 * e é a diferença entre a tela mostrar o treino e a tela mostrar uma esperança
 * sobre o treino.
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

@Composable
private fun App() {
  val ctx = LocalContext.current
  val retrato by Elo.retrato.collectAsStateWithLifecycle()
  val sessao = retrato?.sessao
  val aoAlcance by Elo.celularAoAlcance.collectAsStateWithLifecycle()

  // Qual exercício está aberto, por uid. Nulo = a lista. E qual série está em
  // edição. Guardar por UID e não por índice é o que impede a tela de saltar
  // para outro exercício quando o celular reordena a lista embaixo dela.
  var exercicioAberto by remember { mutableStateOf<String?>(null) }
  var serieEmEdicao by remember { mutableStateOf<String?>(null) }

  // O retrato guardado no Data Layer sobrevive ao relógio reiniciar: ler na
  // abertura é o que faz o treino aparecer imediatamente, em vez de a tela
  // esperar a próxima mudança do outro lado — que pode não vir nunca, se
  // ninguém tocar no celular.
  LaunchedEffect(Unit) {
    Elo.carregar(ctx)
    Elo.conferirCelular(ctx)
  }

  val ouvinte = remember { OuvinteAoVivo(ctx) }
  DisposableEffect(Unit) {
    ouvinte.ligar()
    onDispose { ouvinte.desligar() }
  }

  Scaffold(
    timeText = { TimeText() },
    vignette = { Vignette(vignettePosition = VignettePosition.TopAndBottom) },
    modifier = Modifier.background(Cor.fundo),
  ) {
    val aberto = sessao?.exercicios?.firstOrNull { it.uid == exercicioAberto }
    when {
      sessao == null -> Rotinas(retrato?.rotinas ?: emptyList(), aoAlcance)
      aberto == null -> ListaExercicios(sessao!!) { exercicioAberto = it }
      else -> {
        val serie = aberto.series.firstOrNull { it.id == serieEmEdicao }
        if (serie != null) {
          EditorSerie(aberto, serie) { serieEmEdicao = null }
        } else {
          Series(
            exercicio = aberto,
            aoVoltar = { exercicioAberto = null },
            aoEditar = { serieEmEdicao = it },
          )
        }
      }
    }
  }
}

/**
 * Nada aberto no celular: as rotinas salvas, para escolher uma.
 *
 * É a tela que justifica o app existir antes do treino começar. Sem ela, quem
 * chega à academia ainda precisa tirar o celular do bolso uma vez — e uma vez
 * já é o bastante para o hábito não pegar.
 *
 * A lista vem do celular no mesmo retrato que traz a sessão, então ela está
 * certa por construção: rotina criada, renomeada ou apagada lá aparece aqui na
 * publicação seguinte, sem nada para sincronizar à mão.
 */
@Composable
private fun Rotinas(rotinas: List<Rotina>, aoAlcance: Boolean?) {
  val ctx = LocalContext.current
  val escopo = rememberCoroutineScope()
  var mandando by remember { mutableStateOf(false) }
  var falhou by remember { mutableStateOf(false) }
  val estado = rememberScalingLazyListState()

  fun começar(comando: String) {
    if (mandando) return
    mandando = true
    falhou = false
    escopo.launch {
      val ok = Elo.mandar(ctx, comando)
      mandando = false
      falhou = !ok
    }
  }

  ScalingLazyColumn(
    state = estado,
    modifier = Modifier.fillMaxSize(),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    item {
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
          text = "ÍMPETO",
          color = Cor.tinta,
          fontFamily = FontFamily.Monospace,
          fontWeight = FontWeight.Bold,
          fontSize = 13.sp,
          letterSpacing = 3.4.sp,
        )
        Text(
          text = when {
            falhou || aoAlcance == false -> "Celular fora de alcance"
            mandando -> "Abrindo…"
            else -> "Escolha o treino"
          },
          color = if (falhou || aoAlcance == false) Cor.rec else Cor.tintaFraca,
          fontSize = 12.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(top = 4.dp, bottom = 6.dp),
        )
      }
    }

    items(rotinas, key = { it.id }) { rotina ->
      Chip(
        onClick = { começar(Comando.iniciarRotina(rotina.id)) },
        colors = ChipDefaults.chipColors(backgroundColor = Cor.fundoAlto),
        modifier = Modifier.fillMaxWidth(),
        label = {
          Text(
            text = rotina.nome,
            color = Cor.tinta,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
          )
        },
        secondaryLabel = {
          Text(
            text = "${rotina.exercicios} exercícios · ${rotina.series} séries",
            color = Cor.tintaFraca,
            fontSize = 10.sp,
            fontFamily = FontFamily.Monospace,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
          )
        },
      )
    }

    // O treino vazio fecha a lista, e não a abre: com rotina salva, começar do
    // zero é a exceção. Sem nenhuma, ele é a única linha e vira a resposta
    // óbvia sozinho.
    item {
      Button(
        onClick = { começar(Comando.iniciar()) },
        colors = ButtonDefaults.buttonColors(backgroundColor = Cor.acento),
        modifier = Modifier.fillMaxWidth().height(44.dp).padding(top = 4.dp),
      ) {
        Text(
          text = if (rotinas.isEmpty()) "Começar treino" else "Treino vazio",
          color = Cor.acentoTexto,
          fontSize = 13.sp,
          fontWeight = FontWeight.Medium,
        )
      }
    }
  }
}

/** Os exercícios do treino aberto, com o quanto de cada um já foi feito. */
@Composable
private fun ListaExercicios(sessao: Sessao, aoAbrir: (String) -> Unit) {
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
        fontSize = 15.sp,
        fontWeight = FontWeight.SemiBold,
        textAlign = TextAlign.Center,
        maxLines = 2,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
      )
    }
    if (sessao.exercicios.isEmpty()) {
      item {
        Text(
          text = "Nenhum exercício ainda.\nAdicione pelo celular.",
          color = Cor.tintaFraca,
          fontSize = 12.sp,
          textAlign = TextAlign.Center,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )
      }
    }
    items(sessao.exercicios, key = { it.uid }) { ex ->
      val feitas = ex.series.count { it.feita }
      val completo = feitas == ex.series.size && ex.series.isNotEmpty()
      Chip(
        onClick = { aoAbrir(ex.uid) },
        colors = ChipDefaults.chipColors(backgroundColor = Cor.fundoAlto),
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
            text = "$feitas/${ex.series.size} séries",
            // Âmbar quando o exercício acabou: é o mesmo vocabulário do celular
            // — âmbar é "feito", em qualquer tela do app.
            color = if (completo) Cor.acento else Cor.tintaFraca,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace,
          )
        },
      )
    }
  }
}

/**
 * As séries de um exercício.
 *
 * Tocar na linha MARCA — é a ação que a pessoa veio fazer, e ela é o alvo
 * inteiro da linha, não um quadradinho de doze pixels que ninguém acerta com a
 * mão suada. Editar carga é o toque no valor, que é um alvo menor de propósito:
 * errar ali custa uma tela a mais, errar o marcar custa uma série.
 */
@Composable
private fun Series(exercicio: Exercicio, aoVoltar: () -> Unit, aoEditar: (String) -> Unit) {
  val ctx = LocalContext.current
  val escopo = rememberCoroutineScope()
  val (rotuloA, rotuloB) = rotulos(exercicio.medida)
  val estado = rememberScalingLazyListState()

  ScalingLazyColumn(
    state = estado,
    modifier = Modifier.fillMaxSize(),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    item {
      Text(
        text = exercicio.nome,
        color = Cor.tinta,
        fontSize = 14.sp,
        fontWeight = FontWeight.SemiBold,
        textAlign = TextAlign.Center,
        maxLines = 2,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
      )
    }

    items(exercicio.series, key = { it.id }) { serie ->
      val ordinal = exercicio.series.indexOfFirst { it.id == serie.id } + 1
      Chip(
        onClick = {
          escopo.launch { Elo.mandar(ctx, Comando.marcar(exercicio.uid, serie.id)) }
        },
        colors = ChipDefaults.chipColors(
          backgroundColor = if (serie.feita) Cor.acentoSuave else Cor.fundoAlto,
        ),
        modifier = Modifier.fillMaxWidth(),
        label = {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
          ) {
            Text(
              text = "%02d".format(ordinal),
              color = Cor.tintaFantasma,
              fontFamily = FontFamily.Monospace,
              fontSize = 11.sp,
              modifier = Modifier.padding(end = 8.dp),
            )
            Text(
              text = "${num(serie.peso)} $rotuloA",
              color = if (serie.feita) Cor.acento else Cor.tinta,
              fontFamily = FontFamily.Monospace,
              fontSize = 13.sp,
            )
            Text(
              text = " × ${num(serie.reps)} $rotuloB",
              color = if (serie.feita) Cor.acento else Cor.tinta,
              fontFamily = FontFamily.Monospace,
              fontSize = 13.sp,
              maxLines = 1,
              overflow = TextOverflow.Ellipsis,
            )
          }
        },
      )
    }

    item {
      Row(
        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
      ) {
        Button(
          onClick = { escopo.launch { Elo.mandar(ctx, Comando.addSerie(exercicio.uid)) } },
          colors = ButtonDefaults.buttonColors(backgroundColor = Cor.fundoAlto),
          modifier = Modifier.size(46.dp),
        ) {
          Text("+", color = Cor.tinta, fontSize = 18.sp)
        }
        Button(
          onClick = {
            val ultima = exercicio.series.lastOrNull()
            if (ultima != null) aoEditar(ultima.id)
          },
          colors = ButtonDefaults.buttonColors(backgroundColor = Cor.fundoAlto),
          modifier = Modifier.size(46.dp),
        ) {
          Text("carga", color = Cor.tintaMid, fontSize = 10.sp)
        }
        Button(
          onClick = aoVoltar,
          colors = ButtonDefaults.buttonColors(backgroundColor = Cor.fundoAlto),
          modifier = Modifier.size(46.dp),
        ) {
          Text("‹", color = Cor.tinta, fontSize = 20.sp)
        }
      }
    }
  }
}

/**
 * Peso e repetições de uma série, em botões grandes.
 *
 * Sem teclado: digitar num relógio com a mão suada, no meio de uma série, é
 * pedir para a pessoa desistir e pegar o celular — que é exatamente o que este
 * app existe para evitar. Passos de 2,5 kg e 1 repetição cobrem o incremento
 * real da academia; ajuste fino continua no celular, onde há teclado de carga.
 */
@Composable
private fun EditorSerie(exercicio: Exercicio, serie: Serie, aoFechar: () -> Unit) {
  val ctx = LocalContext.current
  val escopo = rememberCoroutineScope()
  val (rotuloA, rotuloB) = rotulos(exercicio.medida)

  fun ajustar(campo: String, atual: Double?, passo: Double) {
    val novo = max(0.0, (atual ?: 0.0) + passo)
    escopo.launch { Elo.mandar(ctx, Comando.editar(exercicio.uid, serie.id, campo, novo)) }
  }

  Column(
    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
    verticalArrangement = Arrangement.Center,
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    LinhaAjuste(
      valor = num(serie.peso),
      rotulo = rotuloA,
      aoMenos = { ajustar("peso", serie.peso, -2.5) },
      aoMais = { ajustar("peso", serie.peso, 2.5) },
    )
    Box(modifier = Modifier.padding(vertical = 6.dp).fillMaxWidth().height(1.dp).background(Cor.regua))
    LinhaAjuste(
      valor = num(serie.reps),
      rotulo = rotuloB,
      aoMenos = { ajustar("reps", serie.reps, -1.0) },
      aoMais = { ajustar("reps", serie.reps, 1.0) },
    )
    Button(
      onClick = aoFechar,
      colors = ButtonDefaults.buttonColors(backgroundColor = Cor.acento),
      modifier = Modifier.fillMaxWidth().height(40.dp).padding(top = 10.dp),
    ) {
      Text("Pronto", color = Cor.acentoTexto, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
  }
}

@Composable
private fun LinhaAjuste(
  valor: String,
  rotulo: String,
  aoMenos: () -> Unit,
  aoMais: () -> Unit,
) {
  Row(
    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.SpaceBetween,
  ) {
    Button(
      onClick = aoMenos,
      colors = ButtonDefaults.buttonColors(backgroundColor = Cor.fundoAlto),
      modifier = Modifier.size(40.dp),
    ) {
      Text("−", color = Cor.tinta, fontSize = 18.sp)
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
      Text(
        text = valor,
        color = Cor.tinta,
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
      )
      Text(
        text = rotulo.uppercase(),
        color = Cor.tintaFraca,
        fontFamily = FontFamily.Monospace,
        fontSize = 9.sp,
        letterSpacing = 1.5.sp,
      )
    }
    Button(
      onClick = aoMais,
      colors = ButtonDefaults.buttonColors(backgroundColor = Cor.fundoAlto),
      modifier = Modifier.size(40.dp),
    ) {
      Text("+", color = Cor.tinta, fontSize = 18.sp)
    }
  }
}
