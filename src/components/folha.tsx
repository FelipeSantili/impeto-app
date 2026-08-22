import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { create } from 'zustand';
import { Botao, Pressavel, Regua, Rotulo, Tx } from '@/components/base';
import { Glifo, type NomeGlifo } from '@/components/glifos';
import { color, margem, radius, shadow, sp, traco, type } from '@/design/tokens';

export interface OpcaoMenu {
  texto: string;
  glifo?: NomeGlifo;
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
 * vários menus daqui têm mais do que isso.
 *
 * Visualmente é a única peça do app que tem sombra, e por um motivo honesto:
 * ela é literalmente uma folha por cima da página. A sombra tem deslocamento e
 * desfoque de verdade, tingida com o cinza do papel — halo colorido de raio
 * zero é decoração, não profundidade.
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
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(140)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable style={estilos.fundo} onPress={fechar} accessibilityLabel="Fechar" />
          </Animated.View>

          <Animated.View
            // Mola em vez de curva: a folha é ocasional e ganha peso físico.
            entering={SlideInDown.springify().damping(20).stiffness(190).mass(0.9)}
            exiting={SlideOutDown.duration(170)}
            style={estilos.folha}
          >
            <Regua peso="forte" cor={color.tinta} />
            <View style={estilos.conteudo}>
              {menu ? <CorpoMenu config={menu} fechar={fechar} /> : null}
              {prompt ? <CorpoPrompt config={prompt} fechar={fechar} /> : null}
              {confirma ? <CorpoConfirma config={confirma} fechar={fechar} /> : null}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

/** Cabeçalho da folha: alinhado à esquerda, como todo cabeçalho do app. */
function Titulo({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <View style={estilos.cabecalho}>
      <Tx v="title" numberOfLines={2}>
        {titulo}
      </Tx>
      {sub ? (
        <Tx v="small" cor={color.tintaFraca} style={{ marginTop: 2 }}>
          {sub}
        </Tx>
      ) : null}
    </View>
  );
}

function CorpoMenu({ config, fechar }: { config: ConfigMenu; fechar: () => void }) {
  return (
    <>
      {config.titulo ? <Titulo titulo={config.titulo} sub={config.subtitulo} /> : null}
      <Regua peso="normal" cor={color.reguaMid} />

      <View>
        {config.opcoes.map((o, i) => (
          <View key={o.texto}>
            {i > 0 ? <Regua /> : null}
            <Pressavel
              haptico="leve"
              escala={0.995}
              fundoPressionado={color.papelBaixo}
              onPress={() => {
                fechar();
                // Deixa a folha sair de cena antes de a ação abrir outra tela.
                setTimeout(o.onPress, 120);
              }}
              style={estilos.opcao}
            >
              <View style={estilos.opcaoGlifo}>
                {o.glifo ? (
                  <Glifo
                    nome={o.glifo}
                    tamanho={17}
                    cor={o.destrutiva ? color.vermelho : color.tintaMid}
                  />
                ) : null}
              </View>
              <Tx v="bodyMed" cor={o.destrutiva ? color.vermelho : color.tinta}>
                {o.texto}
              </Tx>
            </Pressavel>
          </View>
        ))}
      </View>

      <Regua peso="normal" cor={color.reguaMid} />
      <Botao titulo="Cancelar" tom="texto" onPress={fechar} style={{ marginTop: sp.md }} />
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
      <Titulo titulo={config.titulo} sub={config.descricao} />
      <Rotulo cor={color.tintaFraca} style={{ marginBottom: sp.xs }}>
        Nome
      </Rotulo>
      <TextInput
        value={valor}
        onChangeText={setValor}
        placeholder={config.placeholder}
        placeholderTextColor={color.tintaFantasma}
        style={estilos.campo}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={confirmar}
      />

      <View style={estilos.duplo}>
        <Botao titulo="Cancelar" tom="contorno" onPress={fechar} style={{ flex: 1 }} />
        <Botao
          titulo={config.confirmar ?? 'Salvar'}
          onPress={confirmar}
          style={{ flex: 1.4 }}
        />
      </View>
    </>
  );
}

function CorpoConfirma({ config, fechar }: { config: ConfigConfirma; fechar: () => void }) {
  return (
    <>
      <Titulo titulo={config.titulo} sub={config.descricao} />
      <View style={estilos.duplo}>
        <Botao titulo="Cancelar" tom="contorno" onPress={fechar} style={{ flex: 1 }} />
        <Botao
          titulo={config.confirmar}
          tom={config.destrutiva ? 'perigo' : 'tinta'}
          haptico="medio"
          onPress={() => {
            fechar();
            setTimeout(config.onConfirmar, 100);
          }}
          style={{ flex: 1.4 }}
        />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, justifyContent: 'flex-end' },
  // Escurece o que está atrás com o cinza do papel, não com preto puro.
  fundo: { flex: 1, backgroundColor: 'rgba(30,32,28,0.42)' },
  folha: {
    backgroundColor: color.papelAlto,
    borderTopLeftRadius: radius.folha,
    borderTopRightRadius: radius.folha,
    ...shadow.folha,
  },
  conteudo: {
    paddingHorizontal: margem.pagina,
    paddingTop: sp.lg,
    paddingBottom: sp.h1,
  },
  cabecalho: { marginBottom: sp.lg },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    height: 54,
    marginHorizontal: -margem.pagina,
    paddingHorizontal: margem.pagina,
  },
  opcaoGlifo: { width: 20, alignItems: 'center' },
  campo: {
    ...type.body,
    color: color.azul,
    height: 50,
    backgroundColor: color.papel,
    borderWidth: traco.normal,
    borderColor: color.reguaForte,
    borderRadius: radius.sm,
    paddingHorizontal: sp.md,
  },
  duplo: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xl },
});
