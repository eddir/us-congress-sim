import { groupsFrom, HEMICYCLE, SEAT_RADIUS, seatPoints, type SeatGroup } from '@/hemicycle'
import { partyName, useI18n } from '@/i18n'

type Seat = { id: string; color: string; name: string }

export function Hemicycle({
  groups,
  activeId,
  onPick,
  label,
  sub,
}: {
  groups: SeatGroup[]
  activeId?: string | null
  onPick?: (id: string) => void
  label: string
  sub: string
}) {
  const assigned: Seat[] = []
  for (const group of groups) {
    for (let index = 0; index < group.seats && assigned.length < seatPoints.length; index += 1) {
      assigned.push({ id: group.id, color: group.color, name: group.name })
    }
  }

  return (
    <div dir="ltr">
    <svg viewBox={`0 0 ${HEMICYCLE.width} ${HEMICYCLE.height}`} role="img" aria-label={`${label}, ${sub}`} className="w-full">
      {seatPoints.map((point, index) => {
        const seat = assigned[index] ?? { id: '', color: 'var(--muted)', name: '' }
        const dim = Boolean(activeId) && seat.id !== activeId
        return (
          <circle
            key={`${point.ring}-${index}`}
            cx={point.x}
            cy={point.y}
            r={SEAT_RADIUS}
            fill={seat.color}
            opacity={dim ? 0.22 : 1}
            stroke="var(--card)"
            strokeWidth={1.2}
            className={onPick && seat.id ? 'cursor-pointer' : undefined}
            onClick={() => seat.id && onPick?.(seat.id)}
          >
            <title>{seat.name}</title>
          </circle>
        )
      })}
      <text
        x={HEMICYCLE.labelX}
        y={HEMICYCLE.labelY}
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        className="font-heading"
        fontSize={42}
        fontWeight={650}
      >
        {label}
      </text>
      <text
        x={HEMICYCLE.labelX}
        y={HEMICYCLE.labelY + 28}
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        opacity={0.62}
        fontSize={14}
      >
        {sub}
      </text>
    </svg>
    </div>
  )
}

export function StackedBar({ seats }: { seats: Record<string, number> }) {
  const { locale } = useI18n()
  const groups = groupsFrom(seats).map((group) => ({ ...group, name: partyName(locale, group.id) }))
  const total = groups.reduce((sum, group) => sum + group.seats, 0) || 1
  return (
    <div dir="ltr" className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
      {groups.map((group) => (
        <div key={group.id} style={{ width: `${(group.seats / total) * 100}%`, background: group.color }} title={`${group.name}: ${group.seats}`} />
      ))}
    </div>
  )
}
