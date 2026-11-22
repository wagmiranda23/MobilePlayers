// A pasta do PC (servidor/pasta.ts), a fila e a reconciliação dos aparelhos
// (src/lib/sincronia.ts) e o app servido no PC (servidor/app.ts).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { Conflito, Pasta } from '../servidor/pasta.ts'
import { caminhoSeguro } from '../servidor/app.ts'
import { jogadorNovo } from '../src/lib/fmrte.ts'
import { registroMeu, type Registro } from '../src/lib/registro.ts'
import { enfileirar, normalizarEndereco, reconciliar, semEnviados } from '../src/lib/sincronia.ts'

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

test('o PC recusa uma versão mais velha do que a que ele tem (a mais recente vence)', () => {
  const p = novaPasta()
  p.salvar({ id: 'meu:a', dados: jogador('Novo'), atualizadoEm: 10 })
  assert.throws(() => p.salvar({ id: 'meu:a', dados: jogador('Velho'), atualizadoEm: 5 }), Conflito)
  assert.equal(p.listar()[0].dados.Name, 'Novo')
  // excluir: se o jogador mudou no PC depois da exclusão no aparelho, também recusa
  assert.throws(() => p.excluir('meu:a', new Date(), 8), Conflito)
  assert.equal(p.excluir('meu:a', new Date(), 12), 'Novo (2025-26)')
})

test('retrato: exclusões anotadas, arquivo apagado à mão vira exclusão, e salvar de novo desfaz', () => {
  const p = novaPasta()
  p.salvar({ id: 'meu:a', dados: jogador('A'), atualizadoEm: 1 })
  p.salvar({ id: 'meu:b', dados: jogador('B'), atualizadoEm: 1 })
  p.excluir('meu:a', new Date(), 50)
  unlinkSync(join(p.dir, 'B (2025-26).json'))
  const r = p.retrato(99)
  assert.deepEqual(r.jogadores, [])
  assert.deepEqual(r.excluidos, { 'meu:a': 50, 'meu:b': 99 })
  p.salvar({ id: 'meu:a', dados: jogador('A'), atualizadoEm: 60 })
  assert.deepEqual(Object.keys(p.retrato().excluidos), ['meu:b'])
})

test('retrato: arquivo editado à mão conta como mudança, pela data do arquivo', () => {
  const p = novaPasta()
  const arquivo = p.salvar({ id: 'meu:a', dados: jogador('A'), atualizadoEm: 5 })
  assert.equal(p.retrato().jogadores[0].atualizadoEm, 5)
  const depois = new Date(Date.now() + 60_000)
  utimesSync(join(p.dir, `${arquivo}.json`), depois, depois)
  assert.ok(p.retrato().jogadores[0].atualizadoEm >= depois.getTime() - 1000)
})

const reg = (id: string, Name: string, atualizadoEm: number): Registro => registroMeu({ ...jogadorNovo(), Name }, id, atualizadoEm)

test('reconciliar: vale o mais recente, chega o que é novo, sai o que foi excluído depois', () => {
  const aqui = [reg('a', 'A velho', 1), reg('b', 'B daqui', 9), reg('c', 'C excluído', 3), reg('d', 'D nunca foi', 4), reg('e', 'E voltou', 8)]
  const pc = {
    jogadores: [reg('a', 'A novo', 2), reg('b', 'B do PC', 5), reg('f', 'F do PC', 1)],
    excluidos: { c: 7, e: 6 },
  }
  const r = reconciliar(aqui, pc)
  assert.deepEqual(
    r.lista.map((x) => x.nome),
    ['F do PC', 'A novo', 'B daqui', 'D nunca foi', 'E voltou'],
  )
  assert.deepEqual([r.novos, r.atualizados, r.removidos], [1, 1, 1])
  assert.deepEqual(r.reenviar, ['b', 'd', 'e'])
})

test('reconciliar: o que está na fila não é tocado, e sem mudança devolve a mesma lista', () => {
  const aqui = [reg('a', 'A daqui', 1)]
  const pc = { jogadores: [reg('a', 'A do PC', 5), reg('b', 'B excluído aqui', 1)], excluidos: {} }
  const r = reconciliar(aqui, pc, new Set(['a', 'b']))
  assert.equal(r.mudou, false)
  assert.equal(r.lista, aqui)
  assert.deepEqual(r.reenviar, [])
  const igual = reconciliar(aqui, { jogadores: [reg('a', 'A daqui', 1)], excluidos: {} })
  assert.equal(igual.lista, aqui)
})

test('app do PC: só serve arquivos de dentro da pasta do build', () => {
  const raiz = join(tmpdir(), 'mp-app')
  assert.equal(caminhoSeguro(raiz, '/'), join(raiz, 'index.html'))
  assert.equal(caminhoSeguro(raiz, '/assets/x.js'), join(raiz, 'assets', 'x.js'))
  assert.equal(caminhoSeguro(raiz, '/../segredo.txt'), null)
  assert.equal(caminhoSeguro(raiz, '/%2e%2e/%2e%2e/segredo.txt'), null)
  assert.equal(caminhoSeguro(raiz, '/..%5c..%5csegredo.txt'), null)
  assert.ok(caminhoSeguro(raiz, '/icone-192.png')!.startsWith(raiz + sep))
})
