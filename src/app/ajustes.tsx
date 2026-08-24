import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoGlifo, Carimbo, Pressavel, Regua, Rotulo, Secao, Tx } from '@/components/base';
import { abrirConfirmacao, abrirMenu } from '@/components/folha';
import { Glifo, type NomeGlifo } from '@/components/glifos';
import { criarEstilos, usarPaleta, usarTema, type Preferencia } from '@/design/tema';
import { margem, radius, sp, traco } from '@/design/tokens';
import { exportar, importar } from '@/lib/backup';
import { importarDoRelogio } from '@/lib/relogio';
import {
  abrirAjustesSaude,
  pedirPermissoes,
  statusHealthConnect,
  type StatusSaude,
} from '@/lib/saude';
import { useCinta } from '@/store/cinta';
import { useTreino } from '@/store/treino';

const TEXTO_SAUDE: Record<StatusSaude, string> = {
  indisponivel: 'Não disponível neste aparelho',
  precisa_instalar: 'Instale o app Health Connect',
  sem_permissao: 'Toque para autorizar',
  pronto: 'Conectado',
};

export default function Ajustes() {
  const c = usarPaleta();
  const estilos = usarEstilos();
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

  /**
   * Importa um ou vários .tcx de uma vez e encaixa cada um no seu treino.
   *
   * O relatório de volta é detalhado de propósito: como o casamento é
   * automático, quem importa precisa saber quantos arquivos acharam par e
   * quantos não — senão a ação parece ter funcionado e não fez nada.
   */
  async function aoImportarRelogio() {
    setOcupado(true);
    const r = await importarDoRelogio();
    setOcupado(false);
    if (!r.ok) return;

    const linhas: string[] = [];
    if (r.aplicados) {
      linhas.push(
        r.aplicados === 1
          ? '1 treino recebeu os dados do relógio.'
          : `${r.aplicados} treinos receberam os dados do relógio.`,
      );
    }
    if (r.repetidos) {
      linhas.push(
        r.repetidos === 1
          ? '1 arquivo já tinha sido importado.'
          : `${r.repetidos} arquivos já tinham sido importados.`,
      );
    }
    if (r.semPar.length) {
      linhas.push(
        `Sem treino correspondente no histórico: ${r.semPar.join(', ')}. O arquivo encaixa num treino já registrado — ele não cria um.`,
      );
    }
    if (r.ilegiveis.length) {
      linhas.push(`Não são .tcx do relógio: ${r.ilegiveis.join(', ')}.`);
    }

    if (r.aplicados) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    abrirConfirmacao({
      titulo: r.aplicados ? 'Dados do relógio importados' : 'Nada foi importado',
      descricao: linhas.join('\n\n') || 'Nenhum arquivo tinha dados aproveitáveis.',
      confirmar: 'Pronto',
      onConfirmar: () => {},
    });
  }

  async function aoExportar() {
    setOcupado(true);
    const r = await exportar();
    setOcupado(false);
    if (!r.ok && r.erro) {
      abrirConfirmacao({
        titulo: 'Não deu certo',
        descricao: r.erro,
        confirmar: 'Entendi',
        onConfirmar: () => {},
      });
    }
  }

  async function aoImportar() {
    setOcupado(true);
    const r = await importar();
    setOcupado(false);
    if (r.erro) {
      abrirConfirmacao({
        titulo: 'Não deu certo',
        descricao: r.erro,
        confirmar: 'Entendi',
        onConfirmar: () => {},
      });
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
    <View style={{ flex: 1, backgroundColor: c.fundo }}>
      <View style={[estilos.topo, { paddingTop: insets.top + sp.xs }]}>
        <View style={{ marginLeft: -sp.sm }}>
          <BotaoGlifo glifo="voltar" acessivel="Voltar" onPress={() => router.back()} />
        </View>
        <Tx v="title" style={{ flex: 1 }}>
          Ajustes
        </Tx>
      </View>
      <Regua peso="forte" cor={c.tinta} style={{ marginHorizontal: margem.pagina }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + sp.h2 }}
        showsVerticalScrollIndicator={false}
      >
        <Secao titulo="Aparência" espaco={sp.xxl}>
          <SeletorTema />
        </Secao>

        <Secao titulo="Conexões">
          <Linha
            glifo="coracao"
            titulo="Health Connect"
            subtitulo={
              saude === null
                ? 'Verificando…'
                : `${TEXTO_SAUDE[saude]}${saude === 'pronto' ? ' · lê o relógio depois do treino' : ''}`
            }
            ativo={saude === 'pronto'}
            onPress={tocarSaude}
          />
          <Linha
            glifo="bluetooth"
            titulo="Cinta cardíaca"
            subtitulo={
              cinta.estado === 'conectada'
                ? `${cinta.dispositivo?.nome} · ${cinta.bpm ?? '--'} bpm`
                : cinta.estado === 'procurando'
                  ? 'Procurando…'
                  : cinta.estado === 'conectando'
                    ? 'Conectando…'
                    : (cinta.erro ?? 'Toque para procurar · frequência ao vivo')
            }
            ativo={cinta.estado === 'conectada'}
            carregando={cinta.estado === 'procurando' || cinta.estado === 'conectando'}
            onPress={menuCinta}
          />

          {/* Cintas encontradas */}
          {cinta.estado === 'procurando' && cinta.encontradas.length > 0
            ? cinta.encontradas.map((d) => (
                <View key={d.id}>
                  <Pressavel
                    haptico="selecao"
                    onPress={() => cinta.conectar(d.id)}
                    escala={0.995}
                    fundo={c.fundoAlto}
                    fundoPressionado={c.fundoBaixo}
                    style={estilos.dispositivo}
                  >
                    <Glifo nome="pulso" tamanho={15} cor={c.acento} />
                    <Tx v="smallMed" style={{ flex: 1 }} numberOfLines={1}>
                      {d.nome}
                    </Tx>
                    <Rotulo cor={c.acento}>Conectar</Rotulo>
                  </Pressavel>
                  <Regua />
                </View>
              ))
            : null}

          <Linha
            glifo="relogio"
            titulo="Importar do relógio"
            subtitulo="Arquivos .tcx do Mi Fitness · encaixa no treino do mesmo horário"
            carregando={ocupado}
            onPress={aoImportarRelogio}
          />

          {Platform.OS === 'android' ? (
            <Tx v="small" cor={c.tintaFraca} style={estilos.nota}>
              O Redmi Watch fala um protocolo próprio e não aparece na busca de cintas. Os dados
              dele chegam de dois jeitos: sozinhos, pelo Health Connect, depois que o Mi Fitness
              sincroniza; ou pelo arquivo, quando você exporta a atividade como .tcx.
            </Tx>
          ) : null}

          {/*
            O caminho da exportação é área privada do Mi Fitness — desde o
            Android 11 nenhum gerenciador de arquivos entra em `Android/data`,
            e o seletor deste botão também não. Dizer onde o arquivo está sem
            dizer isso deixaria a instrução impossível de seguir.
          */}
          <Tx v="small" cor={c.tintaFraca} style={estilos.nota}>
            O Mi Fitness salva em Android/data/com.xiaomi.wearable/files/ExportTrack, que o Android
            esconde de todos os apps. Para importar, ligue o celular ao computador e mova os .tcx
            dessa pasta para Download — daí o seletor acima enxerga.
          </Tx>
        </Secao>

        <Secao titulo="Backup">
          <Linha
            glifo="baixar"
            titulo="Exportar treinos"
            subtitulo={`${treinos} treinos e ${rotinas} rotinas num arquivo`}
            carregando={ocupado}
            onPress={aoExportar}
          />
          <Linha
            glifo="subir"
            titulo="Importar backup"
            subtitulo="Soma ao que já existe, sem apagar nada"
            carregando={ocupado}
            onPress={aoImportar}
          />
          <Tx v="small" cor={c.tintaFraca} style={estilos.nota}>
            Seus dados ficam só neste aparelho. O backup é um arquivo que você guarda onde quiser.
          </Tx>
        </Secao>

        <Secao titulo="Sobre">
          <Linha
            glifo="info"
            titulo="Ímpeto"
            subtitulo="299 exercícios · dados locais"
            onPress={() =>
              abrirMenu({
                titulo: 'Ímpeto',
                subtitulo: 'Registro de treino de academia',
                opcoes: [
                  { texto: 'Demonstrações: free-exercise-db', glifo: 'lista', onPress: () => {} },
                  // A CC BY-SA do Z-Anatomy EXIGE este crédito visível. Não é
                  // cortesia: sem ele o uso do modelo fica fora da licença.
                  {
                    texto: 'Modelo 3D: Z-Anatomy — CC BY-SA 4.0',
                    glifo: 'info',
                    onPress: () => {},
                  },
                ],
              })
            }
          />
        </Secao>
      </ScrollView>
    </View>
  );
}

