// O JSON de jogador do FMRTE — o mesmo formato dos exports do LiveEditor24 e
// do template de `C:\dev\legends\shared.js` — mais quatro campos:
//
//   Name, Club   o TablineEditor27 exporta os dois e pula os dois na importação
//   Season       só do app: a temporada daquela versão do jogador ("2005/06")
//   BodyType     biotipo do FM27, 1 (ectomorfo) a 5 (endomorfo); o FM27 não
//                tem Weight, e o FM24 não tem BodyType, então vão os dois
//
// O TablineEditor27 ignora chaves que não conhece, então o arquivo continua
// importável no FM27.

import { ATRIBUTOS, CHAVES_FMRTE, SECAO, type Grupo } from './atributos'
import { ratingFmrte, estimarCA, type Atributos } from './overall'
import { POSICOES, posicaoPrincipal } from './posicoes'

/** Ordem de `Positions` no export do FMRTE. */
const ORDEM_POSICOES = [
  'Goalkeeper', 'Striker', 'AttackingMidCentral', 'AttackingMidLeft', 'AttackingMidRight',
  'DefenderCentral', 'DefenderLeft', 'DefenderRight', 'DefensiveMidfielder', 'MidfielderCentral',
  'MidfielderLeft', 'MidfielderRight', 'WingBackLeft', 'WingBackRight',
]
if (ORDEM_POSICOES.length !== POSICOES.length || POSICOES.some((p) => !ORDEM_POSICOES.includes(p.chave))) {
  throw new Error('ORDEM_POSICOES não cobre exatamente as 14 posições')
}

/** Outros campos de nome que aparecem por aí. Viram `Name` e saem do JSON. */
const OUTROS_NOMES = ['CommonName', 'FirstName', 'Surname', 'FullName', 'ShortName']

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

type Bloco = Record<string, number>

export interface Nacao {
  FIFAPosition: number
  FIFAScore: number
  Id: number
  Name: string
  ShortName: string
  Reputation: number
  FirstTeamManager: string | null
}

export interface JogadorFmrte {
  Name: string
  Club: string | null
  Season: string | null
  CA: number
  PA: number
  AskingPrice: number
  MatchSharpness: number
  Condition: number
  Jadedness: number
  Height: number
  Weight: number
  BodyType: number
  Morale: number
  WorldReputation: number
  CurrentReputation: number
  HomeReputation: number
  GoalKeeperAttributes: Bloco
  MentalAttributes: Bloco
  PhysicalAttributes: Bloco
  HiddenAttributes: Bloco
  TechnicalAttributes: Bloco
  Positions: Bloco
  PreferredMoves: number
  Number: number
  Id: number
  Ethnicity: string
  SkinColour: number
  HairColour: string
  HairLength: string
  Born: string
  Nation: Nacao
  IntCaps: number
  IntGoals: number
  U21Caps: number
  U21Goals: number
  PersonalityAttributes: Bloco
  DocumentType: 'Player'
  FmrteVersion: string
  'Nation.Id': number
  RCA: number
  ActualRating: number
  PotentialRating: number
}

/** Valores vistos em exports reais. Outros existem no jogo, mas só entram aqui depois de confirmados num export. */
export const ETNIAS = ['NorthernEuropean', 'MediterraneanHispanic', 'NorthAfricanMiddleEastern', 'AfricanCaribbean'] as const
export const CABELOS = ['Black2', 'Black3', 'DarkBrown2', 'Grey3'] as const
export const COMPRIMENTOS = ['Short', 'Medium'] as const

const GRUPOS_JSON: Grupo[] = ['tecnico', 'mental', 'fisico', 'goleiro', 'oculto', 'personalidade']

/** Achata as seções do JSON num objeto só (sem os `Id`). */
export function atributosDe(j: JogadorFmrte): Atributos {
  const a: Atributos = {}
  for (const g of GRUPOS_JSON) {
    const bloco = (j as unknown as Record<string, Bloco>)[SECAO[g]] ?? {}
    for (const [k, v] of Object.entries(bloco)) if (k !== 'Id') a[k] = v
  }
  return a
}

