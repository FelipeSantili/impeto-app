package com.impeto.app.pulso

import androidx.compose.ui.graphics.Color

/**
 * A MESMA paleta do app do celular, degrau por degrau.
 *
 * Copiada de `src/design/tokens.ts` (a paleta ESCURA), e só ela: um relógio não
 * tem tema claro que valha a pena — a tela é pequena, fica coberta pela manga e
 * acende no escuro da academia. Fundo preto ainda economiza bateria em OLED,
 * que é o painel do Galaxy Watch.
 *
 * Os nomes são os mesmos do TypeScript de propósito. Quem mexer na paleta lá vai
 * conseguir achar o que mexer aqui procurando pela mesma palavra.
 */
object Cor {
  val fundo = Color(0xFF0A0B0C)
  val fundoAlto = Color(0xFF16191B)
  val fundoBorda = Color(0xFF23282B)

  val tinta = Color(0xFFE9ECEE)
  val tintaMid = Color(0xFF9AA2A7)
  val tintaFraca = Color(0xFF6A7276)
  val tintaFantasma = Color(0xFF3C4347)

  val acento = Color(0xFFE8A13D)
  val acentoTexto = Color(0xFF0A0B0C)
  val acentoSuave = Color(0x1AE8A13D)

  val rec = Color(0xFFFF3B30)

  val regua = Color(0x17E9ECEE)

  /**
   * A rampa térmica. Não é usada ainda no relógio, mas fica aqui pelo mesmo
   * motivo que existe no celular: se um dia um músculo for pintado nesta tela,
   * âmbar tem que querer dizer exatamente o que quer dizer lá.
   */
  val calor = listOf(
    Color(0xFF16191B),
    Color(0xFF26413F),
    Color(0xFF3D6355),
    Color(0xFF7A7A42),
    Color(0xFFB9863A),
    Color(0xFFE8A13D),
  )
}
