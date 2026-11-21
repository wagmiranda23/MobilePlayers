// A pasta do PC onde ficam os jogadores que vieram do iPhone (`meus/`, fora
// do git). Um JSON por jogador, no mesmo formato da base, com o nome de
// arquivo de sempre: "João Silva (2025-26).json". Pronto para o
// TablineEditor27 importar no FM27.
//
// O iPhone conhece cada jogador por um id ("meu:…"); o `.indice.json` guarda
// qual arquivo é de qual id, para o JSON continuar limpo. Excluir no iPhone
// não apaga: move para `lixeira/`, porque essa pasta não tem o git por trás.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { nomeDeArquivo, normalizar, recalcular, type JogadorFmrte } from '../src/lib/fmrte.ts'

export interface Entrada {
  id: string
  dados: JogadorFmrte
  atualizadoEm?: number
}

type Indice = Record<string, { arquivo: string; atualizadoEm?: number }>

/** Arquivo que está na pasta mas não veio do iPhone (o usuário pôs lá): ganha o id `pc:<arquivo>`. */
const PREFIXO_PC = 'pc:'

export class Pasta {
  readonly lixeira: string
  private readonly caminhoIndice: string

  constructor(readonly dir: string) {
    this.lixeira = join(dir, 'lixeira')
    this.caminhoIndice = join(dir, '.indice.json')
    mkdirSync(this.lixeira, { recursive: true })
  }

  private lerIndice(): Indice {
    try {
      return JSON.parse(readFileSync(this.caminhoIndice, 'utf-8')) as Indice
    } catch {
      return {}
    }
  }

  private gravarIndice(i: Indice) {
    this.gravarAtomico(this.caminhoIndice, JSON.stringify(i, null, 2) + '\n')
  }

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

  private caminho(arquivo: string) {
    return join(this.dir, `${arquivo}.json`)
  }

  listar(): Entrada[] {
    const indice = this.lerIndice()
    const donoDe = new Map(Object.entries(indice).map(([id, v]) => [v.arquivo, id]))
    const lista: Entrada[] = []
    for (const arquivo of this.arquivos()) {
      try {
        const dados = normalizar(JSON.parse(readFileSync(this.caminho(arquivo), 'utf-8').replace(/^﻿/, '')))
        if (!dados.Name) dados.Name = arquivo
        const id = donoDe.get(arquivo) ?? `${PREFIXO_PC}${arquivo}`
        lista.push({ id, dados, atualizadoEm: indice[id]?.atualizadoEm })
      } catch {
        // JSON quebrado na pasta: fica de fora da lista, mas não some do disco
      }
    }
    return lista
  }

  /** Grava (ou regrava) o jogador. Se o nome mudou, o arquivo muda de nome junto. Devolve o nome do arquivo. */
  salvar(e: Entrada): string {
    const indice = this.lerIndice()
    const dados = recalcular(normalizar(e.dados))
    const atual = this.arquivoDe(e.id, indice)
    const ocupados = new Set(this.arquivos().filter((a) => a !== atual))

    const base = nomeDeArquivo(dados)
    let arquivo = base
    for (let n = 2; ocupados.has(arquivo); n++) arquivo = `${base} - ${n}`

    this.gravarAtomico(this.caminho(arquivo), JSON.stringify(dados, null, 2) + '\n')
    if (atual && atual !== arquivo) unlinkSync(this.caminho(atual))
    indice[e.id] = { arquivo, atualizadoEm: e.atualizadoEm }
    this.gravarIndice(indice)
    return arquivo
  }

  /** Move para a lixeira. Devolve o nome do arquivo, ou null se não havia. */
  excluir(id: string, agora = new Date()): string | null {
    const indice = this.lerIndice()
    const atual = this.arquivoDe(id, indice)
    delete indice[id]
    this.gravarIndice(indice)
    if (!atual) return null
    const carimbo = agora.toISOString().slice(0, 19).replace(/[:T]/g, '-')
    renameSync(this.caminho(atual), join(this.lixeira, `${atual} (${carimbo}).json`))
    return atual
  }

  quantos(): number {
    return this.arquivos().length
  }
}
