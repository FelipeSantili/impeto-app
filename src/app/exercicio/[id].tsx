import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import {
  BotaoGlifo,
  Cabecalho,
  CabecaColuna,
  Pressavel,
  Regua,
  Rotulo,
  Secao,
  Tela,
  Tx,
  Vazio,
} from '@/components/base';
import { Demo } from '@/components/demo';
import { Glifo } from '@/components/glifos';
import { POR_ID } from '@/data/exercicios';
import { familias } from '@/data/familias';
import { EQUIP_LABEL, GRUPO_LABEL, MEDIDA_LABEL } from '@/data/types';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, radius, sp } from '@/design/tokens';
import { fmtData, fmtNumero, historicoDoExercicio, recordesDoExercicio } from '@/lib/metricas';
import { useTreino } from '@/store/treino';

/**
 * Ficha do exercício — prancha, procedimento e registro.
 *
 * O título deixou de ser centralizado e as etiquetas deixaram de ser pílulas
 * coloridas: viraram uma LINHA DE FICHA, que é como um manual identifica o que
 * está descrevendo. Os passos ganharam numeração na calha e régua entre eles —
 * é um procedimento, e procedimento se lê numerado.
 */
export default function DetalheExercicio() {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = POR_ID[id ?? ''];
  const historico = useTreino((s) => s.historico);
  const ativa = useTreino((s) => s.ativa);
  const addExercicios = useTreino((s) => s.addExercicios);

  if (!ex) {
    return (
      <Tela>
        <Cabecalho esquerda={<BotaoGlifo glifo="voltar" onPress={() => router.back()} />} />
        <Vazio titulo="Exercício não encontrado" />
      </Tela>
    );
  }

  const familia = ex.fam ? familias[ex.fam] : undefined;
  const registros = historicoDoExercicio(historico, ex.id);
  const rec = recordesDoExercicio(historico, ex.id);
  const rotulos = MEDIDA_LABEL[ex.medida];

  const ficha = [GRUPO_LABEL[ex.grupo], EQUIP_LABEL[ex.equip], ex.unilateral ? 'Unilateral' : null]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Tela scroll contentStyle={{ paddingBottom: sp.h4 }}>
      <Cabecalho
        esquerda={<BotaoGlifo glifo="voltar" acessivel="Voltar" onPress={() => router.back()} />}
        direita={
          ativa ? (
            <Pressavel
              haptico="leve"
              onPress={() => {
                addExercicios([ex.id]);
                router.back();
              }}
              accessibilityLabel="Adicionar ao treino"
              style={estilos.addTreino}
            >
              <Glifo nome="mais" tamanho={14} cor={c.azulTexto} />
              <Rotulo cor={c.azulTexto}>Adicionar</Rotulo>
            </Pressavel>
          ) : undefined
        }
        semRegua
      />

      <View style={{ paddingHorizontal: margem.pagina }}>
        <Demo ex={ex} style={estilos.demo} raio={radius.sm} />

        <Tx v="display" style={{ marginTop: sp.xl }}>
          {ex.nome}
        </Tx>
        <Rotulo cor={c.tintaMid} style={{ marginTop: sp.sm }}>
          {ficha}
        </Rotulo>

        {ex.aux?.length ? (
          <Tx v="small" cor={c.tintaFraca} style={{ marginTop: sp.sm }}>
            Também trabalha {ex.aux.map((g) => GRUPO_LABEL[g].toLowerCase()).join(', ')}.
          </Tx>
        ) : null}
      </View>

      {/* Execução */}
      {familia ? (
        <Secao titulo="Como executar">
          {familia.passos.map((p, i) => (
            <View key={i}>
              <View style={estilos.passo}>
                <Tx v="numero" tab cor={c.tintaFantasma} style={{ width: margem.calha }}>
                  {i + 1}
                </Tx>
                <Tx v="body" cor={c.tintaMid} style={{ flex: 1 }}>
                  {p}
                </Tx>
              </View>
              <Regua />
            </View>
          ))}

          <View style={estilos.aviso}>
            <Glifo nome="alerta" tamanho={15} cor={c.vermelho} />
            <Tx v="small" cor={c.tintaMid} style={{ flex: 1 }}>
              {familia.erro}
            </Tx>
          </View>
        </Secao>
      ) : null}

      {/* Recordes: tabela, não grade de cartões. */}
      {rec.totalSeries > 0 ? (
        <Secao titulo="Seus melhores">
          <Marca rotulo="Maior carga" valor={`${fmtNumero(rec.maiorCarga)} ${rotulos.a.toLowerCase()}`} />
          <Marca
            rotulo="Melhor série"
            valor={
              rec.melhorSerie
                ? `${fmtNumero(rec.melhorSerie.peso)} × ${fmtNumero(rec.melhorSerie.reps)}`
                : '—'
            }
          />
          <Marca rotulo="1RM estimado" valor={`${Math.round(rec.melhor1RM)} kg`} nota="estimativa" />
          <Marca rotulo="Séries feitas" valor={String(rec.totalSeries)} />
        </Secao>
      ) : null}

      {/* Histórico */}
      <Secao titulo="Histórico">
        {registros.length === 0 ? (
          <Tx v="small" cor={c.tintaFraca} style={estilos.semHistorico}>
            Você ainda não registrou este exercício.
          </Tx>
        ) : (
          <>
            <CabecaColuna>
              <Rotulo cor={c.tintaMid} style={{ flex: 1 }}>
                Data
              </Rotulo>
              <Rotulo cor={c.tintaMid} style={{ width: 110, textAlign: 'right' }}>
                Séries
              </Rotulo>
            </CabecaColuna>
            {registros.slice(0, 8).map((r, i) => (
              <View key={`${r.sessaoId}-${i}`}>
                <Pressavel
                  onPress={() => router.push(`/sessao/${r.sessaoId}`)}
                  escala={0.995}
                  fundoPressionado={c.fundoBaixo}
                  style={estilos.registro}
                >
                  <View style={{ flex: 1 }}>
                    <Tx v="smallMed">{fmtData(r.data)}</Tx>
                    <Tx v="small" cor={c.tintaFraca} numberOfLines={1}>
                      {r.nomeSessao}
                    </Tx>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {r.series.slice(0, 4).map((s) => (
                      <Tx key={s.id} v="small" tab cor={c.azul}>
                        {fmtNumero(s.peso)} × {fmtNumero(s.reps)}
                      </Tx>
                    ))}
                    {r.series.length > 4 ? (
                      <Rotulo cor={c.tintaFantasma}>+{r.series.length - 4}</Rotulo>
                    ) : null}
                  </View>
                </Pressavel>
                <Regua />
              </View>
            ))}
          </>
        )}
      </Secao>
    </Tela>
  );
}

