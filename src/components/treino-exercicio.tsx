import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { CabecaColuna, Pressavel, Regua, Rotulo, Tx } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { Glifo } from '@/components/glifos';
import { abrirMenu, type OpcaoMenu } from '@/components/folha';
import { abrirTeclado, usarAlvoTeclado } from '@/components/teclado';
import { POR_ID } from '@/data/exercicios';
import { TECNICAS, tecnicaDe } from '@/data/tecnicas';
import { MEDIDA_LABEL, type Medida } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, radius, sp, traco, type } from '@/design/tokens';
import { fmtNumero } from '@/lib/metricas';
import { useDescanso } from '@/store/descanso';
import { useTreino, type ExercicioTreino, type Serie } from '@/store/treino';

const OPCOES_DESCANSO = [0, 45, 60, 90, 120, 150, 180, 240];

/** Larguras das colunas. Fixas, porque tabela que dança não se lê de relance. */
const COL = { serie: 34, valor: 62, check: 36 };

function fmtDescanso(seg: number) {
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
}

/**
 * Um exercício dentro do treino, montado como página de livro-caixa:
 * cabeçalho, cabeça de coluna sobre faixa, e uma linha por série.
 *
 * Antes isto era um cartão com borda e canto de 22px, e cada série era uma
 * pílula solta. O que mudou não é cosmético: colunas de largura fixa com
 * cabeça de coluna transformam uma lista de valores em TABELA, que é o que se
 * lê em três segundos entre uma série e outra.
 */
function BlocoExercicioBase({
  item,
  indice,
  total,
  anterior,
}: {
  item: ExercicioTreino;
  indice: number;
  total: number;
  anterior: Serie[] | null;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const ex = POR_ID[item.exId];
  const medida: Medida = ex?.medida ?? 'peso_rep';
  const rotulos = MEDIDA_LABEL[medida];

  const addSerie = useTreino((s) => s.addSerie);
  const removerExercicio = useTreino((s) => s.removerExercicio);
  const moverExercicio = useTreino((s) => s.moverExercicio);
  const setDescanso = useTreino((s) => s.setDescanso);
  const setNota = useTreino((s) => s.setNota);

  const [mostrarNota, setMostrarNota] = useState(!!item.nota);

  // A linha da vez é a primeira não concluída — é ela que ganha a barra de
  // tinta na margem, a marca de "é aqui que você está".
  const indiceAtivo = item.series.findIndex((s) => !s.feita);

  function menu() {
    const opcoes: OpcaoMenu[] = [
      { texto: 'Ver demonstração', glifo: 'play', onPress: () => router.push(`/exercicio/${item.exId}`) },
      {
        texto: item.nota ? 'Editar anotação' : 'Adicionar anotação',
        glifo: 'lista',
        onPress: () => setMostrarNota(true),
      },
      { texto: 'Tempo de descanso', glifo: 'relogio', onPress: menuDescanso },
    ];
    if (indice > 0)
      opcoes.push({ texto: 'Mover para cima', glifo: 'cima', onPress: () => moverExercicio(item.uid, -1) });
    if (indice < total - 1)
      opcoes.push({ texto: 'Mover para baixo', glifo: 'baixo', onPress: () => moverExercicio(item.uid, 1) });
    opcoes.push({
      texto: 'Remover do treino',
      glifo: 'lixo',
      destrutiva: true,
      onPress: () => removerExercicio(item.uid),
    });
    abrirMenu({ titulo: ex?.nome ?? 'Exercício', opcoes });
  }

  function menuDescanso() {
    abrirMenu({
      titulo: 'Descanso entre séries',
      subtitulo: 'Vale para todas as séries deste exercício.',
      opcoes: OPCOES_DESCANSO.map((seg) => ({
        texto: seg === 0 ? 'Sem cronômetro' : fmtDescanso(seg),
        onPress: () => setDescanso(item.uid, seg),
      })),
    });
  }

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} style={estilos.bloco}>
      <View style={estilos.cabecalho}>
        <Pressavel
          onPress={() => router.push(`/exercicio/${item.exId}`)}
          style={estilos.cabecalhoToque}
          escala={0.995}
        >
          <Miniatura ex={ex} tamanho={38} />
          <View style={{ flex: 1, gap: 1 }}>
            <Tx v="heading" numberOfLines={1}>
              {ex?.nome ?? 'Exercício'}
            </Tx>
            <Tx v="small" cor={c.tintaFraca}>
              {item.descanso > 0 ? `Descanso ${fmtDescanso(item.descanso)}` : 'Sem cronômetro'}
            </Tx>
          </View>
        </Pressavel>
        <Pressavel onPress={menu} hitSlop={12} style={estilos.menu} accessibilityLabel="Opções do exercício">
          <Glifo nome="reticencias" tamanho={16} cor={c.tintaMid} />
        </Pressavel>
      </View>

      {mostrarNota ? (
        <TextInput
          value={item.nota ?? ''}
          onChangeText={(t) => setNota(item.uid, t)}
          placeholder="Anotação (pino, altura do banco, pegada…)"
          placeholderTextColor={c.tintaFantasma}
          style={estilos.nota}
          multiline
        />
      ) : null}

      <CabecaColuna>
        <Rotulo cor={c.tintaMid} style={{ width: COL.serie }}>
          Sér
        </Rotulo>
        <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
          Anterior
        </Rotulo>
        <Rotulo cor={c.tintaMid} style={{ width: COL.valor, textAlign: 'center' }}>
          {rotulos.a}
        </Rotulo>
        <Rotulo cor={c.tintaMid} style={{ width: COL.valor, textAlign: 'center' }}>
          {rotulos.b}
        </Rotulo>
        <View style={{ width: COL.check }} />
      </CabecaColuna>

      {item.series.map((serie, i) => (
        <LinhaSerie
          key={serie.id}
          uid={item.uid}
          serie={serie}
          numero={i + 1}
          descanso={item.descanso}
          ativa={i === indiceAtivo}
          anterior={anterior?.[i] ?? null}
          exercicio={ex?.nome ?? 'Exercício'}
          rotulos={rotulos}
          medida={medida}
        />
      ))}

      <Regua />
      <Pressavel
        haptico="leve"
        onPress={() => addSerie(item.uid)}
        fundoPressionado={c.fundoBaixo}
        escala={0.995}
        style={estilos.addSerie}
      >
        <Glifo nome="mais" tamanho={13} cor={c.tintaMid} />
        <Rotulo cor={c.tintaMid}>Adicionar série</Rotulo>
      </Pressavel>
    </Animated.View>
  );
}

