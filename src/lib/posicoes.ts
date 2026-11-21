// As 14 posições que o FMRTE exporta em `Positions` (o líbero, 15º slot do
// jogo, não vem no export). Aptidão de 1 a 20: 20 é natural.
//
// As siglas aqui são as do futebol brasileiro. Não use as de
// `POSITION_ABREV` do LiveEditor24: lá "ZAG-E" é o lateral esquerdo.

import type { Perfil } from './pesos'

export type Setor = 'GOL' | 'DEF' | 'MEI' | 'ATA'

export interface Posicao {
  chave: string
  sigla: string
  nome: string
  perfil: Perfil
  setor: Setor
}

export const POSICOES: Posicao[] = [
  { chave: 'Goalkeeper', sigla: 'GOL', nome: 'Goleiro', perfil: 'GOLEIRO', setor: 'GOL' },
  { chave: 'DefenderCentral', sigla: 'ZAG', nome: 'Zagueiro', perfil: 'ZAGUEIRO', setor: 'DEF' },
  { chave: 'DefenderLeft', sigla: 'LE', nome: 'Lateral esquerdo', perfil: 'LATERAL', setor: 'DEF' },
  { chave: 'DefenderRight', sigla: 'LD', nome: 'Lateral direito', perfil: 'LATERAL', setor: 'DEF' },
  { chave: 'WingBackLeft', sigla: 'ALE', nome: 'Ala esquerdo', perfil: 'LATERAL', setor: 'DEF' },
  { chave: 'WingBackRight', sigla: 'ALD', nome: 'Ala direito', perfil: 'LATERAL', setor: 'DEF' },
  { chave: 'DefensiveMidfielder', sigla: 'VOL', nome: 'Volante', perfil: 'VOLANTE', setor: 'MEI' },
  { chave: 'MidfielderCentral', sigla: 'MC', nome: 'Meio-campo', perfil: 'MEIO_CAMPO', setor: 'MEI' },
  { chave: 'MidfielderLeft', sigla: 'ME', nome: 'Meia esquerdo', perfil: 'MEIA_ABERTO', setor: 'MEI' },
  { chave: 'MidfielderRight', sigla: 'MD', nome: 'Meia direito', perfil: 'MEIA_ABERTO', setor: 'MEI' },
  { chave: 'AttackingMidCentral', sigla: 'MEI', nome: 'Meia-atacante', perfil: 'MEIA_ATACANTE', setor: 'MEI' },
  { chave: 'AttackingMidLeft', sigla: 'PE', nome: 'Ponta esquerda', perfil: 'PONTA', setor: 'ATA' },
  { chave: 'AttackingMidRight', sigla: 'PD', nome: 'Ponta direita', perfil: 'PONTA', setor: 'ATA' },
  { chave: 'Striker', sigla: 'ATA', nome: 'Atacante', perfil: 'ATACANTE', setor: 'ATA' },
]

export const POSICAO: Record<string, Posicao> = Object.fromEntries(POSICOES.map((p) => [p.chave, p]))

/** Aptidão a partir da qual a posição conta como "joga ali" — o mesmo corte do `liveapi.py`. */
export const APTIDAO_COBRE = 15

/** A posição de maior aptidão. Em empate, vale a ordem de `POSICOES`. */
export function posicaoPrincipal(aptidoes: Record<string, number>): Posicao {
  let melhor = POSICOES[0]
  for (const p of POSICOES) {
    if ((aptidoes[p.chave] ?? 0) > (aptidoes[melhor.chave] ?? 0)) melhor = p
  }
  return melhor
}

/**
 * Os níveis de aptidão do FM, pelas faixas do jogo (18–20 natural, 15–17
 * experiente…). `valor` é o que o app grava ao escolher o nível: a posição
 * principal é sempre 20, então uma segunda posição natural fica em 19.
 */
export interface Nivel {
  id: 'natural' | 'experiente' | 'competente' | 'fraco' | 'desajeitado' | 'ineficaz'
  nome: string
  min: number
  valor: number
  /** Cor do círculo no campinho. */
  cor: string
}

export const NIVEIS: Nivel[] = [
  { id: 'natural', nome: 'Natural', min: 18, valor: 19, cor: 'bg-emerald-500 text-emerald-950' },
  { id: 'experiente', nome: 'Experiente', min: 15, valor: 16, cor: 'bg-lime-400 text-lime-950' },
  { id: 'competente', nome: 'Competente', min: 12, valor: 13, cor: 'bg-yellow-400 text-yellow-950' },
  { id: 'fraco', nome: 'Pouco convincente', min: 9, valor: 10, cor: 'bg-orange-400 text-orange-950' },
  { id: 'desajeitado', nome: 'Desajeitado', min: 5, valor: 6, cor: 'bg-red-500/70 text-white' },
  { id: 'ineficaz', nome: 'Ineficaz', min: 0, valor: 1, cor: 'bg-white/8 text-[var(--apagado)]' },
]

export function nivelDe(aptidao: number): Nivel {
  return NIVEIS.find((n) => aptidao >= n.min) ?? NIVEIS[NIVEIS.length - 1]
}

/** Onde cada posição fica no campinho (em %), com o ataque no alto, como no FM. */
export const NO_CAMPO: Record<string, { x: number; y: number }> = {
  Striker: { x: 50, y: 9 },
  AttackingMidLeft: { x: 15, y: 25 },
  AttackingMidCentral: { x: 50, y: 25 },
  AttackingMidRight: { x: 85, y: 25 },
  MidfielderLeft: { x: 15, y: 41 },
  MidfielderCentral: { x: 50, y: 41 },
  MidfielderRight: { x: 85, y: 41 },
  WingBackLeft: { x: 15, y: 57 },
  DefensiveMidfielder: { x: 50, y: 57 },
  WingBackRight: { x: 85, y: 57 },
  DefenderLeft: { x: 15, y: 73 },
  DefenderCentral: { x: 50, y: 73 },
  DefenderRight: { x: 85, y: 73 },
  Goalkeeper: { x: 50, y: 90 },
}

export const COR_SETOR: Record<Setor, string> = {
  GOL: 'bg-amber-500/20 text-amber-300',
  DEF: 'bg-sky-500/20 text-sky-300',
  MEI: 'bg-emerald-500/20 text-emerald-300',
  ATA: 'bg-rose-500/20 text-rose-300',
}