/** Linha de marca pessoal: rótulo à esquerda, valor tabular à direita. */
function Marca({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  return (
    <View>
      <View style={estilos.marca}>
        <View style={{ flex: 1 }}>
          <Tx v="bodyMed">{rotulo}</Tx>
          {nota ? (
            <Tx v="small" cor={c.tintaFraca}>
              {nota}
            </Tx>
          ) : null}
        </View>
        <Tx v="numeroG" tab>
          {valor}
        </Tx>
      </View>
      <Regua />
    </View>
  );
}

const usarEstilos = criarEstilos((c) => ({
  demo: {
    width: '100%',
    aspectRatio: 1.28,
    marginTop: sp.sm,
  },
  addTreino: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 34,
    paddingHorizontal: sp.md,
    backgroundColor: c.azul,
    borderRadius: radius.sm,
  },
  passo: {
    flexDirection: 'row',
    gap: sp.sm,
    alignItems: 'flex-start',
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  aviso: {
    flexDirection: 'row',
    gap: sp.md,
    marginTop: sp.lg,
    marginHorizontal: margem.pagina,
    padding: sp.md,
    backgroundColor: c.vermelhoSuave,
    borderLeftWidth: 2,
    borderLeftColor: c.vermelho,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  registro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.lg,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  semHistorico: { paddingTop: sp.lg, paddingHorizontal: margem.pagina },
}));
