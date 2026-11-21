// Quanto cada atributo pesa no CA, por perfil de posição.
//
// Fonte: a "CA WEIGHT SYSTEM" de `C:\dev\legends\shared.js`, a mesma que o
// gerador de lendas usa. Os números são cópia fiel de lá; só os nomes dos
// perfis foram traduzidos. `WeakerFoot` é o pé mais fraco: min(LeftFoot, RightFoot).

export type Perfil =
  | 'GOLEIRO'
  | 'ZAGUEIRO'
  | 'LATERAL'
  | 'VOLANTE'
  | 'MEIO_CAMPO'
  | 'MEIA_ABERTO'
  | 'MEIA_ATACANTE'
  | 'PONTA'
  | 'ATACANTE'

export const PESOS: Record<Perfil, Record<string, number>> = {
  GOLEIRO: {
    Decisions: 10, Handling: 8, Reflexes: 8, Agility: 8, AerialAbility: 6, CommandOfArea: 6,
    Bravery: 6, Concentration: 6, Acceleration: 6, Positioning: 5, Communication: 5, Kicking: 5,
    Strength: 4, OneOnOnes: 4, Pace: 3, Passing: 3, Throwing: 3, Anticipation: 3, WeakerFoot: 3,
    Composure: 2, Balance: 2, Leadership: 2, Teamwork: 2, Stamina: 1, Jumping: 1, FirstTouch: 1,
    Heading: 1, Technique: 1, Vision: 1, Workrate: 1,
  },
  ZAGUEIRO: {
    Decisions: 10, Positioning: 8, Marking: 8, Acceleration: 6, Agility: 6, Jumping: 6, Strength: 6,
    Anticipation: 5, Heading: 5, Tackling: 5, Pace: 5, WeakerFoot: 4.5, Concentration: 4, Stamina: 3,
    Composure: 2, Bravery: 2, FirstTouch: 2, Passing: 2, Leadership: 2, Balance: 2, Workrate: 2,
  },
  LATERAL: {
    Decisions: 7, Acceleration: 7, Agility: 6, Stamina: 6, WeakerFoot: 4, Pace: 5, Concentration: 4,
    Tackling: 4, Strength: 4, Anticipation: 3, FirstTouch: 3, Marking: 3, Composure: 2, Vision: 2,
    Workrate: 2, Bravery: 2, Teamwork: 2, Jumping: 2, Heading: 2, Crossing: 2, Technique: 2,
    Positioning: 4, Balance: 2,
  },
  VOLANTE: {
    Decisions: 8, Tackling: 7, Positioning: 5, Anticipation: 5, WeakerFoot: 5, Acceleration: 6,
    Agility: 6, Strength: 5, Vision: 4, Workrate: 4, FirstTouch: 4, Passing: 4, Pace: 4, Stamina: 4,
    Concentration: 3, LongShots: 3, Marking: 3, Technique: 3, Composure: 2, Dribbling: 2, Balance: 2,
    Teamwork: 2,
  },
  MEIO_CAMPO: {
    Decisions: 7, Vision: 6, FirstTouch: 6, Passing: 6, Stamina: 6, Acceleration: 6, Agility: 6,
    WeakerFoot: 6, Pace: 5, Strength: 4, Technique: 4, Composure: 3, OffTheBall: 3, Workrate: 3,
    Anticipation: 3, LongShots: 3, Marking: 3, Tackling: 3, Concentration: 2, Teamwork: 2,
    Dribbling: 2, Finishing: 2, Balance: 2,
  },
  MEIA_ABERTO: {
    Acceleration: 8, Agility: 6, Pace: 6, Crossing: 5, WeakerFoot: 5, Stamina: 5, FirstTouch: 4,
    Technique: 4, Decisions: 5, Dribbling: 3, Vision: 3, Workrate: 3, Composure: 3, Anticipation: 3,
    Passing: 3, Strength: 3, Balance: 2,
  },
  MEIA_ATACANTE: {
    Acceleration: 9, Pace: 7, WeakerFoot: 7, Vision: 6, Decisions: 6, Stamina: 6, Agility: 6,
    Technique: 5, FirstTouch: 5, Passing: 4, OffTheBall: 3, Composure: 3, Anticipation: 3,
    Dribbling: 3, Finishing: 3, LongShots: 3, Workrate: 3, Strength: 3, Balance: 2, Positioning: 2,
    Tackling: 2,
  },
  PONTA: {
    Acceleration: 10, Pace: 10, Stamina: 7, WeakerFoot: 5.5, Agility: 6, Crossing: 5, Dribbling: 5,
    FirstTouch: 5, Technique: 4, Decisions: 5, Composure: 3, Workrate: 3, Vision: 3, Strength: 3,
    Anticipation: 3, Balance: 2,
  },
  ATACANTE: {
    Acceleration: 10, WeakerFoot: 7.5, Finishing: 8, Pace: 7, Composure: 6, OffTheBall: 6, Stamina: 6,
    Strength: 6, FirstTouch: 6, Heading: 6, Anticipation: 5, Jumping: 5, Decisions: 5, Dribbling: 5,
    Agility: 6, Technique: 4, Balance: 2, LongShots: 2, Vision: 2, Passing: 2,
  },
}
