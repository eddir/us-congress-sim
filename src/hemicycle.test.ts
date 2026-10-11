import { describe, expect, it } from 'vitest'
import { parties } from './data'
import { groupsFrom, HEMICYCLE, SEAT_RADIUS, seatPoints } from './hemicycle'

function nearest(points: { x: number; y: number }[]) {
  return points.map((point, index) => {
    let best = Infinity
    for (let other = 0; other < points.length; other += 1) {
      if (other === index) continue
      const distance = Math.hypot(point.x - points[other].x, point.y - points[other].y)
      if (distance < best) best = distance
    }
    return best
  })
}

describe('полукруг', () => {
  it('сажает 435 кресел плотно и внутри рамки', () => {
    expect(seatPoints).toHaveLength(435)
    const gaps = nearest(seatPoints)
    const min = Math.min(...gaps)
    const max = Math.max(...gaps)
    expect(min).toBeGreaterThanOrEqual(SEAT_RADIUS * 2 + 1.4)
    expect(max / min).toBeLessThan(1.55)
    for (const point of seatPoints) {
      expect(point.x).toBeGreaterThan(SEAT_RADIUS)
      expect(point.y).toBeGreaterThan(SEAT_RADIUS)
      expect(point.x).toBeLessThan(HEMICYCLE.width - SEAT_RADIUS)
      expect(point.y).toBeLessThan(HEMICYCLE.height - SEAT_RADIUS)
      expect(Math.hypot(point.x - HEMICYCLE.labelX, point.y - HEMICYCLE.labelY)).toBeGreaterThan(SEAT_RADIUS + 22)
      expect(Math.hypot(point.x - HEMICYCLE.labelX, point.y - (HEMICYCLE.labelY + 28))).toBeGreaterThan(SEAT_RADIUS + 10)
    }
    const top = seatPoints.reduce((best, point) => (point.y < best.y ? point : best))
    expect(Math.abs(top.x - HEMICYCLE.labelX)).toBeLessThan(28)
  })

  it('не собирает длинную горизонтальную полку', () => {
    const bottom = Math.max(...seatPoints.map((point) => point.y))
    const onFloor = seatPoints.filter((point) => bottom - point.y < 4)
    expect(onFloor.length).toBeGreaterThan(0)
    expect(onFloor.length).toBeLessThanOrEqual(8)
    for (const point of onFloor) {
      expect(Math.abs(point.x - HEMICYCLE.labelX)).toBeGreaterThan(HEMICYCLE.width * 0.28)
    }
    const left = seatPoints.slice().sort((a, b) => a.x - b.x).slice(0, 8)
    const spread = Math.max(...left.map((point) => point.y)) - Math.min(...left.map((point) => point.y))
    expect(spread).toBeGreaterThan(20)
  })

  it('сажает левые крылья левее правых', () => {
    const seats = Object.fromEntries(parties.map((party) => [party.id, party.poll]))
    const groups = groupsFrom(seats)
    const xs: Record<string, number[]> = {}
    let cursor = 0
    for (const group of groups) {
      for (let index = 0; index < group.seats; index += 1) {
        const point = seatPoints[cursor]
        cursor += 1
        ;(xs[group.id] ??= []).push(point.x)
      }
    }
    const avg = (id: string) => xs[id].reduce((sum, value) => sum + value, 0) / xs[id].length
    expect(cursor).toBe(435)
    expect(avg('prog')).toBeLessThan(avg('dem'))
    expect(avg('dem')).toBeLessThan(avg('gop'))
    expect(avg('gop')).toBeLessThan(avg('hfc'))
  })
})
