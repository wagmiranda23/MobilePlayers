// Gabarito: sete exports reais do FMRTE (copiados de C:\dev\LiveEditor24).
// O CA deles é o do jogo; o nosso é estimado só pelos atributos.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { estimarCA, fmParaFifa } from '../src/lib/overall.ts'
import { atributosDe, normalizar, principalDe, recalcular, jogadorNovo, type JogadorFmrte } from '../src/lib/fmrte.ts'

const PASTA = join(import.meta.dirname, 'fixtures')
const reais = readdirSync(PASTA)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ arquivo: f, j: JSON.parse(readFileSync(join(PASTA, f), 'utf-8').replace(/^\uFEFF/, '')) as JogadorFmrte }))

test('há sete jogadores reais no gabarito', () => {
  assert.equal(reais.length, 7)
})

test('CA estimado fica a no máximo 10 do CA real, e a média do erro abaixo de 5', () => {
  const erros = reais.map(({ arquivo, j }) => {
    const est = estimarCA(atributosDe(j), principalDe(j).perfil)
    const erro = Math.abs(est - j.CA)
    assert.ok(erro <= 10, `${arquivo}: real ${j.CA}, estimado ${est}`)
    return erro
  })
  const media = erros.reduce((s, e) => s + e, 0) / erros.length
  assert.ok(media < 5, `erro médio ${media.toFixed(1)}`)
})

test('fmParaFifa bate com a tabela do Manager’s Club de CA 70 para cima', () => {
  assert.equal(fmParaFifa(200), 98)
  assert.equal(fmParaFifa(194), 94)
  assert.equal(fmParaFifa(150), 81)
  assert.equal(fmParaFifa(70), 61)
})

test('abaixo de CA 70 a escala continua até 40, sem piso e sem voltar', () => {
  assert.equal(fmParaFifa(69), 60)
  assert.equal(fmParaFifa(40), 51)
  assert.equal(fmParaFifa(1), 40)
  for (let ca = 2; ca <= 200; ca++) assert.ok(fmParaFifa(ca) >= fmParaFifa(ca - 1), `CA ${ca}`)
})

test('normalizar mantém os atributos de um export real', () => {
  const { j } = reais.find((r) => r.arquivo.includes('Mbapp'))!
  const n = normalizar(j)
  assert.deepEqual(atributosDe(n), atributosDe(j))
  assert.equal(principalDe(n).chave, 'Striker')
})

test('normalizar prende valores fora da escala e completa o que falta', () => {
  const n = normalizar({ TechnicalAttributes: { Finishing: 35, Passing: -3 }, Positions: { Striker: 20 } })
  assert.equal(n.TechnicalAttributes.Finishing, 20)
  assert.equal(n.TechnicalAttributes.Passing, 1)
  assert.equal(n.MentalAttributes.Decisions, 10)
  assert.equal(n.Positions.Goalkeeper, 1)
})

test('jogador novo sai com CA coerente e PA nunca abaixo do CA', () => {
  const j = jogadorNovo()
  assert.ok(j.CA > 50 && j.CA < 120, `CA ${j.CA}`)
  const r = recalcular({ ...j, PA: 10 })
  assert.equal(r.PA, r.CA)
})
