package com.impeto.app.pulso

import org.json.JSONArray
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
 *
 * Tudo que chega já vem MASTIGADO: nome do exercício resolvido do catálogo,
 * fração do músculo calculada, volume somado. O relógio não faz conta — ele
 * desenha. É o que permite a tela abrir instantânea num aparelho que tem uma
 * fração da CPU do celular.
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
  /** Descanso alvo em segundos. Zero desliga o cronômetro. */
  val descanso: Int,
  val series: List<Serie>,
) {
  val feitas: Int get() = series.count { it.feita }
  /**
   * A série em que o dedo deve cair ao abrir o exercício: a primeira não feita.
   * Todas feitas, a última — quem volta a um exercício terminado quer ver o que
   * fez, não uma tela vazia.
   */
  val proxima: Int
    get() = series.indexOfFirst { !it.feita }.let { if (it < 0) series.lastIndex else it }
}

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

/** Quanto um grupo levou, para as barras da tela de fim. */
data class Musculo(val nome: String, val series: Double, val fracao: Double)

/** O treino que acabou de fechar. */
data class Fim(
  val nome: String,
  val volume: Double,
  val series: Int,
  val musculos: List<Musculo>,
)

/** O mês corrente em números. */
data class Progresso(
  val treinos: Int,
  val volume: Double,
  val series: Int,
  val minutos: Int,
  /** Volume das últimas seis semanas, da mais velha para a corrente. */
  val semanas: List<Double>,
)

/** O estado inteiro que a tela desenha. */
data class Retrato(
  /** O treino em curso, ou nulo quando não há nenhum. */
  val sessao: Sessao?,
  val rotinas: List<Rotina>,
  /** Segunda a domingo: houve treino naquele dia? Sempre sete posições. */
  val semana: List<Boolean>,
  val progresso: Progresso,
  val ultimo: Fim?,
)

/** Itera um array do JSON sem repetir o `for` de índice em todo lugar. */
private inline fun <T> JSONArray.mapear(f: (JSONObject) -> T): List<T> =
  (0 until length()).map { f(getJSONObject(it)) }

private fun lerSerie(x: JSONObject) = Serie(
  id = x.getString("id"),
  peso = if (x.isNull("peso")) null else x.getDouble("peso"),
  reps = if (x.isNull("reps")) null else x.getDouble("reps"),
  feita = x.getBoolean("feita"),
  tipo = x.optString("tipo", "normal"),
)

private fun lerExercicio(e: JSONObject) = Exercicio(
  uid = e.getString("uid"),
  nome = e.getString("nome"),
  grupo = e.getString("grupo"),
  medida = e.getString("medida"),
  descanso = e.getInt("descanso"),
  series = e.getJSONArray("series").mapear(::lerSerie),
)

private fun lerSessao(s: JSONObject) = Sessao(
  id = s.getString("id"),
  nome = s.getString("nome"),
  inicio = s.getLong("inicio"),
  exercicios = s.getJSONArray("exercicios").mapear(::lerExercicio),
)

private fun lerProgresso(p: JSONObject?) = Progresso(
  treinos = p?.optInt("treinos") ?: 0,
  volume = p?.optDouble("volume", 0.0) ?: 0.0,
  series = p?.optInt("series") ?: 0,
  minutos = p?.optInt("minutos") ?: 0,
  semanas = p?.optJSONArray("semanas")?.let { a ->
    (0 until a.length()).map { a.optDouble(it, 0.0) }
  } ?: emptyList(),
)

private fun lerFim(f: JSONObject) = Fim(
  nome = f.getString("nome"),
  volume = f.optDouble("volume", 0.0),
  series = f.optInt("series"),
  musculos = f.optJSONArray("musculos")?.mapear { m ->
    Musculo(
      nome = m.getString("nome"),
      series = m.optDouble("series", 0.0),
      fracao = m.optDouble("fracao", 0.0),
    )
  } ?: emptyList(),
)

/**
 * Lê o retrato publicado pelo celular.
 *
 * Devolve `null` só para JSON quebrado — que num pulso não tem o que oferecer
 * além da mesma tela de "nada aberto". Retrato VÁLIDO com `sessao` nula é outra
 * coisa: significa que o celular está ali e não tem treino em curso, e é o que
 * permite a tela mostrar as rotinas para escolher.
 *
 * Todo campo NOVO é lido com `opt`, e isso é deliberado: relógio e celular são
 * dois binários que se atualizam em momentos diferentes, e um retrato de uma
 * versão antiga tem que continuar desenhando o que dá em vez de virar tela
 * preta. O que falta vira zero, e zero é desenhável.
 */
fun lerRetrato(json: String): Retrato? = try {
  val raiz = JSONObject(json)
  Retrato(
    sessao = if (raiz.isNull("sessao")) null else lerSessao(raiz.getJSONObject("sessao")),
    rotinas = raiz.optJSONArray("rotinas")?.mapear { r ->
      Rotina(
        id = r.getString("id"),
        nome = r.getString("nome"),
        exercicios = r.getInt("exercicios"),
        series = r.getInt("series"),
      )
    } ?: emptyList(),
    semana = raiz.optJSONArray("semana")?.let { a ->
      (0 until a.length()).map { a.optBoolean(it) }
    } ?: List(7) { false },
    progresso = lerProgresso(raiz.optJSONObject("progresso")),
    ultimo = raiz.optJSONObject("ultimo")?.let(::lerFim),
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
