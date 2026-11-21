// Confere (e, com --gravar, corrige) os JSONs da base.
//
//   npm run conferir                         → todos de src/data/jogadores
//   npm run conferir -- "Ronaldinho (2005-06)" → só esse
//   npm run conferir -- --gravar …           → regrava CA, PA, RCA, ratings e a ordem das chaves
//
// É o passo final de quando o Claude gera um jogador: o CA do arquivo tem que
// ser o que o app calcula, senão a base e a tela mostram números diferentes.
// Sai com erro se algum arquivo tiver aviso: o GitHub Actions roda isso antes
// de publicar, então jogador com problema não vai para o celular.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { atributosDe, contexto, nomeDeArquivo, normalizar, principalDe, recalcular } from '../src/lib/fmrte.ts'
import { porPosicao, calcular } from '../src/lib/overall.ts'
import { APTIDAO_COBRE, POSICOES } from '../src/lib/posicoes.ts'

const PASTA = join(import.meta.dirname, '..', 'src', 'data', 'jogadores')
const args = process.argv.slice(2)
const gravar = args.includes('--gravar')
const nomes = args.filter((a) => !a.startsWith('--'))
const arquivos = nomes.length
  ? nomes.map((n) => (n.includes('/') || n.includes('\\') ? resolve(n) : join(PASTA, n.endsWith('.json') ? n : `${n}.json`)))
  : readdirSync(PASTA).filter((f) => f.endsWith('.json')).map((f) => join(PASTA, f))

if (!arquivos.length) {
  console.log('Nenhum jogador em', PASTA)
  process.exit(0)
}

const GK = ['Handling', 'Reflexes', 'OneOnOnes', 'AerialAbility', 'CommandOfArea']

let problemas = 0
const vistos = new Map<string, string>()
for (const arq of arquivos) {
  const bruto = JSON.parse(readFileSync(arq, 'utf-8').replace(/^﻿/, ''))
  const j = normalizar(bruto)
  const a = atributosDe(j)
  const principal = principalDe(j)
  const r = calcular(a, principal)
  const avisos: string[] = []
  const arquivo = basename(arq, '.json')

  if (!j.Name) avisos.push('sem "Name"')
  else if (arquivo !== nomeDeArquivo(j)) avisos.push(`o arquivo devia se chamar "${nomeDeArquivo(j)}.json"`)
  if (!j.Season) avisos.push('sem "Season" (ex.: "2005/06")')
  const chave = `${j.Name}|${j.Season}`
  if (vistos.has(chave)) avisos.push(`mesmo nome e temporada de ${vistos.get(chave)}`)
  vistos.set(chave, arquivo)

  if (j.CA !== r.ca) avisos.push(`CA no arquivo é ${j.CA}, o app calcula ${r.ca}`)
  if (j.PA < r.ca) avisos.push(`PA ${j.PA} abaixo do CA ${r.ca}`)
  if (a.LeftFoot !== 20 && a.RightFoot !== 20) avisos.push('nenhum pé é 20 (o pé bom tem que ser 20)')
  const vinte = POSICOES.filter((p) => j.Positions[p.chave] === 20)
  if (vinte.length !== 1) {
    avisos.push(
      vinte.length
        ? `${vinte.length} posições com 20 (${vinte.map((p) => p.sigla).join(', ')}); só a principal fica em 20, outra natural vai em 19`
        : 'nenhuma posição com 20 (a principal tem que ser 20)',
    )
  }
  if (principal.chave !== 'Goalkeeper') {
    const gk = GK.filter((k) => a[k] > 3)
    if (gk.length) avisos.push(`atributos de goleiro acima de 3 num jogador de linha: ${gk.join(', ')}`)
  }
  const cobre = POSICOES.filter((p) => (j.Positions[p.chave] ?? 0) >= APTIDAO_COBRE).map((p) => p.sigla)
  const melhor = porPosicao(a)[0]

  console.log(`\n${arquivo}${contexto(j) ? `  [${contexto(j)}]` : ''}`)
  console.log(`  ${principal.sigla}  OVR ${r.ovr}  CA ${r.ca}  PA ${Math.max(j.PA, r.ca)}  (média ponderada ${r.media.toFixed(2)})`)
  console.log(`  joga de: ${cobre.join(', ') || '—'}   melhor OVR pelos atributos: ${melhor.posicao.sigla} ${melhor.ovr}`)
  console.log(`  ${j.Height} cm, ${j.Weight} kg, biotipo ${j.BodyType}`)

  if (gravar) {
    writeFileSync(arq, JSON.stringify(recalcular(j), null, 2) + '\n', 'utf-8')
    console.log('  ✓ gravado')
    // CA/PA o --gravar acerta; o resto continua sendo aviso.
    const resto = avisos.filter((av) => !av.startsWith('CA no arquivo') && !av.startsWith('PA '))
    for (const av of resto) console.log(`  ! ${av}`)
    if (resto.length) problemas++
  } else {
    for (const av of avisos) console.log(`  ! ${av}`)
    if (avisos.length) problemas++
  }
}

if (problemas) {
  console.log(`\n${problemas} arquivo(s) com aviso.${gravar ? '' : ' CA/PA errados se acertam com --gravar.'}`)
  process.exitCode = 1
} else {
  console.log(`\n${arquivos.length} arquivo(s) ok.`)
}
