import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { Pressavel, Rotulo } from '@/components/base';
import type { Grupo } from '@/data/types';
import { usarPaleta } from '@/design/tema';
import { curva, dur } from '@/design/movimento';
import { corDeCalor, sp } from '@/design/tokens';
import { intensidadePorGrupo, type MusculoTrabalhado } from '@/lib/metricas';

/**
 * PRANCHA ANATÔMICA
 *
 * Sobrou para UM lugar: o cartão de compartilhar, que vira imagem. O relatório
 * e o cabeçalho do treino passaram a mostrar o corpo em três dimensões — um
 * corpo que gira mostra os dois lados e o volume, que é o que duas figuras
 * chapadas nunca deram. O cartão não pode segui-los porque é capturado como
 * bitmap, e capturar conteúdo de GL é uma corrida que ninguém precisa correr
 * para gerar uma imagem estática.
 *
 * Não é uma silhueta com manchas por cima: os músculos SÃO o corpo. O que não
 * foi trabalhado fica no tom da prancha, contornado — de modo que a figura já
 * se lê como anatomia mesmo numa sessão vazia, e o treino apenas ACENDE partes
 * de um desenho que já estava inteiro.
 *
 * ─── Fidelidade ──────────────────────────────────────────────────────────────
 *
 * A versão anterior tinha treze formas e lia como boneco. Esta tem trinta e
 * três, e cada uma é desenhada da ORIGEM à INSERÇÃO do músculo real:
 *
 *   · o peitoral em DUAS porções (clavicular e esternal), porque é isso que
 *     faz um peito parecer peito e não um retângulo arredondado;
 *   · o SERRÁTIL em dedos entrelaçados sobre as costelas — é o detalhe que
 *     separa "prancha de anatomia" de "ícone de músculo";
 *   · o reto abdominal SEGMENTADO pelas intersecções tendíneas, não um bloco;
 *   · o quadríceps em três ventres distintos, com o vasto medial descendo mais
 *     que os outros dois — a "gota" logo acima do joelho;
 *   · o SARTÓRIO cruzando o coxa na diagonal, da crista ilíaca à face medial
 *     do joelho, que é o músculo mais longo do corpo e o que dá leitura de
 *     prancha à coxa;
 *   · o trapézio de costas como losango inteiro, do occipital a T12, e o
 *     dorsal em asa da axila à cintura — juntos são o V das costas.
 *
 * Proporção pelo cânone de oito cabeças, com largura de ombro em 2,3 cabeças:
 * é a proporção de atleta, não a de manequim.
 *
 * ─── Intensidade ─────────────────────────────────────────────────────────────
 *
 * A cor sai da RAMPA TÉRMICA da paleta (`corDeCalor`), a mesma escala usada nas
 * barras de carga e no modelo 3D. Um único vocabulário de intensidade no app
 * inteiro: se um músculo está âmbar aqui, âmbar quer dizer a mesma coisa em
 * qualquer outro lugar.
 *
 * Cada músculo aceso leva um CONTORNO na cor do corpo. Sem ele, vizinhos que se
 * encostam — deltoide e peitoral, glúteo e isquiotibial, as duas cabeças do
 * gastrocnêmio — viram uma mancha só no momento em que ambos acendem.
 *
 * ─── Autoria em metade ───────────────────────────────────────────────────────
 *
 * Todo traçado é escrito UMA vez, na metade esquerda (x < 110), e espelhado. A
 * primeira correção que esquecesse um dos lados deixaria a figura assimétrica
 * para sempre, e ninguém percebe isso olhando o código.
 */

const VB = { l: 220, a: 560 };
const PROPORCAO = VB.l / VB.a;

type Vista = 'frente' | 'costas';

/**
 * Marcos do corpo, em coordenadas do viewBox. Todo músculo abaixo é escrito
 * contra estes pontos — mexer num marco é mexer na anatomia inteira.
 *
 *   eixo central      x = 110
 *   topo da cabeça    y =   8      queixo            y =  76
 *   linha do ombro    y = 120      acrômio           x =  56
 *   mamilo            y = 162      axila             y = 168
 *   apêndice xifoide  y = 196      umbigo            y = 228
 *   crista ilíaca     y = 250      púbis             y = 288
 *   cotovelo          y = 262      punho             y = 350
 *   joelho            y = 415      tornozelo         y = 520
 */
