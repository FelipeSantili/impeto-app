import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * Captura uma view como PNG e abre o menu de compartilhar do sistema.
 *
 * Usado no cartão do treino: em vez de mandar texto, sai uma imagem pronta para
 * postar — como fazem Strava e Hevy.
 */
export async function compartilharView(
  ref: RefObject<View | null>,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    if (!ref.current) return { ok: false, erro: 'Nada para compartilhar ainda.' };
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, erro: 'Este aparelho não permite compartilhar arquivos.' };
    }

    const uri = await captureRef(ref, {
      format: 'png',
      quality: 1,
      // 2x deixa o texto nítido quando a imagem é ampliada nas redes.
      result: 'tmpfile',
      width: 760,
    });

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Compartilhar treino',
      UTI: 'public.png',
    });
    return { ok: true };
  } catch {
    return { ok: false, erro: 'Não foi possível gerar a imagem.' };
  }
}
