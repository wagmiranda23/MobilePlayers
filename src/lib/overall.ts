// O cálculo do overall: atributos → CA estimado → OVR na escala FIFA.
//
// 1. Média ponderada dos atributos com os pesos da posição (`pesos.ts`).
// 2. CA = A × média + B. A reta foi ajustada com sete exports reais do FMRTE
//    (`tests/fixtures/`), e o erro máximo ficou em 8 pontos de CA.
//    A relação não é proporcional: o FM cobra mais CA por atributo alto.
// 3. OVR = `fmParaFifa(CA)`: de CA 70 para cima é a tabela do `fmToFifa` de
//    `C:\dev\legends\lib\utils.ts`, para o número bater com o do Manager's
//    Club. Abaixo disso a escala é nossa: desce em linha reta até 40.

import { PESOS, type Perfil } from './pesos'
import { POSICOES, type Posicao } from './posicoes'

/** Todos os atributos num objeto só, chave do FMRTE → valor de 1 a 20. */
export type Atributos = Record<string, number>

export const CALIBRACAO = { A: 20.574, B: -133.061 } as const

export function peFraco(a: Atributos): number {
  return Math.min(a.LeftFoot ?? 1, a.RightFoot ?? 1)
}

export function mediaPonderada(a: Atributos, perfil: Perfil): number {
  const pesos = PESOS[perfil]
  let soma = 0
  let total = 0
  for (const [chave, peso] of Object.entries(pesos)) {
    const v = chave === 'WeakerFoot' ? peFraco(a) : (a[chave] ?? 1)
    soma += v * peso
    total += peso
  }
  return soma / total
}

export function estimarCA(a: Atributos, perfil: Perfil): number {
  const ca = CALIBRACAO.A * mediaPonderada(a, perfil) + CALIBRACAO.B
  return Math.max(1, Math.min(200, Math.round(ca)))
}

/**
 * CA (1–200) → OVR (escala FIFA). De CA 70 para cima, a tabela do Manager's
 * Club. Lá, tudo abaixo de 70 vira 60; aqui a escala continua: CA 69 = 60,
 * CA 1 = 40, em linha reta.
 */
export function fmParaFifa(ca: number): number {
  const faixas: [number, number][] = [
    [199, 98], [198, 97], [196, 96], [195, 95], [193, 94], [192, 93], [190, 92], [189, 91],
    [187, 90], [186, 89], [181, 88], [179, 87], [172, 86], [169, 85], [163, 84], [159, 83],
    [153, 82], [149, 81], [143, 80], [140, 79], [137, 78], [134, 77], [131, 76], [128, 75],
    [126, 74], [122, 73], [120, 72], [118, 71], [114, 70], [110, 69], [106, 68], [100, 67],
    [95, 66], [90, 65], [85, 64], [80, 63], [75, 62], [70, 61],
  ]
  for (const [min, ovr] of faixas) if (ca >= min) return ovr
  return Math.round(40 + ((Math.max(1, ca) - 1) * 20) / 68)
}

export type Faixa = 'elite' | 'rubi' | 'ouro' | 'prata' | 'bronze' | 'grafite'

/** As faixas de cor do OVR, os mesmos cortes de `ratingClass(…, 'fifa')` do Manager's Club. */
export function faixaDoOvr(ovr: number): Faixa {
  if (ovr >= 90) return 'elite'
  if (ovr >= 86) return 'rubi'
  if (ovr >= 82) return 'ouro'
  if (ovr >= 78) return 'prata'
  if (ovr >= 63) return 'bronze'
  return 'grafite'
}

export interface Resultado {
  posicao: Posicao
  media: number
  ca: number
  ovr: number
}

export function calcular(a: Atributos, posicao: Posicao): Resultado {
  const ca = estimarCA(a, posicao.perfil)
  return { posicao, media: mediaPonderada(a, posicao.perfil), ca, ovr: fmParaFifa(ca) }
}

/** O OVR do jogador em cada uma das 14 posições, do maior para o menor. */
export function porPosicao(a: Atributos): Resultado[] {
  return POSICOES.map((p) => calcular(a, p)).sort((x, y) => y.ca - x.ca)
}

/**
 * `ActualRating`/`PotentialRating` do FMRTE a partir de CA/PA. Reta ajustada nos
 * mesmos sete exports (erro de até ~4 pontos). A regra "CA/2.1" do
 * `legends/shared.js` não bate com os dados reais: daria 92 para o Mbappé, que tem 84,76.
 */
export function ratingFmrte(caOuPa: number): number {
  return Math.round((0.3101 * caOuPa + 24.382) * 100) / 100
}
