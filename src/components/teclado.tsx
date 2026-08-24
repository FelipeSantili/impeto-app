import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { BotaoGlifo, Pressavel, Regua, Rotulo, Tx } from '@/components/base';
import { Glifo } from '@/components/glifos';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { compressao } from '@/design/movimento';
import { margem, radius, sombraFolha, sp, traco } from '@/design/tokens';
import { fmtNumero } from '@/lib/metricas';
import { useDescanso } from '@/store/descanso';
import { useTreino } from '@/store/treino';

/**
 * TECLADO DE CARGA
 *
 * ─── Por que a entrada saiu de dentro da linha ───────────────────────────────
 *
 * Antes, carga e repetições eram dois `TextInput` de 62px dentro da própria
 * linha da série. Isso tinha três defeitos que só aparecem na academia, nunca
 * no emulador:
 *
 *   1. O alvo era pequeno. Numa tabela densa, com o polegar de uma mão só e o
 *      dedo úmido, acertar uma célula de 62×34 entre duas outras é caro.
 *   2. O teclado do sistema subia e tapava metade da tabela — inclusive a
 *      linha que você estava editando. Você digitava às cegas.
 *   3. O teclado do sistema não sabe nada sobre musculação. Ele não tem
 *      incremento de anilha, não sabe pular para o próximo campo e não sabe
 *      concluir a série.
 *
 * Agora a célula é só um MOSTRADOR, e o toque abre este painel embaixo, na
 * zona que o polegar alcança sem trocar a mão de posição.
 *
 * ─── Por que tapar a lista aqui não é problema ───────────────────────────────
 *
 * Este painel cobre boa parte da tela, e isso é aceitável por um motivo
 * específico: ele MOSTRA o que você está editando no próprio cabeçalho —
 * exercício, número da série, e os dois valores lado a lado. Não há nada atrás
 * dele que você precise ver. Foi exatamente o contrário disso que tornava o
 * teclado do sistema ruim aqui.
 *
 * ─── O caminho quente inteiro sem fechar o teclado ───────────────────────────
 *
 * KG → REPS → CONCLUIR → KG da próxima série. Uma sequência só, sem tirar o
 * polegar da região de baixo. `Concluir` marca a série, dispara o descanso e
 * já reposiciona o teclado na série seguinte — que, graças à propagação de
 * carga do store, na maioria das vezes já vem preenchida e só precisa de um
 * segundo toque em `Concluir`.
 */

interface Alvo {
  uid: string;
  serieId: string;
  campo: 'peso' | 'reps';
  /** Rótulos da medida do exercício: KG/REPS, KM/MIN, KG/SEG… */
  rotulos: { a: string; b: string };
  /** A segunda coluna aceita decimal? Repetição não; segundo e quilo sim. */
  inteiroB: boolean;
  exercicio: string;
  numeroSerie: number;
  descanso: number;
}

interface EstadoTeclado {
  alvo: Alvo | null;
}

const useTeclado = create<EstadoTeclado>(() => ({ alvo: null }));

export const abrirTeclado = (a: Alvo) => useTeclado.setState({ alvo: a });
export const fecharTeclado = () => useTeclado.setState({ alvo: null });
export const usarAlvoTeclado = () => useTeclado((s) => s.alvo);

