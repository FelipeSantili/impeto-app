import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { create } from 'zustand';
import { Tx } from '@/components/base';
import { color, radius, sp, type } from '@/design/tokens';

export interface OpcaoMenu {
  texto: string;
  icone?: keyof typeof Ionicons.glyphMap;
  destrutiva?: boolean;
  onPress: () => void;
}

interface ConfigMenu {
  titulo?: string;
  subtitulo?: string;
  opcoes: OpcaoMenu[];
}

interface ConfigPrompt {
  titulo: string;
  descricao?: string;
  valor?: string;
  placeholder?: string;
  confirmar?: string;
  onConfirmar: (valor: string) => void;
}

interface ConfigConfirma {
  titulo: string;
  descricao?: string;
  confirmar: string;
  destrutiva?: boolean;
  onConfirmar: () => void;
}

interface EstadoFolha {
  menu: ConfigMenu | null;
  prompt: ConfigPrompt | null;
  confirma: ConfigConfirma | null;
  fechar: () => void;
}

const useFolha = create<EstadoFolha>((set) => ({
  menu: null,
  prompt: null,
  confirma: null,
  fechar: () => set({ menu: null, prompt: null, confirma: null }),
}));

/**
 * Folhas modais imperativas.
 *
 * Substituem `Alert` porque o Android limita alertas nativos a três botões — e
 * vários menus deste app têm mais do que isso. Também mantêm o mesmo visual nas
 * duas plataformas.
 */
export const abrirMenu = (c: ConfigMenu) => useFolha.setState({ menu: c });
export const abrirPrompt = (c: ConfigPrompt) => useFolha.setState({ prompt: c });
export const abrirConfirmacao = (c: ConfigConfirma) => useFolha.setState({ confirma: c });

export function Folhas() {
  const { menu, prompt, confirma, fechar } = useFolha();
  const visivel = !!(menu || prompt || confirma);

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={fechar}
    >
      {visivel ? (
        <View style={estilos.raiz}>
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
            <Pressable style={estilos.fundo} onPress={fechar} />
          </Animated.View>

          <Animated.View
            entering={SlideInDown.duration(240)}
            exiting={SlideOutDown.duration(180)}
            style={estilos.folha}
          >
            <View style={estilos.puxador} />
            {menu ? <CorpoMenu config={menu} fechar={fechar} /> : null}
            {prompt ? <CorpoPrompt config={prompt} fechar={fechar} /> : null}
            {confirma ? <CorpoConfirma config={confirma} fechar={fechar} /> : null}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

function CorpoMenu({ config, fechar }: { config: ConfigMenu; fechar: () => void }) {
  return (
    <>
      {config.titulo ? (
        <View style={estilos.cabecalho}>
          <Tx v="heading" center numberOfLines={2}>
            {config.titulo}
          </Tx>
          {config.subtitulo ? (
            <Tx v="small" cor={color.textFaint} center>
              {config.subtitulo}
            </Tx>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 2 }}>
        {config.opcoes.map((o) => (
          <Pressable
            key={o.texto}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              fechar();
              // Deixa a folha sair de cena antes de a ação abrir outra tela.
              setTimeout(o.onPress, 120);
            }}
            style={({ pressed }) => [estilos.opcao, pressed && { backgroundColor: color.surfaceHi }]}
          >
            {o.icone ? (
              <Ionicons
                name={o.icone}
                size={18}
                color={o.destrutiva ? color.danger : color.textDim}
              />
            ) : null}
            <Tx v="bodyMed" cor={o.destrutiva ? color.danger : color.text}>
              {o.texto}
            </Tx>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={fechar} style={({ pressed }) => [estilos.cancelar, pressed && { opacity: 0.6 }]}>
        <Tx v="bodyMed" cor={color.textDim}>
          Cancelar
        </Tx>
      </Pressable>
    </>
  );
}

function CorpoPrompt({ config, fechar }: { config: ConfigPrompt; fechar: () => void }) {
  const [valor, setValor] = useState(config.valor ?? '');
  useEffect(() => setValor(config.valor ?? ''), [config]);

  function confirmar() {
    fechar();
    setTimeout(() => config.onConfirmar(valor.trim()), 100);
  }

  return (
    <>
      <View style={estilos.cabecalho}>
        <Tx v="heading" center>
          {config.titulo}
        </Tx>
        {config.descricao ? (
          <Tx v="small" cor={color.textFaint} center>
            {config.descricao}
          </Tx>
        ) : null}
      </View>

      <TextInput
        value={valor}
        onChangeText={setValor}
        placeholder={config.placeholder}
        placeholderTextColor={color.textGhost}
        style={estilos.campo}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={confirmar}
      />

      <View style={estilos.duplo}>
        <Pressable onPress={fechar} style={({ pressed }) => [estilos.botaoSuave, pressed && { opacity: 0.6 }]}>
          <Tx v="bodyMed" cor={color.textDim}>
            Cancelar
          </Tx>
        </Pressable>
        <Pressable onPress={confirmar} style={({ pressed }) => [estilos.botaoForte, pressed && { opacity: 0.8 }]}>
          <Tx v="bodyMed" cor={color.bg}>
            {config.confirmar ?? 'Salvar'}
          </Tx>
        </Pressable>
      </View>
    </>
  );
}

function CorpoConfirma({ config, fechar }: { config: ConfigConfirma; fechar: () => void }) {
  return (
    <>
      <View style={estilos.cabecalho}>
        <Tx v="heading" center>
          {config.titulo}
        </Tx>
        {config.descricao ? (
          <Tx v="small" cor={color.textFaint} center style={{ maxWidth: 300 }}>
            {config.descricao}
          </Tx>
        ) : null}
      </View>

      <View style={estilos.duplo}>
        <Pressable onPress={fechar} style={({ pressed }) => [estilos.botaoSuave, pressed && { opacity: 0.6 }]}>
          <Tx v="bodyMed" cor={color.textDim}>
            Cancelar
          </Tx>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            fechar();
            setTimeout(config.onConfirmar, 100);
          }}
          style={({ pressed }) => [
            config.destrutiva ? estilos.botaoPerigo : estilos.botaoForte,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Tx v="bodyMed" cor={config.destrutiva ? color.danger : color.bg}>
            {config.confirmar}
          </Tx>
        </Pressable>
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, justifyContent: 'flex-end' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  folha: {
    backgroundColor: color.bgSoft,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: 0,
    borderColor: color.lineMid,
    paddingHorizontal: sp.lg,
    paddingTop: sp.md,
    paddingBottom: sp.h1,
    gap: sp.md,
  },
  puxador: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.lineHi,
    alignSelf: 'center',
    marginBottom: sp.sm,
  },
  cabecalho: { alignItems: 'center', gap: 4, paddingHorizontal: sp.lg, paddingVertical: sp.md },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    height: 52,
    paddingHorizontal: sp.xl,
    borderRadius: radius.md,
  },
  cancelar: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: color.surface,
    marginTop: sp.xs,
  },
  campo: {
    ...type.body,
    color: color.text,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.lineMid,
    paddingHorizontal: sp.lg,
  },
  duplo: { flexDirection: 'row', gap: sp.sm },
  botaoSuave: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  botaoForte: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.text,
  },
  botaoPerigo: {
    flex: 1,
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.dangerSoft,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: color.danger,
  },
});
