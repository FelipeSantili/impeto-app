import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { usarPaleta } from '@/design/tema';


/**
 * Marcas desenhadas do Ímpeto.
 *
 * Substituem o conjunto de ícones pronto que vinha antes. Um caderno não tem
 * ícone — tem marca impressa —, então cada glifo aqui é desenhado na mesma
 * grade de 24 e com o mesmo traço: ponta reta (`butt`) e junta em esquadria,
 * que é como sai de uma pena técnica. Ponta arredondada é a assinatura dos
 * conjuntos prontos e foi justamente o que saiu daqui.
 *
 * Um só peso de traço em todo o app. Tamanho muda; espessura, não — a
 * espessura é reescalada para se manter ótica.
 */

const GRADE = 24;

export type NomeGlifo =
  | 'voltar'
  | 'avancar'
  | 'baixo'
  | 'cima'
  | 'mais'
  | 'menos'
  | 'fechar'
  | 'confere'
  | 'busca'
  | 'ajustes'
  | 'compartilhar'
  | 'lixo'
  | 'raio'
  | 'coracao'
  | 'pulso'
  | 'relogio'
  | 'alerta'
  | 'info'
  | 'grafico'
  | 'lista'
  | 'play'
  | 'reticencias'
  | 'bluetooth'
  | 'baixar'
  | 'subir'
  | 'halter';

/** Traçados. Cada entrada é uma lista de `d` de `<Path>`. */
const TRACOS: Record<NomeGlifo, string[]> = {
  voltar: ['M15 4.5 L8 12 L15 19.5'],
  avancar: ['M9 4.5 L16 12 L9 19.5'],
  baixo: ['M4.5 9 L12 16.5 L19.5 9'],
  cima: ['M4.5 15 L12 7.5 L19.5 15'],
  mais: ['M12 4.5 V19.5', 'M4.5 12 H19.5'],
  menos: ['M4.5 12 H19.5'],
  fechar: ['M5.5 5.5 L18.5 18.5', 'M18.5 5.5 L5.5 18.5'],
  confere: ['M4.5 12.5 L9.5 17.5 L19.5 6.5'],
  busca: ['M15.2 15.2 L20.5 20.5'],
  ajustes: ['M3.5 7 H20.5', 'M3.5 12 H20.5', 'M3.5 17 H20.5'],
  compartilhar: ['M12 15.5 V3.5', 'M8 7.5 L12 3.5 L16 7.5', 'M5 12 V20.5 H19 V12'],
  lixo: ['M4.5 7 H19.5', 'M9 7 V4 H15 V7', 'M6.8 7 L8 20.5 H16 L17.2 7'],
  raio: [],
  coracao: [],
  pulso: ['M2.5 12 H7.5 L10 5.5 L13.5 18.5 L16 12 H21.5'],
  relogio: ['M12 6.5 V12 L16 14.5'],
  alerta: ['M12 3.5 L21.5 20 H2.5 Z', 'M12 9.5 V14'],
  info: ['M12 11 V16.8'],
  grafico: ['M3 20.5 H21', 'M6.5 20.5 V13', 'M12 20.5 V6', 'M17.5 20.5 V10'],
  lista: ['M4.5 7 H19.5', 'M4.5 12 H19.5', 'M4.5 17 H13.5'],
  play: [],
  reticencias: [],
  bluetooth: ['M7.5 7.5 L16.5 16.5 L12 20.5 V3.5 L16.5 7.5 L7.5 16.5'],
  baixar: ['M12 3.5 V16', 'M7.5 11.5 L12 16 L16.5 11.5', 'M4.5 20.5 H19.5'],
  subir: ['M12 16 V3.5', 'M7.5 8 L12 3.5 L16.5 8', 'M4.5 20.5 H19.5'],
  halter: ['M3.5 9 V15', 'M7 6 V18', 'M17 6 V18', 'M20.5 9 V15', 'M7 12 H17'],
};

/** Formas cheias — as que só fazem sentido preenchidas. */
function preenchidas(nome: NomeGlifo, cor: string) {
  switch (nome) {
    case 'raio':
      // O mesmo raio do ícone do app, redesenhado na grade de 24.
      return <Polygon points="14.5,2 5.5,13.5 10.8,13.5 9.5,22 18.5,10.5 13.2,10.5" fill={cor} />;
    case 'coracao':
      return (
        <Path
          d="M12 20.5 C12 20.5 3 14.4 3 8.9 A4.4 4.4 0 0 1 12 6.9 A4.4 4.4 0 0 1 21 8.9 C21 14.4 12 20.5 12 20.5 Z"
          fill={cor}
        />
      );
    case 'play':
      return <Polygon points="7.5,4.5 19.5,12 7.5,19.5" fill={cor} />;
    case 'reticencias':
      return (
        <>
          <Circle cx={5.5} cy={12} r={1.6} fill={cor} />
          <Circle cx={12} cy={12} r={1.6} fill={cor} />
          <Circle cx={18.5} cy={12} r={1.6} fill={cor} />
        </>
      );
    default:
      return null;
  }
}

/** Círculos de contorno que acompanham alguns traçados. */
function circulos(nome: NomeGlifo, cor: string, largura: number, fundo: string) {
  const comum = { stroke: cor, strokeWidth: largura, fill: 'none' as const };
  switch (nome) {
    case 'busca':
      return <Circle cx={10.5} cy={10.5} r={6.2} {...comum} />;
    case 'relogio':
      return <Circle cx={12} cy={12} r={8.5} {...comum} />;
    case 'info':
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...comum} />
          <Circle cx={12} cy={7.6} r={0.95} fill={cor} />
        </>
      );
    case 'alerta':
      return <Circle cx={12} cy={16.9} r={0.95} fill={cor} />;
    case 'ajustes':
      // Botões deslizantes: a marca de "ajustar" sem recorrer à engrenagem.
      return (
        <>
          <Circle cx={9} cy={7} r={2.5} {...comum} fill={fundo} />
          <Circle cx={15.5} cy={12} r={2.5} {...comum} fill={fundo} />
          <Circle cx={7.5} cy={17} r={2.5} {...comum} fill={fundo} />
        </>
      );
    default:
      return null;
  }
}

export function Glifo({
  nome,
  tamanho = 20,
  cor,
}: {
  nome: NomeGlifo;
  tamanho?: number;
  cor?: string;
}) {
  const c = usarPaleta();
  const tom = cor ?? c.tinta;

  // Espessura ótica: cresce menos que o glifo, senão marca grande fica pesada
  // e marca pequena somem. 1,6 a 20px é a referência.
  const largura = Math.max(1.15, 1.6 * (20 / tamanho) ** 0.35);

  return (
    <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${GRADE} ${GRADE}`}>
      {TRACOS[nome].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={tom}
          strokeWidth={largura}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          fill="none"
        />
      ))}
      {/* O miolo dos botões deslizantes é vazado na cor do fundo, então ele
          precisa saber qual fundo está valendo. */}
      {circulos(nome, tom, largura, c.fundo)}
      {preenchidas(nome, tom)}
    </Svg>
  );
}
