import { router } from 'expo-router';
import { View } from 'react-native';
import { Tela, Tx } from '@/components/base';
import { ListaExercicios } from '@/components/lista-exercicios';
import { sp } from '@/design/tokens';

export default function Exercicios() {
  return (
    <Tela>
      <ListaExercicios
        cabecalho={
          <View style={{ paddingHorizontal: sp.xl, paddingTop: sp.lg, paddingBottom: sp.xl }}>
            <Tx v="title">Exercícios</Tx>
          </View>
        }
        rodape={150}
        onPress={(ex) => router.push(`/exercicio/${ex.id}`)}
      />
    </Tela>
  );
}
