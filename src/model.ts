import {
  canBeSpeaker,
  demIds,
  gopIds,
  MAJORITY,
  parties,
  partyById,
  posts,
  questions,
  SEAT_COUNT,
  THIRD_PARTY_FLOOR,
  themes,
  vetoPairs,
  weightLevels,
  type Question,
} from './data'
import { leaderOf, partyName, scenarioText, type Locale } from './i18n'

const SIGMA = 0.4
const ELASTICITY = 1.35
const GEO_BIAS = 0.004

export type Answers = Record<string, number | null>
export type Weights = Record<string, number>

export type Scenario = {
  id: string
  name: string
  ids: string[]
  seats: number
  pm: string | null
  outside: string[]
  total: number
  note: string
}

export type Coalition = {
  ids: string[]
  seats: number
  pm: string
}

export type ThemeBlock = {
  themeId: string
  seats: Record<string, number>
  total: number
  raw: Record<string, number>
}

export type BillTally = {
  yes: number
  no: number
  abs: number
  yesIds: string[]
  noIds: string[]
  absIds: string[]
  pass: boolean
}

export type SeatResult = {
  seats: Record<string, number>
  raw: Record<string, number>
  blocks: ThemeBlock[]
  twoPartyDem: number
  closestId: string
  closeness: Record<string, number>
  scenarios: Scenario[]
  coalitions: Coalition[]
  primaryId: string | null
  floorFight: boolean
  leverageId: string | null
  verdictTitle: string
  verdictText: string
  outlookTitle: string
  outlookText: string
  compassUser: { x: number; y: number } | null
  compassParties: { id: string; x: number; y: number }[]
  cabinet: { post: string; partyId: string }[] | null
}

export function defaultWeights(): Weights {
  return Object.fromEntries(themes.map((theme) => [theme.id, 2]))
}

function themeWeight(weights: Weights, themeId: string) {
  const level = weights[themeId]
  const found = weightLevels.find((item) => item.id === level)
  return found ? found.w : weightLevels[2].w
}

function answered(questionsIn: Question[], answers: Answers, weights: Weights) {
  return questionsIn.filter((question) => {
    if (!(question.id in answers) || answers[question.id] == null) return false
    return themeWeight(weights, question.theme) > 0
  })
}

function shares(question: Question, value: number) {
  const distances = parties.map((party) => {
    const stance = question.stance[party.id] ?? 0
    return (value - stance) ** 2
  })
  const floor = Math.min(...distances)
  const raw = distances.map((distance) => Math.exp(-(distance - floor) / (2 * SIGMA * SIGMA)))
  const sum = raw.reduce((total, item) => total + item, 0)
  return raw.map((item) => (sum ? item / sum : 0))
}

export function vetoed(ids: string[]) {
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const pair = vetoPairs.some(
        ([a, b]) => (a === ids[i] && b === ids[j]) || (b === ids[i] && a === ids[j]),
      )
      if (pair) return true
    }
  }
  return false
}

function sumIds(seats: Record<string, number>, ids: string[]) {
  return ids.reduce((total, id) => total + (seats[id] ?? 0), 0)
}

function presentIds(ids: string[], seats: Record<string, number>) {
  return ids.filter((id) => (seats[id] ?? 0) > 0)
}

function wingsOf(present: string[]) {
  if (present.every((id) => demIds.includes(id))) {
    return { institutional: 'dem', rebels: present.filter((id) => id !== 'dem') }
  }
  if (present.every((id) => gopIds.includes(id))) {
    return { institutional: 'gop', rebels: present.filter((id) => id !== 'gop') }
  }
  return { institutional: null as string | null, rebels: present }
}

export function isFloorFight(ids: string[], seats: Record<string, number>) {
  const present = presentIds(ids, seats)
  const total = sumIds(seats, present)
  if (total < MAJORITY) return false
  const margin = total - MAJORITY
  const { institutional, rebels } = wingsOf(present)
  const blocking = rebels.filter((id) => (seats[id] ?? 0) > margin)
  if (blocking.length >= 2) return true
  // У республиканцев один кокус свободы уже устраивает многотуровое голосование,
  // если руководство само больше запаса и может провалить кандидата кокуса.
  // Демократический левый фланг в такой же арифметике обычно голосует за своего номинанта:
  // это рычаг, а не борьба, пока умеренные не могут провалить кандидата отдельно.
  return institutional === 'gop' && blocking.includes('hfc') && (seats.gop ?? 0) > margin
}