export const BlocoExercicio = memo(BlocoExercicioBase);

function LinhaSerie({
  uid,
  serie,
  numero,
  descanso,
  ativa,
  anterior,
  exercicio,
  rotulos,
  medida,
}: {
  uid: string;
  serie: Serie;
  numero: number;
  descanso: number;
  ativa: boolean;
  anterior: Serie | null;
  exercicio: string;
  rotulos: { a: string; b: string };
  medida: Medida;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const editarSerie = useTreino((s) => s.editarSerie);
  const alternarFeita = useTreino((s) => s.alternarFeita);
  const definirTipo = useTreino((s) => s.definirTipo);
  const removerSerie = useTreino((s) => s.removerSerie);
  const iniciarDescanso = useDescanso((s) => s.iniciar);

  const tecnica = tecnicaDe(serie.tipo);
  const feita = serie.feita;
  const aquecimento = serie.tipo === 'aquecimento';

  /** Dez técnicas não cabem num toque cíclico — a folha lista todas. */
  function escolherTecnica() {
    abrirMenu({
      titulo: `Série ${numero}`,
      subtitulo: 'Como você vai executar',
      opcoes: TECNICAS.map((t) => ({
        texto: t.tipo === tecnica.tipo ? `${t.nome}  ·  atual` : t.nome,
        glifo: t.tipo === tecnica.tipo ? ('confere' as const) : undefined,
        onPress: () => definirTipo(uid, serie.id, t.tipo),
      })),
    });
  }

  const dicaPeso = anterior?.peso != null ? fmtNumero(anterior.peso) : null;
  const dicaReps = anterior?.reps != null ? fmtNumero(anterior.reps) : null;

  function concluir() {
    // Marcar sem digitar nada assume o desempenho anterior — é o caminho comum
    // de quem repete a carga da semana passada.
    if (!feita) {
      if (serie.peso === null && anterior?.peso != null)
        editarSerie(uid, serie.id, 'peso', anterior.peso);
      if (serie.reps === null && anterior?.reps != null)
        editarSerie(uid, serie.id, 'reps', anterior.reps);
    }
    const virou = alternarFeita(uid, serie.id);
    if (virou) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (descanso > 0) iniciarDescanso(descanso);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  /** Abre o teclado de carga já apontando para a célula que foi tocada. */
  function abrir(campo: 'peso' | 'reps') {
    Haptics.selectionAsync();
    abrirTeclado({
      uid,
      serieId: serie.id,
      campo,
      rotulos,
      // Repetição é inteira; segundo e quilômetro aceitam decimal.
      inteiroB: medida === 'peso_rep' || medida === 'rep',
      exercicio,
      numeroSerie: numero,
      descanso,
    });
  }

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      style={[estilos.linha, feita && estilos.linhaFeita, ativa && estilos.linhaAtiva]}
    >
      {/* Marca de linha da vez: barra de tinta encostada na margem. */}
      {ativa ? <View style={estilos.barraAtiva} /> : null}

      {/*
        Ordinal. Aquecimento vem ENTRE PARÊNTESES porque é assim que um
        livro-caixa marca a linha que não soma ao total — e aquecimento é
        exatamente a única série que não entra no volume.
      */}
      <Pressavel
        haptico="selecao"
        onPress={escolherTecnica}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removerSerie(uid, serie.id);
        }}
        delayLongPress={400}
        hitSlop={8}
        accessibilityLabel={`Série ${numero}, ${tecnica.nome}. Toque para mudar a técnica.`}
        style={{ width: COL.serie }}
      >
        <Tx v="numero" tab cor={aquecimento ? c.tintaFraca : c.tinta}>
          {aquecimento ? `(${numero})` : numero}
        </Tx>
        {tecnica.sigla && !aquecimento ? (
          <Text style={estilos.sigla} numberOfLines={1}>
            {tecnica.sigla}
          </Text>
        ) : null}
      </Pressavel>

      <Tx v="small" tab cor={c.tintaFraca} style={{ flex: 1 }} numberOfLines={1}>
        {dicaPeso && dicaReps ? `${dicaPeso} × ${dicaReps}` : '—'}
      </Tx>

      <Celula valor={serie.peso} dica={dicaPeso} feita={feita} campo="peso" serieId={serie.id} onAbrir={abrir} />
      <Celula valor={serie.reps} dica={dicaReps} feita={feita} campo="reps" serieId={serie.id} onAbrir={abrir} />

      <Pressavel
        onPress={concluir}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: feita }}
        accessibilityLabel={`Concluir série ${numero}`}
        style={[estilos.check, feita && estilos.checkFeito]}
      >
        <Glifo nome="confere" tamanho={15} cor={feita ? c.acentoTexto : c.tintaFantasma} />
      </Pressavel>
    </Animated.View>
  );
}