interface Regiao {
  /** `null` = detalhe anatômico que nunca acende (pescoço, tendões). */
  grupo: Grupo | null;
  vista: Vista | 'ambas';
  /** Traçado da metade esquerda; espelhado automaticamente. */
  par?: string;
  /** Traçado único sobre o eixo, que não espelha. */
  centro?: string;
}

const REGIOES: Regiao[] = [
  // ═══ PESCOÇO — detalhe, nas duas vistas ═══
  {
    // Esternocleidomastoideo: do processo mastoide ao esterno. É o que dá
    // pescoço; sem ele a cabeça parece encaixada num cilindro.
    grupo: null,
    vista: 'ambas',
    par: 'M99 68 C96 82 99 100 106 118 L112 116 C107 98 104 82 105 66 Z',
  },

  // ═══ OMBRO — o capuz, visível nas duas vistas ═══
  {
    // Deltoide, porção lateral: o capuz que cobre a articulação por fora.
    grupo: 'ombros',
    vista: 'ambas',
    par: 'M63 117 C51 124 43 140 41 158 C40 171 46 180 54 179 C59 176 55 165 56 153 C57 138 60 126 63 117 Z',
  },
  {
    // Deltoide, porção anterior: nasce na clavícula e some sob o peitoral.
    grupo: 'ombros',
    vista: 'frente',
    par: 'M67 118 C59 126 55 141 54 157 C54 169 59 178 66 176 C71 167 73 151 72 137 C71 127 70 121 67 118 Z',
  },
  {
    // Deltoide, porção posterior: mais plana e mais baixa que a anterior.
    grupo: 'ombros',
    vista: 'costas',
    par: 'M66 119 C59 128 55 143 56 159 C57 172 63 179 70 175 C73 164 74 146 72 133 C71 125 69 120 66 119 Z',
  },

  // ═══════════════════════════ FRENTE ═══════════════════════════
  {
    // Trapézio superior: do pescoço ao acrômio, a rampa do ombro.
    grupo: 'trapezio',
    vista: 'frente',
    par: 'M104 76 C90 84 76 98 62 118 L72 128 C84 111 96 99 107 90 Z',
  },
  {
    // Peitoral maior, porção CLAVICULAR: fibras que descem da clavícula.
    grupo: 'peito',
    vista: 'frente',
    par: 'M106 122 C93 123 81 127 72 134 C68 140 69 147 74 150 C83 146 95 143 106 142 Z',
  },
  {
    // Peitoral maior, porção ESTERNAL: o leque, do esterno ao úmero. As duas
    // porções juntas convergem para a axila — é essa convergência que lê
    // como peitoral e não como bloco.
    grupo: 'peito',
    vista: 'frente',
    par: 'M106 144 C93 145 81 149 74 156 C70 165 72 177 79 184 C89 191 101 190 107 185 C108 173 108 157 106 144 Z',
  },
  {
    // Serrátil anterior: os dedos sobre as costelas, sob a axila. Quatro
    // digitações — o detalhe que faz a prancha ser anatomia.
    grupo: null,
    vista: 'frente',
    par:
      'M73 170 C77 172 80 174 81 177 C80 181 79 184 78 187 C75 185 72 183 70 181 C71 177 72 173 73 170 Z ' +
      'M71 184 C75 186 78 188 79 191 C78 195 77 198 76 201 C73 199 71 197 69 195 C70 191 70 187 71 184 Z ' +
      'M70 198 C74 200 76 202 77 205 C76 209 75 211 75 214 C72 212 70 210 69 208 C69 205 69 201 70 198 Z ' +
      'M70 211 C73 213 75 215 76 218 C75 221 75 223 74 226 C72 224 70 222 69 220 C69 217 69 214 70 211 Z',
  },
  {
    // Reto abdominal: quatro segmentos separados pelas intersecções
    // tendíneas. Um bloco liso aqui é o erro que faz a figura parecer boneco.
    grupo: 'abdomen',
    vista: 'frente',
    par: 'M89 152 C86 153 85 158 85 164 L85 170 C91 173 101 173 106 170 L106 152 C100 150 94 150 89 152 Z',
  },
  {
    grupo: 'abdomen',
    vista: 'frente',
    par: 'M85 175 L85 192 C91 196 101 196 106 193 L106 175 C100 178 91 178 85 175 Z',
  },
  {
    grupo: 'abdomen',
    vista: 'frente',
    par: 'M85 198 L85 215 C91 219 101 219 106 216 L106 198 C100 201 91 201 85 198 Z',
  },
  {
    // O quarto segmento é mais longo e afunila para o púbis, como o real.
    grupo: 'abdomen',
    vista: 'frente',
    par: 'M86 221 C86 234 87 248 91 258 C95 266 103 267 106 261 L106 221 C100 224 91 224 86 221 Z',
  },
  {
    // Oblíquo externo: ladeia o reto, da costela à crista ilíaca.
    grupo: 'abdomen',
    vista: 'frente',
    par: 'M75 179 C70 195 69 216 73 234 C77 249 83 256 85 251 L85 220 C84 204 84 190 84 179 C81 175 77 175 75 179 Z',
  },
  {
    // Bíceps braquial: ventre alto, afunilando ao tendão do cotovelo.
    grupo: 'biceps',
    vista: 'frente',
    par: 'M57 151 C50 163 46 183 46 203 C46 223 51 239 58 241 C65 241 68 227 67 207 C66 185 64 165 61 153 C60 149 58 148 57 151 Z',
  },
  {
    // Braquiorradial e flexores: o cordão que sai do cotovelo pelo lado do
    // polegar e afina até o punho.
    grupo: 'antebraco',
    vista: 'frente',
    par: 'M49 251 C42 263 37 283 35 305 C33 325 34 343 37 351 L47 349 C45 331 45 311 48 291 C51 273 55 259 57 253 C55 248 51 247 49 251 Z',
  },
  {
    // Quadríceps — reto femoral: a coluna central da coxa.
    grupo: 'quadriceps',
    vista: 'frente',
    par: 'M89 293 C83 301 79 323 79 347 C79 373 83 397 89 405 C95 401 97 377 97 349 C97 321 95 301 91 293 Z',
  },
  {
    // Quadríceps — vasto lateral: o ventre externo, mais alto e mais largo.
    grupo: 'quadriceps',
    vista: 'frente',
    par: 'M73 293 C67 307 65 331 67 353 C69 373 75 387 79 385 C78 363 77 335 80 311 C81 301 79 293 77 291 Z',
  },
  {
    // Quadríceps — vasto medial: a GOTA. Desce mais que os outros dois e
    // morre logo acima do joelho; é o que dá leitura de coxa treinada.
    grupo: 'quadriceps',
    vista: 'frente',
    par: 'M99 331 C96 345 95 367 97 387 C99 401 105 405 107 399 C107 381 106 357 105 337 C103 329 100 327 99 331 Z',
  },
  {
    // Sartório: da crista ilíaca à face medial do joelho, cruzando a coxa na
    // diagonal. O músculo mais longo do corpo.
    grupo: 'quadriceps',
    vista: 'frente',
    par: 'M77 289 C79 307 85 331 93 353 C99 371 103 387 105 397 L109 393 C105 377 99 357 92 337 C85 317 81 301 80 287 Z',
  },
  {
    // Adutores: a massa interna da coxa.
    grupo: 'posterior',
    vista: 'frente',
    par: 'M101 293 C97 307 97 329 100 349 C102 363 107 369 109 363 L109 293 Z',
  },
  {
    // Tibial anterior: o cordão do lado de fora da canela.
    grupo: 'panturrilha',
    vista: 'frente',
    par: 'M85 429 C81 443 79 465 80 487 C81 503 85 513 88 511 C88 491 89 467 91 449 C92 437 89 427 85 429 Z',
  },
  {
    // Gastrocnêmio, cabeça medial: aparece de frente porque é mais bojuda.
    grupo: 'panturrilha',
    vista: 'frente',
    par: 'M97 431 C94 447 93 469 96 487 C98 499 104 501 105 493 C105 475 104 453 102 435 C101 429 98 427 97 431 Z',
  },

  // ═══════════════════════════ COSTAS ═══════════════════════════
  {
    // Trapézio: o losango inteiro, do occipital aos acrômios e descendo até
    // T12. É uma peça só e centrada — espelhar daria uma costura no meio.
    grupo: 'trapezio',
    vista: 'costas',
    centro:
      'M110 70 C96 74 78 88 62 113 L73 125 C87 107 99 97 110 93 C121 97 133 107 147 125 L158 113 C142 88 124 74 110 70 Z ' +
      'M110 97 C98 101 88 109 83 119 C89 149 97 181 110 209 C123 181 131 149 137 119 C132 109 122 101 110 97 Z',
  },
  {
    // Infraespinhal e redondo maior: o par sobre a escápula, acima do dorsal.
    grupo: 'costas',
    vista: 'costas',
    par: 'M71 131 C65 141 63 155 66 165 C71 173 81 173 85 165 C85 153 82 139 77 131 Z',
  },
  {
    // Latíssimo do dorso: a ASA. Da axila e do úmero abrindo até a cintura —
    // é ele, e só ele, que faz o V das costas.
    grupo: 'costas',
    vista: 'costas',
    par: 'M69 159 C63 177 63 201 69 221 C75 239 87 249 95 245 C97 223 93 191 83 167 C78 157 72 153 69 159 Z',
  },
  {
    // Tríceps, cabeça longa: sobe até a escápula, por dentro.
    grupo: 'triceps',
    vista: 'costas',
    par: 'M61 147 C56 161 52 181 52 201 C52 221 57 239 63 241 C69 239 70 221 69 201 C68 181 66 161 64 149 Z',
  },
  {
    // Tríceps, cabeça lateral: por fora, mais curta, morre acima do cotovelo.
    grupo: 'triceps',
    vista: 'costas',
    par: 'M51 151 C45 165 42 183 43 201 C44 217 48 229 52 229 C53 211 53 187 56 167 C57 157 54 149 51 151 Z',
  },
  {
    grupo: 'antebraco',
    vista: 'costas',
    par: 'M47 251 C40 263 36 285 34 307 C32 327 34 343 37 351 L47 349 C44 331 44 311 47 291 C50 273 54 259 56 253 C54 248 50 247 47 251 Z',
  },
  {
    // Eretores da espinha: as duas colunas que ladeiam a lombar.
    grupo: 'lombar',
    vista: 'costas',
    par: 'M97 201 C93 217 92 239 95 255 C98 267 106 269 108 261 L108 203 C104 198 99 197 97 201 Z',
  },
  {
    // Glúteo médio: o leque alto e externo, acima do máximo.
    grupo: 'gluteos',
    vista: 'costas',
    par: 'M77 251 C69 255 64 265 65 275 C71 269 79 263 89 261 C89 255 85 250 77 251 Z',
  },
  {
    grupo: 'gluteos',
    vista: 'costas',
    par: 'M75 257 C65 267 61 287 67 303 C75 317 93 319 101 307 C105 291 104 269 99 257 C91 251 81 251 75 257 Z',
  },
  {
    // Isquiotibiais — bíceps femoral: o ventre externo do posterior.
    grupo: 'posterior',
    vista: 'costas',
    par: 'M73 313 C68 331 67 357 71 381 C74 397 80 405 84 401 C83 379 83 349 85 325 C85 315 77 307 73 313 Z',
  },
  {
    // Isquiotibiais — semitendinoso: o ventre interno, que desce mais reto.
    grupo: 'posterior',
    vista: 'costas',
    par: 'M93 313 C90 333 90 359 93 381 C96 397 103 403 106 397 C105 375 104 345 103 321 C101 311 95 307 93 313 Z',
  },
  {
    // Gastrocnêmio, cabeça lateral.
    grupo: 'panturrilha',
    vista: 'costas',
    par: 'M77 425 C71 441 69 463 73 481 C76 493 83 495 85 487 C85 467 84 445 83 429 C82 421 79 420 77 425 Z',
  },
  {
    // Gastrocnêmio, cabeça medial: mais baixa e mais cheia que a lateral. As
    // duas juntas formam o losango da panturrilha.
    grupo: 'panturrilha',
    vista: 'costas',
    par: 'M97 425 C94 443 93 469 97 489 C100 501 107 501 108 491 C108 469 106 443 103 427 C101 420 98 419 97 425 Z',
  },
  {
    // Sóleo: aparece por baixo do gastrocnêmio, nos lados da canela.
    grupo: null,
    vista: 'costas',
    par: 'M79 481 C75 493 74 507 76 517 L85 515 C84 505 84 493 85 485 Z',
  },
];

