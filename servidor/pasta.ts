// A pasta do PC onde ficam os jogadores do usuário (`meus/`, fora do git). Um
// JSON por jogador, no mesmo formato da base, com o nome de arquivo de
// sempre: "João Silva (2025-26).json". Pronto para o TablineEditor27 importar
// no FM27.
//
// Cada aparelho conhece um jogador por um id ("meu:…"); o `.indice.json`
// guarda qual arquivo é de qual id e quando ele mudou, para o JSON continuar
// limpo. Excluir não apaga: move para `lixeira/`, porque essa pasta não tem o
// git por trás, e anota em `.excluidos.json` quando foi, para os outros
// aparelhos saberem que é para tirar.
//
// Mexer na pasta à mão também vale: arquivo novo aparece com o id
// `pc:<arquivo>`, arquivo editado conta como mudança (pela data do arquivo) e
// arquivo apagado conta como exclusão.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { nomeDeArquivo, normalizar, recalcular, type JogadorFmrte } from '../src/lib/fmrte.ts'

export interface Entrada {
  id: string
  dados: JogadorFmrte
  /** Quando o jogador mudou pela última vez, no relógio de quem mudou (ms). */
  atualizadoEm?: number
}

export interface Retrato {
  jogadores: (Entrada & { atualizadoEm: number })[]
  /** id → quando foi excluído. */
  excluidos: Record<string, number>
}

/** O PC tem uma versão mais nova do que a que chegou. Vira um 409. */
export class Conflito extends Error {
  constructor(readonly atualizadoEm: number) {
    super('o PC tem uma versão mais nova desse jogador')
  }
}

/** `gravadoEm`: a data do arquivo logo depois de gravar. Se o arquivo ficar mais novo que isso, alguém mexeu à mão. */
type Indice = Record<string, { arquivo: string; atualizadoEm?: number; gravadoEm?: number }>
type Excluidos = Record<string, number>

/** Arquivo que está na pasta mas não veio de um aparelho (o usuário pôs lá): ganha o id `pc:<arquivo>`. */
const PREFIXO_PC = 'pc:'
/** Folga para a data do arquivo: abaixo disso, é a própria gravação. */
const FOLGA_MS = 2000

export class Pasta {
  readonly lixeira: string
  private readonly caminhoIndice: string
  private readonly caminhoExcluidos: string

  constructor(readonly dir: string) {
    this.lixeira = join(dir, 'lixeira')
    this.caminhoIndice = join(dir, '.indice.json')
    this.caminhoExcluidos = join(dir, '.excluidos.json')
    mkdirSync(this.lixeira, { recursive: true })
  }

  private lerJson<T>(caminho: string): T | Record<string, never> {
    try {
      return JSON.parse(readFileSync(caminho, 'utf-8')) as T
    } catch {
      return {}
    }
  }

  private lerIndice = () => this.lerJson<Indice>(this.caminhoIndice) as Indice
  private lerExcluidos = () => this.lerJson<Excluidos>(this.caminhoExcluidos) as Excluidos
  private gravarIndice = (i: Indice) => this.gravarAtomico(this.caminhoIndice, JSON.stringify(i, null, 2) + '\n')
  private gravarExcluidos = (e: Excluidos) => this.gravarAtomico(this.caminhoExcluidos, JSON.stringify(e, null, 2) + '\n')

  /** Grava num temporário e troca, para um arquivo nunca ficar pela metade. */
  private gravarAtomico(caminho: string, texto: string) {
    const tmp = `${caminho}.tmp`
    writeFileSync(tmp, texto, 'utf-8')
    renameSync(tmp, caminho)
  }

