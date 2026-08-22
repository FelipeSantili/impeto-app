import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoIcone, Rotulo, Tx } from '@/components/base';
import { abrirConfirmacao, abrirMenu } from '@/components/folha';
import { color, radius, sp } from '@/design/tokens';
import { exportar, importar } from '@/lib/backup';
import { abrirAjustesSaude, pedirPermissoes, statusHealthConnect, type StatusSaude } from '@/lib/saude';
import { useCinta } from '@/store/cinta';
import { useTreino } from '@/store/treino';

const TEXTO_SAUDE: Record<StatusSaude, string> = {
  indisponivel: 'Não disponível neste aparelho',
  precisa_instalar: 'Instale o app Health Connect',
  sem_permissao: 'Toque para autorizar',
  pronto: 'Conectado',
};

export default function Ajustes() {
  const insets = useSafeAreaInsets();
  const [saude, setSaude] = useState<StatusSaude | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cinta = useCinta();
  const rotinas = useTreino((s) => s.rotinas.length);
  const treinos = useTreino((s) => s.historico.length);

  const conferirSaude = useCallback(() => {
    statusHealthConnect().then(setSaude);
  }, []);

  useEffect(conferirSaude, [conferirSaude]);

  // Sair da tela com uma busca de Bluetooth rodando gastaria bateria à toa.
  useEffect(() => () => cinta.pararBusca(), [cinta]);

  async function tocarSaude() {
    if (saude === 'precisa_instalar' || saude === 'indisponivel') {
      abrirAjustesSaude();
      return;
    }
    if (saude === 'sem_permissao') {
      setSaude(await pedirPermissoes());
      return;
    }
    abrirAjustesSaude();
  }

  function menuCinta() {
    if (cinta.estado === 'conectada') {
      abrirConfirmacao({
        titulo: 'Desconectar a cinta?',
        descricao: `${cinta.dispositivo?.nome ?? 'A cinta'} deixará de enviar a frequência cardíaca.`,
        confirmar: 'Desconectar',
        destrutiva: true,
        onConfirmar: () => cinta.desconectar(),
      });
      return;
    }
    cinta.procurar();
  }

  async function aoExportar() {
    setOcupado(true);
    const r = await exportar();
    setOcupado(false);
    if (!r.ok && r.erro) {
      abrirConfirmacao({ titulo: 'Não deu certo', descricao: r.erro, confirmar: 'Entendi', onConfirmar: () => {} });
    }
  }

  async function aoImportar() {
    setOcupado(true);
    const r = await importar();
    setOcupado(false);
    if (r.erro) {
      abrirConfirmacao({ titulo: 'Não deu certo', descricao: r.erro, confirmar: 'Entendi', onConfirmar: () => {} });
      return;
    }
    if (r.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      abrirConfirmacao({
        titulo: 'Backup importado',
        descricao: `${r.treinos} treinos e ${r.rotinas} rotinas adicionados. Nada foi apagado.`,
        confirmar: 'Pronto',
        onConfirmar: () => {},
      });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.sm }]}>
        <BotaoIcone icone="chevron-back" onPress={() => router.back()} />
        <Tx v="bodyMed" style={{ flex: 1, textAlign: 'center' }}>
          Ajustes
        </Tx>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: sp.xl, paddingBottom: insets.bottom + sp.h2 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Conexões */}
        <Rotulo style={{ marginTop: sp.md, marginBottom: sp.md }}>Conexões</Rotulo>

        <Animated.View entering={FadeInDown.duration(280)}>
          <Linha
            icone="heart-outline"
            titulo="Health Connect"
            subtitulo={
              saude === null
                ? 'Verificando…'
                : `${TEXTO_SAUDE[saude]}${saude === 'pronto' ? ' · lê o relógio depois do treino' : ''}`
            }
            ativo={saude === 'pronto'}
            onPress={tocarSaude}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(280)}>
          <Linha
            icone="bluetooth-outline"
            titulo="Cinta cardíaca"
            subtitulo={
              cinta.estado === 'conectada'
                ? `${cinta.dispositivo?.nome} · ${cinta.bpm ?? '--'} bpm`
                : cinta.estado === 'procurando'
                  ? 'Procurando…'
                  : cinta.estado === 'conectando'
                    ? 'Conectando…'
                    : cinta.erro ?? 'Toque para procurar · frequência ao vivo'
            }
            ativo={cinta.estado === 'conectada'}
            carregando={cinta.estado === 'procurando' || cinta.estado === 'conectando'}
            onPress={menuCinta}
          />
        </Animated.View>

        {/* Cintas encontradas */}
        {cinta.estado === 'procurando' && cinta.encontradas.length > 0 ? (
          <Animated.View entering={FadeIn.duration(240)} style={estilos.lista}>
            {cinta.encontradas.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  cinta.conectar(d.id);
                }}
                style={({ pressed }) => [estilos.dispositivo, pressed && { opacity: 0.6 }]}
              >
                <Ionicons name="pulse" size={15} color={color.accent} />
                <Tx v="smallMed" style={{ flex: 1 }} numberOfLines={1}>
                  {d.nome}
                </Tx>
                <Tx v="caption" cor={color.textFaint}>
                  CONECTAR
                </Tx>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        {Platform.OS === 'android' ? (
          <Tx v="small" cor={color.textGhost} style={{ marginTop: sp.md }}>
            O Redmi Watch fala um protocolo próprio e não aparece na busca de cintas. Os dados
            dele chegam pelo Health Connect, depois que o Mi Fitness sincroniza.
          </Tx>
        ) : null}

        {/* Backup */}
        <Rotulo style={{ marginTop: sp.h1, marginBottom: sp.md }}>Backup</Rotulo>

        <Animated.View entering={FadeInDown.delay(120).duration(280)}>
          <Linha
            icone="download-outline"
            titulo="Exportar treinos"
            subtitulo={`${treinos} treinos e ${rotinas} rotinas num arquivo`}
            carregando={ocupado}
            onPress={aoExportar}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(280)}>
          <Linha
            icone="cloud-upload-outline"
            titulo="Importar backup"
            subtitulo="Soma ao que já existe, sem apagar nada"
            carregando={ocupado}
            onPress={aoImportar}
          />
        </Animated.View>

        <Tx v="small" cor={color.textGhost} style={{ marginTop: sp.md }}>
          Seus dados ficam só neste aparelho. O backup é um arquivo que você guarda onde quiser.
        </Tx>

        {/* Sobre */}
        <Rotulo style={{ marginTop: sp.h1, marginBottom: sp.md }}>Sobre</Rotulo>
        <Animated.View entering={FadeInDown.delay(240).duration(280)}>
          <Linha
            icone="information-circle-outline"
            titulo="Ímpeto"
            subtitulo="299 exercícios · dados locais"
            onPress={() =>
              abrirMenu({
                titulo: 'Ímpeto',
                subtitulo: 'Registro de treino de academia',
                opcoes: [
                  {
                    texto: 'Demonstrações: free-exercise-db',
                    icone: 'image-outline',
                    onPress: () => {},
                  },
                ],
              })
            }
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function Linha({
  icone,
  titulo,
  subtitulo,
  ativo,
  carregando,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  subtitulo: string;
  ativo?: boolean;
  carregando?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={carregando}
      style={({ pressed }) => [estilos.linha, pressed && { backgroundColor: color.surfaceHi }]}
    >
      <View style={[estilos.icone, ativo && estilos.iconeAtivo]}>
        <Ionicons name={icone} size={17} color={ativo ? color.accent : color.textDim} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Tx v="bodyMed" numberOfLines={1}>
          {titulo}
        </Tx>
        <Tx v="small" cor={ativo ? color.accent : color.textFaint} numberOfLines={2}>
          {subtitulo}
        </Tx>
      </View>
      {carregando ? (
        <ActivityIndicator size="small" color={color.textDim} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={color.textGhost} />
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp.md,
    paddingBottom: sp.sm,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    padding: sp.lg,
    borderRadius: radius.xl,
    backgroundColor: color.bgSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.line,
    marginBottom: sp.sm,
  },
  icone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceHi,
  },
  iconeAtivo: { backgroundColor: color.accentSoft },
  lista: { gap: sp.xs, marginBottom: sp.sm },
  dispositivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingHorizontal: sp.lg,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.accentLine,
  },
});
