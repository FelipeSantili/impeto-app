import { requireNativeModule, type EventSubscription } from 'expo-modules-core';
import { Platform } from 'react-native';

/**
 * PONTE COM O RELÓGIO — o lado JavaScript.
 *
 * O que atravessa a ponte é sempre STRING de JSON, nos dois sentidos, e isso é
 * escolha e não preguiça: o Data Layer transporta bytes, e a alternativa seria
 * espelhar cada campo do treino num `DataMap` em Kotlin. Toda vez que uma série
 * ganhasse um campo, seriam três lugares para mexer — TypeScript, Kotlin do
 * celular, Kotlin do relógio. Com JSON, o contrato vive num arquivo só
 * (`protocolo.ts`), e os dois lados nativos só carregam texto.
 */

/** Nulo fora do Android: o Wear Data Layer não existe em outro lugar. */
const nativo = Platform.OS === 'android' ? requireNativeModule('ImpetoPulso') : null;

/** O aparelho pode falar com um relógio? Falso em iOS e na web. */
export const relogioDisponivel = nativo !== null;

/**
 * Comandos que chegaram enquanto o app estava fechado, em ordem, e some do
 * disco ao ser lido. Devolve JSON cru — quem interpreta é `protocolo.ts`.
 */
export async function drenarFila(): Promise<string[]> {
  if (!nativo) return [];
  return await nativo.drenarFila();
}

/** Publica o retrato da sessão aberta para o relógio desenhar. */
export async function publicarSessao(json: string): Promise<void> {
  if (!nativo) return;
  await nativo.publicarSessao(json);
}

/** Nomes dos relógios com o Ímpeto instalado e ao alcance AGORA. */
export async function relogiosConectados(): Promise<string[]> {
  if (!nativo) return [];
  try {
    return await nativo.relogiosConectados();
  } catch {
    // Sem Play Services, sem relógio pareado, ou o serviço fora do ar. Nenhum
    // desses é erro do app — é só não ter relógio.
    return [];
  }
}

/** Assina os comandos que chegam do relógio com o app aberto. */
export function aoReceberComando(ouvir: (json: string) => void): EventSubscription | null {
  if (!nativo) return null;
  return nativo.addListener('comando', (e: { json: string }) => ouvir(e.json));
}