/** Incrementos de anilha. Ninguém sobe carga de um em um quilo. */
const PASSOS = [-5, -2.5, 2.5, 5] as const;

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export function TecladoCarga() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const insets = useSafeAreaInsets();
  const alvo = useTeclado((s) => s.alvo);

  const ativa = useTreino((s) => s.ativa);
  const editarSerie = useTreino((s) => s.editarSerie);
  const alternarFeita = useTreino((s) => s.alternarFeita);
  const iniciarDescanso = useDescanso((s) => s.iniciar);

  /*
   * O texto local guarda estados intermediários que um número puro descartaria
   * — "82," enquanto se digita a vírgula, e o "" de campo recém-limpo, que é
   * diferente de zero.
   */
  const [texto, setTexto] = useState<string | null>(null);

  const exercicio = ativa?.exercicios.find((e) => e.uid === alvo?.uid);
  const serie = exercicio?.series.find((s) => s.id === alvo?.serieId);

  // Trocar de campo ou de série descarta a digitação em curso: o valor que vale
  // é o que já está no store.
  useEffect(() => {
    setTexto(null);
  }, [alvo?.serieId, alvo?.campo]);

  if (!alvo || !serie) return null;

  const inteiro = alvo.campo === 'reps' && alvo.inteiroB;
  const valorStore = serie[alvo.campo];
  const mostrado = texto ?? (valorStore === null ? '' : fmtNumero(valorStore));

  function gravar(bruto: string) {
    if (!alvo) return;
    setTexto(bruto);
    if (bruto === '' || bruto === ',') return editarSerie(alvo.uid, alvo.serieId, alvo.campo, null);
    const n = Number(bruto.replace(',', '.'));
    if (!Number.isNaN(n)) editarSerie(alvo.uid, alvo.serieId, alvo.campo, n);
  }

  function digitar(t: string) {
    Haptics.selectionAsync();
    if (t === ',') {
      if (inteiro || mostrado.includes(',')) return;
      return gravar((mostrado === '' ? '0' : mostrado) + ',');
    }
    // Um zero à esquerda sozinho não é valor; é o campo ainda vazio.
    const base = mostrado === '0' ? '' : mostrado;
    if (base.replace(',', '').length >= 6) return;
    gravar(base + t);
  }

  function apagar() {
    Haptics.selectionAsync();
    gravar(mostrado.slice(0, -1));
  }

  function somar(passo: number) {
    if (!alvo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const atual = valorStore ?? 0;
    // Nunca desce abaixo de zero: carga negativa não existe e o usuário teria
    // que apagar à mão para se recuperar de um toque errado.
    const novo = Math.max(0, Math.round((atual + passo) * 100) / 100);
    setTexto(null);
    editarSerie(alvo.uid, alvo.serieId, alvo.campo, novo === 0 ? null : novo);
  }

  function irPara(campo: 'peso' | 'reps') {
    if (!alvo || campo === alvo.campo) return;
    Haptics.selectionAsync();
    useTeclado.setState({ alvo: { ...alvo, campo } });
  }

  /** Marca a série e reposiciona o teclado na próxima — o laço do treino. */
  function concluir() {
    if (!alvo || !exercicio) return;
    const virou = alternarFeita(alvo.uid, alvo.serieId);
    if (!virou) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (alvo.descanso > 0) iniciarDescanso(alvo.descanso);

    const i = exercicio.series.findIndex((s) => s.id === alvo.serieId);
    const prox = exercicio.series[i + 1];
    if (prox && !prox.feita) {
      useTeclado.setState({
        alvo: { ...alvo, serieId: prox.id, campo: 'peso', numeroSerie: alvo.numeroSerie + 1 },
      });
    } else {
      fecharTeclado();
    }
  }

  const peso = serie.peso === null ? '--' : fmtNumero(serie.peso);
  const reps = serie.reps === null ? '--' : fmtNumero(serie.reps);

  return (
    <Animated.View
      entering={SlideInDown.duration(220)}
      exiting={SlideOutDown.duration(180)}
      style={[estilos.painel, sombraFolha(c), { paddingBottom: insets.bottom + sp.sm }]}
    >
      <View style={estilos.cabeca}>
        <View style={{ flex: 1 }}>
          <Tx v="heading" numberOfLines={1}>
            {alvo.exercicio}
          </Tx>
          <Rotulo cor={c.tintaFraca}>Série {alvo.numeroSerie}</Rotulo>
        </View>
        <BotaoGlifo glifo="fechar" tamanho={34} acessivel="Fechar" onPress={fecharTeclado} />
      </View>

      {/* Os dois campos lado a lado. O ativo é sublinhado em acento — é o que
          substitui o cursor, já que aqui não há campo de texto de verdade. */}
      <View style={estilos.campos}>
        <Campo
          rotulo={alvo.rotulos.a}
          valor={alvo.campo === 'peso' ? mostrado || '--' : peso}
          ativo={alvo.campo === 'peso'}
          onPress={() => irPara('peso')}
        />
        <Campo
          rotulo={alvo.rotulos.b}
          valor={alvo.campo === 'reps' ? mostrado || '--' : reps}
          ativo={alvo.campo === 'reps'}
          onPress={() => irPara('reps')}
        />
      </View>

      {/* Incremento de anilha: só faz sentido na coluna de carga. */}
      {alvo.campo === 'peso' ? (
        <View style={estilos.passos}>
          {PASSOS.map((p) => (
            <Pressavel
              key={p}
              onPress={() => somar(p)}
              escala={compressao.botao}
              style={estilos.passo}
              accessibilityRole="button"
              accessibilityLabel={`${p > 0 ? 'Somar' : 'Subtrair'} ${Math.abs(p)}`}
            >
              <Tx v="numero" cor={c.tintaMid}>
                {p > 0 ? `+${fmtNumero(p)}` : fmtNumero(p)}
              </Tx>
            </Pressavel>
          ))}
        </View>
      ) : (
        <View style={estilos.passos}>
          {[1, 2, 5, 10].map((p) => (
            <Pressavel
              key={p}
              onPress={() => somar(p)}
              escala={compressao.botao}
              style={estilos.passo}
              accessibilityRole="button"
              accessibilityLabel={`Somar ${p}`}
            >
              <Tx v="numero" cor={c.tintaMid}>
                +{p}
              </Tx>
            </Pressavel>
          ))}
        </View>
      )}

      <Regua style={{ marginHorizontal: margem.pagina }} />

      <View style={estilos.grade}>
        {TECLAS.map((t) => (
          <Tecla key={t} rotulo={t} onPress={() => digitar(t)} />
        ))}
        <Tecla
          rotulo=","
          desativada={inteiro}
          onPress={() => digitar(',')}
        />
        <Tecla rotulo="0" onPress={() => digitar('0')} />
        <Tecla rotulo="apagar" onPress={apagar} />
      </View>

      <Pressavel
        onPress={concluir}
        escala={compressao.barra}
        fundo={serie.feita ? c.fundoAlto : c.acento}
        fundoPressionado={serie.feita ? c.fundoBorda : c.acentoPress}
        style={estilos.concluir}
        accessibilityRole="button"
        accessibilityLabel={serie.feita ? 'Desmarcar série' : 'Concluir série'}
      >
        <Glifo
          nome="confere"
          tamanho={16}
          cor={serie.feita ? c.tintaMid : c.acentoTexto}
        />
        <Tx v="bodyMed" cor={serie.feita ? c.tintaMid : c.acentoTexto}>
          {serie.feita ? 'Desmarcar série' : 'Concluir série'}
        </Tx>
      </Pressavel>
    </Animated.View>
  );
}

