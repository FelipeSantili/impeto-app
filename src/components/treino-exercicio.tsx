import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Rotulo, Tx } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { abrirMenu, type OpcaoMenu } from '@/components/folha';
import { POR_ID } from '@/data/exercicios';
import { MEDIDA_LABEL, type Medida } from '@/data/types';
import { color, radius, sp, type } from '@/design/tokens';
import { fmtNumero } from '@/lib/metricas';
import { useDescanso } from '@/store/descanso';
import { useTreino, type ExercicioTreino, type Serie, type TipoSerie } from '@/store/treino';

const MARCA: Record<TipoSerie, { texto: string; cor: string } | null> = {
  normal: null,
  aquecimento: { texto: 'A', cor: '#F5B942' },
  falha: { texto: 'F', cor: color.danger },
  drop: { texto: 'D', cor: '#4FD1C5' },
};

const OPCOES_DESCANSO = [0, 45, 60, 90, 120, 150, 180, 240];

/** Bloco de um exercício dentro do treino: cabeçalho, tabela de séries e ações. */
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
  const ex = POR_ID[item.exId];
  const medida: Medida = ex?.medida ?? 'peso_rep';
  const rotulos = MEDIDA_LABEL[medida];

  const addSerie = useTreino((s) => s.addSerie);
  const removerExercicio = useTreino((s) => s.removerExercicio);
  const moverExercicio = useTreino((s) => s.moverExercicio);
  const setDescanso = useTreino((s) => s.setDescanso);
  const setNota = useTreino((s) => s.setNota);

  const [mostrarNota, setMostrarNota] = useState(!!item.nota);

  function menu() {
    const opcoes: OpcaoMenu[] = [
      {
        texto: 'Ver demonstração',
        icone: 'play-circle-outline',
        onPress: () => router.push(`/exercicio/${item.exId}`),
      },
      {
        texto: item.nota ? 'Editar anotação' : 'Adicionar anotação',
        icone: 'create-outline',
        onPress: () => setMostrarNota(true),
      },
      { texto: 'Tempo de descanso', icone: 'timer-outline', onPress: menuDescanso },
    ];
    if (indice > 0)
      opcoes.push({
        texto: 'Mover para cima',
        icone: 'arrow-up',
        onPress: () => moverExercicio(item.uid, -1),
      });
    if (indice < total - 1)
      opcoes.push({
        texto: 'Mover para baixo',
        icone: 'arrow-down',
        onPress: () => moverExercicio(item.uid, 1),
      });
    opcoes.push({
      texto: 'Remover do treino',
      icone: 'trash-outline',
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
        texto:
          seg === 0
            ? 'Sem cronômetro'
            : `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`,
        onPress: () => setDescanso(item.uid, seg),
      })),
    });
  }

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} style={estilos.bloco}>
      <Pressable onPress={() => router.push(`/exercicio/${item.exId}`)} style={estilos.cabecalho}>
        <Miniatura ex={ex} tamanho={40} />
        <View style={{ flex: 1, gap: 1 }}>
          <Tx v="bodyMed" numberOfLines={1}>
            {ex?.nome ?? 'Exercício'}
          </Tx>
          <Tx v="small" cor={color.textFaint}>
            {item.descanso > 0
              ? `Descanso ${Math.floor(item.descanso / 60)}:${String(item.descanso % 60).padStart(2, '0')}`
              : 'Sem cronômetro'}
          </Tx>
        </View>
        <Pressable hitSlop={10} onPress={menu} style={estilos.menu}>
          <Ionicons name="ellipsis-horizontal" size={16} color={color.textDim} />
        </Pressable>
      </Pressable>

      {mostrarNota ? (
        <TextInput
          value={item.nota ?? ''}
          onChangeText={(t) => setNota(item.uid, t)}
          placeholder="Anotação (pino, altura do banco, pegada…)"
          placeholderTextColor={color.textGhost}
          style={estilos.nota}
          multiline
        />
      ) : null}

      <View style={estilos.colunas}>
        <Rotulo style={{ width: 30, textAlign: 'center' }}>Sér</Rotulo>
        <Rotulo style={{ flex: 1, textAlign: 'center' }}>Anterior</Rotulo>
        <Rotulo style={{ width: 64, textAlign: 'center' }}>{rotulos.a}</Rotulo>
        <Rotulo style={{ width: 64, textAlign: 'center' }}>{rotulos.b}</Rotulo>
        <View style={{ width: 34 }} />
      </View>

      {item.series.map((serie, i) => (
        <LinhaSerie
          key={serie.id}
          uid={item.uid}
          serie={serie}
          numero={i + 1}
          descanso={item.descanso}
          anterior={anterior?.[i] ?? null}
        />
      ))}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          addSerie(item.uid);
        }}
        style={({ pressed }) => [estilos.addSerie, pressed && { backgroundColor: color.surfaceHi }]}
      >
        <Ionicons name="add" size={15} color={color.textDim} />
        <Tx v="smallMed" cor={color.textDim}>
          Adicionar série
        </Tx>
      </Pressable>
    </Animated.View>
  );
}