/** Espelha o traçado da metade esquerda para a direita. */
function Par({ d }: { d: string }) {
  return (
    <>
      <Path d={d} />
      <G transform={`translate(${VB.l},0) scale(-1,1)`}>
        <Path d={d} />
      </G>
    </>
  );
}

/**
 * O que não é músculo nomeado: cabeça, pescoço, o tronco por baixo, os
 * segmentos dos membros, mãos e pés.
 *
 * Existe por baixo de tudo para que não sobre vão entre um músculo e outro —
 * sem esta camada, a figura vira um arquipélago de manchas soltas.
 */
function Estrutura({ cor, traco }: { cor: string; traco: string }) {
  return (
    <G fill={cor} stroke={traco} strokeWidth={1.3} strokeLinejoin="round">
      <Ellipse cx={110} cy={42} rx={23} ry={34} />
      <Path d="M97 66 L97 100 C102 109 118 109 123 100 L123 66 Z" />
      {/* Tronco: ombro em 2,3 cabeças, cintura em 1,6 — proporção de atleta. */}
      <Path d="M64 118 C56 140 54 170 58 200 C62 226 70 244 72 262 C72 278 70 288 72 296 L148 296 C150 288 148 278 148 262 C150 244 158 226 162 200 C166 170 164 140 156 118 C140 106 80 106 64 118 Z" />
      {/* Braços */}
      <Path d="M58 116 C46 126 40 150 38 180 C36 212 35 240 36 262 C34 286 32 320 33 352 L51 352 C51 320 52 288 53 264 C55 240 57 212 61 184 C64 156 68 132 72 122 Z" />
      <Path d="M162 116 C174 126 180 150 182 180 C184 212 185 240 184 262 C186 286 188 320 187 352 L169 352 C169 320 168 288 167 264 C165 240 163 212 159 184 C156 156 152 132 148 122 Z" />
      {/* Mãos */}
      <Path d="M31 352 C27 366 28 386 34 398 C40 404 50 402 52 392 C53 376 52 362 51 352 Z" />
      <Path d="M189 352 C193 366 192 386 186 398 C180 404 170 402 168 392 C167 376 168 362 169 352 Z" />
      {/* Pernas */}
      <Path d="M72 296 C64 320 62 356 66 396 C68 420 70 440 72 460 C74 484 76 508 78 528 L100 528 C100 508 99 484 100 460 C102 440 104 420 104 396 C106 356 106 320 106 296 Z" />
      <Path d="M148 296 C156 320 158 356 154 396 C152 420 150 440 148 460 C146 484 144 508 142 528 L120 528 C120 508 121 484 120 460 C118 440 116 420 116 396 C114 356 114 320 114 296 Z" />
      {/* Pés */}
      <Path d="M76 528 C70 541 72 551 84 551 L102 551 C104 543 104 534 102 528 Z" />
      <Path d="M144 528 C150 541 148 551 136 551 L118 551 C116 543 116 534 118 528 Z" />
    </G>
  );
}

