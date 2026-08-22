import { router } from 'expo-router';
import { View } from 'react-native';
import { Regua, Rotulo, Tela, Tx } from '@/components/base';
import { ListaExercicios } from '@/components/lista-exercicios';
import { EXERCICIOS } from '@/data/exercicios';
import { color, margem, sp } from '@/design/tokens';

export default function Exercicios() {
  return (
    <Tela>
      <ListaExercicios
        cabecalho={
          <View>
            <View style={{ paddingHorizontal: margem.pagina, paddingBottom: sp.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Tx v="title" style={{ flex: 1 }}>
                  Exercícios
                </Tx>
                <Rotulo cor={color.tintaFraca}>{EXERCICIOS.length} no catálogo</Rotulo>
              </View>
            </View>
            <Regua peso="forte" cor={color.tinta} style={{ marginHorizontal: margem.pagina }} />
          </View>
        }
        rodape={150}
        onPress={(ex) => router.push(`/exercicio/${ex.id}`)}
      />
    </Tela>
  );
}