function Campo({
  rotulo,
  valor,
  ativo,
  onPress,
}: {
  rotulo: string;
  valor: string;
  ativo: boolean;
  onPress: () => void;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  return (
    <Pressavel
      onPress={onPress}
      escala={compressao.linha}
      style={[estilos.campo, ativo && { borderBottomColor: c.acento }]}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={`${rotulo}: ${valor}`}
    >
      <Rotulo cor={ativo ? c.acento : c.tintaFraca}>{rotulo}</Rotulo>
      <Tx v="numeroXG" cor={ativo ? c.tinta : c.tintaMid} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Tx>
    </Pressavel>
  );
}

function Tecla({
  rotulo,
  onPress,
  desativada,
}: {
  rotulo: string;
  onPress: () => void;
  desativada?: boolean;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const apagador = rotulo === 'apagar';
  return (
    // A folga entre teclas vive no encaixe, não na tecla: assim o alvo de toque
    // ocupa a célula inteira e a margem não come área clicável.
    <View style={estilos.encaixe}>
      <Pressavel
        onPress={onPress}
        disabled={desativada}
        escala={compressao.tecla}
        fundo={c.fundoAlto}
        fundoPressionado={c.fundoBorda}
        style={estilos.tecla}
        accessibilityRole="button"
        accessibilityLabel={apagador ? 'Apagar' : rotulo}
      >
        {apagador ? (
          <Glifo nome="voltar" tamanho={20} cor={c.tintaMid} />
        ) : (
          <Tx v="numeroG" cor={desativada ? c.tintaFantasma : c.tinta}>
            {rotulo}
          </Tx>
        )}
      </Pressavel>
    </View>
  );
}

const usarEstilos = criarEstilos((c) => ({
  painel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.fundo,
    borderTopWidth: traco.normal,
    borderTopColor: c.acentoLinha,
    borderTopLeftRadius: radius.folha,
    borderTopRightRadius: radius.folha,
    paddingTop: sp.md,
  },
  cabeca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingLeft: margem.pagina,
    paddingRight: margem.pagina - sp.sm,
    paddingBottom: sp.md,
  },
  campos: {
    flexDirection: 'row',
    gap: sp.md,
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.lg,
  },
  campo: {
    flex: 1,
    gap: 2,
    paddingBottom: sp.sm,
    borderBottomWidth: traco.forte,
    borderBottomColor: c.reguaMid,
  },
  passos: {
    flexDirection: 'row',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.lg,
  },
  passo: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.fundoAlto,
    borderRadius: radius.md,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: margem.pagina - sp.xs,
    paddingTop: sp.md,
  },
  encaixe: { width: '33.333%', padding: sp.xs },
  tecla: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  concluir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    height: 56,
    marginHorizontal: margem.pagina,
    marginTop: sp.xs,
    borderRadius: radius.lg,
  },
}));