export function speakerOf(ids: string[], seats: Record<string, number>): string | null {
  const present = presentIds(ids, seats)
  if (!present.length) return null
  const total = sumIds(seats, present)
  const margin = total - MAJORITY
  const demOnly = present.every((id) => demIds.includes(id))
  const gopOnly = present.every((id) => gopIds.includes(id))

  if (demOnly) {
    if (isFloorFight(present, seats) && (seats.dem ?? 0) > 0) return 'dem'
    const prog = seats.prog ?? 0
    const dem = seats.dem ?? 0
    if (prog > dem && (seats.modd ?? 0) <= margin && prog > 0) return 'prog'
    if (dem > 0) return 'dem'
    return present.slice().sort((a, b) => (seats[b] ?? 0) - (seats[a] ?? 0))[0]
  }
  if (gopOnly) {
    if (isFloorFight(present, seats) && (seats.gop ?? 0) > 0) return 'gop'
    const hfc = seats.hfc ?? 0
    const gop = seats.gop ?? 0
    if (hfc > gop && (seats.modr ?? 0) <= margin && hfc > 0) return 'hfc'
    if (gop > 0) return 'gop'
    return hfc > 0 ? 'hfc' : present[0]
  }
  const pool = present.filter((id) => canBeSpeaker(id))
  const source = pool.length ? pool : present
  return source.slice().sort((a, b) => (seats[b] ?? 0) - (seats[a] ?? 0) || a.localeCompare(b))[0]
}

export function leverageWing(ids: string[], seats: Record<string, number>): string | null {
  const present = presentIds(ids, seats)
  const total = sumIds(seats, present)
  if (total < MAJORITY) return null
  const margin = total - MAJORITY
  const speaker = speakerOf(present, seats)
  const wings = present.filter((id) => id !== speaker && (seats[id] ?? 0) > margin)
  return wings.length === 1 ? wings[0] : null
}

function span(ids: string[]) {
  const ranks = ids.map((id) => partyById(id).lr)
  return Math.max(...ranks) - Math.min(...ranks)
}

export function minimalCoalitions(seats: Record<string, number>): Coalition[] {
  const ids = parties.filter((party) => party.organize && (seats[party.id] ?? 0) > 0).map((party) => party.id)
  const found: Coalition[] = []
  const limit = 1 << ids.length
  for (let mask = 1; mask < limit; mask += 1) {
    const member: string[] = []
    let total = 0
    for (let index = 0; index < ids.length; index += 1) {
      if ((mask & (1 << index)) === 0) continue
      member.push(ids[index])
      total += seats[ids[index]] ?? 0
    }
    if (total < MAJORITY || vetoed(member)) continue
    if (member.some((id) => total - (seats[id] ?? 0) >= MAJORITY)) continue
    const pm = speakerOf(member, seats)
    if (!pm) continue
    found.push({ ids: member, seats: total, pm })
  }
  found.sort((a, b) => a.ids.length - b.ids.length || span(a.ids) - span(b.ids) || b.seats - a.seats)
  const seen = new Set<string>()
  return found
    .filter((item) => {
      const key = item.ids.slice().sort().join('+')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 4)
}

function hamilton(weights: number[], total: number) {
  const seats = weights.map(() => 0)
  if (total <= 0) return seats
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  const exact = sum > 0 ? weights.map((weight) => (weight / sum) * total) : weights.map(() => total / weights.length)
  for (let index = 0; index < exact.length; index += 1) seats[index] = Math.floor(exact[index])
  let left = total - seats.reduce((acc, seat) => acc + seat, 0)
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index)
  for (const item of order) {
    if (left <= 0) break
    seats[item.index] += 1
    left -= 1
  }
  return seats
}

