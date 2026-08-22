import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Botao, BotaoIcone, Rotulo, Tela, Tx } from '@/components/base';
import { Brilho } from '@/components/decor';
import { Miniatura } from '@/components/demo';
import { abrirConfirmacao, abrirMenu } from '@/components/folha';
import { POR_ID } from '@/data/exercicios';
import { GRUPO_LABEL } from '@/data/types';
import { color, radius, sp } from '@/design/tokens';
import { fmtDuracaoCurta, fmtVolume, resumoDaSemana, saudacao, sequenciaDias } from '@/lib/metricas';
import { useTreino, type Rotina } from '@/store/treino';

const INICIAIS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

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
        { texto: 'Iniciar esta rotina', icone: 'play', onPress: () => abrirRotina(r) },
        { texto: 'Editar', icone: 'create-outline', onPress: () => router.push(`/rotina/${r.id}`) },
        {
          texto: 'Apagar rotina',
          icone: 'trash-outline',
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

  return (
    <Tela scroll contentStyle={{ paddingHorizontal: sp.xl }}>
      {/* Semana: sete pontos, o de hoje ganha um anel. */}
      <View style={estilos.semana}>
        <View style={estilos.barraTopo}>
          <BotaoIcone icone="settings-outline" tamanho={30} onPress={() => router.push('/ajustes')} />
        </View>
        <View style={estilos.pontos}>
          {semana.dias.map((feito, i) => (
            <View key={i} style={estilos.diaCol}>
              <View style={[estilos.anelDia, i === hoje && estilos.anelHoje]}>
                <View style={[estilos.ponto, feito && estilos.pontoAtivo]} />
              </View>
              <Tx v="caption" cor={i === hoje ? color.text : feito ? color.textDim : color.textGhost}>
                {INICIAIS[i]}
              </Tx>
            </View>
          ))}
        </View>
        <Tx v="small" cor={color.textFaint} center style={{ marginTop: sp.md }}>
          {semana.treinos === 0
            ? 'Nenhum treino esta semana'
            : `${semana.treinos} ${semana.treinos === 1 ? 'treino' : 'treinos'} · ${fmtVolume(semana.volume)} · ${fmtDuracaoCurta(semana.minutos * 60000)}`}
        </Tx>
      </View>

      {/* Bloco central: a única decisão da tela, com a única luz da tela. */}
      <Animated.View entering={FadeInDown.duration(320)} style={estilos.centro}>
        <Brilho tamanho={420} style={{ top: -70 }} />
        <Tx v="small" cor={color.textFaint} center>
          {saudacao()}
        </Tx>
        <Tx v="display" center style={{ marginTop: sp.xs }}>
          {ativa ? 'Treino em curso' : sequencia > 1 ? `${sequencia} dias seguidos` : 'Bora treinar'}
        </Tx>
        <Tx v="body" cor={color.textFaint} center style={{ marginTop: sp.sm, maxWidth: 280 }}>
          {ativa
            ? 'Você tem um treino aberto agora.'
            : rotinas.length
              ? 'Escolha uma rotina abaixo ou monte um treino do zero.'
              : 'Comece por um modelo pronto ou monte o seu do zero.'}
        </Tx>

        <Botao
          titulo={ativa ? 'Continuar treino' : 'Iniciar treino'}
          icone={ativa ? 'play' : 'add'}
          grande
          onPress={comecar}
          style={{ marginTop: sp.xxl, alignSelf: 'stretch' }}
        />
      </Animated.View>

      {/* Rotinas */}
      <View style={estilos.cabecalhoSecao}>
        <Rotulo>Rotinas</Rotulo>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm }}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.push('/modelos');
            }}
            style={({ pressed }) => [estilos.pilulaModelos, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="sparkles" size={12} color={color.accent} />
            <Tx v="smallMed" cor={color.textDim}>
              Modelos
            </Tx>
          </Pressable>
          <BotaoIcone icone="add" tamanho={30} onPress={() => router.push('/rotina/nova')} />
        </View>
      </View>

      {rotinas.length === 0 ? (
        <View style={{ gap: sp.sm }}>
          <Pressable
            onPress={() => router.push('/modelos')}
            style={({ pressed }) => [estilos.cartaoModelos, pressed && { opacity: 0.8 }]}
          >
            <View style={estilos.iconeModelos}>
              <Ionicons name="sparkles" size={16} color={color.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Tx v="bodyMed">Começar por um modelo</Tx>
              <Tx v="small" cor={color.textFaint}>
                Upper · Lower, Push · Pull · Legs, ABC e mais
              </Tx>
            </View>
            <Ionicons name="chevron-forward" size={16} color={color.textGhost} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/rotina/nova')}
            style={({ pressed }) => [estilos.rotinaVazia, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="add" size={18} color={color.textFaint} />
            <Tx v="bodyMed" cor={color.textDim}>
              Criar do zero
            </Tx>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: sp.sm }}>
          {rotinas.map((r, i) => (
            <Animated.View key={r.id} entering={FadeInDown.delay(60 + i * 40).duration(280)}>
              <CartaoRotina
                rotina={r}
                onPress={() => abrirRotina(r)}
                onLongPress={() => opcoesRotina(r)}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </Tela>
  );
}

function CartaoRotina({
  rotina,
  onPress,
  onLongPress,
}: {
  rotina: Rotina;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const series = rotina.itens.reduce((t, i) => t + i.series, 0);
  const exs = rotina.itens.map((i) => POR_ID[i.exId]).filter(Boolean);
  const grupos = [...new Set(exs.map((e) => e.grupo))].map((g) => GRUPO_LABEL[g]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={({ pressed }) => [estilos.rotina, pressed && { backgroundColor: color.surfaceHi }]}
    >
      <View style={estilos.pilha}>
        {exs.slice(0, 3).map((e, i) => (
          <View key={`${e.id}-${i}`} style={[estilos.pilhaItem, i > 0 && { marginLeft: -12 }]}>
            <Miniatura ex={e} tamanho={34} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Tx v="heading" numberOfLines={1}>
          {rotina.nome}
        </Tx>
        <Tx v="small" cor={color.textFaint} numberOfLines={1}>
          {rotina.itens.length} exercícios · {series} séries
          {grupos.length ? ` · ${grupos.slice(0, 3).join(', ')}` : ''}
        </Tx>
      </View>
      <View style={estilos.playRotina}>
        <Ionicons name="play" size={13} color={color.accent} style={{ marginLeft: 2 }} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  semana: { paddingTop: sp.xs, paddingBottom: sp.sm },
  barraTopo: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: sp.sm },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: sp.md },
  diaCol: { alignItems: 'center', gap: sp.sm },
  anelDia: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'transparent',
  },
  anelHoje: { borderColor: color.accentLine },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
  },
  pontoAtivo: { backgroundColor: color.accent, borderColor: color.accent },
  centro: {
    alignItems: 'center',
    paddingTop: sp.h3,
    paddingBottom: sp.h3,
  },
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.md,
    paddingLeft: sp.xs,
  },
  pilulaModelos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingHorizontal: sp.md,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
  },
  rotina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    backgroundColor: color.bgSoft,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
    paddingVertical: sp.lg,
    paddingLeft: sp.lg,
    paddingRight: sp.md,
  },
  pilha: { flexDirection: 'row', alignItems: 'center' },
  pilhaItem: {
    borderWidth: 2,
    borderColor: color.bgSoft,
    borderRadius: 13,
  },
  // Discreto de propósito: o único verde-limão sólido da tela é o botão principal.
  playRotina: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.accentSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartaoModelos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    padding: sp.lg,
    borderRadius: radius.xl,
    backgroundColor: color.bgSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentLine,
  },
  iconeModelos: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.accentSoft,
  },
  rotinaVazia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.sm,
    height: 56,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
    borderStyle: 'dashed',
  },
});
