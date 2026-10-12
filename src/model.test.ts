import { describe, expect, it } from 'vitest'
import { demIds, gopIds, parties, questions, SEAT_COUNT, themes, THIRD_PARTY_FLOOR } from './data'
import { questionText, themeText } from './i18n'
import {
  buildScenarios,
  defaultWeights,
  isFloorFight,
  leverageWing,
  minimalCoalitions,
  simulate,
  speakerOf,
  vetoed,
} from './model'

function fill(value: number) {
  return Object.fromEntries(questions.map((question) => [question.id, value]))
}

function seatsOf(value: number) {
  return simulate(fill(value)).seats
}

function camp(seats: Record<string, number>, ids: string[]) {
  return ids.reduce((sum, id) => sum + (seats[id] ?? 0), 0)
}

describe('языки', () => {
  it('переводит вердикт и не меняет места', () => {
    const ru = simulate(fill(0))
    const en = simulate(fill(0), defaultWeights(), 'en')
    expect(en.seats).toEqual(ru.seats)
    expect(ru.verdictTitle).toMatch(/[А-Яа-яЁё]/)
    expect(en.verdictTitle).not.toMatch(/[А-Яа-яЁё]/)
    expect(en.scenarios.map((item) => item.name).join(' ')).not.toMatch(/[А-Яа-яЁё]/)
    expect(en.verdictText).not.toMatch(/[А-Яа-яЁё]/)
    expect(en.outlookText).not.toMatch(/[А-Яа-яЁё]/)
  })

  it('даёт английский каждому вопросу и теме', () => {
    for (const question of questions) {
      const copy = questionText('en', question.id)
      expect(copy.title.length).toBeGreaterThan(1)
      expect(copy.a.length).toBeGreaterThan(1)
      expect(copy.b.length).toBeGreaterThan(1)
      expect(`${copy.title} ${copy.a} ${copy.b}`).not.toMatch(/[А-Яа-яЁё]/)
    }
    for (const theme of ['money', 'care', 'border', 'rights', 'power', 'world']) {
      expect(themeText('en', theme).name).not.toMatch(/[А-Яа-яЁё]/)
    }
  })
})

describe('палата 2026', () => {
  it('у каждого вопроса есть позиция каждого крыла', () => {
    for (const question of questions) {
      for (const party of parties) {
        const stance = question.stance[party.id]
        expect(stance).toBeGreaterThanOrEqual(-1)
        expect(stance).toBeLessThanOrEqual(1)
      }
    }
  })

  it('прогнозные места складываются в 435', () => {
    expect(parties.reduce((sum, party) => sum + party.poll, 0)).toBe(SEAT_COUNT)
    expect(camp(Object.fromEntries(parties.map((party) => [party.id, party.poll])), demIds)).toBe(238)
    expect(camp(Object.fromEntries(parties.map((party) => [party.id, party.poll])), gopIds)).toBe(197)
  })

  it('всегда раздаёт 435 мест', () => {
    for (const value of [-1, -0.5, 0, 0.5, 1]) {
      const seats = seatsOf(value)
      expect(Object.values(seats).reduce((sum, n) => sum + n, 0)).toBe(SEAT_COUNT)
      for (const seat of Object.values(seats)) expect(seat).toBeGreaterThanOrEqual(0)
    }
  })

  it('жёсткий ответ Б собирает демократическую палату', () => {
    const result = simulate(fill(1))
    const dem = camp(result.seats, demIds)
    const gop = camp(result.seats, gopIds)
    expect(dem).toBeGreaterThan(300)
    expect(gop).toBeLessThan(120)
    expect(result.seats.prog).toBeGreaterThan(result.seats.hfc)
    expect(result.primaryId).toBe('dem')
    expect(['dem', 'prog']).toContain(result.closestId)
  })

  it('жёсткий ответ А собирает республиканскую палату', () => {
    const result = simulate(fill(-1))
    const dem = camp(result.seats, demIds)
    const gop = camp(result.seats, gopIds)
    expect(gop).toBeGreaterThan(300)
    expect(dem).toBeLessThan(120)
    expect(result.seats.hfc).toBeGreaterThan(result.seats.prog)
    expect(result.primaryId).toBe('gop')
    expect(['hfc', 'gop']).toContain(result.closestId)
  })

  it('середина не устраивает разгром', () => {
    const result = simulate(fill(0))
    const dem = camp(result.seats, demIds)
    const gop = camp(result.seats, gopIds)
    expect(Math.abs(dem - gop)).toBeLessThan(80)
    expect(dem).toBeGreaterThan(160)
    expect(gop).toBeGreaterThan(160)
    expect(result.seats.ind).toBeLessThan(40)
  })

  it('крыло ниже порога независимых не получает округов, если доля мала', () => {
    const result = simulate({})
    if (result.raw.ind + 1e-9 < THIRD_PARTY_FLOOR) expect(result.seats.ind).toBe(0)
  })

  it('в каждом разделе по шесть вопросов, а округа разделов складываются в палату', () => {
    expect(questions).toHaveLength(themes.length * 6)
    for (const theme of themes) {
      expect(questions.filter((question) => question.theme === theme.id)).toHaveLength(6)
    }
    const result = simulate(fill(0.5))
    expect(result.blocks.reduce((sum, block) => sum + block.total, 0)).toBe(SEAT_COUNT)
    const seats: Record<string, number> = {}
    for (const block of result.blocks) {
      expect(Object.values(block.seats).reduce((sum, n) => sum + n, 0)).toBe(block.total)
      for (const [id, count] of Object.entries(block.seats)) seats[id] = (seats[id] ?? 0) + count
    }
    expect(seats).toEqual(result.seats)
  })

  it('поздний раздел не переписывает округа раннего', () => {
    const money = Object.fromEntries(questions.filter((question) => question.theme === 'money').map((question) => [question.id, 1]))
    const later = {
      ...money,
      ...Object.fromEntries(questions.filter((question) => question.theme === 'world').map((question) => [question.id, -1])),
    }
    const early = simulate(money).blocks.find((block) => block.themeId === 'money')
    const after = simulate(later).blocks.find((block) => block.themeId === 'money')
    expect(after?.seats).toEqual(early?.seats)
  })
})