function blend(ids: string[], score: Record<string, number>, prior: number[]) {
  const sum = ids.reduce((acc, id) => acc + (score[id] ?? 0), 0)
  return ids.map((id, index) => {
    const vote = sum > 0 ? (score[id] ?? 0) / sum : 1 / ids.length
    return 0.78 * vote + 0.22 * prior[index]
  })
}

export function allocateSeats(score: Record<string, number>, total = SEAT_COUNT) {
  const seats: Record<string, number> = Object.fromEntries(parties.map((party) => [party.id, 0]))
  if (total <= 0) return seats
  const scale = total / SEAT_COUNT
  const indShare = score.ind ?? 0
  let indSeats = 0
  if (indShare >= THIRD_PARTY_FLOOR) {
    indSeats = Math.min(total, Math.round(40 * scale), Math.max(0, Math.round((indShare - THIRD_PARTY_FLOOR) * 36 * scale)))
  }
  const rest = total - indSeats
  const dVote = sumIds(score, demIds)
  const rVote = sumIds(score, gopIds)
  const denom = dVote + rVote
  const dTP = denom > 0 ? dVote / denom : 0.5
  const dFrac = Math.max(0.05, Math.min(0.95, 0.5 + ELASTICITY * (dTP - 0.5 - GEO_BIAS)))
  const dSeats = Math.round(dFrac * rest)
  const rSeats = rest - dSeats
  const dSplit = hamilton(blend(demIds, score, [0.2, 0.62, 0.18]), dSeats)
  const rSplit = hamilton(blend(gopIds, score, [0.16, 0.52, 0.32]), rSeats)
  seats.ind = indSeats
  demIds.forEach((id, index) => {
    seats[id] = dSplit[index]
  })
  gopIds.forEach((id, index) => {
    seats[id] = rSplit[index]
  })
  const got = Object.values(seats).reduce((acc, seat) => acc + seat, 0)
  if (got !== total) seats.gop = (seats.gop ?? 0) + (total - got)
  return seats
}

export function seatPlan(weights: Weights) {
  const plan = Object.fromEntries(themes.map((theme) => [theme.id, 0]))
  const active = themes.filter((theme) => themeWeight(weights, theme.id) > 0)
  if (!active.length) return plan
  const counts = hamilton(
    active.map((theme) => themeWeight(weights, theme.id)),
    SEAT_COUNT,
  )
  active.forEach((theme, index) => {
    plan[theme.id] = counts[index] ?? 0
  })
  return plan
}

function themeScore(themeId: string, answers: Answers) {
  const score = Object.fromEntries(parties.map((party) => [party.id, 0]))
  let count = 0
  for (const question of questions) {
    if (question.theme !== themeId) continue
    const value = answers[question.id]
    if (value == null) continue
    count += 1
    shares(question, value).forEach((share, index) => {
      score[parties[index].id] += share
    })
  }
  if (!count) {
    for (const party of parties) score[party.id] = 1
  }
  return score
}

export function sectionBlocks(answers: Answers, weights: Weights): ThemeBlock[] {
  const plan = seatPlan(weights)
  const active = themes.filter((theme) => (plan[theme.id] ?? 0) > 0)
  if (!active.length) {
    const raw = Object.fromEntries(parties.map((party) => [party.id, 1 / parties.length]))
    return [{ themeId: '_even', seats: allocateSeats(raw, SEAT_COUNT), total: SEAT_COUNT, raw }]
  }
  return active.map((theme) => {
    const score = themeScore(theme.id, answers)
    const totalScore = Object.values(score).reduce((sum, value) => sum + value, 0) || 1
    const raw = Object.fromEntries(parties.map((party) => [party.id, score[party.id] / totalScore]))
    const total = plan[theme.id] ?? 0
    return { themeId: theme.id, raw, total, seats: allocateSeats(raw, total) }
  })
}

export function tallyBill(questionId: string, yes: 1 | -1, seats: Record<string, number>): BillTally {
  const question = questions.find((item) => item.id === questionId)
  const yesIds: string[] = []
  const noIds: string[] = []
  const absIds: string[] = []
  let yesSeats = 0
  let noSeats = 0
  let absSeats = 0
  for (const party of parties) {
    const count = seats[party.id] ?? 0
    if (!count) continue
    const lean = ((question?.stance[party.id] ?? 0) * yes)
    if (lean >= 0.2) {
      yesSeats += count
      yesIds.push(party.id)
    } else if (lean <= -0.2) {
      noSeats += count
      noIds.push(party.id)
    } else {
      absSeats += count
      absIds.push(party.id)
    }
  }
  return { yes: yesSeats, no: noSeats, abs: absSeats, yesIds, noIds, absIds, pass: yesSeats >= MAJORITY }
}

