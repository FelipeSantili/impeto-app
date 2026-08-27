package expo.modules.impetopulso

import android.content.Context
import org.json.JSONArray

/**
 * O ponto de encontro entre o serviço do sistema e o app.
 *
 * Existem dois donos possíveis para um comando que chega do relógio, e qual
 * deles atende depende de uma coisa que não está sob nosso controle: se o
 * JavaScript está de pé.
 *
 * O `WearableListenerService` é acordado pelo Play Services mesmo com o app
 * fechado — o processo sobe, o serviço roda, e o React Native NÃO está lá. O
 * estado do treino mora no zustand, que mora no JS: não há para quem entregar.
 *
 * Então: se o módulo está vivo, o comando vai direto para o JS. Se não está,
 * vai para a FILA em disco, e o módulo a esvazia quando nascer. Marcar uma
 * série no relógio com o celular no bolso, tela apagada e app morto continua
 * valendo — só aparece quando o app abrir.
 */
object Ponte {
  private var modulo: ImpetoPulsoModule? = null

  @Synchronized
  fun ligar(m: ImpetoPulsoModule) {
    modulo = m
  }

  /**
   * Só desliga se quem pediu for o dono atual.
   *
   * Em recarga rápida do JS o módulo novo nasce antes de o antigo morrer, e um
   * `desligar` incondicional apagaria a referência recém-instalada — o app
   * ficaria de pé, ouvindo nada, até a próxima recarga.
   */
  @Synchronized
  fun desligar(m: ImpetoPulsoModule) {
    if (modulo === m) modulo = null
  }

  /** Entrega ao JS, ou guarda para depois. */
  fun receber(ctx: Context, json: String) {
    val destino = synchronized(this) { modulo }
    if (destino != null && destino.entregar(json)) return
    Fila.guardar(ctx, json)
  }
}

/**
 * A fila em disco dos comandos que chegaram sem ninguém para atender.
 *
 * `SharedPreferences` e não banco: são poucos itens, vivem segundos ou minutos,
 * e o que importa é a escrita ser síncrona o bastante para sobreviver ao
 * processo sendo morto logo depois de o serviço responder — que é exatamente o
 * que o Android faz com um processo acordado só para receber uma mensagem.
 */
object Fila {
  private const val ARQUIVO = "impeto_pulso_fila"
  private const val CHAVE = "comandos"

  /**
   * Teto de comandos guardados.
   *
   * Uma fila sem teto é um vazamento com passo lento: relógio marcando série
   * durante um treino inteiro com o app do celular morto encheria isto de
   * centenas de itens que ninguém vai aplicar em ordem útil. Ao estourar, o
   * mais VELHO sai — o fim da fila é o que descreve o estado mais recente.
   */
  private const val TETO = 200

  @Synchronized
  fun guardar(ctx: Context, json: String) {
    val prefs = ctx.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)
    val atual = JSONArray(prefs.getString(CHAVE, "[]") ?: "[]")
    atual.put(json)
    val podado = if (atual.length() <= TETO) atual else JSONArray().apply {
      for (i in (atual.length() - TETO) until atual.length()) put(atual.getString(i))
    }
    prefs.edit().putString(CHAVE, podado.toString()).commit()
  }

  /** Devolve tudo que estava guardado e esvazia, numa operação só. */
  @Synchronized
  fun drenar(ctx: Context): List<String> {
    val prefs = ctx.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)
    val bruto = prefs.getString(CHAVE, "[]") ?: "[]"
    if (bruto == "[]") return emptyList()
    prefs.edit().putString(CHAVE, "[]").commit()
    val lista = JSONArray(bruto)
    return (0 until lista.length()).map { lista.getString(it) }
  }
}
