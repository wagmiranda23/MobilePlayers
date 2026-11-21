// Um jogador como o app guarda (dados do FMRTE + de onde veio), e o backup.
// Tudo aqui é puro, sem localStorage nem Vite, para dar para testar.

import { normalizar, type JogadorFmrte } from './fmrte'

export type Origem = 'base' | 'meu'

export interface Registro {
  id: string
  /** O `Name` do JSON (ou o nome do arquivo, se o JSON não tiver). */
  nome: string
  origem: Origem
  dados: JogadorFmrte
  atualizadoEm?: number
  /** Só da base: o nome do arquivo, sem `.json`. Também vira o nome do arquivo exportado. */
  arquivo?: string
}

export function novoId(): string {
  return `meu:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Um registro "meu" a partir dos dados; o nome sai do `Name`. */
export function registroMeu(dados: JogadorFmrte, id = novoId(), atualizadoEm = Date.now()): Registro {
  return { id, nome: dados.Name || 'Sem nome', origem: 'meu', dados, atualizadoEm }
}

/** "85139014-Kylian Mbappé.json" → "Kylian Mbappé": tira a extensão e o id que o FMRTE põe na frente. */
export function nomeDoArquivo(arquivo: string): string {
  return arquivo
    .replace(/\.json$/i, '')
    .replace(/^\d+-/, '')
    .trim()
}

/** Lê um registro gravado, aceitando o formato antigo (nome fora do JSON). */
export function doAparelho(r: Partial<Registro>): Registro | null {
  try {
    const dados = normalizar(r.dados)
    if (!dados.Name && r.nome) dados.Name = r.nome
    return registroMeu(dados, r.id || novoId(), r.atualizadoEm ?? Date.now())
  } catch {
    return null
  }
}

interface Backup {
  app: 'MobilePlayers'
  versao: 1
  exportadoEm: string
  jogadores: { id: string; dados: JogadorFmrte; atualizadoEm?: number }[]
}

export function montarBackup(meus: Registro[], agora = new Date()): string {
  const b: Backup = {
    app: 'MobilePlayers',
    versao: 1,
    exportadoEm: agora.toISOString(),
    jogadores: meus.map(({ id, dados, atualizadoEm }) => ({ id, dados, atualizadoEm })),
  }
  return JSON.stringify(b, null, 2)
}

export function nomeDoBackup(hoje = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0')
  return `MobilePlayers backup ${hoje.getFullYear()}-${d(hoje.getMonth() + 1)}-${d(hoje.getDate())}`
}

/**
 * Lê um arquivo ou texto colado: um backup do app, um jogador do FMRTE, ou uma
 * lista de jogadores. Jogador sem `Name` leva o nome do arquivo.
 */
export function lerImportado(texto: string, arquivo = ''): { backup: boolean; registros: Registro[] } {
  const bruto = JSON.parse(texto.replace(/^﻿/, '')) as unknown
  const b = bruto as Partial<Backup> | null
  if (b && b.app === 'MobilePlayers' && Array.isArray(b.jogadores)) {
    return {
      backup: true,
      registros: b.jogadores.map(doAparelho).filter((r): r is Registro => r !== null),
    }
  }
  const lista = Array.isArray(bruto) ? bruto : [bruto]
  const nome = nomeDoArquivo(arquivo)
  return {
    backup: false,
    registros: lista.map((item) => {
      const dados = normalizar(item)
      if (!dados.Name && nome) dados.Name = nome
      return registroMeu(dados)
    }),
  }
}

/** Junta o que chegou com o que já está no aparelho. Mesmo id: o que chegou substitui. */
export function mesclar(meus: Registro[], chegando: Registro[]): { lista: Registro[]; novos: number; atualizados: number } {
  const porId = new Map(chegando.map((r) => [r.id, r]))
  let atualizados = 0
  const lista = meus.map((m) => {
    const veio = porId.get(m.id)
    if (!veio) return m
    porId.delete(m.id)
    atualizados++
    return veio
  })
  return { lista: [...porId.values(), ...lista], novos: porId.size, atualizados }
}
