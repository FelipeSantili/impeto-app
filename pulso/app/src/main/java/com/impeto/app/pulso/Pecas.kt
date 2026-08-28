package com.impeto.app.pulso

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Text

/**
 * O VOCABULÁRIO DA TELA REDONDA.
 *
 * O app do celular separa por RÉGUA e por espaço — uma página é lida de cima
 * para baixo. Num relógio não há página: há um disco, e o olho cai no meio
 * dele. Então o vocabulário aqui é outro, e é ANEL: um arco diz a proporção, o
 * centro diz o número, e o resto orbita.
 *
 * O que NÃO muda é a paleta. Âmbar continua querendo dizer quantidade, e o
 * preto continua neutro. Um valor âmbar no pulso significa o mesmo que
 * significa no relatório, e é isso que faz os dois parecerem o mesmo app.
 */

/** Rótulo miúdo em caixa alta — o carimbo do app, na escala do pulso. */
@Composable
fun Rotulo(
  texto: String,
  cor: Color = Cor.tintaFraca,
  tamanho: Float = 9f,
  modifier: Modifier = Modifier,
) {
  Text(
    text = texto.uppercase(),
    color = cor,
    fontFamily = FontFamily.Monospace,
    fontWeight = FontWeight.Medium,
    fontSize = tamanho.sp,
    letterSpacing = (tamanho * 0.22f).sp,
    textAlign = TextAlign.Center,
    maxLines = 1,
    overflow = TextOverflow.Ellipsis,
    modifier = modifier,
  )
}

/** Número grande, monoespaçado — o que o olho vem buscar no meio do disco. */
@Composable
fun Numero(
  texto: String,
  cor: Color = Cor.tinta,
  tamanho: Float = 34f,
  modifier: Modifier = Modifier,
) {
  Text(
    text = texto,
    color = cor,
    fontFamily = FontFamily.Monospace,
    fontWeight = FontWeight.Bold,
    fontSize = tamanho.sp,
    letterSpacing = (-tamanho * 0.03f).sp,
    maxLines = 1,
    modifier = modifier,
  )
}

/**
 * O anel de proporção.
 *
 * Começa no topo e cresce no sentido do relógio, porque é como todo mostrador
 * circular do mundo é lido. A trilha atrás fica sempre visível: sem ela, um
 * arco curto não tem contra o que ser curto, e 1/7 lê igual a 6/7.
 */
@Composable
fun Anel(
  fracao: Float,
  modifier: Modifier = Modifier,
  espessura: Dp = 8.dp,
  cor: Color = Cor.acento,
  trilha: Color = Cor.fundoAlto,
  conteudo: @Composable () -> Unit = {},
) {
  Box(modifier = modifier, contentAlignment = Alignment.Center) {
    Canvas(modifier = Modifier.fillMaxSize()) {
      val px = espessura.toPx()
      val canto = Offset(px / 2, px / 2)
      val tamanho = Size(size.width - px, size.height - px)
      drawArc(
        color = trilha,
        startAngle = -90f,
        sweepAngle = 360f,
        useCenter = false,
        topLeft = canto,
        size = tamanho,
        style = Stroke(width = px),
      )
      if (fracao > 0f) {
        drawArc(
          color = cor,
          startAngle = -90f,
          sweepAngle = 360f * fracao.coerceIn(0f, 1f),
          useCenter = false,
          topLeft = canto,
          size = tamanho,
          // Ponta arredondada: um arco de ponta reta num disco parece um
          // pedaço quebrado, não uma medida.
          style = Stroke(width = px, cap = androidx.compose.ui.graphics.StrokeCap.Round),
        )
      }
    }
    conteudo()
  }
}

/** A ação principal da tela. Cheia quando é o caminho óbvio, vazada quando não. */
@Composable
fun Pilula(
  texto: String,
  aoTocar: () -> Unit,
  modifier: Modifier = Modifier,
  cheia: Boolean = true,
  cor: Color = Cor.acento,
  altura: Dp = 38.dp,
) {
  Box(
    modifier = modifier
      .height(altura)
      .clip(CircleShape)
      .then(if (cheia) Modifier.background(cor) else Modifier.border(1.dp, cor, CircleShape))
      .clickable(onClick = aoTocar)
      .padding(horizontal = 18.dp),
    contentAlignment = Alignment.Center,
  ) {
    Text(
      text = texto,
      color = if (cheia) Cor.acentoTexto else cor,
      fontSize = 13.sp,
      fontWeight = FontWeight.SemiBold,
      maxLines = 1,
    )
  }
}

/**
 * A coluna de ajuste de um valor — o centro do que a tela de treino faz.
 *
 * Mostra o vizinho de cima e o de baixo em tinta fraca, e é isso que transforma
 * dois botões num MOSTRADOR: dá para ver para onde o valor vai antes de tocar,
 * e o toque confirma uma expectativa em vez de revelar uma surpresa. Custa duas
 * linhas de texto e economiza o olhar de conferência depois de cada toque.
 *
 * Os alvos de toque são as setas E os números vizinhos — a área inteira de cima
 * sobe, a de baixo desce. Num pulso suado, alvo pequeno é alvo errado.
 */
