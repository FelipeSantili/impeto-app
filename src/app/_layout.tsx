import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import {
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AvisoAtualizacao } from '@/components/aviso-atualizacao';
import { Folhas } from '@/components/folha';
import { color } from '@/design/tokens';
import { useVerificarAtualizacao } from '@/lib/atualizacao';
import { useTreino } from '@/store/treino';

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(color.papel);

export default function RootLayout() {
  const [fontesProntas] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });
  const hidratado = useTreino((s) => s.hidratado);
  useVerificarAtualizacao();

  // Só liberamos a splash quando fontes e dados salvos estão prontos — evita o
  // primeiro quadro com tipografia trocada ou lista de rotinas vazia.
  useEffect(() => {
    if (fontesProntas && hidratado) SplashScreen.hideAsync();
  }, [fontesProntas, hidratado]);

  if (!fontesProntas || !hidratado) return null;

  return (
    <SafeAreaProvider>
      {/* Papel claro: os ícones da barra de status precisam ser escuros. */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.papel },
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
        <Stack.Screen name="modelos" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="modelo/[id]" />
        <Stack.Screen name="ajustes" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <AvisoAtualizacao />
      <Folhas />
    </SafeAreaProvider>
  );
}