export function addSeats(blocks: ThemeBlock[], themeIds: string[]) {
  const seats = Object.fromEntries(parties.map((party) => [party.id, 0]))
  const allow = new Set(themeIds)
  for (const block of blocks) {
    if (!allow.has(block.themeId)) continue
    for (const party of parties) seats[party.id] += block.seats[party.id] ?? 0
  }
  return seats
}

export function buildScenarios(seats: Record<string, number>, locale: Locale = 'ru'): Scenario[] {
  const demPresent = presentIds(demIds, seats)
  const gopPresent = presentIds(gopIds, seats)
  const demSeats = sumIds(seats, demPresent)
  const gopSeats = sumIds(seats, gopPresent)
  const ind = seats.ind ?? 0
  const text = (id: string) => scenarioText(locale, id)
  const scenarios: Scenario[] = [
    {
      id: 'dem',
      name: text('dem').name,
      ids: demPresent,
      seats: demSeats,
      pm: speakerOf(demPresent, seats),
      outside: [],
      total: demSeats,
      note: text('dem').note,
    },
    {
      id: 'gop',
      name: text('gop').name,
      ids: gopPresent,
      seats: gopSeats,
      pm: speakerOf(gopPresent, seats),
      outside: [],
      total: gopSeats,
      note: text('gop').note,
    },
  ]
  if (ind > 0 && demSeats < MAJORITY && gopSeats < MAJORITY) {
    const host = demSeats >= gopSeats ? 'dem' : 'gop'
    const hostIds = host === 'dem' ? demPresent : gopPresent
    const hostSeats = host === 'dem' ? demSeats : gopSeats
    scenarios.push({
      id: 'outside',
      name: text('outside').name,
      ids: hostIds,
      seats: hostSeats,
      pm: speakerOf(hostIds, seats),
      outside: ['ind'],
      total: hostSeats + ind,
      note: text('outside').note,
    })
  }
  return scenarios
}

function pickPrimary(scenarios: Scenario[]) {
  const ready = scenarios.filter((item) => item.outside.length === 0 && item.total >= MAJORITY)
  if (ready.length) return ready.slice().sort((a, b) => b.total - a.total)[0].id
  const outside = scenarios.find((item) => item.id === 'outside' && item.total >= MAJORITY)
  return outside ? outside.id : null
}

function narrate(
  seats: Record<string, number>,
  scenarios: Scenario[],
  primaryId: string | null,
  locale: Locale,
) {
  const byId = Object.fromEntries(scenarios.map((item) => [item.id, item]))
  const dem = byId.dem
  const gop = byId.gop
  const primary = primaryId ? byId[primaryId] : undefined
  const en = locale === 'en'

  if (!primary) {
    const best = scenarios.slice().sort((a, b) => b.total - a.total)[0]
    return {
      verdictTitle: en ? '218 does not come together' : '218 не собирается',
      verdictText: noMajorityText(en, dem?.seats ?? 0, gop?.seats ?? 0),
      outlookTitle: en ? 'A House that cannot organize' : 'Палата без спикера',
      outlookText: best
        ? repeatOutlook(en, best.name, best.total)
        : en
          ? 'No camp has the seats.'
          : 'Мест не хватает ни одному лагерю.',
    }
  }

  if (primary.outside.length) {
    return outsideSpeaker(en, primary.seats, primary.total, leaderOf(locale, primary.pm))
  }

  const fight = isFloorFight(primary.ids, seats)
  const wing = leverageWing(primary.ids, seats)
  const speaker = leaderOf(locale, primary.pm)
  const margin = primary.total - MAJORITY

  if (fight) {
    return {
      verdictTitle: en ? `Floor fight at ${primary.total}` : `Борьба за спикера при ${primary.total}`,
      verdictText: fightText(en, primary.id, primary.total, margin),
      outlookTitle: en ? 'No committees until a speaker' : 'Пока нет спикера, нет комитетов',
      outlookText: fightOutlook(en),
    }
  }

  return {
    verdictTitle: `${primary.name}: ${primary.total}`,
    verdictText: majorityText(en, primary.id, primary.total, margin, wing ? partyName(locale, wing) : null, speaker, seats[wing ?? ''] ?? 0),
    outlookTitle: outlookTitle(en, primary.id, primary.pm),
    outlookText: outlookBody(en, primary.id, primary.pm, Boolean(wing)),
  }
}

