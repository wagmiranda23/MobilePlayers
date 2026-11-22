// Sincronia com o PC, nos dois sentidos. A pasta `meus/` do PC é o ponto de
// encontro: o programinha do PC (`servidor/pc.ts`) grava nela, e cada aparelho
// guarda uma cópia. O iPhone chega lá pela rede do Tailscale
// (https://<pc>.<rede>.ts.net), então funciona até no 4G; o app aberto no
// próprio PC (http://localhost:8765) usa o mesmo caminho.
//
// 1. Cada mudança no aparelho vai para uma fila. Com o PC desligado, ela
//    espera. O iOS não deixa app web rodar em segundo plano: a fila vai
//    quando o app está aberto e o PC responde.
// 2. Depois de esvaziar a fila, o aparelho puxa o retrato da pasta e
//    `reconciliar` junta os dois lados: vale a mudança mais recente.
//    O PC recusa (409) uma mudança mais velha do que a que ele tem.

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
 * caiu no meio). Devolve o que saiu da fila: o que o PC gravou e o que ele
 * recusou (4xx, incluindo o 409 de "tenho uma versão mais nova").
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
        // `em`: quando foi excluído. Se o jogador mudou no PC depois disso, o PC recusa.
        r = await fetch(`${url}?em=${item.em}`, { method: 'DELETE', signal: comPrazo(10000) })
      } else {
        continue
      }
      // 4xx: o PC recusou; tentar de novo não muda nada, sai da fila. No 409, o
      // retrato que vem logo depois traz a versão do PC.
      if (r.ok || (r.status >= 400 && r.status < 500)) enviados[id] = item
      else break
    } catch {
      break
    }
  }
  return enviados
}

/** O que está na pasta do PC: os jogadores e quando cada id foi excluído. */
export interface Retrato {
  jogadores: Registro[]
  excluidos: Record<string, number>
}

/** O retrato da pasta. `null` se o PC não respondeu ou é um programa antigo, sem `/sincronia`. */
export async function retratoDoPc(endereco: string): Promise<Retrato | null> {
  try {
    const r = await fetch(`${endereco}/sincronia`, { cache: 'no-store', signal: comPrazo(15000) })
    if (!r.ok) return null
    const corpo = (await r.json()) as { app?: string; jogadores?: Partial<Registro>[]; excluidos?: Record<string, number> }
    if (corpo.app !== 'MobilePlayers' || !Array.isArray(corpo.jogadores)) return null
    return {
      jogadores: corpo.jogadores.map(doAparelho).filter((x): x is Registro => x !== null),
      excluidos: corpo.excluidos ?? {},
    }
  } catch {
    return null
  }
}

export interface Reconciliacao {
  lista: Registro[]
  /** `false`: nada mudou, `lista` é o próprio `meus`. */
  mudou: boolean
  novos: number
  atualizados: number
  removidos: number
  /** Ids que o aparelho tem e o PC não (ou tem mais velho): voltam para a fila. */
  reenviar: string[]
}

/**
 * Junta os jogadores do aparelho com o retrato da pasta do PC. Vale a mudança
 * mais recente (`atualizadoEm`):
 *
 * - nos dois lados: fica o mais novo;
 * - só no PC: chegou (criado no PC ou em outro aparelho);
 * - só no aparelho: se o PC excluiu depois da última mudança daqui, sai;
 *   senão o PC não recebeu, e volta para a fila.
 *
 * `intocaveis` são os ids com mudança ainda na fila: o que está no aparelho
 * vale, e o retrato não mexe neles.
 */
export function reconciliar(meus: Registro[], pc: Retrato, intocaveis: ReadonlySet<string> = new Set()): Reconciliacao {
  const doPc = new Map(pc.jogadores.map((r) => [r.id, r]))
  const lista: Registro[] = []
  const reenviar: string[] = []
  let atualizados = 0
  let removidos = 0
  for (const m of meus) {
    const p = doPc.get(m.id)
    doPc.delete(m.id)
    const daqui = m.atualizadoEm ?? 0
    if (intocaveis.has(m.id)) {
      lista.push(m)
    } else if (p) {
      const dele = p.atualizadoEm ?? 0
      if (dele > daqui) {
        lista.push(p)
        atualizados++
      } else {
        lista.push(m)
        if (daqui > dele) reenviar.push(m.id)
      }
    } else if (m.id in pc.excluidos && pc.excluidos[m.id] >= daqui) {
      removidos++
    } else {
      lista.push(m)
      reenviar.push(m.id)
    }
  }
  const chegaram = [...doPc.values()].filter((p) => !intocaveis.has(p.id))
  const mudou = chegaram.length + atualizados + removidos > 0
  return { lista: mudou ? [...chegaram, ...lista] : meus, mudou, novos: chegaram.length, atualizados, removidos, reenviar }
}

/** Só no app aberto no próprio PC: pede ao programa do PC para abrir a pasta `meus/` no Explorer. */
export async function abrirPastaNoPc(endereco: string): Promise<boolean> {
  try {
    const r = await fetch(`${endereco}/abrir-pasta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: comPrazo(5000),
    })
    return r.ok
  } catch {
    return false
  }
}