/**
 * Célula de valor — agora um MOSTRADOR, não um campo.
 *
 * Antes isto era um `TextInput` de 62px que chamava o teclado do sistema, e o
 * teclado do sistema subia tapando a própria linha que estava sendo editada.
 * Agora a célula só exibe, e o toque abre o teclado de carga do app, que mostra
 * o que você está editando no cabeçalho dele.
 *
 * Vazia, mostra o traço de mostrador sem leitura (`--`), não um zero: zero é um
 * valor, ausência não é. Preenchida, escreve em acento — acento é o que VOCÊ
 * escreveu. O sublinhado é a marca de "campo a preencher" e some quando a série
 * é dada por concluída, porque ali deixou de ser campo e virou registro.
 */
function Celula({
  valor,
  dica,
  feita,
  campo,
  serieId,
  onAbrir,
}: {
  valor: number | null;
  dica: string | null;
  feita: boolean;
  campo: 'peso' | 'reps';
  serieId: string;
  onAbrir: (campo: 'peso' | 'reps') => void;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const alvo = usarAlvoTeclado();
  // Precisa casar a SÉRIE também: só o campo marcaria a mesma coluna em todas
  // as linhas do exercício ao mesmo tempo.
  const editando = alvo?.serieId === serieId && alvo?.campo === campo;

  const vazio = valor === null;
  return (
    <Pressavel
      onPress={() => onAbrir(campo)}
      escala={0.94}
      // O alvo real é maior que a célula: a tabela é densa e o dedo é úmido.
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`${campo === 'peso' ? 'Carga' : 'Repetições'}: ${
        vazio ? 'não preenchido' : fmtNumero(valor)
      }. Toque para editar.`}
      style={[
        estilos.celula,
        feita && estilos.celulaFeita,
        editando && { borderBottomColor: c.acento },
      ]}
    >
      <Tx
        v="numero"
        cor={vazio ? c.tintaFantasma : c.acento}
        center
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {vazio ? (dica ?? '--') : fmtNumero(valor)}
      </Tx>
    </Pressavel>
  );
}

const usarEstilos = criarEstilos((c) => ({
  bloco: { marginBottom: sp.h1 },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.md,
  },
  cabecalhoToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: sp.md },
  menu: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  nota: {
    ...type.small,
    color: c.acento,
    backgroundColor: c.fundoAlto,
    borderLeftWidth: 2,
    borderLeftColor: c.acentoLinha,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    marginHorizontal: margem.pagina,
    marginBottom: sp.md,
    minHeight: 40,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: margem.pagina,
    borderBottomWidth: traco.fina,
    borderBottomColor: c.regua,
  },
  linhaFeita: { backgroundColor: c.fundoAlto },
  linhaAtiva: { backgroundColor: c.acentoSuave },
  barraAtiva: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: c.tinta,
  },
  sigla: {
    ...type.carimbo,
    fontSize: 9,
    letterSpacing: 0.8,
    color: c.rec,
    marginTop: -2,
  },
  celula: {
    width: COL.valor,
    height: 34,
    justifyContent: 'center',
    borderBottomWidth: traco.normal,
    borderBottomColor: c.reguaMid,
  },
  // Concluída, some o sublinhado: deixou de ser campo e virou registro.
  celulaFeita: { borderBottomColor: 'transparent' },
  check: {
    width: COL.check,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: traco.normal,
    borderColor: c.reguaMid,
    borderRadius: radius.sm,
    marginLeft: sp.xs,
  },
  checkFeito: { backgroundColor: c.acento, borderColor: c.acento },
  addSerie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    height: 46,
    paddingHorizontal: margem.pagina,
  },
}));
