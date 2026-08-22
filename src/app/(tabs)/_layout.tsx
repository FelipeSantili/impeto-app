import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { View } from 'react-native';
import { Aba, Doca } from '@/components/barra-abas';
import { color } from '@/design/tokens';

export default function LayoutAbas() {
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <Tabs>
        <TabSlot />
        <TabList asChild>
          <Doca>
            <TabTrigger name="index" href="/" asChild>
              <Aba icone="home" rotulo="Início" />
            </TabTrigger>
            <TabTrigger name="exercicios" href="/exercicios" asChild>
              <Aba icone="search" rotulo="Exercícios" />
            </TabTrigger>
            <TabTrigger name="historico" href="/historico" asChild>
              <Aba icone="stats-chart" rotulo="Progresso" />
            </TabTrigger>
          </Doca>
        </TabList>
      </Tabs>
    </View>
  );
}
