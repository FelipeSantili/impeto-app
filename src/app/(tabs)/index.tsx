import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Botao, BotaoGlifo, Pressavel, Regua, Rotulo, Secao, Tela, Tx } from '@/components/base';
import { Miniatura } from '@/components/demo';
import { abrirConfirmacao, abrirMenu } from '@/components/folha';
import { Glifo } from '@/components/glifos';
import { POR_ID } from '@/data/exercicios';
import { GRUPO_LABEL } from '@/data/types';
import { color, margem, sp, traco } from '@/design/tokens';
import { fmtDuracaoCurta, fmtVolume, resumoDaSemana, sequenciaDias } from '@/lib/metricas';
import { useTreino, type Rotina } from '@/store/treino';

const INICIAIS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function dataDeHoje() {
  const d = new Date();
  const s = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  // "sex., 22 de ago." → "sex 22 ago"
  return s.replace(/\./g, '').replace(' de ', ' ');
}

/**
 * Início — a primeira página do caderno.
 *
 * O que havia antes: saudação centralizada, título de 42px, sete bolinhas e um
 * halo roxo atrás do botão. Tudo simétrico, tudo centralizado, nenhuma tensão.
 *
 * Agora a página abre como abre um livro de registro: marca e data na mesma
 * linha de base, a SEMANA como linha pautada de sete células com as iniciais
 * por cabeçalho de coluna, e a ação primária como barra cheia de tinta. As
 * rotinas são linhas de livro-caixa — ordinal na margem, nome, e a contagem
 * alinhada à direita numa coluna tabular.
 */
