// Sincronia com o PC: o iPhone manda os jogadores dele para o programinha do
// PC (`servidor/pc.ts`), que grava na pasta `meus/`. O caminho é a rede do
// Tailscale (https://<pc>.<rede>.ts.net), então funciona até no 4G.
//
// Com o PC desligado, cada mudança vai para uma fila guardada no aparelho.
// O iOS não deixa app web rodar em segundo plano: a fila é enviada quando o
// app está aberto e o PC responde (ao abrir, ao voltar para a tela e a cada
// 30 segundos).

import { doAparelho, type Registro } from './registro'

export type Operacao = 'salvar' | 'excluir'
/** id do jogador → o que falta fazer no PC. `em` diferencia duas mudanças seguidas no mesmo jogador. */
export type Fila = Record<string, { op: Operacao; em: number }>

const CHAVE_PC = 'mobileplayers.pc'
const CHAVE_FILA = 'mobileplayers.fila'

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
    // segue sem salvar
  }
}

export const lerEnderecoPc = (): string => ler(CHAVE_PC, '')
export const gravarEnderecoPc = (url: string) => gravar(CHAVE_PC, url)
export const lerFila = (): Fila => ler(CHAVE_FILA, {})
export const gravarFila = (f: Fila) => gravar(CHAVE_FILA, f)

/** "meu-pc.tail1234.ts.net/" → "https://meu-pc.tail1234.ts.net". */
export function normalizarEndereco(texto: string): string {
  let t = texto.trim().replace(/\/+$/, '')
  if (!t) return ''
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`
  return t
}

export function enfileirar(f: Fila, ids: string[], op: Operacao, em = Date.now()): Fila {
  const nova = { ...f }
  for (const id of ids) nova[id] = { op, em }
  return nova
}

/** Tira da fila o que foi enviado, sem perder mudança feita durante o envio. */
export function semEnviados(atual: Fila, enviados: Fila): Fila {
  let mudou = false
  const nova = { ...atual }
  for (const [id, item] of Object.entries(enviados)) {
    if (nova[id] && nova[id].em === item.em) {
      delete nova[id]
      mudou = true
    }
  }
  return mudou ? nova : atual
}

export interface StatusPc {
  jogadores: number
  pasta: string
}

/** Como está a ligação com o PC: sem endereço, conferindo, respondendo ou não. */
export type EstadoPc = { tipo: 'sem' } | { tipo: 'conferindo' } | { tipo: 'online'; status: StatusPc } | { tipo: 'offline' }

const comPrazo = (ms: number) => (typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ms) : undefined)

/** O PC responde? `null` = desligado, fora do Tailscale ou endereço errado. */
export async function statusDoPc(endereco: string): Promise<StatusPc | null> {
  try {
    const r = await fetch(`${endereco}/status`, { cache: 'no-store', signal: comPrazo(5000) })
    if (!r.ok) return null
    const s = (await r.json()) as Partial<StatusPc> & { app?: string }
    return s.app === 'MobilePlayers' ? { jogadores: s.jogadores ?? 0, pasta: s.pasta ?? '' } : null
  } catch {
    return null
  }
}

/**
 * Manda a fila para o PC, na ordem. Para no primeiro erro de rede (o PC
 * caiu no meio). Devolve o que foi enviado com sucesso.
 */
export async function enviarFila(endereco: string, fila: Fila, meus: Registro[]): Promise<Fila> {
  const enviados: Fila = {}
  for (const [id, item] of Object.entries(fila)) {
    const url = `${endereco}/jogadores/${encodeURIComponent(id)}`
    const registro = meus.find((m) => m.id === id)
    try {
      let r: Response
      if (item.op === 'salvar' && registro) {
        r = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, dados: registro.dados, atualizadoEm: registro.atualizadoEm }),
          signal: comPrazo(10000),
        })
      } else if (item.op === 'excluir' || !registro) {
        r = await fetch(url, { method: 'DELETE', signal: comPrazo(10000) })
      } else {
        continue
      }
      // 4xx: o PC recusou esse jogador; tentar de novo não muda nada, sai da fila.
      if (r.ok || (r.status >= 400 && r.status < 500)) enviados[id] = item
      else break
    } catch {
      break
    }
  }
  return enviados
}

/** Os jogadores que estão na pasta do PC, para trazer de volta ao aparelho. */
export async function jogadoresDoPc(endereco: string): Promise<Registro[]> {
  const r = await fetch(`${endereco}/jogadores`, { cache: 'no-store', signal: comPrazo(15000) })
  if (!r.ok) throw new Error(`o PC respondeu ${r.status}`)
  const lista = (await r.json()) as Partial<Registro>[]
  return lista.map(doAparelho).filter((x): x is Registro => x !== null)
}