export function aptidoesDe(j: JogadorFmrte): Bloco {
  const { Id: _id, ...resto } = j.Positions ?? {}
  return resto
}

export const principalDe = (j: JogadorFmrte) => posicaoPrincipal(aptidoesDe(j))

/** Recalcula CA e os campos derivados dele, a partir dos atributos e da posição principal. */
export function recalcular(j: JogadorFmrte): JogadorFmrte {
  const ca = estimarCA(atributosDe(j), principalDe(j).perfil)
  const pa = Math.max(ca, j.PA || ca)
  return {
    ...j,
    CA: ca,
    PA: pa,
    RCA: ca,
    ActualRating: ratingFmrte(ca),
    PotentialRating: ratingFmrte(pa),
  }
}

/** Os biotipos do FM27, com os rótulos do TablineEditor27 (o 3 é o meio da escala). */
export const BIOTIPOS: [number, string][] = [
  [1, 'Ectomorfo'],
  [2, ''],
  [3, 'Mesomorfo'],
  [4, ''],
  [5, 'Endomorfo'],
]

/**
 * Biotipo sugerido pelo IMC. Jogador de futebol fica quase sempre entre 21 e
 * 25: 180 cm e 75 kg dá 3; o Crouch (201 cm, 75 kg) dá 1.
 */
export function biotipoSugerido(altura: number, peso: number): number {
  if (altura < 120 || peso < 40) return 3
  const imc = peso / (altura / 100) ** 2
  if (imc < 20.5) return 1
  if (imc < 22) return 2
  if (imc < 24) return 3
  if (imc < 25.5) return 4
  return 5
}

/** Reputação padrão a partir do CA, para quem não quer mexer nisso. */
export function reputacaoPadrao(ca: number): number {
  return Math.round(Math.max(0, Math.min(1, (ca - 60) / 140)) * 9500)
}

/** Valor pedido padrão (€), uma curva exponencial grosseira ajustada nos exports. */
export function valorPadrao(ca: number): number {
  return Math.round(Math.exp(11.74 + 0.0587 * (ca - 84)) / 1000) * 1000
}

function blocoCom(grupo: Grupo, valor: number): Bloco {
  const b: Bloco = {}
  for (const chave of CHAVES_FMRTE[grupo]) b[chave] = valor
  b.Id = -1
  return b
}

/** Um jogador novo: atacante destro, tudo em 10, atributos de goleiro em 2. */
export function jogadorNovo(): JogadorFmrte {
  const fisico = blocoCom('fisico', 10)
  fisico.RightFoot = 20
  fisico.LeftFoot = 8
  const positions: Bloco = {}
  for (const chave of ORDEM_POSICOES) positions[chave] = 1
  positions.Striker = 20
  positions.Id = -1

  const base: JogadorFmrte = {
    Name: '', Club: null, Season: null,
    CA: 0, PA: 0, AskingPrice: 0,
    MatchSharpness: 10000, Condition: 10000, Jadedness: 0,
    Height: 180, Weight: 75, BodyType: 3, Morale: 18,
    WorldReputation: 0, CurrentReputation: 0, HomeReputation: 0,
    GoalKeeperAttributes: blocoCom('goleiro', 2),
    MentalAttributes: blocoCom('mental', 10),
    PhysicalAttributes: fisico,
    HiddenAttributes: blocoCom('oculto', 12),
    TechnicalAttributes: blocoCom('tecnico', 10),
    Positions: positions,
    PreferredMoves: 0, Number: -1, Id: -1,
    Ethnicity: 'MediterraneanHispanic', SkinColour: 10, HairColour: 'DarkBrown2', HairLength: 'Short',
    Born: '2004-01-01T00:00:00',
    Nation: { FIFAPosition: 5, FIFAScore: 1880, Id: -1, Name: 'Brasil', ShortName: 'Brasil', Reputation: 8500, FirstTeamManager: null },
    IntCaps: 0, IntGoals: 0, U21Caps: 0, U21Goals: 0,
    PersonalityAttributes: {
      Adaptability: 13, Ambition: 15, Loyalty: 13, Pressure: 14, Professional: 14,
      Sportsmanship: 13, Temperament: 14, Controversy: 8, Id: -1,
    },
    DocumentType: 'Player', FmrteVersion: '24.3.0.29', 'Nation.Id': -1,
    RCA: 0, ActualRating: 0, PotentialRating: 0,
  }
  const j = recalcular(base)
  const rep = reputacaoPadrao(j.CA)
  return { ...j, WorldReputation: rep, CurrentReputation: rep, HomeReputation: Math.min(10000, rep + 700), AskingPrice: valorPadrao(j.CA) }
}

