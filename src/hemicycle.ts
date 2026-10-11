import { parties } from './data'

// Девять дуг, 435 кресел. Число мест растёт с радиусом, шаг по дуге почти постоянный.
// Угол чуть больше 180°: концы загибаются вниз и не выстраиваются в полку.
const ROW_COUNTS = [32, 36, 40, 44, 48, 52, 57, 61, 65]
const INNER_RADIUS = 100
const RING_GAP = 13
const SPAN = Math.PI * 1.18
const PAD = 10

export const SEAT_RADIUS = 4.15

export type SeatPoint = { x: number; y: number; angle: number; ring: number }

type RawPoint = { x: number; y: number; angle: number; ring: number }

function rawPoints(): RawPoint[] {
  const start = (Math.PI + SPAN) / 2
  const points: RawPoint[] = []
  ROW_COUNTS.forEach((count, ring) => {
    const radius = INNER_RADIUS + ring * RING_GAP
    const stagger = (ring % 2) * (SPAN / count) * 0.5
    for (let index = 0; index < count; index += 1) {
      const along = (index + 0.5) / count
      const angle = start - SPAN * along - stagger
      points.push({
        angle,
        ring,
        x: Math.cos(angle) * radius,
        y: -Math.sin(angle) * radius,
      })
    }
  })
  return points
}

const raw = rawPoints()
const minX = Math.min(...raw.map((point) => point.x)) - SEAT_RADIUS - PAD
const maxX = Math.max(...raw.map((point) => point.x)) + SEAT_RADIUS + PAD
const minY = Math.min(...raw.map((point) => point.y)) - SEAT_RADIUS - PAD
const maxY = Math.max(...raw.map((point) => point.y)) + SEAT_RADIUS + PAD

export const HEMICYCLE = {
  width: maxX - minX,
  height: maxY - minY,
  labelX: 0 - minX,
  labelY: -INNER_RADIUS * 0.42 - minY,
}

// Слева направо по картинке: левые крылья слева, как в зале Палаты.
export const seatPoints: SeatPoint[] = raw
  .map((point) => ({
    angle: point.angle,
    ring: point.ring,
    x: point.x - minX,
    y: point.y - minY,
  }))
  .sort((a, b) => b.angle - a.angle || a.ring - b.ring)

export type SeatGroup = { id: string; name: string; color: string; seats: number }

export function groupsFrom(seats: Record<string, number>): SeatGroup[] {
  return parties
    .filter((party) => (seats[party.id] ?? 0) > 0)
    .slice()
    .sort((a, b) => a.lr - b.lr)
    .map((party) => ({ id: party.id, name: party.name, color: party.color, seats: seats[party.id] }))
}
