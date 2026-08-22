import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { View } from 'react-native';
import { Aba, Doca } from '@/components/barra-abas';
import { color } from '@/design/tokens';

export default function LayoutAbas() {
  return (
    <View style={{ flex: 1, backgroundColor: color.papel }}>
      <Tabs>
        <TabSlot />
        <TabList asChild>
          <Doca>
            <TabTrigger name="index" href="/" asChild>
              <Aba glifo="raio" rotulo="Início" />
            </TabTrigger>
            <TabTrigger name="exercicios" href="/exercicios" asChild>
              <Aba glifo="busca" rotulo="Exercícios" />
            </TabTrigger>
            <TabTrigger name="historico" href="/historico" asChild>
              <Aba glifo="grafico" rotulo="Progresso" />
            </TabTrigger>
          </Doca>
        </TabList>
      </Tabs>
    </View>
  );
}
