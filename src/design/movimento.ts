/**
 * O sistema de movimento.
 *
 * A direção é TELEMETRIA: um instrumento de medição. Isso dita a personalidade
 * do movimento antes de qualquer valor — **instrumento não tem elasticidade**.
 * A varredura de um scanner corre em velocidade constante do começo ao fim; ela
 * não acelera porque está animada, ela corre porque está medindo. Por isso a
 * curva padrão do app é `linear`, o que em quase todo outro produto seria erro.
 *
 * As molas existem, mas são raras e têm endereço: só os dois momentos que
 * comemoram algo — o selo de exercício fechado e a marca de recorde. Ali o
 * movimento tem massa porque ali ele está celebrando, não medindo.
 *
 * ─── A regra que não se negocia ──────────────────────────────────────────────
 *
 * O estado muda no `onPressIn`. A animação **acompanha** o que já aconteceu,
 * nunca decide quando acontece. Um ✓ que espera 500ms de varredura para
 * registrar a série é um bug, não um efeito — o usuário está com a mão na barra
 * e o dedo suado, e vai tocar de novo achando que falhou.
 *
 * ─── Escalonamento por raridade ──────────────────────────────────────────────
 *
 * "Retorno em tudo" só não cansa se o tamanho do retorno for proporcional à
 * raridade do evento. Três faixas:
 *
 *   CONSTANTE  toque, digitação          → 90–140ms, imperceptível como animação
 *   FREQUENTE  concluir série, descanso  → 320–500ms, notável mas curto
 *   RARO       exercício fechado, recorde → 520ms–1,6s, com licença para molas
 *
 * O que acontece dezenas de vezes por sessão vive na primeira faixa. Trocar de
 * aba não anima nada além da própria marca da aba: acontece demais.
 */

import { Easing, ReduceMotion, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/**
 * Curvas.
 *
 * `linear` é a assinatura da direção e o padrão de tudo que varre ou preenche.
 * `saida` desacelera no fim e serve para o que ENTRA na tela — nunca use
 * ease-in em interface: atrasa justamente o instante que se está olhando.
 */
export const curva = {
  /** Velocidade constante. A varredura, o trilho de descanso, a barra que enche. */
  linear: Easing.linear,
  /** Desaceleração forte. Entradas, aberturas, o que assenta. */
  saida: Easing.bezier(0.22, 1, 0.32, 1),
  /** Desaceleração suave. Mudanças de cor e de tom, que não devem chamar atenção. */
  suave: Easing.out(Easing.cubic),
  /** Ida e volta simétrica. Só para pulso — o que cresce e volta ao mesmo lugar. */
  pulso: Easing.inOut(Easing.quad),
} as const;

/**
 * Durações, em milissegundos, nomeadas pelo EVENTO e não pelo tamanho — assim
 * mudar o ritmo do app é mudar um número aqui, não caçar `300` pelo código.
 */
export const dur = {
  /** Press-in e press-out. Abaixo de ~80ms o olho não registra a compressão. */
  toque: 90,
  /** A célula assumindo a cor de "escrito por você", no primeiro caractere. */
  digito: 140,
  /** Troca de tom, de borda, de fundo. */
  estado: 200,
  /** Entrada de linha nova numa lista. */
  entrada: 240,
  /** A marca da aba deslizando entre posições. */
  aba: 180,
  /** A tira de descanso abrindo ou fechando espaço. */
  descanso: 320,
  /** A VARREDURA: o retorno de concluir uma série. Linear, sempre. */
  varredura: 500,
  /** O ✓ desenhando o próprio traço. Roda junto com a varredura. */
  tique: 340,
  /** Número subindo de zero até o valor. */
  contador: 700,
  /** Região da prancha migrando de degrau na rampa térmica. */
  calor: 800,
  /** Marca de recorde cravando. */
  recorde: 520,
  /** Selo de exercício fechado: entra, segura, sai. */
  selo: 1600,
} as const;

/**
 * Molas — as duas únicas do app.
 *
 * `dampingRatio` abaixo de 1 é o que dá o repique. `overshootClamping: false`
 * é explícito porque sem ele o selo passa do tamanho final e cresce demais
 * antes de assentar.
 */
export const mola = {
  /** O selo de exercício fechado. Vem de longe e assenta com sobra mínima. */
  selo: {
    duration: 520,
    dampingRatio: 0.66,
    overshootClamping: false,
  } satisfies WithSpringConfig,
  /** A marca de recorde. Mais curta e mais seca — crava, não balança. */
  recorde: {
    duration: 420,
    dampingRatio: 0.78,
    overshootClamping: false,
  } satisfies WithSpringConfig,
  /** Pulo de escala de um valor que acabou de mudar. */
  valor: {
    duration: 340,
    dampingRatio: 0.6,
    overshootClamping: false,
  } satisfies WithSpringConfig,
} as const;

/** Atalhos de `withTiming` já com a curva certa. */
export const t = {
  toque: { duration: dur.toque, easing: curva.saida } satisfies WithTimingConfig,
  estado: { duration: dur.estado, easing: curva.suave } satisfies WithTimingConfig,
  entrada: { duration: dur.entrada, easing: curva.saida } satisfies WithTimingConfig,
  varredura: { duration: dur.varredura, easing: curva.linear } satisfies WithTimingConfig,
  tique: { duration: dur.tique, easing: curva.saida } satisfies WithTimingConfig,
  calor: { duration: dur.calor, easing: curva.suave } satisfies WithTimingConfig,
} as const;

/**
 * Escalas de compressão ao toque, por peso do alvo.
 *
 * O que é grande comprime menos: um botão de largura total encolhendo 4% lê
 * como se a tela toda tivesse tremido. Opacidade sozinha — que era o que o app
 * usava antes — lê como componente morto, porque nada no mundo físico fica
 * translúcido quando você aperta.
 */
export const compressao = {
  /** Barra de ação de largura total. */
  barra: 0.985,
  /** Linha de lista, linha de série. */
  linha: 0.978,
  /** Botão comum, chip. */
  botao: 0.965,
  /** Alvo pequeno: ✓, ícone, tecla. */
  tecla: 0.93,
  /** Sem compressão — abas, e qualquer coisa que aconteça dezenas de vezes. */
  nenhuma: 1,
} as const;

/**
 * `ReduceMotion.System` deixa o Reanimated respeitar a preferência do sistema
 * sozinho, sem cada componente precisar checar. Onde a animação é a única
 * indicação de que algo mudou, o componente ainda precisa tratar o caso à mão
 * com `useReducedMotion` — desligar o movimento não pode desligar a informação.
 */
export const reduzir = ReduceMotion.System;