export default function Inicio() {
  const rotinas = useTreino((s) => s.rotinas);
  const historico = useTreino((s) => s.historico);
  const ativa = useTreino((s) => s.ativa);
  const iniciarVazio = useTreino((s) => s.iniciarVazio);
  const iniciarDeRotina = useTreino((s) => s.iniciarDeRotina);
  const apagarRotina = useTreino((s) => s.apagarRotina);

  const semana = resumoDaSemana(historico);
  const sequencia = sequenciaDias(historico);
  const hoje = (new Date().getDay() + 6) % 7;

  function comecar() {
    if (!ativa) iniciarVazio();
    router.push('/treino');
  }

  function abrirRotina(r: Rotina) {
    if (ativa) {
      abrirConfirmacao({
        titulo: 'Treino em andamento',
        descricao: 'Finalize ou descarte o treino atual antes de começar outro.',
        confirmar: 'Ver treino',
        onConfirmar: () => router.push('/treino'),
      });
      return;
    }
    iniciarDeRotina(r.id);
    router.push('/treino');
  }

  function opcoesRotina(r: Rotina) {
    abrirMenu({
      titulo: r.nome,
      subtitulo: `${r.itens.length} exercícios`,
      opcoes: [
        { texto: 'Iniciar esta rotina', glifo: 'play', onPress: () => abrirRotina(r) },
        { texto: 'Editar', glifo: 'lista', onPress: () => router.push(`/rotina/${r.id}`) },
        {
          texto: 'Apagar rotina',
          glifo: 'lixo',
          destrutiva: true,
          onPress: () =>
            abrirConfirmacao({
              titulo: 'Apagar rotina?',
              descricao: `"${r.nome}" será removida. Os treinos já registrados continuam no histórico.`,
              confirmar: 'Apagar',
              destrutiva: true,
              onConfirmar: () => apagarRotina(r.id),
            }),
        },
      ],
    });
  }

  const resumo =
    semana.treinos === 0
      ? 'Nenhum treino esta semana'
      : `${semana.treinos} ${semana.treinos === 1 ? 'treino' : 'treinos'} · ${fmtVolume(semana.volume)} · ${fmtDuracaoCurta(semana.minutos * 60000)}`;

  return (
    <Tela scroll>
      {/* Cabeçalho da página: marca à esquerda, data à direita, mesma base. */}
      <View style={estilos.marca}>
        <Glifo nome="raio" tamanho={16} cor={color.tinta} />
        <Rotulo cor={color.tinta} style={estilos.marcaTexto}>
          Ímpeto
        </Rotulo>
        <View style={{ flex: 1 }} />
        <Rotulo cor={color.tintaFraca}>{dataDeHoje()}</Rotulo>
        <BotaoGlifo
          glifo="ajustes"
          tamanho={32}
          acessivel="Ajustes"
          onPress={() => router.push('/ajustes')}
        />
      </View>
      <Regua peso="forte" cor={color.tinta} style={{ marginHorizontal: margem.pagina }} />

      <Secao
        titulo="Semana"
        espaco={sp.xxl}
        direita={sequencia > 1 ? <Rotulo cor={color.azul}>{sequencia} dias seguidos</Rotulo> : null}
      >
        <LinhaSemana dias={semana.dias} hoje={hoje} />
        <Tx v="small" cor={color.tintaMid} style={estilos.resumo}>
          {resumo}
        </Tx>
      </Secao>

      {/* A única decisão da tela. Barra cheia, largura total, canto reto. */}
      <View style={estilos.acao}>
        <Tx v="display">{ativa ? 'Treino em curso' : 'Registrar treino'}</Tx>
        <Tx v="body" cor={color.tintaMid} style={{ marginTop: sp.xs, maxWidth: 320 }}>
          {ativa
            ? 'Você tem um treino aberto agora.'
            : rotinas.length
              ? 'Escolha uma rotina abaixo ou monte um treino do zero.'
              : 'Comece por um modelo pronto ou monte o seu do zero.'}
        </Tx>
        <Botao
          titulo={ativa ? 'Continuar treino' : 'Iniciar treino'}
          glifo={ativa ? 'play' : 'mais'}
          grande
          onPress={comecar}
          style={{ marginTop: sp.xl }}
        />
      </View>

      <Secao
        titulo="Rotinas"
        direita={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
            <Pressavel
              haptico="selecao"
              onPress={() => router.push('/modelos')}
              hitSlop={10}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              <Rotulo cor={color.azul}>Modelos</Rotulo>
              <Glifo nome="avancar" tamanho={11} cor={color.azul} />
            </Pressavel>
            <BotaoGlifo
              glifo="mais"
              tamanho={28}
              acessivel="Criar rotina"
              onPress={() => router.push('/rotina/nova')}
            />
          </View>
        }
      >
        {rotinas.length === 0 ? (
          <View>
            <Pressavel
              onPress={() => router.push('/modelos')}
              fundoPressionado={color.papelBaixo}
              escala={0.995}
              style={estilos.linhaVazia}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Tx v="bodyMed">Começar por um modelo</Tx>
                <Tx v="small" cor={color.tintaFraca}>
                  Upper · Lower, Push · Pull · Legs, ABC e mais
                </Tx>
              </View>
              <Glifo nome="avancar" tamanho={14} cor={color.tintaFantasma} />
            </Pressavel>
            <Regua />
            <Pressavel
              onPress={() => router.push('/rotina/nova')}
              fundoPressionado={color.papelBaixo}
              escala={0.995}
              style={estilos.linhaVazia}
            >
              <Tx v="bodyMed" cor={color.tintaMid} style={{ flex: 1 }}>
                Criar do zero
              </Tx>
              <Glifo nome="mais" tamanho={14} cor={color.tintaFantasma} />
            </Pressavel>
            <Regua />
          </View>
        ) : (
          <View>
            {rotinas.map((r, i) => (
              <LinhaRotina
                key={r.id}
                rotina={r}
                numero={i + 1}
                onPress={() => abrirRotina(r)}
                onLongPress={() => opcoesRotina(r)}
              />
            ))}
          </View>
        )}
      </Secao>
    </Tela>
  );
}

/**
 * A semana como linha pautada.
 *
 * Sete células de largura igual, separadas por régua fina, com as iniciais por
 * cabeçalho de coluna. Um dia treinado recebe um BLOCO DE TINTA AZUL — azul é
 * o que você escreveu, a mesma regra da tabela de séries. Hoje é a célula
 * emoldurada. Nenhum ponto, nenhum anel.
 */