function noMajorityText(en: boolean, dem: number, gop: number) {
  if (en) {
    return `Democrats get ${dem}, Republicans ${gop}. The nearest attempt is still short of 218. Without a speaker the House does not send bills to committee.`
  }
  return `Демократы получают ${dem}, республиканцы ${gop}. Ближайшая попытка всё равно короче 218. Без спикера палата не рассылает законопроекты по комитетам.`
}

function repeatOutlook(en: boolean, name: string, total: number) {
  if (en) return `The furthest reach is “${name}”: ${total} of ${MAJORITY}. Members-elect can vote, but nobody is sworn in as speaker until 218 names match.`
  return `Дальше всех дотягивается «${name}»: ${total} из ${MAJORITY}. Избранные депутаты могут голосовать, но спикер не приведён к присяге, пока 218 человек не назовут одно имя.`
}

function outsideSpeaker(en: boolean, seats: number, total: number, speaker: string) {
  if (en) {
    return {
      verdictTitle: `With independents that is ${total}`,
      verdictText: `The camp itself has only ${seats}. Together with independents, who take no leadership posts, that is ${total}. This is a majority for one evening: independents can walk on the first spending bill.`,
      outlookTitle: 'A borrowed gavel',
      outlookText: `The speaker in this lineup is ${speaker}. Independents get no chair and can withhold the vote that keeps the government open.`,
    }
  }
  return {
    verdictTitle: `С независимыми набирается ${total}`,
    verdictText: `Своих мест у лагеря только ${seats}. Вместе с независимыми, которые не берут постов руководства, выходит ${total}. Это большинство на один вечер: независимые могут уйти на первом же бюджете.`,
    outlookTitle: 'Чужой молоток',
    outlookText: `Спикер в таком раскладе ${speaker}. Независимые кресла не получают и могут снять голос, без которого правительство не финансируется.`,
  }
}

function fightText(en: boolean, id: string, total: number, margin: number) {
  const camp = id === 'gop' ? (en ? 'Republicans' : 'республиканцев') : en ? 'Democrats' : 'демократов'
  if (en) {
    return `${camp[0].toUpperCase()}${camp.slice(1)} have ${total} seats, only ${margin} more than 218. At least two wings are each larger than that margin, so each can sink the other's nominee. The House stood like this in January 2023, when Kevin McCarthy was elected on the 15th ballot. Until there is a deal, there is no speaker and the committees do not start.`
  }
  return `У ${camp} ${total} мест, запас над 218 всего ${margin}. Как минимум два крыла больше этого запаса, и каждое может провалить чужого кандидата. Так палата стояла в январе 2023 года, когда Кевина Маккарти избирали с 15-й попытки. Пока сделки нет, спикера нет, и комитеты не начинают работу.`
}

function fightOutlook(en: boolean) {
  if (en) return 'The first bill that breaks a floor fight is usually a stopgap spending bill. Otherwise the government shuts down while the gavel is still empty.'
  return 'Первый счёт, который ломает борьбу за спикера, обычно временный бюджет. Иначе правительство закрывается, пока молоток всё ещё никто не держит.'
}

