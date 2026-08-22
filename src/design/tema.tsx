import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { CLARA, ESCURA, type Paleta } from '@/design/tokens';
import { useTemaStore, type Preferencia } from '@/store/tema';

export type { Paleta, Preferencia };

interface Tema {
  paleta: Paleta;
  preferencia: Preferencia;
  escuro: boolean;
}

const PADRAO: Tema = { paleta: CLARA, preferencia: 'sistema', escuro: false };

const Ctx = createContext<Tema>(PADRAO);

function escolher(preferencia: Preferencia, sistema: 'claro' | 'escuro'): Paleta {
  if (preferencia === 'claro') return CLARA;
  if (preferencia === 'escuro') return ESCURA;
  return sistema === 'escuro' ? ESCURA : CLARA;
}

/**
 * Fonte única do tema.
 *
 * O app inteiro lê a paleta por contexto, e só ESTE componente assina o store.
 * A primeira versão fazia cada componente chamar `useTemaStore` — e como
 * `usarPaleta` e `usarEstilos` são chamados juntos no mesmo componente, isso
 * dava duas, três, cinco assinaturas do mesmo store por componente.
 *
 * Não é só desperdício: com o `persist` hidratando de forma assíncrona, várias
 * assinaturas do mesmo store dentro de um componente que re-renderiza nessa
 * janela desalinham a lista de hooks dele. O sintoma é fatal e nada óbvio —
 * "Cannot read properties of undefined (reading 'length')" no primeiro
 * `useEffect` seguinte, com a árvore inteira sumindo antes do primeiro quadro,
 * porque o índice do hook escorregou para um slot que não é de efeito.
 *
 * Uma assinatura, um contexto, e o problema deixa de existir por construção.
 */
export function TemaProvider({ children }: { children: ReactNode }) {
  const preferencia = useTemaStore((s) => s.preferencia);
  const sistema = useTemaStore((s) => s.sistema);

  const valor = useMemo<Tema>(() => {
    const paleta = escolher(preferencia, sistema);
    return { paleta, preferencia, escuro: paleta === ESCURA };
  }, [preferencia, sistema]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

/** A paleta que está valendo. Leitura de contexto — não assina nada. */
export function usarPaleta(): Paleta {
  return useContext(Ctx).paleta;
}

/** Tema completo, para a tela de ajustes. `definir` é estável e não assina. */
export function usarTema() {
  const tema = useContext(Ctx);
  return { ...tema, definir: useTemaStore.getState().definir };
}

type Estilos = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Cria folhas de estilo POR TEMA.
 *
 * `StyleSheet.create` roda uma vez, quando o módulo carrega, e copia os valores
 * de cor para dentro do objeto — mutar a paleta depois não muda nada, e nem
 * remontar a árvore resolve, porque o módulo não é reavaliado.
 *
 * Aqui a folha vira função da paleta e o resultado fica em cache. Como existem
 * exatamente duas paletas, e elas são constantes de módulo (identidade
 * estável), o cache tem no máximo duas entradas por componente e a criação
 * acontece uma única vez por tema.
 *
 * Uso:
 *
 *     const usarEstilos = criarEstilos((c) => ({
 *       linha: { backgroundColor: c.fundoAlto },
 *     }));
 *
 *     function Componente() {
 *       const estilos = usarEstilos();
 *       ...
 *     }
 */
export function criarEstilos<T extends Estilos>(fabrica: (c: Paleta) => T): () => T {
  const cache = new Map<Paleta, T>();
  return function usarEstilos(): T {
    const paleta = usarPaleta();
    let pronto = cache.get(paleta);
    if (!pronto) {
      pronto = StyleSheet.create(fabrica(paleta)) as T;
      cache.set(paleta, pronto);
    }
    return pronto;
  };
}
