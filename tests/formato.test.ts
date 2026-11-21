// O formato do JSON (nome, clube, temporada, biotipo), as posições e o backup.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  biotipoSugerido,
  comAptidao,
  comPrincipal,
  idade,
  jogadorNovo,
  nomeDeArquivo,
  normalizar,
  principalDe,
} from '../src/lib/fmrte.ts'
import { nivelDe } from '../src/lib/posicoes.ts'
import { lerImportado, mesclar, montarBackup, nomeDoArquivo, registroMeu } from '../src/lib/registro.ts'

const mbappe = readFileSync(join(import.meta.dirname, 'fixtures', '85139014-Kylian Mbappé.json'), 'utf-8')

test('Name sai do CommonName ou do nome + sobrenome, e os outros campos de nome somem', () => {
  assert.equal(normalizar({ CommonName: 'Kaká', FirstName: 'Ricardo', Surname: 'Leite' }).Name, 'Kaká')
  const n = normalizar({ FirstName: 'Ricardo', Surname: 'Leite' })
  assert.equal(n.Name, 'Ricardo Leite')
  assert.equal('FirstName' in n, false)
  assert.equal(normalizar({ Name: ' Ronaldinho ', Club: 'Barcelona', Season: '2005/06' }).Club, 'Barcelona')
})

test('Name, Club e Season vêm primeiro no JSON, e BodyType logo depois do Weight', () => {
  const chaves = Object.keys(normalizar({ Name: 'X', Weight: 70 }))
  assert.deepEqual(chaves.slice(0, 3), ['Name', 'Club', 'Season'])
  assert.equal(chaves.indexOf('BodyType'), chaves.indexOf('Weight') + 1)
})

test('biotipo: o do JSON se for 1–5, senão o sugerido pela altura e peso', () => {
  assert.equal(biotipoSugerido(180, 75), 3)
  assert.equal(biotipoSugerido(201, 75), 1)
  assert.equal(biotipoSugerido(180, 100), 5)
  assert.equal(normalizar({ Height: 201, Weight: 75 }).BodyType, 1)
  assert.equal(normalizar({ Height: 201, Weight: 75, BodyType: 4 }).BodyType, 4)
  assert.equal(normalizar({ Height: 201, Weight: 75, BodyType: 9 }).BodyType, 1)
})

test('a idade conta a partir da temporada, quando tem', () => {
  const j = { ...jogadorNovo(), Born: '1980-03-21T00:00:00', Season: '2005/06' }
  assert.equal(idade(j), 25)
  assert.equal(idade({ ...j, Season: null }, new Date(2026, 10, 21)), 46)
})

test('nome do arquivo leva a temporada com hífen', () => {
  assert.equal(nomeDeArquivo({ ...jogadorNovo(), Name: 'Ronaldinho', Season: '2005/06' }), 'Ronaldinho (2005-06)')
  assert.equal(nomeDeArquivo({ ...jogadorNovo(), Name: 'Neymar', Season: '2012' }), 'Neymar (2012)')
  assert.equal(nomeDoArquivo('85139014-Kylian Mbappé.json'), 'Kylian Mbappé')
})

test('níveis de aptidão seguem as faixas do FM', () => {
  assert.equal(nivelDe(20).id, 'natural')
  assert.equal(nivelDe(18).id, 'natural')
  assert.equal(nivelDe(17).id, 'experiente')
  assert.equal(nivelDe(12).id, 'competente')
  assert.equal(nivelDe(9).id, 'fraco')
  assert.equal(nivelDe(5).id, 'desajeitado')
  assert.equal(nivelDe(1).id, 'ineficaz')
})

test('trocar a principal deixa a antiga natural (19) e só uma posição em 20', () => {
  const j = comPrincipal(jogadorNovo(), 'AttackingMidLeft')
  assert.equal(principalDe(j).chave, 'AttackingMidLeft')
  assert.equal(j.Positions.Striker, 19)
  assert.equal(Object.entries(j.Positions).filter(([k, v]) => k !== 'Id' && v === 20).length, 1)
  // Mudar o nível de outra posição nunca passa de 19 nem mexe na principal.
  const k = comAptidao(j, 'Striker', 20)
  assert.equal(k.Positions.Striker, 19)
  assert.equal(comAptidao(j, 'AttackingMidLeft', 1).Positions.AttackingMidLeft, 20)
})

test('importar um export do FMRTE usa o nome do arquivo quando o JSON não tem nome', () => {
  const { backup, registros } = lerImportado(mbappe, '85139014-Kylian Mbappé.json')
  assert.equal(backup, false)
  assert.equal(registros.length, 1)
  assert.equal(registros[0].nome, 'Kylian Mbappé')
  assert.equal(registros[0].dados.Name, 'Kylian Mbappé')
})

test('backup vai e volta, e restaurar substitui pelo id', () => {
  const a = registroMeu({ ...jogadorNovo(), Name: 'A' }, 'meu:a', 1)
  const b = registroMeu({ ...jogadorNovo(), Name: 'B' }, 'meu:b', 2)
  const lido = lerImportado(montarBackup([a, b]))
  assert.equal(lido.backup, true)
  assert.deepEqual(
    lido.registros.map((r) => [r.id, r.nome]),
    [
      ['meu:a', 'A'],
      ['meu:b', 'B'],
    ],
  )

  const aEditado = registroMeu({ ...jogadorNovo(), Name: 'A2' }, 'meu:a', 3)
  const c = registroMeu({ ...jogadorNovo(), Name: 'C' }, 'meu:c', 4)
  const { lista, novos, atualizados } = mesclar([a, b], [aEditado, c])
  assert.equal(novos, 1)
  assert.equal(atualizados, 1)
  assert.deepEqual(
    lista.map((r) => r.nome),
    ['C', 'A2', 'B'],
  )
})

test('lê o formato antigo do aparelho (nome fora do JSON)', () => {
  const antigo = JSON.stringify({ app: 'MobilePlayers', versao: 1, exportadoEm: '', jogadores: [{ id: 'meu:x', nome: 'Velho', dados: jogadorNovo() }] })
  assert.equal(lerImportado(antigo).registros[0].nome, 'Velho')
})