/** Troca o valor de um atributo, sem saber em que seção ele mora. */
export function comAtributo(j: JogadorFmrte, chave: string, valor: number): JogadorFmrte {
  const attr = ATRIBUTOS.find((a) => a.chave === chave)
  if (!attr) throw new Error(`atributo desconhecido: ${chave}`)
  const secao = SECAO[attr.grupo] as keyof JogadorFmrte
  const bloco = j[secao] as Bloco
  return { ...j, [secao]: { ...bloco, [chave]: Math.max(1, Math.min(20, Math.round(valor))) } }
}

/** Destro se o pé direito for pelo menos tão bom quanto o esquerdo. */
export function ehDestro(j: JogadorFmrte): boolean {
  return (j.PhysicalAttributes.RightFoot ?? 1) >= (j.PhysicalAttributes.LeftFoot ?? 1)
}

/** O valor do pé fraco (o menor dos dois). */
export function peFracoDe(j: JogadorFmrte): number {
  return Math.min(j.PhysicalAttributes.RightFoot ?? 1, j.PhysicalAttributes.LeftFoot ?? 1)
}

/** Pé bom em 20 e o outro com `valorFraco`. Recalcula, porque o pé fraco entra no overall. */
export function comPes(j: JogadorFmrte, destro: boolean, valorFraco: number): JogadorFmrte {
  let d = comAtributo(j, destro ? 'RightFoot' : 'LeftFoot', 20)
  d = comAtributo(d, destro ? 'LeftFoot' : 'RightFoot', valorFraco)
  return recalcular(d)
}

/** Muda altura e peso. O biotipo acompanha enquanto estiver no sugerido; se o usuário mexeu nele, fica. */
export function comCorpo(j: JogadorFmrte, altura: number, peso: number): JogadorFmrte {
  const seguia = j.BodyType === biotipoSugerido(j.Height, j.Weight)
  return { ...j, Height: altura, Weight: peso, BodyType: seguia ? biotipoSugerido(altura, peso) : j.BodyType }
}

/** Muda a aptidão de uma posição que não é a principal (a principal fica em 20). */
export function comAptidao(j: JogadorFmrte, chave: string, valor: number): JogadorFmrte {
  if (chave === principalDe(j).chave) return j
  const v = Math.max(1, Math.min(19, Math.round(valor)))
  return recalcular({ ...j, Positions: { ...j.Positions, [chave]: v } })
}

/** Faz de `chave` a posição principal (20). As outras que estavam em 20 descem para 19 e continuam naturais. */
export function comPrincipal(j: JogadorFmrte, chave: string): JogadorFmrte {
  const pos: Bloco = { ...j.Positions }
  for (const k of ORDEM_POSICOES) if (pos[k] >= 20) pos[k] = 19
  pos[chave] = 20
  return recalcular({ ...j, Positions: pos })
}

