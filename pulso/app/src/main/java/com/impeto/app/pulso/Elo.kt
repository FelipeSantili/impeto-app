package com.impeto.app.pulso

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await

/**
 * O ELO — tudo que atravessa para o celular passa por aqui.
 *
 * O estado é um `StateFlow` de escopo de PROCESSO, e não do ViewModel, por uma
 * razão prática: o retrato pode chegar pelo `ServicoCelular` com o app fechado,
 * e quando a tela abrir ela precisa encontrar o treino já ali. Guardado no
 * ViewModel, cada abertura começaria em branco e piscaria até a primeira
 * sincronia — o que num relógio, onde a sessão de uso dura oito segundos, é
 * quase o tempo todo.
 */
object Elo {
  private const val TAG = "ImpetoPulso"

  private val _sessao = MutableStateFlow<Sessao?>(null)

  /** O treino aberto no celular, como ele está agora. */
  val sessao: StateFlow<Sessao?> = _sessao.asStateFlow()

  /** Nulo = ainda não perguntamos. Falso = perguntamos e não há ninguém. */
  private val _celularAoAlcance = MutableStateFlow<Boolean?>(null)
  val celularAoAlcance: StateFlow<Boolean?> = _celularAoAlcance.asStateFlow()

  fun receber(sessao: Sessao?) {
    _sessao.value = sessao
  }

  /**
   * Lê o retrato que já está guardado no Data Layer.
   *
   * O `DataItem` é PERSISTENTE: o último retrato publicado continua lá depois
   * de o relógio reiniciar, sem o celular precisar publicar de novo. Chamar
   * isto ao abrir a tela é o que faz o treino aparecer imediatamente em vez de
   * esperar a próxima mudança do outro lado.
   */
  suspend fun carregar(ctx: Context) {
    try {
      val itens = Wearable.getDataClient(ctx).dataItems.await()
      try {
        val item = itens.firstOrNull { it.uri.path == CAMINHO_SESSAO }
        _sessao.value = item
          ?.let { DataMapItem.fromDataItem(it).dataMap.getString("json") }
          ?.let(::lerRetrato)
      } finally {
        // `DataItemBuffer` segura memória nativa. Sem o `release` cada abertura
        // da tela vaza um buffer, e o aviso só aparece no logcat.
        itens.release()
      }
    } catch (e: Throwable) {
      Log.w(TAG, "não deu para ler o retrato guardado", e)
    }
  }

  /** Há celular com o Ímpeto ao alcance agora? */
  suspend fun conferirCelular(ctx: Context) {
    _celularAoAlcance.value = try {
      Wearable.getCapabilityClient(ctx)
        .getCapability(CAPACIDADE_CELULAR, CapabilityClient.FILTER_REACHABLE)
        .await()
        .nodes.isNotEmpty()
    } catch (e: Throwable) {
      false
    }
  }

  /**
   * Manda um comando para todos os nós que rodam o Ímpeto.
   *
   * "Todos" e não "o primeiro": um relógio pode estar pareado a mais de um nó
   * (celular e tablet), e escolher um deles por chute erraria metade das vezes.
   * Quem não tiver treino aberto descarta o comando sozinho — `aplicar` no lado
   * do celular é tolerante a comando que não faz mais sentido.
   *
   * Devolve falso quando nenhum nó recebeu. É esse falso que a tela usa para
   * dizer "celular fora de alcance" em vez de fingir que gravou.
   */
  suspend fun mandar(ctx: Context, comando: String): Boolean {
    return try {
      val nos = Wearable.getCapabilityClient(ctx)
        .getCapability(CAPACIDADE_CELULAR, CapabilityClient.FILTER_REACHABLE)
        .await()
        .nodes
      _celularAoAlcance.value = nos.isNotEmpty()
      if (nos.isEmpty()) return false
      val bytes = comando.toByteArray(Charsets.UTF_8)
      var algum = false
      for (no in nos) {
        try {
          Wearable.getMessageClient(ctx).sendMessage(no.id, CAMINHO_COMANDO, bytes).await()
          algum = true
        } catch (e: Throwable) {
          Log.w(TAG, "nó ${no.displayName} recusou o comando", e)
        }
      }
      algum
    } catch (e: Throwable) {
      Log.w(TAG, "não deu para mandar o comando", e)
      _celularAoAlcance.value = false
      false
    }
  }
}

/**
 * Recebe o retrato do celular, inclusive com o app do relógio fechado.
 *
 * É o que faz abrir o Ímpeto no pulso já mostrando o treino em curso. Sem ele o
 * app abriria vazio e só se encheria na primeira mudança do outro lado — e se o
 * usuário não mexer no celular, isso pode não acontecer nunca.
 */
class ServicoCelular : WearableListenerService() {
  override fun onDataChanged(eventos: DataEventBuffer) {
    for (evento in eventos) {
      if (evento.dataItem.uri.path != CAMINHO_SESSAO) continue
      val json = DataMapItem.fromDataItem(evento.dataItem).dataMap.getString("json") ?: continue
      Elo.receber(lerRetrato(json))
    }
  }
}

/**
 * O ouvinte ao vivo, ligado só enquanto a tela está aberta.
 *
 * O serviço acima já receberia tudo, mas ele acorda o processo a cada evento —
 * e com a tela na frente do usuário isso é trabalho a mais para chegar ao mesmo
 * lugar. Este é registrado na hora e some ao fechar.
 */
class OuvinteAoVivo(private val ctx: Context) : DataClient.OnDataChangedListener {
  fun ligar() = Wearable.getDataClient(ctx).addListener(this)
  fun desligar() = Wearable.getDataClient(ctx).removeListener(this)

  override fun onDataChanged(eventos: DataEventBuffer) {
    for (evento in eventos) {
      if (evento.dataItem.uri.path != CAMINHO_SESSAO) continue
      val json = DataMapItem.fromDataItem(evento.dataItem).dataMap.getString("json") ?: continue
      Elo.receber(lerRetrato(json))
    }
  }
}