export const BlocoExercicio = memo(BlocoExercicioBase);

function LinhaSerie({
  uid,
  serie,
  numero,
  descanso,
  anterior,
}: {
  uid: string;
  serie: Serie;
  numero: number;
  descanso: number;
  anterior: Serie | null;
}) {
  const editarSerie = useTreino((s) => s.editarSerie);
  const alternarFeita = useTreino((s) => s.alternarFeita);
  const ciclarTipo = useTreino((s) => s.ciclarTipo);
  const removerSerie = useTreino((s) => s.removerSerie);
  const iniciarDescanso = useDescanso((s) => s.iniciar);

  const marca = MARCA[serie.tipo];
  const feita = serie.feita;

  const dicaPeso = anterior?.peso != null ? fmtNumero(anterior.peso) : '—';
  const dicaReps = anterior?.reps != null ? fmtNumero(anterior.reps) : '—';

  function concluir() {
    // Marcar sem digitar nada assume o desempenho anterior — é o caminho comum
    // de quem repete a carga da semana passada.
    if (!feita) {
      if (serie.peso === null && anterior?.peso != null) editarSerie(uid, serie.id, 'peso', anterior.peso);
      if (serie.reps === null && anterior?.reps != null) editarSerie(uid, serie.id, 'reps', anterior.reps);
    }
    const virou = alternarFeita(uid, serie.id);
    if (virou) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (descanso > 0) iniciarDescanso(descanso);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  return (
    <Animated.View entering={FadeIn.duration(180)} style={[estilos.linha, feita && estilos.linhaFeita]}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          ciclarTipo(uid, serie.id);
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removerSerie(uid, serie.id);
        }}
        delayLongPress={400}
        hitSlop={6}
        style={{ width: 30, alignItems: 'center' }}
      >
        <Tx v="smallMed" tab cor={marca ? marca.cor : color.textDim}>
          {marca ? marca.texto : numero}
        </Tx>
      </Pressable>

      <Tx v="small" tab cor={color.textGhost} center style={{ flex: 1 }} numberOfLines={1}>
        {anterior ? `${dicaPeso} × ${dicaReps}` : '—'}
      </Tx>

      <CampoNumero
        valor={serie.peso}
        dica={dicaPeso}
        feita={feita}
        onChange={(v) => editarSerie(uid, serie.id, 'peso', v)}
      />
      <CampoNumero
        valor={serie.reps}
        dica={dicaReps}
        feita={feita}
        inteiro
        onChange={(v) => editarSerie(uid, serie.id, 'reps', v)}
      />

      <Pressable onPress={concluir} hitSlop={6} style={[estilos.check, feita && estilos.checkFeito]}>
        <Ionicons name="checkmark" size={16} color={feita ? color.accentText : color.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

function CampoNumero({
  valor,
  dica,
  feita,
  inteiro,
  onChange,
}: {
  valor: number | null;
  dica: string;
  feita: boolean;
  inteiro?: boolean;
  onChange: (v: number | null) => void;
}) {
  // O texto local preserva estados intermediários ("12." enquanto digita) que
  // um número puro descartaria.
  const [texto, setTexto] = useState<string | null>(null);
  const mostrado = texto ?? (valor === null ? '' : fmtNumero(valor));

  return (
    <TextInput
      value={mostrado}
      onChangeText={(t) => {
        const limpo = inteiro ? t.replace(/[^0-9]/g, '') : t.replace(',', '.').replace(/[^0-9.]/g, '');
        setTexto(limpo);
        if (limpo === '') return onChange(null);
        const n = Number(limpo);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => setTexto(null)}
      placeholder={dica}
      placeholderTextColor={color.textGhost}
      keyboardType={inteiro ? 'number-pad' : 'decimal-pad'}
      selectTextOnFocus
      // A célula tem 64×34 fixos: a fonte não pode crescer a ponto de cortar o número.
      maxFontSizeMultiplier={1.2}
      style={[estilos.campo, feita && estilos.campoFeito]}
    />
  );
}

const estilos = StyleSheet.create({
  bloco: {
    backgroundColor: color.bgSoft,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
    padding: sp.lg,
    paddingTop: sp.md,
    marginBottom: sp.md,
  },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: sp.md, paddingVertical: sp.sm },
  menu: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: color.surfaceHi,
  },
  nota: {
    ...type.small,
    color: color.textDim,
    backgroundColor: color.surfaceHi,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    marginTop: sp.sm,
    minHeight: 40,
  },
  colunas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingTop: sp.lg,
    paddingBottom: sp.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    height: 42,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  linhaFeita: { backgroundColor: color.accentFundo },
  campo: {
    width: 64,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceHi,
    color: color.text,
    textAlign: 'center',
    ...type.mono,
    padding: 0,
  },
  campoFeito: { backgroundColor: 'transparent', color: color.text },
  check: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceHi,
  },
  checkFeito: { backgroundColor: color.accent },
  addSerie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.xs,
    height: 38,
    borderRadius: radius.md,
    marginTop: sp.sm,
    backgroundColor: color.surface,
  },
});
