import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BotaoIcone, Cabecalho, Rotulo, Tela, Tx, Vazio } from '@/components/base';
import { Demo } from '@/components/demo';
import { familias } from '@/data/familias';
import { POR_ID } from '@/data/exercicios';
import { EQUIP_LABEL, GRUPO_LABEL, MEDIDA_LABEL } from '@/data/types';
import { color, radius, shadow, sp } from '@/design/tokens';
import {
  fmtData,
  fmtNumero,
  historicoDoExercicio,
  recordesDoExercicio,
} from '@/lib/metricas';
import { useTreino } from '@/store/treino';

export default function DetalheExercicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = POR_ID[id ?? ''];
  const historico = useTreino((s) => s.historico);
  const ativa = useTreino((s) => s.ativa);
  const addExercicios = useTreino((s) => s.addExercicios);

  if (!ex) {
    return (
      <Tela>
        <Cabecalho esquerda={<BotaoIcone icone="chevron-back" onPress={() => router.back()} />} />
        <Vazio icone="alert-circle-outline" titulo="Exercício não encontrado" />
      </Tela>
    );
  }

  const familia = ex.fam ? familias[ex.fam] : undefined;
  const registros = historicoDoExercicio(historico, ex.id);
  const rec = recordesDoExercicio(historico, ex.id);
  const rotulos = MEDIDA_LABEL[ex.medida];

  return (
    <Tela scroll contentStyle={{ paddingBottom: sp.h4 }}>
      <Cabecalho
        esquerda={<BotaoIcone icone="chevron-back" onPress={() => router.back()} />}
        direita={
          ativa ? (
            <BotaoIcone
              icone="add"
              cor={color.bg}
              fundo={color.accent}
              tamanho={34}
              onPress={() => {
                addExercicios([ex.id]);
                router.back();
              }}
            />
          ) : undefined
        }
      />

      <View style={{ paddingHorizontal: sp.xl }}>
        <Animated.View entering={FadeIn.duration(300)}>
          <Demo ex={ex} style={estilos.demo} raio={radius.xxl} />
        </Animated.View>

        <Tx v="title" center style={{ marginTop: sp.xxl }}>
          {ex.nome}
        </Tx>

        <View style={estilos.tags}>
          <Tag texto={GRUPO_LABEL[ex.grupo]} destaque />
          <Tag texto={EQUIP_LABEL[ex.equip]} />
          {ex.unilateral ? <Tag texto="Unilateral" /> : null}
        </View>

        {ex.aux?.length ? (
          <Tx v="small" cor={color.textFaint} center style={{ marginTop: sp.md }}>
            Também trabalha {ex.aux.map((g) => GRUPO_LABEL[g].toLowerCase()).join(', ')}
          </Tx>
        ) : null}
      </View>

      {/* Execução */}
      {familia ? (
        <Animated.View entering={FadeInDown.delay(80).duration(300)} style={estilos.secao}>
          <Rotulo>Como executar</Rotulo>
          <View style={{ gap: sp.lg, marginTop: sp.lg }}>
            {familia.passos.map((p, i) => (
              <View key={i} style={estilos.passo}>
                <View style={estilos.passoNumero}>
                  <Tx v="caption" cor={color.accent} tab>
                    {i + 1}
                  </Tx>
                </View>
                <Tx v="body" cor={color.textDim} style={{ flex: 1 }}>
                  {p}
                </Tx>
              </View>
            ))}
          </View>

          <View style={estilos.aviso}>
            <Ionicons name="warning-outline" size={15} color={color.textFaint} />
            <Tx v="small" cor={color.textFaint} style={{ flex: 1 }}>
              {familia.erro}
            </Tx>
          </View>
        </Animated.View>
      ) : null}

      {/* Recordes */}
      {rec.totalSeries > 0 ? (
        <View style={estilos.secao}>
          <Rotulo>Seus melhores</Rotulo>
          <View style={estilos.grade}>
            <Metrica rotulo="Maior carga" valor={`${fmtNumero(rec.maiorCarga)} ${rotulos.a.toLowerCase()}`} />
            <Metrica
              rotulo="Melhor série"
              valor={
                rec.melhorSerie
                  ? `${fmtNumero(rec.melhorSerie.peso)} × ${fmtNumero(rec.melhorSerie.reps)}`
                  : '—'
              }
            />
            <Metrica rotulo="1RM estimado" valor={`${Math.round(rec.melhor1RM)} kg`} />
            <Metrica rotulo="Séries feitas" valor={String(rec.totalSeries)} />
          </View>
        </View>
      ) : null}

      {/* Histórico */}
      <View style={estilos.secao}>
        <Rotulo>Histórico</Rotulo>
        {registros.length === 0 ? (
          <Tx v="small" cor={color.textGhost} style={{ marginTop: sp.lg }}>
            Você ainda não registrou este exercício.
          </Tx>
        ) : (
          <View style={{ marginTop: sp.md }}>
            {registros.slice(0, 8).map((r, i) => (
              <Pressable
                key={`${r.sessaoId}-${i}`}
                onPress={() => router.push(`/sessao/${r.sessaoId}`)}
                style={({ pressed }) => [estilos.registro, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flex: 1 }}>
                  <Tx v="smallMed">{fmtData(r.data)}</Tx>
                  <Tx v="small" cor={color.textGhost} numberOfLines={1}>
                    {r.nomeSessao}
                  </Tx>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  {r.series.slice(0, 4).map((s) => (
                    <Tx key={s.id} v="small" tab cor={color.textDim}>
                      {fmtNumero(s.peso)} × {fmtNumero(s.reps)}
                    </Tx>
                  ))}
                  {r.series.length > 4 ? (
                    <Tx v="caption" cor={color.textGhost}>
                      +{r.series.length - 4}
                    </Tx>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Tela>
  );
}

function Tag({ texto, destaque }: { texto: string; destaque?: boolean }) {
  return (
    <View style={[estilos.tag, destaque && { backgroundColor: color.accentSoft, borderColor: color.accentLine }]}>
      <Tx v="caption" cor={destaque ? color.accent : color.textDim} style={{ textTransform: 'none', letterSpacing: 0.2 }}>
        {texto}
      </Tx>
    </View>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.metrica}>
      <Tx v="caption" cor={color.textFaint}>
        {rotulo.toUpperCase()}
      </Tx>
      <Tx v="heading" tab style={{ marginTop: sp.xs }}>
        {valor}
      </Tx>
    </View>
  );
}

const estilos = StyleSheet.create({
  demo: {
    width: '100%',
    aspectRatio: 1.28,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
    ...shadow.soft,
  },
  tags: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: sp.sm,
    marginTop: sp.lg,
  },
  tag: {
    paddingHorizontal: sp.md,
    height: 26,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  secao: { paddingHorizontal: sp.xl, paddingTop: sp.h2 },
  passo: { flexDirection: 'row', gap: sp.md, alignItems: 'flex-start' },
  passoNumero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accentSoft,
    marginTop: 1,
  },
  aviso: {
    flexDirection: 'row',
    gap: sp.md,
    marginTop: sp.xl,
    padding: sp.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm, marginTop: sp.lg },
  metrica: {
    flexGrow: 1,
    flexBasis: '46%',
    padding: sp.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  registro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.lg,
    paddingVertical: sp.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.line,
  },
});