describe('спикер', () => {
  it('не сажает прогрессистов с кокусом свободы', () => {
    expect(vetoed(['prog', 'hfc'])).toBe(true)
    expect(vetoed(['prog', 'dem'])).toBe(false)
  })

  it('по прогнозу демократы уже имеют 218, и прогрессисты больше запаса', () => {
    const seats = Object.fromEntries(parties.map((party) => [party.id, party.poll]))
    const scenarios = buildScenarios(seats)
    expect(scenarios.find((item) => item.id === 'dem')?.seats).toBe(238)
    expect(scenarios.find((item) => item.id === 'gop')?.seats).toBe(197)
    expect(speakerOf(['prog', 'dem', 'modd'], seats)).toBe('dem')
    expect(leverageWing(['prog', 'dem', 'modd'], seats)).toBe('prog')
    expect(isFloorFight(['prog', 'dem', 'modd'], seats)).toBe(false)
    const coalitions = minimalCoalitions(seats)
    expect(coalitions.every((item) => item.seats >= 218)).toBe(true)
    expect(coalitions.some((item) => item.ids.includes('prog') && item.ids.includes('hfc'))).toBe(false)
    expect(coalitions.some((item) => item.ids.includes('prog') && item.ids.includes('dem'))).toBe(true)
  })

  it('кокус свободы забирает молоток, когда основное крыло меньше запаса', () => {
    const seats = { prog: 30, dem: 80, modd: 20, ind: 0, modr: 5, gop: 20, hfc: 280 }
    expect(Object.values(seats).reduce((sum, n) => sum + n, 0)).toBe(435)
    expect(isFloorFight(['modr', 'gop', 'hfc'], seats)).toBe(false)
    expect(speakerOf(['modr', 'gop', 'hfc'], seats)).toBe('hfc')
  })

  it('два крыла больше запаса устраивают борьбу за спикера', () => {
    const seats = { prog: 20, dem: 40, modd: 20, ind: 0, modr: 30, gop: 150, hfc: 175 }
    expect(Object.values(seats).reduce((sum, n) => sum + n, 0)).toBe(435)
    expect(isFloorFight(['modr', 'gop', 'hfc'], seats)).toBe(true)
    expect(speakerOf(['modr', 'gop', 'hfc'], seats)).toBe('gop')
    const result = simulate({})
    expect(result.seats).toBeTruthy()
  })
})
