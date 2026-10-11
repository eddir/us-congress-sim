import { describe, expect, it } from 'vitest'
import { placeCompassLabels, type CompassBox } from './compassLayout'
import { simulate } from './model'
import { partyById } from './data'

function overlaps(a: CompassBox, b: CompassBox) {
  return a.x0 < b.x1 - 0.5 && a.x1 > b.x0 + 0.5 && a.y0 < b.y1 - 0.5 && a.y1 > b.y0 + 0.5
}

function layout(user: { x: number; y: number } | null) {
  const size = 360
  const pad = 36
  const map = (value: number) => pad + ((Math.max(-1, Math.min(1, value)) + 1) / 2) * (size - pad * 2)
  const result = simulate({})
  const dots = result.compassParties.map((party) => ({
    id: party.id,
    name: partyById(party.id).name,
    px: map(party.x),
    py: map(-party.y),
  }))
  const you = user ? { px: map(user.x), py: map(-user.y) } : null
  return placeCompassLabels(dots, you, size)
}

describe('подписи компаса', () => {
  it('не наезжают друг на друга', () => {
    for (const user of [null, { x: 0, y: 0 }, { x: -0.8, y: 0.6 }, { x: 0.7, y: -0.8 }]) {
      const labels = layout(user)
      expect(labels.length).toBe(user ? 8 : 7)
      for (let i = 0; i < labels.length; i += 1) {
        for (let j = i + 1; j < labels.length; j += 1) {
          expect(overlaps(labels[i].box, labels[j].box), `${labels[i].text} / ${labels[j].text}`).toBe(false)
        }
        expect(labels[i].box.x0).toBeGreaterThanOrEqual(0)
        expect(labels[i].box.y0).toBeGreaterThanOrEqual(0)
        expect(labels[i].box.x1).toBeLessThanOrEqual(360)
        expect(labels[i].box.y1).toBeLessThanOrEqual(360)
      }
    }
  })
})