/**
 * Escolha do tema.
 *
 * Três caixas de formulário lado a lado, no mesmo desenho dos filtros da lista
 * de exercícios: a marcada é preenchida a tinta. Não é um interruptor
 * sol/lua — esse é o par de ícones mais gerado que existe, e além disso um
 * interruptor de duas posições não sabe dizer "siga o sistema".
 *
 * "Sistema" é o padrão: acompanha o aparelho e muda sozinho de dia para noite.
 */
function SeletorTema() {
  const { preferencia, definir, escuro, paleta: c } = usarTema();
  const estilos = usarEstilos();

  const opcoes: { valor: Preferencia; nome: string }[] = [
    { valor: 'sistema', nome: 'Sistema' },
    { valor: 'claro', nome: 'Claro' },
    { valor: 'escuro', nome: 'Escuro' },
  ];

  return (
    <View>
      <View style={estilos.tema}>
        {opcoes.map((o) => {
          const ativo = preferencia === o.valor;
          return (
            <Pressavel
              key={o.valor}
              haptico="selecao"
              onPress={() => definir(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={o.nome}
              style={[
                estilos.temaOpcao,
                { borderColor: ativo ? c.tinta : c.reguaMid },
                ativo ? { backgroundColor: c.tinta } : null,
              ]}
            >
              <Rotulo cor={ativo ? c.fundo : c.tintaMid}>{o.nome}</Rotulo>
            </Pressavel>
          );
        })}
      </View>
      <Tx v="small" cor={c.tintaFraca} style={estilos.nota}>
        {preferencia === 'sistema'
          ? `Seguindo o aparelho — agora está ${escuro ? 'escuro' : 'claro'}.`
          : escuro
            ? 'Ardósia e giz, como o quadro da academia.'
            : 'Papel e tinta, como o caderno de treino.'}
      </Tx>
    </View>
  );
}

/**
 * Linha de ajuste.
 *
 * A marca deixou de morar num círculo tingido: fica solta na calha, no mesmo
 * lugar em que mora o ordinal nas outras telas. Quando a conexão está ativa,
 * quem diz isso é um CARIMBO, não a cor do texto.
 */
function Linha({
  glifo,
  titulo,
  subtitulo,
  ativo,
  carregando,
  onPress,
}: {
  glifo: NomeGlifo;
  titulo: string;
  subtitulo: string;
  ativo?: boolean;
  carregando?: boolean;
  onPress: () => void;
}) {
  const c = usarPaleta();
  const estilos = usarEstilos();
  return (
    <View>
      <Pressavel
        onPress={onPress}
        disabled={carregando}
        escala={0.995}
        fundoPressionado={c.fundoBaixo}
        accessibilityRole="button"
        accessibilityLabel={titulo}
        style={estilos.linha}
      >
        <View style={estilos.calha}>
          <Glifo nome={glifo} tamanho={18} cor={ativo ? c.acento : c.tintaMid} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.sm }}>
            <Tx v="bodyMed" numberOfLines={1}>
              {titulo}
            </Tx>
            {ativo ? <Carimbo texto="Ativo" cor={c.acento} /> : null}
          </View>
          <Tx v="small" cor={c.tintaFraca} numberOfLines={2}>
            {subtitulo}
          </Tx>
        </View>
        {carregando ? (
          <ActivityIndicator size="small" color={c.tintaMid} />
        ) : (
          <Glifo nome="avancar" tamanho={13} cor={c.tintaFantasma} />
        )}
      </Pressavel>
      <Regua />
    </View>
  );
}

const usarEstilos = criarEstilos((c) => ({
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingBottom: sp.md,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.lg,
    paddingHorizontal: margem.pagina,
  },
  calha: { width: margem.calha, alignItems: 'flex-start' },
  dispositivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    paddingVertical: sp.md,
    paddingLeft: margem.pagina + margem.calha,
    paddingRight: margem.pagina,
    backgroundColor: c.fundoAlto,
  },
  nota: { paddingHorizontal: margem.pagina, paddingTop: sp.md },
  tema: {
    flexDirection: 'row',
    gap: sp.sm,
    paddingHorizontal: margem.pagina,
    paddingTop: sp.lg,
  },
  temaOpcao: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: traco.normal,
    borderRadius: radius.sm,
  },
}));