function Figura({
  vista,
  intensidade,
  atraso,
  largura,
  rotulo = true,
}: {
  vista: Vista;
  intensidade: Map<Grupo, number>;
  atraso: number;
  largura: number;
  rotulo?: boolean;
}) {
  const c = usarPaleta();
  const p = useSharedValue(0);
  const reduzido = useReducedMotion();

  useEffect(() => {
    if (reduzido) {
      p.set(1);
      return;
    }
    p.set(0);
    p.set(withDelay(atraso, withTiming(1, { duration: dur.calor, easing: curva.suave })));
  }, [atraso, reduzido, p]);

  const estilo = useAnimatedStyle(() => ({ opacity: p.get() }));

  const daVista = REGIOES.filter((r) => r.vista === vista || r.vista === 'ambas');
  const acesa = (r: Regiao) => r.grupo !== null && intensidade.has(r.grupo);
  const inertes = daVista.filter((r) => !acesa(r));
  const ativas = daVista.filter(acesa);

  const altura = largura / PROPORCAO;
  const viewBox = `0 0 ${VB.l} ${VB.a}`;
  const desenhar = (r: Regiao, i: number) =>
    r.centro ? <Path key={i} d={r.centro} /> : <Par key={i} d={r.par!} />;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: largura, height: altura }}>
        <Svg width={largura} height={altura} viewBox={viewBox}>
          <Estrutura cor={c.silhueta} traco={c.silhuetaTraco} />
          {/* Músculos em repouso: mesmo tom do corpo, contornados. A prancha
              já se lê como anatomia mesmo sem nenhum destaque. */}
          <G fill={c.silhueta} stroke={c.silhuetaTraco} strokeWidth={1.1} strokeLinejoin="round">
            {inertes.map(desenhar)}
          </G>
        </Svg>

        <Animated.View style={[StyleSheet.absoluteFill, estilo]} pointerEvents="none">
          <Svg width={largura} height={altura} viewBox={viewBox}>
            {ativas.map((r, i) => (
              // O contorno é na cor do CORPO, não do músculo: é o que separa
              // vizinhos que se encostam quando os dois acendem.
              <G
                key={i}
                fill={corDeCalor(c, intensidade.get(r.grupo!)!)}
                stroke={c.silhueta}
                strokeWidth={1.5}
                strokeLinejoin="round"
              >
                {desenhar(r, i)}
              </G>
            ))}
          </Svg>
        </Animated.View>
      </View>

      {rotulo ? (
        <Rotulo cor={c.tintaFraca} style={{ marginTop: sp.sm }}>
          {vista === 'frente' ? 'Frente' : 'Costas'}
        </Rotulo>
      ) : null}
    </View>
  );
}

