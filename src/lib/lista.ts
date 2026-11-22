// A lista de jogadores (base + meus) com o overall já calculado, a busca e o
// filtro por setor. É a mesma no celular e no PC.

import { atributosDe, contexto, principalDe } from './fmrte'
import { calcular } from './overall'
import type { Posicao, Setor } from './posicoes'
import type { Registro } from './registro'

export interface Linha {
  r: Registro
  principal: Posicao
  /** "Barcelona · 2005/06" */
  onde: string
  ca: number
  ovr: number
  busca: string
}

export type FiltroSetor = Setor | 'TODOS'
export const FILTROS: FiltroSetor[] = ['TODOS', 'GOL', 'DEF', 'MEI', 'ATA']

/** Do maior CA para o menor; empate, pelo nome. */
export function linhasDe(registros: Registro[]): Linha[] {
  return registros
    .map((r) => {
      const principal = principalDe(r.dados)
      const onde = contexto(r.dados)
      const { ca, ovr } = calcular(atributosDe(r.dados), principal)
      const busca = [r.nome, onde, r.dados.Nation.Name].join(' ').toLocaleLowerCase('pt')
      return { r, principal, onde, ca, ovr, busca }
    })
    .sort((a, b) => b.ca - a.ca || a.r.nome.localeCompare(b.r.nome, 'pt'))
}

/** Busca por nome, clube, temporada ou nação, e filtro por setor. */
export function filtrar(linhas: Linha[], busca: string, setor: FiltroSetor): Linha[] {
  const termo = busca.trim().toLocaleLowerCase('pt')
  return linhas.filter((l) => (setor === 'TODOS' || l.principal.setor === setor) && (!termo || l.busca.includes(termo)))
}