/** Arruma um JSON vindo de fora (colado, gerado por IA, export antigo) para o formato esperado. */
export function normalizar(entrada: unknown): JogadorFmrte {
  if (!entrada || typeof entrada !== 'object') throw new Error('O JSON não é um objeto.')
  const j = { ...jogadorNovo(), ...(entrada as Partial<JogadorFmrte>) } as JogadorFmrte
  for (const g of GRUPOS_JSON) {
    const secao = SECAO[g] as keyof JogadorFmrte
    const padrao = jogadorNovo()[secao] as Bloco
    const veio = ((entrada as Record<string, unknown>)[secao] ?? {}) as Bloco
    const bloco: Bloco = { ...padrao }
    for (const k of Object.keys(padrao)) {
      if (k === 'Id') continue
      const n = Math.round(Number(veio[k]))
      bloco[k] = Number.isFinite(n) ? Math.max(1, Math.min(20, n)) : padrao[k]
    }
    bloco.Id = -1
    ;(j as unknown as Record<string, Bloco>)[secao] = bloco
  }
  const pos: Bloco = {}
  const veioPos = ((entrada as Record<string, unknown>).Positions ?? {}) as Bloco
  for (const chave of ORDEM_POSICOES) {
    const n = Math.round(Number(veioPos[chave]))
    pos[chave] = Number.isFinite(n) ? Math.max(0, Math.min(20, n)) : 1
  }
  pos.Id = -1
  j.Positions = pos

  const e = entrada as Record<string, unknown>
  j.Name = texto(e.Name) || texto(e.CommonName) || [texto(e.FirstName), texto(e.Surname)].filter(Boolean).join(' ')
  for (const campo of OUTROS_NOMES) delete (j as unknown as Record<string, unknown>)[campo]
  j.Club = texto(e.Club) || null
  j.Season = texto(e.Season) || null
  const altura = Number(j.Height) || 180
  const peso = Number(j.Weight) || 75
  const bt = Math.round(Number(e.BodyType))
  j.BodyType = bt >= 1 && bt <= 5 ? bt : biotipoSugerido(altura, peso)

  j.Nation = { ...jogadorNovo().Nation, ...(j.Nation ?? {}), Id: -1, FirstTeamManager: null }
  j['Nation.Id'] = -1
  j.Id = -1
  j.DocumentType = 'Player'
  return j
}

/** O texto do JSON para exportar, com CA e derivados já recalculados. */
export function paraTexto(j: JogadorFmrte): string {
  return JSON.stringify(recalcular(j), null, 2)
}

/**
 * A data em que a idade é contada: 1º de julho do primeiro ano da temporada
 * ("2005/06" → julho de 2005), ou hoje, para quem não tem temporada. O
 * Ronaldinho de 2005/06 tem 25 anos, não a idade de hoje.
 */
export function dataDeReferencia(j: JogadorFmrte, hoje = new Date()): Date {
  const m = /^(\d{4})/.exec(j.Season ?? '')
  return m ? new Date(Number(m[1]), 6, 1) : hoje
}

export function idade(j: JogadorFmrte, hoje = new Date()): number | null {
  const n = new Date(j.Born)
  if (Number.isNaN(n.getTime())) return null
  const ref = dataDeReferencia(j, hoje)
  let anos = ref.getFullYear() - n.getFullYear()
  const m = ref.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < n.getDate())) anos--
  return anos
}

/**
 * O nome do arquivo do jogador, sem `.json`: "Ronaldinho (2005-06)". A barra
 * da temporada vira hífen, porque não pode ir em nome de arquivo.
 */
export function nomeDeArquivo(j: JogadorFmrte): string {
  const nome = (j.Name || 'Jogador').replace(/[\\/:*?"<>|]/g, '').trim()
  return j.Season ? `${nome} (${j.Season.replace(/\//g, '-')})` : nome
}

/** "Barcelona · 2005/06", o que der para montar. */
export function contexto(j: JogadorFmrte): string {
  return [j.Club, j.Season].filter(Boolean).join(' · ')
}
