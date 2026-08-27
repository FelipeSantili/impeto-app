package expo.modules.impetopulso

import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

/** O caminho por onde os comandos do relógio chegam. */
const val CAMINHO_COMANDO = "/impeto/comando"

/** O caminho onde o celular publica o retrato da sessão aberta. */
const val CAMINHO_SESSAO = "/impeto/sessao"

/**
 * A porta de entrada do relógio no celular.
 *
 * Só existe por causa do app fechado. Enquanto o Ímpeto está aberto, o módulo
 * já está ouvindo e este serviço é um repasse de uma linha; quando o app está
 * morto, é ele quem o Play Services acorda, e é a única chance que o comando
 * tem de não se perder.
 *
 * Note que ele NÃO tenta abrir o app. Android 10 em diante barra o início de
 * activity a partir do fundo, e insistir nisso daria um comando engolido sem
 * aviso. O comando vai para a fila e é aplicado quando o usuário abrir — que é
 * o momento em que ele vai olhar, de qualquer forma.
 */
class ServicoPulso : WearableListenerService() {
  override fun onMessageReceived(evento: MessageEvent) {
    if (evento.path != CAMINHO_COMANDO) return
    Ponte.receber(applicationContext, String(evento.data, Charsets.UTF_8))
  }
}