  private arquivos(): string[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('.'))
      .map((f) => f.slice(0, -'.json'.length))
  }

  private caminho(arquivo: string) {
    return join(this.dir, `${arquivo}.json`)
  }

  /** O arquivo atual de um id, se existir. */
  private arquivoDe(id: string, indice: Indice): string | undefined {
    const doIndice = indice[id]?.arquivo
    if (doIndice && existsSync(this.caminho(doIndice))) return doIndice
    if (id.startsWith(PREFIXO_PC)) {
      const nome = id.slice(PREFIXO_PC.length)
      if (existsSync(this.caminho(nome))) return nome
    }
    return undefined
  }

  /** Quando o jogador desse arquivo mudou: o que o aparelho disse, ou a data do arquivo, se ele foi mexido à mão depois. */
  private mudouEm(arquivo: string, info: Indice[string] | undefined): number {
    const mtime = Math.round(statSync(this.caminho(arquivo)).mtimeMs)
    if (!info || info.atualizadoEm === undefined) return mtime
    if (info.gravadoEm !== undefined && mtime > info.gravadoEm + FOLGA_MS) return Math.max(mtime, info.atualizadoEm)
    return info.atualizadoEm
  }

  /**
   * O que está na pasta agora, para os aparelhos se acertarem. De quebra,
   * arruma o índice: arquivo que sumiu da pasta (apagado à mão) vira exclusão.
   */
  retrato(agora = Date.now()): Retrato {
    const indice = this.lerIndice()
    const excluidos = this.lerExcluidos()
    let mexeu = false
    for (const [id, info] of Object.entries(indice)) {
      if (!existsSync(this.caminho(info.arquivo))) {
        delete indice[id]
        excluidos[id] = agora
        mexeu = true
      }
    }

    const donoDe = new Map(Object.entries(indice).map(([id, v]) => [v.arquivo, id]))
    const jogadores: Retrato['jogadores'] = []
    for (const arquivo of this.arquivos()) {
      try {
        const dados = normalizar(JSON.parse(readFileSync(this.caminho(arquivo), 'utf-8').replace(/^﻿/, '')))
        if (!dados.Name) dados.Name = arquivo
        const id = donoDe.get(arquivo) ?? `${PREFIXO_PC}${arquivo}`
        jogadores.push({ id, dados, atualizadoEm: this.mudouEm(arquivo, indice[id]) })
        if (id in excluidos) {
          delete excluidos[id]
          mexeu = true
        }
      } catch {
        // JSON quebrado na pasta: fica de fora da lista, mas não some do disco
      }
    }
    if (mexeu) {
      this.gravarIndice(indice)
      this.gravarExcluidos(excluidos)
    }
    return { jogadores, excluidos }
  }

  listar(): Entrada[] {
    return this.retrato().jogadores
  }

  /**
   * Grava (ou regrava) o jogador. Se o nome mudou, o arquivo muda de nome
   * junto. Devolve o nome do arquivo. Se o PC tiver uma versão mais nova que
   * `atualizadoEm`, não grava e lança `Conflito`.
   */
  salvar(e: Entrada, agora = Date.now()): string {
    const indice = this.lerIndice()
    const atual = this.arquivoDe(e.id, indice)
    if (atual && e.atualizadoEm !== undefined) {
      const doPc = this.mudouEm(atual, indice[e.id])
      if (doPc > e.atualizadoEm) throw new Conflito(doPc)
    }

    const dados = recalcular(normalizar(e.dados))
    const ocupados = new Set(this.arquivos().filter((a) => a !== atual))
    const base = nomeDeArquivo(dados)
    let arquivo = base
    for (let n = 2; ocupados.has(arquivo); n++) arquivo = `${base} - ${n}`

    this.gravarAtomico(this.caminho(arquivo), JSON.stringify(dados, null, 2) + '\n')
    if (atual && atual !== arquivo) unlinkSync(this.caminho(atual))
    indice[e.id] = {
      arquivo,
      atualizadoEm: e.atualizadoEm ?? agora,
      gravadoEm: Math.round(statSync(this.caminho(arquivo)).mtimeMs),
    }
    this.gravarIndice(indice)

    const excluidos = this.lerExcluidos()
    if (e.id in excluidos) {
      delete excluidos[e.id]
      this.gravarExcluidos(excluidos)
    }
    return arquivo
  }

  /**
   * Move para a lixeira e anota a exclusão. `em` é quando o aparelho excluiu:
   * se o jogador mudou no PC depois disso, não exclui e lança `Conflito`.
   * Devolve o nome do arquivo, ou null se ele não estava na pasta.
   */
  excluir(id: string, agora = new Date(), em?: number): string | null {
    const indice = this.lerIndice()
    const atual = this.arquivoDe(id, indice)
    if (atual && em !== undefined) {
      const doPc = this.mudouEm(atual, indice[id])
      if (doPc > em) throw new Conflito(doPc)
    }
    delete indice[id]
    this.gravarIndice(indice)
    const excluidos = this.lerExcluidos()
    excluidos[id] = em ?? agora.getTime()
    this.gravarExcluidos(excluidos)
    if (!atual) return null
    const carimbo = agora.toISOString().slice(0, 19).replace(/[:T]/g, '-')
    renameSync(this.caminho(atual), join(this.lixeira, `${atual} (${carimbo}).json`))
    return atual
  }

  quantos(): number {
    return this.arquivos().length
  }
}
