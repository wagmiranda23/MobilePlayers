// A pasta do PC (servidor/pasta.ts) e a fila do iPhone (src/lib/sincronia.ts).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Pasta } from '../servidor/pasta.ts'
import { jogadorNovo } from '../src/lib/fmrte.ts'
import { enfileirar, normalizarEndereco, semEnviados } from '../src/lib/sincronia.ts'

const novaPasta = () => new Pasta(mkdtempSync(join(tmpdir(), 'mp-pasta-')))
const jogador = (Name: string, Season: string | null = '2025/26') => ({ ...jogadorNovo(), Name, Season })

test('salvar grava o JSON com o nome de arquivo da base e o CA recalculado', () => {
  const p = novaPasta()
  const arquivo = p.salvar({ id: 'meu:a', dados: { ...jogador('João Silva'), CA: 1 }, atualizadoEm: 5 })
  assert.equal(arquivo, 'João Silva (2025-26)')
  const j = JSON.parse(readFileSync(join(p.dir, `${arquivo}.json`), 'utf-8'))
  assert.equal(j.Name, 'João Silva')
  assert.notEqual(j.CA, 1)
  assert.deepEqual(
    p.listar().map((e) => [e.id, e.dados.Name, e.atualizadoEm]),
    [['meu:a', 'João Silva', 5]],
  )
})

test('mudar o nome no iPhone renomeia o arquivo, sem deixar o antigo', () => {
  const p = novaPasta()
  p.salvar({ id: 'meu:a', dados: jogador('João') })
  p.salvar({ id: 'meu:a', dados: jogador('João Pedro') })
  assert.deepEqual(readdirSync(p.dir).filter((f) => f.endsWith('.json') && !f.startsWith('.')), ['João Pedro (2025-26).json'])
})

test('dois jogadores com o mesmo nome não se sobrescrevem', () => {
  const p = novaPasta()
  assert.equal(p.salvar({ id: 'meu:a', dados: jogador('Zé') }), 'Zé (2025-26)')
  assert.equal(p.salvar({ id: 'meu:b', dados: jogador('Zé') }), 'Zé (2025-26) - 2')
  assert.equal(p.salvar({ id: 'meu:a', dados: jogador('Zé') }), 'Zé (2025-26)')
  assert.equal(p.quantos(), 2)
})

test('excluir move para a lixeira em vez de apagar', () => {
  const p = novaPasta()
  p.salvar({ id: 'meu:a', dados: jogador('Some', null) })
  assert.equal(p.excluir('meu:a', new Date('2026-11-21T10:00:00Z')), 'Some')
  assert.equal(p.quantos(), 0)
  assert.deepEqual(readdirSync(p.lixeira), ['Some (2026-11-21-10-00-00).json'])
  assert.equal(p.excluir('meu:a'), null)
})

test('arquivo posto à mão na pasta aparece com id pc: e pode ser editado pelo iPhone', () => {
  const p = novaPasta()
  writeFileSync(join(p.dir, 'Avulso.json'), JSON.stringify({ ...jogadorNovo(), Name: 'Avulso' }))
  const [e] = p.listar()
  assert.equal(e.id, 'pc:Avulso')
  p.salvar({ id: 'pc:Avulso', dados: jogador('Avulso', '2026') })
  assert.equal(existsSync(join(p.dir, 'Avulso.json')), false)
  assert.equal(existsSync(join(p.dir, 'Avulso (2026).json')), true)
})

test('endereço do PC: completa o https e tira a barra do fim', () => {
  assert.equal(normalizarEndereco(' meu-pc.tail1234.ts.net/ '), 'https://meu-pc.tail1234.ts.net')
  assert.equal(normalizarEndereco('http://localhost:8765'), 'http://localhost:8765')
  assert.equal(normalizarEndereco('  '), '')
})

test('fila: o enviado sai, mas uma mudança feita durante o envio fica', () => {
  const f = enfileirar(enfileirar({}, ['a', 'b'], 'salvar', 1), ['c'], 'excluir', 1)
  const durante = enfileirar(f, ['b'], 'salvar', 2)
  const resto = semEnviados(durante, f)
  assert.deepEqual(resto, { b: { op: 'salvar', em: 2 } })
  // nada enviado: devolve o mesmo objeto (não dispara outro envio no React)
  assert.equal(semEnviados(durante, {}), durante)
})