function majorityText(
  en: boolean,
  id: string,
  total: number,
  margin: number,
  wing: string | null,
  speaker: string,
  wingSeats: number,
) {
  if (en) {
    if (wing) {
      return `${id === 'gop' ? 'Republicans' : 'Democrats'} get ${total}. The cushion over 218 is ${margin}, and ${wing} has ${wingSeats} seats. That is enough to vote the nominee down. ${speaker} becomes speaker only if that wing votes yes instead of sitting on its hands.`
    }
    return `${id === 'gop' ? 'Republicans' : 'Democrats'} get ${total}. The cushion over 218 is ${margin}, larger than any single wing, so no flank can block organization by itself. On this majority the gavel goes to ${speaker}.`
  }
  if (wing) {
    return `${id === 'gop' ? 'Республиканцы' : 'Демократы'} получают ${total}. Запас над 218 всего ${margin}, а у «${wing}» ${wingSeats} мест. Этого хватает, чтобы провалить кандидата. Спикером становится ${speaker}, только если это крыло голосует за, а не сидит на руках.`
  }
  return `${id === 'gop' ? 'Республиканцы' : 'Демократы'} получают ${total}. Запас над 218 составляет ${margin}, он больше любого одного крыла, поэтому фланг сам по себе организацию не срывает. В таком большинстве спикером становится ${speaker}.`
}

function outlookTitle(en: boolean, id: string, speaker: string | null) {
  if (en) {
    if (speaker === 'hfc') return 'A Freedom Caucus gavel'
    if (speaker === 'prog') return 'A progressive gavel'
    return id === 'gop' ? 'A Republican House' : 'A Democratic House'
  }
  if (speaker === 'hfc') return 'Молоток у кокуса свободы'
  if (speaker === 'prog') return 'Молоток у прогрессистов'
  return id === 'gop' ? 'Республиканская палата' : 'Демократическая палата'
}

function outlookBody(en: boolean, id: string, speaker: string | null, wing: boolean) {
  if (en) {
    if (speaker === 'hfc') return 'The agenda is tariffs, winding down Ukraine aid, and a Justice Department that answers to the White House. The caucus is large enough to pass that without the moderate Republicans.'
    if (speaker === 'prog') return 'The agenda is expanded coverage, a drug-price cap, and a vote on abortion rights. The progressive wing is large enough to elect its own speaker without the moderates.'
    if (id === 'gop' && wing) return 'Leadership holds the gavel on loan from the Freedom Caucus. Closed rules pass only while that loan is current. A spending fight is where it gets called in.'
    if (id === 'dem' && wing) return 'Leadership holds the gavel on loan from the progressives. The left wing bargains the rules package: an open amendment, or a gavel on Judiciary. The budget lives until that bargain breaks.'
    if (id === 'gop') return 'The agenda is extending the tax cuts, a harder border, and letting the enhanced ACA subsidies lapse. The speaker writes closed rules.'
    return 'The agenda is keeping the ACA subsidies, a Medicare drug cap, and aid to Ukraine. The rules package is written by leadership, not by the flank.'
  }
  if (speaker === 'hfc') return 'Повестка: пошлины, свёртывание помощи Украине и Минюст, который отвечает Белому дому. Кокуса хватает, чтобы провести это без умеренных республиканцев.'
  if (speaker === 'prog') return 'Повестка: более широкая страховка, потолок цен на лекарства и голосование о праве на аборт. Прогрессистов хватает, чтобы избрать своего спикера без умеренных.'
  if (id === 'gop' && wing) return 'Руководство держит молоток в долг у кокуса свободы. Закрытые правила проходят, пока долг не потребовали назад. Обычно его требуют на бюджете.'
  if (id === 'dem' && wing) return 'Руководство держит молоток в долг у прогрессистов. Левый фланг торгует пакет правил: открытая поправка или молоток юридического комитета. Бюджет жив, пока торг не сорвался.'
  if (id === 'gop') return 'Повестка: продление налоговых льгот, более жёсткая граница и истечение расширенных субсидий ACA. Спикер пишет закрытые правила.'
  return 'Повестка: сохранить субсидии ACA, потолок цен на лекарства в Medicare и помощь Украине. Пакет правил пишет руководство, а не фланг.'
}

function compassOf(weights: Weights, pick: (question: Question) => number | null) {
  let x = 0
  let y = 0
  let xw = 0
  let yw = 0
  for (const question of questions) {
    const value = pick(question)
    if (value == null) continue
    const weight = themeWeight(weights, question.theme)
    if (weight <= 0) continue
    const ax = Math.abs(question.x)
    const ay = Math.abs(question.y)
    x += value * question.x * weight
    y += value * question.y * weight
    xw += ax * weight
    yw += ay * weight
  }
  if (!xw && !yw) return null
  return {
    x: xw ? Math.max(-1, Math.min(1, x / xw)) : 0,
    y: yw ? Math.max(-1, Math.min(1, y / yw)) : 0,
  }
}

