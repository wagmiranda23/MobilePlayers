// A base de jogadores: o que está em `src/data/jogadores/` (o Claude gera
// esses arquivos) mais o que o usuário criou ou importou no próprio aparelho
// (fica no localStorage do navegador, e só ali: daí o backup).

import { normalizar, type JogadorFmrte } from './fmrte'
import { doAparelho, type Registro } from './registro'

const arquivos = import.meta.glob<unknown>('../data/jogadores/*.json', { eager: true, import: 'default' })

export const BASE: Registro[] = Object.entries(arquivos)
  .map(([caminho, bruto]) => {
    const arquivo = decodeURIComponent(caminho.split('/').pop()!.replace(/\.json$/i, ''))
    const dados = normalizar(bruto)
    return { id: `base:${arquivo}`, nome: dados.Name || arquivo, origem: 'base' as const, dados, arquivo }
  })
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

const CHAVE_MEUS = 'mobileplayers.meus'
const CHAVE_RASCUNHO = 'mobileplayers.rascunho'
const CHAVE_BACKUP = 'mobileplayers.ultimoBackup'

function ler<T>(chave: string, padrao: T): T {
  try {
    const t = localStorage.getItem(chave)
    return t ? (JSON.parse(t) as T) : padrao
  } catch {
    return padrao
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // modo privado ou armazenamento cheio: segue sem salvar
  }
}

export function lerMeus(): Registro[] {
  return ler<Partial<Registro>[]>(CHAVE_MEUS, [])
    .map(doAparelho)
    .filter((r): r is Registro => r !== null)
}

export function gravarMeus(lista: Registro[]) {
  gravar(CHAVE_MEUS, lista.map(({ id, dados, atualizadoEm }) => ({ id, dados, atualizadoEm })))
}

export interface Rascunho {
  dados: JogadorFmrte
  /** id do registro "meu" que está sendo editado, se for edição. */
  editando?: string
}

export function lerRascunho(): Rascunho | null {
  const r = ler<(Rascunho & { nome?: string }) | null>(CHAVE_RASCUNHO, null)
  if (!r) return null
  try {
    const dados = normalizar(r.dados)
    if (!dados.Name && r.nome) dados.Name = r.nome
    return { dados, editando: r.editando }
  } catch {
    return null
  }
}

export function gravarRascunho(r: Rascunho) {
  gravar(CHAVE_RASCUNHO, r)
}

export function lerUltimoBackup(): number | null {
  return ler<number | null>(CHAVE_BACKUP, null)
}

export function gravarUltimoBackup(quando = Date.now()) {
  gravar(CHAVE_BACKUP, quando)
}
