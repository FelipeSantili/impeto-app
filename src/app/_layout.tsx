import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AvisoAtualizacao } from '@/components/aviso-atualizacao';
import { Folhas } from '@/components/folha';
import { TemaProvider, usarPaleta } from '@/design/tema';
import { useVerificarAtualizacao } from '@/lib/atualizacao';
import { useTreino } from '@/store/treino';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontesProntas] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    // Toda coluna de dado do app é monoespaçada: alinhar carga não depende de
    // `fontVariant`, e um valor mudando de 82,5 para 100 não empurra a coluna.
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
  const hidratado = useTreino((s) => s.hidratado);
  useVerificarAtualizacao();

  const pronto = fontesProntas && hidratado;

  // Só liberamos a splash quando fontes, tema e dados salvos estão prontos —
  // evita o primeiro quadro com tipografia trocada ou lista de rotinas vazia.
  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <Moldura />
      </TemaProvider>
    </SafeAreaProvider>
  );
}

/**
 * Tudo que depende do tema.
 *
 * Vive abaixo do TemaProvider e do portão de hidratação. O layout raiz não lê
 * a paleta: ele só segura a splash. Quem pinta é este.
 */
function Moldura() {
  const c = usarPaleta();

  /*
   * Fundo do sistema: é o que o Android pinta atrás da janela durante rotações
   * e transições. Fixo no claro, apareceria uma faixa branca piscando no tema
   * escuro.
   */
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.fundo);
  }, [c]);

  return (
    <>
      {/* Ícones da barra de status ao contrário do fundo. */}
      <StatusBar style={c.barraStatus} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.fundo },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="treino" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="selecionar"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="exercicio/[id]" />
        <Stack.Screen name="rotina/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sessao/[id]" />
        {/* O modelo 3D: sobe por cima da prancha que o abriu, e volta pra ela. */}
        <Stack.Screen
          name="corpo"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="modelos" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="modelo/[id]" />
        <Stack.Screen name="ajustes" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <AvisoAtualizacao />
      <Folhas />
    </>
  );
}
