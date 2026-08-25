import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Pressavel, Regua, Rotulo, Secao, Tx } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { abrirConfirmacao, abrirEscolhaExercicio } from '@/components/folha';
import { Glifo } from '@/components/glifos';
import { POR_ID } from '@/data/exercicios';
import { EQUIP_LABEL, type Exercicio } from '@/data/types';
import { finalidadesDe, variacoesDe, type Variacao } from '@/data/variacoes';
import { criarEstilos, usarPaleta } from '@/design/tema';
import { margem, radius, sp, traco } from '@/design/tokens';
import { useTreino } from '@/store/treino';

/** Quantas variações a ficha mostra antes de pedir para abrir o resto. */
const LIMITE = 5;

/**
 * Nota da variação: o equipamento, e o quanto ela se aproxima do original.
 *
 * "Mesma execução" é a família de movimento — o substituto mais próximo que
 * existe. "Mesma finalidade" treina o mesmo movimento por outro caminho. Só
 * quando as colunas de registro mudam (de kg × reps para km × min, por
 * exemplo) o aviso aparece, porque aí a troca muda o que você digita.
 */
export function notaDaVariacao(v: Variacao): string {
  return [
    EQUIP_LABEL[v.ex.equip],
    v.mesmaExecucao ? 'mesma execução' : 'mesma finalidade',
    v.mesmaMedida ? null : 'muda o registro',
  ]
    .filter(Boolean)
    .join('  ·  ');
}

/**
 * Folha de troca: as variações do exercício, da mais próxima à mais distante.
 *
 * Usada pelo treino em andamento e pelo editor de rotina — os dois têm a mesma
 * pergunta a fazer e por isso mostram a mesma folha.
 */
export function abrirTrocaExercicio({
  ex,
  subtitulo,
  onEscolher,
  verTodos,
}: {
  ex: Exercicio;
  subtitulo?: string;
  onEscolher: (exId: string) => void;
  /** Escape para o catálogo inteiro, quando nenhuma variação serve. */
  verTodos?: () => void;
}) {
  abrirEscolhaExercicio({
    titulo: `Trocar ${ex.nome}`,
    subtitulo,
    itens: variacoesDe(ex.id).map((v) => ({ exId: v.ex.id, nota: notaDaVariacao(v) })),
    vazio: 'Este exercício não tem variação catalogada.',
    rodape: verTodos ? { texto: 'Escolher outro exercício', onPress: verTodos } : undefined,
    onEscolher,
  });
}

/**
 * Variações na ficha do exercício.
 *
 * É a resposta à pergunta que se faz de pé, na academia, com a máquina
 * ocupada: o que serve no lugar disto. A lista não é decoração — quando existe
 * um treino aberto com este exercício, cada linha vem com o botão de troca, e
 * a substituição acontece na hora, na rotina de hoje.
 */
export function SecaoVariacoes({ ex, uid }: { ex: Exercicio; uid?: string }) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  const [todas, setTodas] = useState(false);

  const ativa = useTreino((s) => s.ativa);
  const substituir = useTreino((s) => s.substituirExercicio);

  const variacoes = variacoesDe(ex.id);
  if (!variacoes.length) return null;

  /*
   * O alvo da troca: a linha do treino aberto que este exercício ocupa.
   *
   * Vem por parâmetro quando você chegou aqui pelo próprio treino — é o que
   * permite trocar a linha certa quando o mesmo exercício aparece duas vezes.
   * Sem ele, vale a primeira linha que usa este exercício.
   */
  const alvo = ativa?.exercicios.find((e) => (uid ? e.uid === uid : e.exId === ex.id));
  const atual = alvo ? POR_ID[alvo.exId] : undefined;
  const finalidade = finalidadesDe(ex)[0];
  const mostradas = todas ? variacoes : variacoes.slice(0, LIMITE);

  function trocar(destino: Exercicio) {
    if (!alvo) return;
    const feitas = alvo.series.filter((s) => s.feita).length;
    const nomeAtual = atual?.nome ?? 'o exercício atual';
    abrirConfirmacao({
      titulo: 'Trocar no treino?',
      descricao:
        `${destino.nome} entra no lugar de ${nomeAtual}, com as séries em branco.` +
        (feitas > 0
          ? ` As ${feitas === 1 ? 'série já marcada' : `${feitas} séries já marcadas`} continuam registradas em ${nomeAtual}.`
          : ''),
      confirmar: 'Trocar',
      onConfirmar: () => {
        substituir(alvo.uid, destino.id);
        // Volta para onde a troca acontece: ver a linha mudar é o recibo.
        if (router.canGoBack()) router.back();
      },
    });
  }

  return (
    <Secao titulo="Variações">
      <Tx v="small" cor={c.tintaMid} style={estilos.prosa}>
        {finalidade ? `Mesma finalidade: ${finalidade.nome}. ` : ''}
        {alvo
          ? 'Toque para ver a ficha, ou use o botão de troca para pôr a variação no lugar deste exercício no treino de hoje.'
          : 'Servem no lugar deste exercício quando a máquina está ocupada ou o estímulo precisa variar.'}
      </Tx>

      {mostradas.map((v) => (
        <View key={v.ex.id}>
          <View style={estilos.linha}>
            <Pressavel
              onPress={() => router.push(`/exercicio/${v.ex.id}${uid ? `?uid=${uid}` : ''}`)}
              escala={0.995}
              fundoPressionado={c.fundoBaixo}
              accessibilityLabel={`${v.ex.nome}. Ver ficha.`}
              style={estilos.linhaToque}
            >
              <Miniatura ex={v.ex} tamanho={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Tx v="bodyMed" numberOfLines={1}>
                  {v.ex.nome}
                </Tx>
                <Tx
                  v="small"
                  cor={v.mesmaExecucao ? c.tintaMid : c.tintaFraca}
                  numberOfLines={1}
                >
                  {notaDaVariacao(v)}
                </Tx>
              </View>
              {alvo ? null : <Glifo nome="avancar" tamanho={14} cor={c.tintaFantasma} />}
            </Pressavel>

            {alvo ? (
              <Pressavel
                haptico="leve"
                hitSlop={8}
                onPress={() => trocar(v.ex)}
                accessibilityLabel={`Trocar por ${v.ex.nome} no treino`}
                style={estilos.troca}
              >
                <Glifo nome="trocar" tamanho={14} cor={c.tinta} />
                <Rotulo cor={c.tinta}>Trocar</Rotulo>
              </Pressavel>
            ) : null}
          </View>
          <Regua />
        </View>
      ))}

      {!todas && variacoes.length > LIMITE ? (
        <Pressavel
          haptico="leve"
          escala={0.995}
          fundoPressionado={c.fundoBaixo}
          onPress={() => setTodas(true)}
          style={estilos.mais}
        >
          <Glifo nome="baixo" tamanho={13} cor={c.tintaMid} />
          <Rotulo cor={c.tintaMid}>Mostrar todas as {variacoes.length}</Rotulo>
        </Pressavel>
      ) : null}
    </Secao>
  );
}

const usarEstilos = criarEstilos((c) => ({
  prosa: { paddingTop: sp.md, paddingHorizontal: margem.pagina },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: margem.pagina,
  },
  linhaToque: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  // Caixa de contorno, como a de marcar série: é ação, não pílula.
  troca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: sp.sm,
    marginLeft: sp.sm,
    borderWidth: traco.normal,
    borderColor: c.reguaForte,
    borderRadius: radius.sm,
  },
  mais: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    height: 46,
    paddingHorizontal: margem.pagina,
  },
}));
