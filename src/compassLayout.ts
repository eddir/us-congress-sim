export type CompassAnchor = 'start' | 'end' | 'middle'

export type CompassBox = { x0: number; y0: number; x1: number; y1: number }

export type CompassLabel = {
  id: string
  text: string
  x: number
  y: number
  anchor: CompassAnchor
  box: CompassBox
}

type Dot = { id: string; name: string; px: number; py: number }

const CHAR = 6.05
const LINE = 12

function overlaps(a: CompassBox, b: CompassBox) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0
}

function boxFor(x: number, y: number, anchor: CompassAnchor, width: number): CompassBox {
  const top = y - LINE
  const bottom = y + 2
  if (anchor === 'start') return { x0: x, y0: top, x1: x + width, y1: bottom }
  if (anchor === 'end') return { x0: x - width, y0: top, x1: x, y1: bottom }
  return { x0: x - width / 2, y0: top, x1: x + width / 2, y1: bottom }
}

function shortName(name: string) {
  return name.length > 16 ? `${name.slice(0, 15)}…` : name
}

function reserve(occupied: CompassBox[], box: CompassBox) {
  occupied.push(box)
}

export function placeCompassLabels(dots: Dot[], you: { px: number; py: number } | null, size: number, youLabel = 'Вы'): CompassLabel[] {
  const occupied: CompassBox[] = []
  for (const dot of dots) reserve(occupied, { x0: dot.px - 8, y0: dot.py - 8, x1: dot.px + 8, y1: dot.py + 8 })
  if (you) reserve(occupied, { x0: you.px - 11, y0: you.py - 11, x1: you.px + 11, y1: you.py + 11 })
  reserve(occupied, { x0: size / 2 - 78, y0: 0, x1: size / 2 + 78, y1: 22 })
  reserve(occupied, { x0: size / 2 - 92, y0: size - 20, x1: size / 2 + 92, y1: size })
  reserve(occupied, { x0: 0, y0: size / 2 - 90, x1: 30, y1: size / 2 + 90 })
  reserve(occupied, { x0: size - 30, y0: size / 2 - 90, x1: size, y1: size / 2 + 90 })

  function take(id: string, text: string, px: number, py: number, preferEnd: boolean): CompassLabel {
    const width = text.length * CHAR + 2
    const sides: CompassAnchor[] = preferEnd ? ['end', 'start', 'middle'] : ['start', 'end', 'middle']
    const shifts = [0, -14, 14, -28, 28, -42, 42, -56, 56]
    for (const anchor of sides) {
      for (const shift of shifts) {
        const x = anchor === 'middle' ? px : anchor === 'start' ? px + 12 : px - 12
        const y = (anchor === 'middle' ? py + (shift < 0 ? -14 : 16) : py + 4) + (anchor === 'middle' ? 0 : shift)
        const box = boxFor(x, y, anchor, width)
        if (box.x0 < 1 || box.y0 < 1 || box.x1 > size - 1 || box.y1 > size - 1) continue
        if (occupied.some((other) => overlaps(box, other))) continue
        reserve(occupied, box)
        return { id, text, x, y, anchor, box }
      }
    }
    const fallback = boxFor(px + 12, py + 4, 'start', width)
    reserve(occupied, fallback)
    return { id, text, x: px + 12, y: py + 4, anchor: 'start', box: fallback }
  }

  const labels: CompassLabel[] = []
  if (you) labels.push(take('user', youLabel, you.px, you.py, false))
  const ordered = dots.slice().sort((a, b) => a.px - b.px || a.py - b.py)
  for (const dot of ordered) {
    labels.push(take(dot.id, shortName(dot.name), dot.px, dot.py, dot.px > size * 0.58))
  }
  return labels
}