export function MapaMuscular({
  musculos,
  atraso = 0,
  largura = 96,
  /** Desligado no cartão de compartilhar, que vira imagem e não recebe toque. */
  interativo = true,
  /** Qual sessão o modelo 3D deve mostrar. Ausente = a que está em curso. */
  sessaoId,
}: {
  musculos: MusculoTrabalhado[];
  atraso?: number;
  largura?: number;
  interativo?: boolean;
  sessaoId?: string;
}) {
  const c = usarPaleta();
  const intensidade = intensidadePorGrupo(musculos);

  const prancha = (
    <View style={estilos.raiz}>
      <Figura vista="frente" intensidade={intensidade} atraso={atraso} largura={largura} />
      <Figura vista="costas" intensidade={intensidade} atraso={atraso + 160} largura={largura} />
    </View>
  );

  if (!interativo) return prancha;

  return (
    <Pressavel
      onPress={() => router.push(sessaoId ? `/corpo?sessao=${sessaoId}` : '/corpo')}
      escala={0.985}
      accessibilityRole="button"
      accessibilityLabel="Abrir o modelo em três dimensões dos músculos trabalhados"
      style={estilos.toque}
    >
      {prancha}
      <Rotulo cor={c.acento} style={{ marginTop: sp.md, textAlign: 'center' }}>
        Toque para girar em 3D
      </Rotulo>
    </Pressavel>
  );
}

const estilos = StyleSheet.create({
  raiz: { flexDirection: 'row', justifyContent: 'center', gap: sp.h1 },
  toque: { paddingVertical: sp.sm },
});
