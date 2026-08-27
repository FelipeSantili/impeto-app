package com.impeto.app.pulso

import org.json.JSONObject
import java.util.UUID

/**
 * O CONTRATO COM O CELULAR — tradução literal de `src/lib/pulso.ts`.
 *
 * Os dois arquivos descrevem a mesma coisa em duas linguagens, e é para eles
 * serem lidos lado a lado que este mantém os nomes em português e a mesma
 * ordem de campos. Mudou lá, muda aqui. Não há um terceiro lugar.
 *
 * JSON e não `DataMap`: o Data Layer transportaria os campos avulsos sem
 * problema, mas aí cada campo novo numa série viraria mexida em três arquivos
 * em vez de dois, e o esquecimento silencioso de um deles é indistinguível de
 * uma falha de rede.
 */

const val CAMINHO_COMANDO = "/impeto/comando"
const val CAMINHO_SESSAO = "/impeto/sessao"
const val CAPACIDADE_CELULAR = "impeto_celular"

data class Serie(
  val id: String,
  val peso: Double?,
  val reps: Double?,
  val feita: Boolean,
  val tipo: String,
)

data class Exercicio(
  val uid: String,
  val nome: String,
  val grupo: String,
  /** `peso_rep`, `rep`, `tempo`, `dist_tempo`, `peso_tempo`. Muda os rótulos. */
  val medida: String,
  val descanso: Int,
  val series: List<Serie>,
)

data class Sessao(
  val id: String,
  val nome: String,
  val inicio: Long,
  val exercicios: List<Exercicio>,
)

/**
 * Um modelo de treino salvo no celular.
 *
 * Só a contagem, não os exercícios: a lista serve para ESCOLHER qual treino
 * começar, e ninguém escolhe lendo dezoito nomes numa tela de quatro
 * centímetros. Escolhido, o retrato da sessão traz tudo.
 */
data class Rotina(
  val id: String,
  val nome: String,
  val exercicios: Int,
  val series: Int,
)

/** O estado inteiro que a tela desenha. */
data class Retrato(
  /** O treino em curso, ou nulo quando não há nenhum. */
  val sessao: Sessao?,
  val rotinas: List<Rotina>,
)

/**
 * Lê o retrato publicado pelo celular.
 *
 * Devolve `null` só para JSON quebrado — que num pulso não tem o que oferecer
 * além da mesma tela de "nada aberto". Retrato VÁLIDO com `sessao` nula é outra
 * coisa: significa que o celular está ali e não tem treino em curso, e é o que
 * permite a tela mostrar as rotinas para escolher.
 */
fun lerRetrato(json: String): Retrato? = try {
  val raiz = JSONObject(json)
  val rotinas = raiz.optJSONArray("rotinas")
  Retrato(
    rotinas = if (rotinas == null) emptyList() else (0 until rotinas.length()).map { i ->
      val r = rotinas.getJSONObject(i)
      Rotina(
        id = r.getString("id"),
        nome = r.getString("nome"),
        exercicios = r.getInt("exercicios"),
        series = r.getInt("series"),
      )
    },
    sessao = if (raiz.isNull("sessao")) null else {
    val s = raiz.getJSONObject("sessao")
    val exercicios = s.getJSONArray("exercicios")
    Sessao(
      id = s.getString("id"),
      nome = s.getString("nome"),
      inicio = s.getLong("inicio"),
      exercicios = (0 until exercicios.length()).map { i ->
        val e = exercicios.getJSONObject(i)
        val series = e.getJSONArray("series")
        Exercicio(
          uid = e.getString("uid"),
          nome = e.getString("nome"),
          grupo = e.getString("grupo"),
          medida = e.getString("medida"),
          descanso = e.getInt("descanso"),
          series = (0 until series.length()).map { j ->
            val x = series.getJSONObject(j)
            Serie(
              id = x.getString("id"),
              peso = if (x.isNull("peso")) null else x.getDouble("peso"),
              reps = if (x.isNull("reps")) null else x.getDouble("reps"),
              feita = x.getBoolean("feita"),
              tipo = x.optString("tipo", "normal"),
            )
          },
        )
      },
    )
  },
  )
} catch (e: Throwable) {
  null
}

/**
 * Os comandos que o relógio manda.
 *
 * Cada um nasce com `id` novo porque a entrega tem dois caminhos do outro lado
 * — o evento ao vivo e a fila em disco do app fechado — e nada impede que um
 * comando percorra os dois. `marcar` é uma INVERSÃO: aplicada duas vezes,
 * desmarca a série que a pessoa acabou de marcar.
 */
object Comando {
  fun iniciar(nome: String? = null): String =
    monta("iniciar") { if (nome != null) put("nome", nome) }

  fun iniciarRotina(rotinaId: String): String =
    monta("iniciarRotina") { put("rotinaId", rotinaId) }

  fun marcar(uid: String, serieId: String): String =
    monta("marcar") { put("uid", uid); put("serieId", serieId) }

  fun editar(uid: String, serieId: String, campo: String, valor: Double?): String =
    monta("editar") {
      put("uid", uid)
      put("serieId", serieId)
      put("campo", campo)
      if (valor == null) put("valor", JSONObject.NULL) else put("valor", valor)
    }

  fun addSerie(uid: String): String = monta("addSerie") { put("uid", uid) }

  fun finalizar(): String = monta("finalizar") {}

  private fun monta(tipo: String, corpo: JSONObject.() -> Unit): String =
    JSONObject().apply {
      put("id", UUID.randomUUID().toString())
      put("tipo", tipo)
      corpo()
    }.toString()
}
