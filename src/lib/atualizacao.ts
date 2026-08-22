import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAtualizacao } from '@/store/atualizacao';

/**
 * Procura por uma nova versão ao abrir o app e sempre que ele volta do segundo
 * plano. O download acontece aqui; aplicar fica a cargo do usuário, pelo aviso.
 */
export function useVerificarAtualizacao() {
  const verificar = useAtualizacao((s) => s.verificar);

  useEffect(() => {
    verificar();
    const inscricao = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') verificar();
    });
    return () => inscricao.remove();
  }, [verificar]);
}
