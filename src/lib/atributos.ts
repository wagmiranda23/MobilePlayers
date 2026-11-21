// Os atributos do FM, na escala de 1 a 20.
//
// A chave é o nome interno do FMRTE, em inglês, e é ela que vai no JSON. O
// rótulo é só para a tela e usa os termos do FM em português, os mesmos de
// `C:\dev\LiveEditor24\liveeditor\ability.py` (ROTULO_PT).

export type Grupo = 'tecnico' | 'mental' | 'fisico' | 'goleiro' | 'oculto' | 'personalidade'

/** Em qual objeto do JSON do FMRTE cada grupo mora. */
export const SECAO: Record<Grupo, string> = {
  tecnico: 'TechnicalAttributes',
  mental: 'MentalAttributes',
  fisico: 'PhysicalAttributes',
  goleiro: 'GoalKeeperAttributes',
  oculto: 'HiddenAttributes',
  personalidade: 'PersonalityAttributes',
}

export const NOME_GRUPO: Record<Grupo, string> = {
  tecnico: 'Técnicos',
  mental: 'Mentais',
  fisico: 'Físicos',
  goleiro: 'Guarda-redes',
  oculto: 'Ocultos',
  personalidade: 'Personalidade',
}

export interface Atributo {
  chave: string
  grupo: Grupo
  rotulo: string
}

// Em cada grupo, as chaves estão na ORDEM DO EXPORT DO FMRTE (a mesma do
// template de legends/shared.js). É nessa ordem que o JSON sai; a tela
// ordena pelo rótulo à parte.
const BRUTO: Record<Grupo, Record<string, string>> = {
  tecnico: {
    Corners: 'Cantos',
    Crossing: 'Cruzamentos',
    Dribbling: 'Finta',
    Finishing: 'Finalização',
    FirstTouch: 'Primeiro Toque',
    Freekicks: 'Livres',
    Heading: 'Cabeceamento',
    LongShots: 'Remates de Longe',
    Longthrows: 'Lançamentos Longos',
    Marking: 'Marcação',
    Passing: 'Passe',
    PenaltyTaking: 'Marcação de Penáltis',
    Tackling: 'Desarme',
    Technique: 'Técnica',
  },
  mental: {
    Aggression: 'Agressividade',
    Anticipation: 'Antecipação',
    Bravery: 'Bravura',
    Composure: 'Compostura',
    Concentration: 'Concentração',
    Vision: 'Visão de Jogo',
    Decisions: 'Decisões',
    Determination: 'Determinação',
    Flair: 'Imprevisibilidade',
    Leadership: 'Liderança',
    OffTheBall: 'Sem Bola',
    Positioning: 'Posicionamento',
    Teamwork: 'Trabalho de Equipa',
    Workrate: 'Índice de Trabalho',
  },
  fisico: {
    Acceleration: 'Aceleração',
    Agility: 'Agilidade',
    Balance: 'Equilíbrio',
    Jumping: 'Impulsão',
    LeftFoot: 'Pé Esquerdo',
    NaturalFitness: 'Aptidão Física',
    Pace: 'Velocidade',
    RightFoot: 'Pé Direito',
    Stamina: 'Resistência',
    Strength: 'Força',
  },
  goleiro: {
    AerialAbility: 'Alcance Aéreo',
    CommandOfArea: 'Comando de Área',
    Communication: 'Comunicação',
    Eccentricity: 'Excentricidade',
    Handling: 'Jogo de Mãos',
    Kicking: 'Pontapé',
    OneOnOnes: 'Um Para Um',
    Reflexes: 'Reflexos',
    RushingOut: 'Saídas da Baliza',
    TendencyToPunch: 'Tendência para Socar',
    Throwing: 'Lançamentos',
  },
  oculto: {
    Consistency: 'Consistência',
    Dirtiness: 'Jogo Sujo',
    ImportantMatches: 'Jogos Importantes',
    InjuryProness: 'Propensão a Lesões',
    Versatility: 'Versatilidade',
  },
  personalidade: {
    Adaptability: 'Adaptabilidade',
    Ambition: 'Ambição',
    Loyalty: 'Lealdade',
    Pressure: 'Pressão',
    Professional: 'Profissionalismo',
    Sportsmanship: 'Desportivismo',
    Temperament: 'Temperamento',
    Controversy: 'Controvérsia',
  },
}

/** As chaves de cada grupo na ordem do JSON do FMRTE. */
export const CHAVES_FMRTE: Record<Grupo, string[]> = Object.fromEntries(
  Object.entries(BRUTO).map(([g, b]) => [g, Object.keys(b)]),
) as Record<Grupo, string[]>

/**
 * Todos os atributos, ordenados pelo rótulo dentro de cada grupo — é assim que
 * o FM mostra a grade.
 */
export const ATRIBUTOS: Atributo[] = (Object.keys(BRUTO) as Grupo[]).flatMap((grupo) =>
  Object.entries(BRUTO[grupo])
    .map(([chave, rotulo]) => ({ chave, grupo, rotulo }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt')),
)

export const ROTULO: Record<string, string> = Object.fromEntries(
  ATRIBUTOS.map((a) => [a.chave, a.rotulo]),
)

export const doGrupo = (grupo: Grupo) => ATRIBUTOS.filter((a) => a.grupo === grupo)

/** Os pés são atributos físicos no JSON, mas na tela têm controle próprio. */
export const PES = ['LeftFoot', 'RightFoot'] as const

/** Cor do valor de um atributo, na mesma régua do fmTatics. */
export function corDoValor(v: number): string {
  if (v >= 17) return 'text-emerald-400'
  if (v >= 14) return 'text-lime-400'
  if (v >= 11) return 'text-yellow-300'
  if (v >= 8) return 'text-orange-400'
  return 'text-red-400'
}