@Composable
fun Passo(
  valor: String,
  acima: String,
  abaixo: String,
  rotulo: String,
  aoSubir: () -> Unit,
  aoDescer: () -> Unit,
  modifier: Modifier = Modifier,
  destacado: Boolean = true,
) {
  val borda = if (destacado) Cor.acento else Cor.fundoBorda
  Column(
    modifier = modifier.width(72.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(8.dp))
        .clickable(onClick = aoSubir)
        .padding(vertical = 1.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      Text("▲", color = Cor.tintaFantasma, fontSize = 9.sp)
      Text(
        text = acima,
        color = Cor.tintaFraca,
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
      )
    }

    Box(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(10.dp))
        .background(Cor.fundoAlto)
        .border(1.dp, borda, RoundedCornerShape(10.dp))
        .padding(vertical = 5.dp),
      contentAlignment = Alignment.Center,
    ) {
      Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Numero(valor, cor = if (destacado) Cor.acento else Cor.tinta, tamanho = 25f)
        Rotulo(rotulo, cor = Cor.tintaFraca, tamanho = 8f)
      }
    }

    Column(
      modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(8.dp))
        .clickable(onClick = aoDescer)
        .padding(vertical = 1.dp),
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      Text(
        text = abaixo,
        color = Cor.tintaFraca,
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
      )
      Text("▼", color = Cor.tintaFantasma, fontSize = 9.sp)
    }
  }
}

/**
 * Os pontos das séries, e o botão de acrescentar uma.
 *
 * Cada ponto é uma série: cheio quando feita, vazado quando não, com anel
 * quando é a que está sendo editada. Tocar um ponto vai para ela — é como se
 * troca de série sem menu nenhum.
 */
@Composable
fun PontosDeSerie(
  total: Int,
  atual: Int,
  feitas: Set<Int>,
  aoEscolher: (Int) -> Unit,
  aoAdicionar: () -> Unit,
  modifier: Modifier = Modifier,
) {
  Row(
    modifier = modifier,
    verticalAlignment = Alignment.CenterVertically,
    horizontalArrangement = Arrangement.spacedBy(7.dp),
  ) {
    for (i in 0 until total) {
      val cor = when {
        i in feitas -> Cor.acento
        i == atual -> Cor.tinta
        else -> Cor.tintaFantasma
      }
      Box(
        modifier = Modifier
          .size(if (i == atual) 11.dp else 9.dp)
          .clip(CircleShape)
          .then(if (i == atual) Modifier.border(1.dp, Cor.tinta, CircleShape) else Modifier)
          .background(if (i in feitas) cor else Color.Transparent)
          .then(
            if (i !in feitas) Modifier.border(1.dp, cor, CircleShape) else Modifier
          )
          .clickable { aoEscolher(i) },
      )
    }
    Box(
      modifier = Modifier
        .size(18.dp)
        .clip(CircleShape)
        .border(1.dp, Cor.acento, CircleShape)
        .clickable(onClick = aoAdicionar),
      contentAlignment = Alignment.Center,
    ) {
      Text("+", color = Cor.acento, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
  }
}

/** Os sete dias da semana. Cheio = treinou. */
@Composable
fun FaixaDaSemana(dias: List<Boolean>, modifier: Modifier = Modifier) {
  val letras = listOf("S", "T", "Q", "Q", "S", "S", "D")
  Row(
    modifier = modifier,
    horizontalArrangement = Arrangement.spacedBy(4.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    letras.forEachIndexed { i, letra ->
      val treinou = dias.getOrElse(i) { false }
      Box(
        modifier = Modifier
          .size(16.dp)
          .clip(RoundedCornerShape(5.dp))
          .background(if (treinou) Cor.acento else Cor.fundoAlto),
        contentAlignment = Alignment.Center,
      ) {
        Text(
          text = letra,
          color = if (treinou) Cor.acentoTexto else Cor.tintaFraca,
          fontFamily = FontFamily.Monospace,
          fontSize = 8.sp,
          fontWeight = FontWeight.Bold,
        )
      }
    }
  }
}

/** Uma barra horizontal de proporção — o músculo na tela de fim. */
@Composable
fun Barra(fracao: Float, modifier: Modifier = Modifier) {
  Box(
    modifier = modifier
      .height(4.dp)
      .clip(CircleShape)
      .background(Cor.fundoAlto),
  ) {
    Box(
      modifier = Modifier
        .fillMaxWidth(fracao.coerceIn(0f, 1f))
        .height(4.dp)
        .clip(CircleShape)
        .background(Cor.acento),
    )
  }
}

/** Os pontos de página do rodapé. */
@Composable
fun Paginas(total: Int, atual: Int, modifier: Modifier = Modifier) {
  Row(
    modifier = modifier,
    horizontalArrangement = Arrangement.spacedBy(4.dp),
    verticalAlignment = Alignment.CenterVertically,
  ) {
    for (i in 0 until total) {
      Box(
        modifier = Modifier
          .size(width = if (i == atual) 12.dp else 5.dp, height = 4.dp)
          .clip(CircleShape)
          .background(if (i == atual) Cor.acento else Cor.tintaFantasma),
      )
    }
  }
}