function buildLeadership(ids: string[], seats: Record<string, number>, speaker: string | null) {
  if (!speaker) return null
  const members = ids.filter((id) => partyById(id).organize && (seats[id] ?? 0) > 0)
  if (!members.length) return null
  const load = new Map<string, number>()
  const assigned: { post: string; partyId: string }[] = [{ post: 'speaker', partyId: speaker }]
  load.set(speaker, 1)
  for (const post of posts) {
    if (post.id === 'speaker') continue
    const fitted = members.filter((id) => partyById(id).fit.includes(post.id))
    const pool = fitted.length ? fitted : members
    pool.sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0) || (seats[b] ?? 0) - (seats[a] ?? 0))
    const pick = pool[0]
    assigned.push({ post: post.id, partyId: pick })
    load.set(pick, (load.get(pick) ?? 0) + 1)
  }
  return assigned
}

export function simulate(answers: Answers, weights: Weights = defaultWeights(), locale: Locale = 'ru'): SeatResult {
  const active = answered(questions, answers, weights)
  const blocks = sectionBlocks(answers, weights)
  const seats = Object.fromEntries(parties.map((party) => [party.id, 0]))
  for (const block of blocks) {
    for (const party of parties) seats[party.id] += block.seats[party.id] ?? 0
  }
  const denom = blocks.reduce((sum, block) => sum + block.total, 0) || 1
  const raw = Object.fromEntries(
    parties.map((party) => [party.id, blocks.reduce((sum, block) => sum + block.raw[party.id] * block.total, 0) / denom]),
  )
  const dVote = sumIds(raw, demIds)
  const rVote = sumIds(raw, gopIds)
  const twoPartyDem = dVote + rVote > 0 ? dVote / (dVote + rVote) : 0.5

  const closeness: Record<string, number> = {}
  for (const party of parties) {
    let sum = 0
    let weightSum = 0
    for (const question of active) {
      const value = answers[question.id]
      if (value == null) continue
      const weight = themeWeight(weights, question.theme)
      sum += weight * (1 - Math.abs(value - (question.stance[party.id] ?? 0)) / 2)
      weightSum += weight
    }
    closeness[party.id] = weightSum ? sum / weightSum : 0
  }
  const closestId = parties.slice().sort((a, b) => closeness[b.id] - closeness[a.id] || b.poll - a.poll)[0].id

  const scenarios = buildScenarios(seats, locale)
  const primaryId = pickPrimary(scenarios)
  const primary = scenarios.find((item) => item.id === primaryId) ?? null
  const text = narrate(seats, scenarios, primaryId, locale)
  const fight = Boolean(primary && primary.outside.length === 0 && isFloorFight(primary.ids, seats))
  const leverageId = primary && primary.outside.length === 0 && !fight ? leverageWing(primary.ids, seats) : null
  const cabinet = primary && primary.total >= MAJORITY && primary.outside.length === 0 && !fight
    ? buildLeadership(primary.ids, seats, primary.pm)
    : null

  return {
    seats,
    raw,
    blocks,
    twoPartyDem,
    closestId,
    closeness,
    scenarios,
    coalitions: minimalCoalitions(seats),
    primaryId,
    floorFight: fight,
    leverageId,
    verdictTitle: text.verdictTitle,
    verdictText: text.verdictText,
    outlookTitle: text.outlookTitle,
    outlookText: text.outlookText,
    compassUser: compassOf(weights, (question) => (question.id in answers ? answers[question.id] : null)),
    compassParties: parties.map((party) => {
      const point = compassOf(defaultWeights(), (question) => question.stance[party.id] ?? 0)
      return { id: party.id, x: point?.x ?? 0, y: point?.y ?? 0 }
    }),
    cabinet,
  }
}

export function formatPct(value: number, locale: Locale = 'ru') {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value * 100)
}
