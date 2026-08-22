import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTreino, type Rotina, type Sessao } from '@/store/treino';

/**
 * Backup em arquivo, sem conta nem servidor.
 *
 * Exporta rotinas e histórico num JSON legível que você guarda onde quiser
 * (Drive, e-mail, cartão) e reimporta em outro aparelho.
 */

const FORMATO = 1;

interface Arquivo {
  app: 'impeto';
  formato: number;
  exportadoEm: string;
  rotinas: Rotina[];
  historico: Sessao[];
}

function nomeArquivo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `impeto-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

export interface ResultadoExport {
  ok: boolean;
  erro?: string;
}

export async function exportar(): Promise<ResultadoExport> {
  try {
    const { rotinas, historico } = useTreino.getState();
    if (!rotinas.length && !historico.length) {
      return { ok: false, erro: 'Não há nada para exportar ainda.' };
    }

    const dados: Arquivo = {
      app: 'impeto',
      formato: FORMATO,
      exportadoEm: new Date().toISOString(),
      rotinas,
      historico,
    };

    const arquivo = new File(Paths.cache, nomeArquivo());
    if (arquivo.exists) arquivo.delete();
    arquivo.create();
    arquivo.write(JSON.stringify(dados, null, 2));

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, erro: 'Este aparelho não permite compartilhar arquivos.' };
    }
    await Sharing.shareAsync(arquivo.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Salvar backup do Ímpeto',
    });
    return { ok: true };
  } catch {
    return { ok: false, erro: 'Falha ao gerar o arquivo.' };
  }
}

export interface ResultadoImport {
  ok: boolean;
  erro?: string;
  rotinas?: number;
  treinos?: number;
}

/**
 * Importa um backup, somando ao que já existe.
 *
 * Nada é apagado: registros com o mesmo id são ignorados, então reimportar o
 * mesmo arquivo duas vezes não duplica treinos.
 */
export async function importar(): Promise<ResultadoImport> {
  try {
    const escolha = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (escolha.canceled || !escolha.assets?.[0]) return { ok: false };

    const arquivo = new File(escolha.assets[0].uri);
    const bruto = await arquivo.text();
    const dados = JSON.parse(bruto) as Partial<Arquivo>;

    if (dados.app !== 'impeto' || !Array.isArray(dados.historico)) {
      return { ok: false, erro: 'Este arquivo não é um backup do Ímpeto.' };
    }
    if ((dados.formato ?? 0) > FORMATO) {
      return { ok: false, erro: 'Backup de uma versão mais nova do app.' };
    }

    const estado = useTreino.getState();
    const idsRotinas = new Set(estado.rotinas.map((r) => r.id));
    const idsSessoes = new Set(estado.historico.map((s) => s.id));

    const novasRotinas = (dados.rotinas ?? []).filter((r) => r?.id && !idsRotinas.has(r.id));
    const novosTreinos = (dados.historico ?? []).filter((s) => s?.id && !idsSessoes.has(s.id));

    useTreino.setState({
      rotinas: [...estado.rotinas, ...novasRotinas],
      historico: [...estado.historico, ...novosTreinos].sort(
        (a, b) => (b.fim ?? b.inicio) - (a.fim ?? a.inicio),
      ),
    });

    return { ok: true, rotinas: novasRotinas.length, treinos: novosTreinos.length };
  } catch {
    return { ok: false, erro: 'Não foi possível ler o arquivo.' };
  }
}