function LinhaSemana({ dias, hoje }: { dias: boolean[]; hoje: number }) {
  return (
    <View>
      <View style={estilos.semanaCabeca}>
        {INICIAIS.map((letra, i) => (
          <View key={`${letra}-${i}`} style={estilos.celula}>
            <Rotulo cor={i === hoje ? color.tinta : color.tintaFraca}>{letra}</Rotulo>
          </View>
        ))}
      </View>
      <Regua peso="normal" cor={color.reguaMid} />
      <View style={estilos.semanaLinha}>
        {dias.map((feito, i) => (
          <View
            key={i}
            style={[
              estilos.celula,
              estilos.celulaAlta,
              // Régua entre as células: sem elas a fileira não lê como linha de
              // tabela, e o quadro de "hoje" fica pendurado no vazio.
              i > 0 && estilos.celulaDivisa,
              i === hoje && estilos.celulaHoje,
            ]}
          >
            {feito ? <View style={estilos.blocoFeito} /> : null}
          </View>
        ))}
      </View>
      <Regua />
    </View>
  );
}

function LinhaRotina({
  rotina,
  numero,
  onPress,
  onLongPress,
}: {
  rotina: Rotina;
  numero: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const series = rotina.itens.reduce((t, i) => t + i.series, 0);
  const exs = rotina.itens.map((i) => POR_ID[i.exId]).filter(Boolean);
  const grupos = [...new Set(exs.map((e) => e.grupo))].map((g) => GRUPO_LABEL[g]);

  return (
    <View>
      <Pressavel
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={280}
        escala={0.995}
        fundoPressionado={color.papelBaixo}
        accessibilityRole="button"
        accessibilityLabel={`${rotina.nome}, ${rotina.itens.length} exercícios`}
        style={estilos.rotina}
      >
        <Tx v="numero" tab cor={color.tintaFantasma} style={{ width: margem.calha }}>
          {numero}
        </Tx>
        <View style={estilos.pilha}>
          {exs.slice(0, 3).map((e, i) => (
            <View key={`${e.id}-${i}`} style={i > 0 ? { marginLeft: -10 } : null}>
              <Miniatura ex={e} tamanho={32} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Tx v="bodyMed" numberOfLines={1}>
            {rotina.nome}
          </Tx>
          <Tx v="small" cor={color.tintaFraca} numberOfLines={1}>
            {grupos.slice(0, 3).join(' · ') || 'Sem exercícios'}
          </Tx>
        </View>
        {/* Coluna tabular à direita: sempre no mesmo x, sempre alinhada. */}
        <View style={{ alignItems: 'flex-end' }}>
          <Tx v="numero" tab>
            {rotina.itens.length}
            <Tx v="small" cor={color.tintaFraca}>
              {' '}
              ex
            </Tx>
          </Tx>
          <Tx v="small" tab cor={color.tintaFraca}>
            {series} séries
          </Tx>
        </View>
      </Pressavel>
      <Regua />
    </View>
  );
}

const estilos = StyleSheet.create({
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.sm,
    minHeight: 40,
  },
  marcaTexto: { fontSize: 14, letterSpacing: 3.4 },
  semanaCabeca: { flexDirection: 'row', paddingHorizontal: margem.pagina, paddingBottom: sp.xs },
  semanaLinha: { flexDirection: 'row', paddingHorizontal: margem.pagina },
  celula: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  celulaAlta: { height: 40 },
  celulaDivisa: { borderLeftWidth: traco.fina, borderLeftColor: color.regua },
  celulaHoje: {
    borderWidth: traco.normal,
    borderColor: color.tinta,
    borderTopWidth: 0,
  },
  blocoFeito: {
    width: 16,
    height: 16,
    backgroundColor: color.azul,
    borderRadius: 1,
  },
  resumo: { paddingHorizontal: margem.pagina, paddingTop: sp.sm },
  acao: { paddingHorizontal: margem.pagina, paddingTop: sp.h2 },
  rotina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: margem.pagina,
  },
  pilha: { flexDirection: 'row', alignItems: 'center' },
  linhaVazia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    minHeight: 60,
    paddingHorizontal: margem.pagina,
  },
});
