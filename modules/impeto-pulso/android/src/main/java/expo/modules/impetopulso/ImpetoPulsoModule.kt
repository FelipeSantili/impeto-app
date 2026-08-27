package expo.modules.impetopulso

import android.content.Context
import android.os.Bundle
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Nome da capacidade que o relógio procura. Espelha `res/values/wear.xml`. */
private const val CAPACIDADE = "impeto_celular"

/**
 * O lado do celular da ponte com o relógio.
 *
 * A divisão de trabalho entre os dois aparelhos é deliberada e vale explicar,
 * porque a alternativa é tentadora e errada:
 *
 *   · o CELULAR é a fonte da verdade. O treino mora no zustand dele, com o
 *     histórico e o catálogo de exercícios;
 *   · o RELÓGIO manda COMANDOS ("marca esta série", "abre um treino") e desenha
 *     o retrato que o celular publica de volta. Ele não guarda estado próprio.
 *
 * A alternativa seria os dois lados escreverem no mesmo estado e reconciliarem
 * depois. Numa rede que cai — e a do relógio cai, é Bluetooth — isso vira
 * resolução de conflito para cada série marcada, e o custo de errar é o usuário
 * perdendo carga registrada. Um dono só, e a discussão não existe.
 *
 * Por isso os dois canais do Data Layer são usados para coisas diferentes:
 * `MessageClient` para os comandos (baratos, ordenados, sem estado) e
 * `DataClient` para o retrato (persistente, deduplicado, e que reaparece
 * sozinho quando o relógio volta ao alcance).
 */
class ImpetoPulsoModule : Module() {
  private val contexto: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  /**
   * Entrega um comando ao JS. Falso quando não há ninguém ouvindo — e é esse
   * falso que manda o comando para a fila em disco.
   */
  fun entregar(json: String): Boolean {
    if (!temOuvinte) return false
    return try {
      sendEvent("comando", Bundle().apply { putString("json", json) })
      true
    } catch (e: Throwable) {
      // Ponte de JS caindo no meio da entrega. Devolver falso manda o comando
      // para a fila, que é melhor que perdê-lo com o app quase morto.
      false
    }
  }

  private var temOuvinte = false

  override fun definition() = ModuleDefinition {
    Name("ImpetoPulso")

    Events("comando")

    OnCreate { Ponte.ligar(this@ImpetoPulsoModule) }
    OnDestroy { Ponte.desligar(this@ImpetoPulsoModule) }

    // O JS só quer eventos enquanto tem quem os aplique. Fora disso o comando
    // vai para a fila em vez de sumir num emissor sem assinante.
    OnStartObserving("comando") { temOuvinte = true }
    OnStopObserving("comando") { temOuvinte = false }

    /**
     * Tudo que chegou com o app fechado, de uma vez, e some do disco.
     *
     * Chamado pelo JS ao montar. Devolve JSON cru: quem sabe interpretar
     * comando é o TypeScript, e duplicar esse conhecimento em Kotlin seria dois
     * lugares para consertar a cada campo novo.
     */
    AsyncFunction("drenarFila") {
      return@AsyncFunction Fila.drenar(contexto)
    }

    /**
     * Publica o retrato da sessão aberta.
     *
     * `setUrgent` porque o padrão do Data Layer é juntar escritas e entregar
     * quando der — o que para um retrato de treino significa o relógio mostrando
     * a série anterior por até meio minuto. Aqui cada publicação é uma resposta
     * direta a um toque, no relógio ou no celular, e atraso lê como travamento.
     *
     * Publicar JSON IDÊNTICO ao que já está lá não gera evento nenhum do outro
     * lado: o Data Layer deduplica por conteúdo. É de graça, e é o que permite
     * o JS chamar isto a cada mudança do store sem pensar duas vezes.
     */
    AsyncFunction("publicarSessao") { json: String ->
      val pedido = PutDataMapRequest.create(CAMINHO_SESSAO).apply {
        dataMap.putString("json", json)
      }.asPutDataRequest().setUrgent()
      Wearable.getDataClient(contexto).putDataItem(pedido)
      return@AsyncFunction null
    }

    /**
     * Há relógio com o Ímpeto instalado ao alcance?
     *
     * `FILTER_REACHABLE` e não `FILTER_ALL`: um relógio pareado mas desligado
     * continua na lista de nós, e dizer "conectado" ali seria mentir para a
     * tela de ajustes. Só conta quem responde agora.
     */
    AsyncFunction("relogiosConectados") {
      val info = com.google.android.gms.tasks.Tasks.await(
        Wearable.getCapabilityClient(contexto)
          .getCapability(CAPACIDADE, CapabilityClient.FILTER_REACHABLE)
      )
      return@AsyncFunction info.nodes.map { it.displayName }
    }
  }
}
