import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Compass } from '@/components/Compass'
import { Hemicycle } from '@/components/Hemicycle'
import { groupsFrom } from '@/hemicycle'
import {
  bills,
  demIds,
  gopIds,
  MAJORITY,
  parties,
  partyById,
  questions,
  SEAT_COUNT,
  themes,
  THIRD_PARTY_FLOOR,
  VETO,
  weightLevels,
  type Question,
} from '@/data'
import { addSeats, defaultWeights, formatPct, seatPlan, simulate, tallyBill, type Answers, type SeatResult, type Weights } from '@/model'
import {
  billText,
  I18nContext,
  loadLocale,
  partyLeader,
  partyName,
  postName,
  questionText,
  saveLocale,
  seatsWord,
  themeText,
  ui,
  useI18n,
  type Locale,
} from '@/i18n'

type Phase = 'intro' | 'weights' | 'questions' | 'board' | 'results'

type Save = {
  phase: Phase
  weights: Weights
  answers: Answers
  index: number
  board: string | null
}

const STORAGE = 'house-2026-v1'
const choices = [
  { value: -1, key: '1' },
  { value: -0.5, key: '2' },
  { value: 0, key: '3' },
  { value: 0.5, key: '4' },
  { value: 1, key: '5' },
]
const weightValues = new Set<number>(weightLevels.map((level) => level.id))

function orderQuestions(weights: Weights) {
  const rank = new Map(themes.map((theme, index) => [theme.id, index]))
  return themes
    .filter((theme) => (weightLevels.find((level) => level.id === weights[theme.id])?.w ?? 0) > 0)
    .slice()
    .sort((a, b) => {
      const left = weightLevels.find((level) => level.id === weights[a.id])?.w ?? 0
      const right = weightLevels.find((level) => level.id === weights[b.id])?.w ?? 0
      return left - right || (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)
    })
    .flatMap((theme) => questions.filter((question) => question.theme === theme.id))
}

function themeIdsOf(list: Question[]) {
  const ids: string[] = []
  for (const question of list) {
    if (!ids.includes(question.theme)) ids.push(question.theme)
  }
  return ids
}

function loadSave(): Save {
  const empty: Save = { phase: 'intro', weights: defaultWeights(), answers: {}, index: 0, board: null }
  try {
    const raw = localStorage.getItem(STORAGE)
    if (!raw) return empty
    const data = JSON.parse(raw) as Partial<Save>
    const phase: Phase =
      data.phase === 'weights' || data.phase === 'questions' || data.phase === 'board' || data.phase === 'results'
        ? data.phase
        : 'intro'
    const weights = defaultWeights()
    if (data.weights && typeof data.weights === 'object') {
      for (const theme of themes) {
        const level = data.weights[theme.id]
        if (typeof level === 'number' && weightValues.has(level)) weights[theme.id] = level
      }
    }
    const answers: Answers = {}
    if (data.answers && typeof data.answers === 'object') {
      for (const question of questions) {
        const value = (data.answers as Record<string, unknown>)[question.id]
        if (value === null) answers[question.id] = null
        else if (typeof value === 'number' && Number.isFinite(value) && value >= -1 && value <= 1) {
          answers[question.id] = value
        }
      }
    }
    const index = Number.isFinite(data.index) ? Math.round(data.index ?? 0) : 0
    const board = typeof data.board === 'string' && themes.some((theme) => theme.id === data.board) ? data.board : null
    return {
      phase,
      weights,
      answers,
      index: Math.max(0, Math.min(questions.length - 1, index)),
      board,
    }
  } catch {
    return empty
  }
}

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('house-theme', next ? 'dark' : 'light')
    setDark(next)
  }
  return { dark, toggle }
}

function campSeats(seats: Record<string, number>, ids: string[]) {
  return ids.reduce((sum, id) => sum + (seats[id] ?? 0), 0)
}

function topWing(seats: Record<string, number>) {
  return parties.slice().sort((a, b) => (seats[b.id] ?? 0) - (seats[a.id] ?? 0) || b.poll - a.poll)[0]
}

function nearestWing(question: Question, value: number) {
  return parties.slice().sort((a, b) => {
    const left = Math.abs(value - (question.stance[a.id] ?? 0))
    const right = Math.abs(value - (question.stance[b.id] ?? 0))
    return left - right || b.poll - a.poll
  })[0]
}

function chamber(seats: Record<string, number>, pendingLabel: string, locale: Locale) {
  const groups = groupsFrom(seats).map((group) => ({ ...group, name: partyName(locale, group.id) }))
  const pending = SEAT_COUNT - groups.reduce((sum, group) => sum + group.seats, 0)
  if (pending > 0) {
    const block = { id: 'pending', name: pendingLabel, color: 'var(--pend)', seats: pending }
    const at = groups.findIndex((group) => partyById(group.id).lr >= 5.5)
    if (at < 0) groups.push(block)
    else groups.splice(at, 0, block)
  }
  return groups
}

export default function App() {
  const [initial] = useState(loadSave)
  const [phase, setPhase] = useState<Phase>(initial.phase)
  const [weights, setWeights] = useState<Weights>(initial.weights)
  const [answers, setAnswers] = useState<Answers>(initial.answers)
  const [index, setIndex] = useState(initial.index)
  const [board, setBoard] = useState<string | null>(initial.board)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [locale, setLocaleState] = useState<Locale>(loadLocale)
  const t = ui[locale]
  const theme = useTheme()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const ordered = useMemo(() => orderQuestions(weights), [weights])
  const sections = useMemo(() => themeIdsOf(ordered), [ordered])
  const result = useMemo(() => simulate(answers, weights, locale), [answers, weights, locale])
  const shareKey = parties.map((party) => result.seats[party.id]).join('.')
  const copied = copiedKey === shareKey
  const cursor = Math.min(index, Math.max(0, ordered.length - 1))
  const visible: Phase = ordered.length === 0 && (phase === 'questions' || phase === 'board')
    ? 'weights'
    : phase === 'board' && (!board || !sections.includes(board))
      ? 'questions'
      : phase

  useEffect(() => {
    const save: Save = { phase, weights, answers, index, board }
    localStorage.setItem(STORAGE, JSON.stringify(save))
  }, [phase, weights, answers, index, board])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopiedKey(null), 2200)
    return () => window.clearTimeout(id)
  }, [copied])

  useEffect(() => {
    if (visible === 'questions') headingRef.current?.focus()
    window.scrollTo(0, 0)
  }, [visible, index, board])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
    document.title = t.pageTitle
  }, [locale, t.pageTitle])

  function setLocale(next: Locale) {
    setLocaleState(next)
    saveLocale(next)
  }

  const answered = questions.filter((question) => question.id in answers && answers[question.id] != null).length

  function go(next: Phase) {
    if (next !== 'results') setActiveId(null)
    setPhase(next)
  }

  function reset() {
    setAnswers({})
    setWeights(defaultWeights())
    setIndex(0)
    setBoard(null)
    setActiveId(null)
    go('intro')
  }

  const pickValue = useCallback((value: number) => {
    const question = orderQuestions(weights)[index]
    if (!question) return
    setAnswers((current) => ({ ...current, [question.id]: value }))
  }, [weights, index])

  const advance = useCallback((mode: 'next' | 'skip') => {
    const list = orderQuestions(weights)
    const question = list[index]
    if (!question) return
    if (mode === 'skip') setAnswers((current) => ({ ...current, [question.id]: null }))
    else if (typeof answers[question.id] !== 'number') return
    const next = list[index + 1]
    if (!next || next.theme !== question.theme) {
      setBoard(question.theme)
      setActiveId(null)
      setPhase('board')
    } else setIndex(index + 1)
  }, [weights, index, answers])

  const backQuestion = useCallback(() => {
    if (index === 0) setPhase('weights')
    else setIndex((current) => current - 1)
  }, [index])

  useEffect(() => {
    if (visible !== 'questions') return
    function onKey(event: KeyboardEvent) {
      if (event.repeat || event.defaultPrevented) return
      if (document.querySelector('[role="dialog"]')) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const choice = choices.find((item) => item.key === event.key)
      if (choice) {
        event.preventDefault()
        pickValue(choice.value)
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        const question = orderQuestions(weights)[index]
        const current = question && typeof answers[question.id] === 'number' ? answers[question.id] : 0
        const step = event.shiftKey ? 0.25 : 0.1
        let next = (current ?? 0) + (event.key === 'ArrowRight' ? step : -step)
        next = Math.max(-1, Math.min(1, Math.round(next * 100) / 100))
        if (Math.abs(next) < 0.04) next = 0
        pickValue(next)
        return
      }
      if (event.key === 'Enter') {
        if (target?.tagName === 'BUTTON') return
        event.preventDefault()
        advance('next')
      } else if (event.key === '0') {
        event.preventDefault()
        advance('skip')
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        backQuestion()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [visible, pickValue, advance, backQuestion, answers, weights, index])

  const plan = seatPlan(weights)
  const ready = ordered.length > 0

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      <div className="wrap">
        <header className="top">
          <button type="button" className="brand" onClick={() => go('intro')}>
            <i />
            <span>
              <small>{t.brandKicker}</small>
              {t.brand}
            </span>
          </button>
          <div className="top-r">
            <div role="group" aria-label={t.language}>
              {(['ru', 'en'] as const).map((code) => (
                <button key={code} type="button" className="lang" aria-pressed={locale === code} onClick={() => setLocale(code)}>
                  {code === 'ru' ? 'RU' : 'EN'}
                </button>
              ))}
            </div>
            <MethodDialog />
            <button type="button" className="iconbtn" aria-label={theme.dark ? t.lightTheme : t.darkTheme} onClick={theme.toggle}>
              {theme.dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>
        <main>
          {visible === 'intro' && <Intro onStart={() => go('weights')} onSkip={() => { setIndex(0); go('questions') }} />}
          {visible === 'weights' && (
            <Weights
              weights={weights}
              plan={plan}
              ready={ready}
              count={ordered.length}
              sections={sections.length}
              onChange={(themeId, level) => setWeights((current) => ({ ...current, [themeId]: level }))}
              onNext={() => { setIndex(0); go('questions') }}
            />
          )}
          {visible === 'questions' && ordered.length > 0 && (
            <Question
              list={ordered}
              index={cursor}
              answers={answers}
              plan={plan}
              headingRef={headingRef}
              onValue={pickValue}
              onNext={() => advance('next')}
              onSkip={() => advance('skip')}
              onBack={backQuestion}
            />
          )}
          {visible === 'board' && board && sections.includes(board) && (
            <Board
              key={board}
              themeId={board}
              sections={sections}
              answers={answers}
              result={result}
              onBack={() => {
                const last = ordered.reduce((found, question, at) => (question.theme === board ? at : found), 0)
                setIndex(last)
                go('questions')
              }}
              onNext={() => {
                const at = sections.indexOf(board)
                if (at < 0 || at >= sections.length - 1) go('results')
                else {
                  const nextId = sections[at + 1]
                  setIndex(ordered.findIndex((question) => question.theme === nextId))
                  go('questions')
                }
              }}
            />
          )}
          {visible === 'results' && (
            <Results
              result={result}
              ordered={ordered}
              answers={answers}
              answered={answered}
              activeId={activeId}
              onActive={setActiveId}
              copied={copied}
              onCopy={async () => {
                const lines = parties.filter((party) => result.seats[party.id]).map((party) => `${partyName(locale, party.id)} ${result.seats[party.id]}`)
                const text = t.shareText(lines.join(', '), result.verdictTitle)
                try {
                  await navigator.clipboard.writeText(text)
                  setCopiedKey(shareKey)
                } catch {
                  setCopiedKey(null)
                }
              }}
              onEdit={() => { setIndex(Math.max(0, ordered.length - 1)); go('questions') }}
              onReset={reset}
            />
          )}
        </main>
      </div>
    </I18nContext.Provider>
  )
}

function MethodDialog() {
  const { t } = useI18n()
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" className="h-8" />}>{t.methodButton}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{t.methodTitle}</DialogTitle>
          <DialogDescription>{t.methodLead}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed">
          {t.methodParas.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Intro({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const { t, locale } = useI18n()
  const poll = Object.fromEntries(parties.map((party) => [party.id, party.poll]))
  const dem = campSeats(poll, demIds)
  const gop = campSeats(poll, gopIds)
  const groups = groupsFrom(poll).map((group) => ({ ...group, name: partyName(locale, group.id) }))
  return (
    <div className="parl intro">
      <div>
        <p className="kicker">{t.date}</p>
        <h1>{t.introTitle}</h1>
        <p className="lead">{t.introLead}</p>
        <dl className="facts">
          {[
            [String(SEAT_COUNT), t.seatsShort],
            ['1', t.districtShort],
            [String(MAJORITY), t.majorityShort],
          ].map(([value, name]) => (
            <div key={name}>
              <dt><b>{value}</b></dt>
              <dd><span>{name}</span></dd>
            </div>
          ))}
        </dl>
        <div className="go">
          <button type="button" className="cta" onClick={onStart}>{t.start}</button>
          <button type="button" className="link" onClick={onSkip}>{t.skipToQuestions}</button>
        </div>
        <p className="hint" style={{ marginTop: 14 }}>{t.pollNow(dem, gop)}</p>
      </div>
      <figure className="box" style={{ margin: 0 }}>
        <Hemicycle groups={groups} label={String(SEAT_COUNT)} sub={t.hemicycleSub} />
        <figcaption className="hint">{t.figcaption}</figcaption>
      </figure>
    </div>
  )
}

function Weights({
  weights,
  plan,
  ready,
  count,
  sections,
  onChange,
  onNext,
}: {
  weights: Weights
  plan: Record<string, number>
  ready: boolean
  count: number
  sections: number
  onChange: (themeId: string, level: number) => void
  onNext: () => void
}) {
  const { t, locale } = useI18n()
  return (
    <section className="narrow">
      <p className="kicker">{t.step}</p>
      <h2>{t.weightsTitle}</h2>
      <p className="lead">{t.weightsLead}</p>
      <div className="rows">
        {themes.map((item) => {
          const copy = themeText(locale, item.id)
          const level = weights[item.id] ?? 0
          return (
            <div key={item.id} className={`pr${level ? '' : ' off'}`}>
              <span className="nm">
                <i className="dot" style={{ background: item.color }} />
                {copy.name}
                <small>{copy.hint}</small>
              </span>
              <span className="st">
                <span>{plan[item.id] ?? 0}</span>
                <small>{t.seatsShort}</small>
              </span>
              <div className="seg" role="radiogroup" aria-label={copy.name}>
                {weightLevels.map((option) => {
                  const on = level === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      data-l={option.id}
                      aria-checked={on}
                      onClick={() => onChange(item.id, option.id)}
                    >
                      {t.weights[option.id]}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="go">
        <button type="button" className="cta" disabled={!ready} onClick={onNext}>{t.toQuestions}</button>
        <span>{ready ? t.quizSize(count, sections) : t.needTheme}</span>
      </div>
    </section>
  )
}

function describeValue(value: number | null | undefined, marks: [string, string], t: (typeof ui)['ru']) {
  if (typeof value !== 'number') return t.valEmpty
  const mag = Math.abs(value)
  if (mag < 0.08) return t.valMid
  const side = value < 0 ? marks[0] : marks[1]
  if (mag < 0.4) return t.valNear(side)
  if (mag < 0.8) return t.valClear(side)
  return t.valFull(side)
}

function Question({
  list,
  index,
  answers,
  plan,
  headingRef,
  onValue,
  onNext,
  onSkip,
  onBack,
}: {
  list: Question[]
  index: number
  answers: Answers
  plan: Record<string, number>
  headingRef: RefObject<HTMLHeadingElement | null>
  onValue: (value: number) => void
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}) {
  const { t, locale } = useI18n()
  const question = list[index]
  const copy = questionText(locale, question.id)
  const theme = themeText(locale, question.theme)
  const section = list.filter((item) => item.theme === question.theme)
  const place = section.findIndex((item) => item.id === question.id) + 1
  const current = question.id in answers ? answers[question.id] : undefined
  const set = typeof current === 'number'
  const shown = set ? current : 0
  const x = ((shown + 1) / 2) * 100
  const trackRef = useRef<HTMLDivElement>(null)
  const color = themes.find((item) => item.id === question.theme)?.color ?? 'var(--accent)'

  function fromX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    let next = ((clientX - rect.left) / rect.width) * 2 - 1
    next = Math.max(-1, Math.min(1, next))
    if (Math.abs(next) < 0.04) next = 0
    return Math.round(next * 100) / 100
  }

  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button')) return
    if (typeof event.currentTarget.setPointerCapture === 'function') event.currentTarget.setPointerCapture(event.pointerId)
    onValue(fromX(event.clientX))
  }

  return (
    <section className="narrow">
      <div className="prog" aria-hidden="true">
        {list.map((item, at) => {
          const value = answers[item.id]
          const state = at === index ? 'cur' : value === null ? 'skip' : item.id in answers ? 'done' : ''
          const gap = at > 0 && item.theme !== list[at - 1].theme ? ' gap' : ''
          return <i key={item.id} className={`${state}${gap}`} />
        })}
      </div>
      <div className="meta">
        <i className="dot" style={{ background: color, margin: 0 }} />
        <b>{theme.name}</b>
        <span className="pill">{t.atStake(plan[question.theme] ?? 0, seatsWord(locale, plan[question.theme] ?? 0))}</span>
        <span>{t.inSection(place, section.length)}</span>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="qtitle">{copy.title}</h2>
      <div className="poles">
        <button type="button" className={`pole l${set && shown <= -0.08 ? ' on' : ''}`} style={{ ['--o' as string]: !set || shown <= 0.08 ? 1 : Math.max(0.45, 1 - shown * 0.6) }} onClick={() => onValue(-1)}>
          <em>{t.marks[0]}</em>
          <span>{copy.a}</span>
        </button>
        <button type="button" className={`pole r${set && shown >= 0.08 ? ' on' : ''}`} style={{ ['--o' as string]: !set || shown >= -0.08 ? 1 : Math.max(0.45, 1 + shown * 0.6) }} onClick={() => onValue(1)}>
          <em>{t.marks[1]}</em>
          <span>{copy.b}</span>
        </button>
      </div>
      <div
        className={`track${set ? ' set' : ''}`}
        id="track"
        ref={trackRef}
        onPointerDown={drag}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) onValue(fromX(event.clientX))
        }}
      >
        <div className="rail" />
        <div className="fill" style={{ left: `${Math.min(50, x)}%`, width: `${Math.abs(x - 50)}%` }} />
        {choices.map((choice, choiceIndex) => (
          <button
            key={choice.key}
            type="button"
            role="radio"
            className={`tick${choice.value === 0 ? ' c' : ''}`}
            style={{ left: `${((choice.value + 1) / 2) * 100}%` }}
            aria-checked={current === choice.value}
            aria-label={`${choice.key} ${t.choices[choiceIndex]}`}
            onClick={() => onValue(choice.value)}
          />
        ))}
        <div className="ball" style={{ left: `${x}%` }} />
      </div>
      <div className="val" aria-live="polite">{describeValue(current, t.marks, t)}</div>
      <div className="nav2">
        <button type="button" className="cta" disabled={!set} onClick={onNext}>{t.next}</button>
        <button type="button" className="link" onClick={onBack}>{t.back}</button>
        <button type="button" className="link" onClick={onSkip}>{t.noOpinion}</button>
      </div>
      <p className="kbd">{t.keysHint}</p>
    </section>
  )
}

function Board({
  themeId,
  sections,
  answers,
  result,
  onBack,
  onNext,
}: {
  themeId: string
  sections: string[]
  answers: Answers
  result: SeatResult
  onBack: () => void
  onNext: () => void
}) {
  const { t, locale } = useI18n()
  const at = sections.indexOf(themeId)
  const last = at === sections.length - 1
  const now = addSeats(result.blocks, sections.slice(0, at + 1))
  const prev = addSeats(result.blocks, sections.slice(0, at))
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [reveal, setReveal] = useState(reduce)
  useEffect(() => {
    if (reduce) return
    const id = window.setTimeout(() => setReveal(true), 600)
    return () => window.clearTimeout(id)
  }, [themeId, reduce])
  const shown = reveal ? now : prev
  const order = parties
    .map((party) => party.id)
    .sort((a, b) => (shown[b] ?? 0) - (shown[a] ?? 0) || partyById(b).poll - partyById(a).poll)
  const place = new Map(order.map((id, index) => [id, index]))
  const given = Object.values(now).reduce((sum, n) => sum + n, 0)
  const block = result.blocks.find((item) => item.themeId === themeId)
  const n = block?.total ?? 0
  const name = themeText(locale, themeId).name
  const lead = topWing(now)
  const before = topWing(prev)
  const any = questions.some((question) => question.theme === themeId && answers[question.id] != null)
  let message = (now[lead.id] ?? 0) >= MAJORITY
    ? t.leadMajority(partyName(locale, lead.id))
    : at === 0
      ? t.leadOut(partyName(locale, lead.id))
      : lead.id !== before.id && (prev[before.id] ?? 0) > 0
        ? t.leadTake(partyName(locale, lead.id))
        : t.leadKeep(partyName(locale, lead.id))
  if (!last) message = `${message} · ${t.seatsLeft(SEAT_COUNT - given, seatsWord(locale, SEAT_COUNT - given))}`
  const nextName = last ? '' : themeText(locale, sections[at + 1]).name
  const scale = MAJORITY / 0.7

  return (
    <section className="board">
      <div className="box">
        <span className="eyebrow">{t.sectionOf(at + 1, sections.length)}</span>
        <h2>«{name}» {t.gives} <em>{n}</em> {seatsWord(locale, n)}</h2>
        <div className="bcols">
          <Hemicycle groups={chamber(shown, t.pendingSeats, locale)} label={String(Object.values(shown).reduce((sum, item) => sum + item, 0))} sub={t.ofTotal(SEAT_COUNT)} />
          <div>
            <div className="sb" style={{ height: parties.length * 44 - 4 }}>
              {parties.map((party) => {
                const delta = (now[party.id] ?? 0) - (prev[party.id] ?? 0)
                const total = shown[party.id] ?? 0
                return (
                  <div key={party.id} className={`sr${total >= MAJORITY ? ' maj' : ''}`} style={{ ['--c' as string]: party.color, top: (place.get(party.id) ?? 0) * 44 }}>
                    <span className="rk">{(place.get(party.id) ?? 0) + 1}</span>
                    <span className="nm">
                      <b><i className="dot" style={{ background: party.color }} />{partyName(locale, party.id)}</b>
                      <span className="bar"><span style={{ width: `${Math.min(100, (total / scale) * 100)}%` }} /></span>
                    </span>
                    <span className={`pts${reveal ? ' show' : ''}${delta < 0 ? ' neg' : ''}${delta === 0 ? ' zero' : ''}`}>
                      {delta > 0 ? `+${delta}` : String(delta)}
                    </span>
                    <span className="tot">{total}</span>
                  </div>
                )
              })}
            </div>
            <p className="msg" aria-live="polite">{reveal ? message : ''}</p>
          </div>
        </div>
        <div className="bfoot">
          <span>{t.majorityMark(MAJORITY)}</span>
          <span>{any ? t.boardByAnswers : t.boardNoAnswers}</span>
        </div>
      </div>
      <div className="bnav">
        <button type="button" className="link" onClick={onBack}>{t.back}</button>
        <button type="button" className="cta" onClick={onNext}>{last ? t.showHouse : t.nextSection(nextName)}</button>
      </div>
    </section>
  )
}

function Results({
  result,
  ordered,
  answers,
  answered,
  activeId,
  onActive,
  copied,
  onCopy,
  onEdit,
  onReset,
}: {
  result: SeatResult
  ordered: Question[]
  answers: Answers
  answered: number
  activeId: string | null
  onActive: (id: string | null) => void
  copied: boolean
  onCopy: () => void
  onEdit: () => void
  onReset: () => void
}) {
  const { t, locale } = useI18n()
  const closestId = result.closestId
  const groups = groupsFrom(result.seats).map((group) => ({ ...group, name: partyName(locale, group.id) }))
  const below = parties.filter((party) => result.seats[party.id] === 0)
  const demSeats = campSeats(result.seats, demIds)
  const wasted = result.seats.ind === 0 && result.raw.ind >= 0.02 && result.raw.ind < THIRD_PARTY_FLOOR
  const shownId = activeId && parties.some((party) => party.id === activeId) ? activeId : closestId
  const ranked = parties.filter((party) => result.seats[party.id] > 0).slice().sort((a, b) => result.seats[b.id] - result.seats[a.id])
  const maxSeats = ranked[0] ? result.seats[ranked[0].id] : 1

  return (
    <div className="res stack">
      <div>
        <div className="chips" style={{ marginBottom: 10 }}>
          <span className="pill">{t.date}</span>
          <span className="pill">{SEAT_COUNT} {seatsWord(locale, SEAT_COUNT)}</span>
          <span className="pill">{t.majorityMark(MAJORITY)}</span>
          <span className="pill">{t.wikiSystem}</span>
        </div>
        <p className="kicker">{t.yourHouse}</p>
        <h2>{result.verdictTitle}</h2>
        <p className="lead">{result.verdictText}</p>
        <p className="hint">{t.twoParty(formatPct(result.twoPartyDem, locale), demSeats)}</p>
        {wasted && <p className="hint">{t.wasted(formatPct(result.raw.ind, locale))}</p>}
        {answered < 4 && <p className="hint">{t.fewAnswers}</p>}
        <p>
          {t.closestBefore} <strong>{partyName(locale, closestId)}</strong>
          {locale === 'ru' && <span style={{ color: 'var(--ink2)' }}> {parties.find((party) => party.id === closestId)?.en}</span>}
          {`, ${partyLeader(locale, closestId)}. ${t.matchWord} ${formatPct(result.closeness[closestId], locale)}%.`}
        </p>
      </div>

      <div className="box main">
        <Hemicycle
          groups={groups}
          activeId={activeId}
          onPick={(id) => onActive(activeId === id ? null : id)}
          label={String(SEAT_COUNT)}
          sub={t.hemicycleSub}
        />
        <div>
          <div className="leg">
            {ranked.map((party) => (
              <button
                key={party.id}
                type="button"
                className="row"
                aria-pressed={activeId === party.id}
                onClick={() => onActive(activeId === party.id ? null : party.id)}
              >
                <i className="dot" style={{ background: party.color }} />
                <b>{partyName(locale, party.id)}</b>
                <span className="bar"><span style={{ width: `${(result.seats[party.id] / maxSeats) * 100}%`, background: party.color }} /></span>
                <span className="n">{result.seats[party.id]}</span>
              </button>
            ))}
          </div>
          {below.length > 0 && (
            <p className="hint">{t.noSeatsLine(below.map((party) => `${partyName(locale, party.id)} (${formatPct(result.raw[party.id], locale)}%)`).join(', '))}</p>
          )}
          <p className="desc">
            <b>{partyName(locale, shownId)}</b>
            {' · '}
            {result.seats[shownId]}
            {' · '}
            {partyLeader(locale, shownId)}
          </p>
        </div>
      </div>

      <WikiCard result={result} />

      <section className="box">
        <h3>{t.whoBuilds}</h3>
        <div className="coal">
          {result.scenarios.map((scenario) => {
            const enough = scenario.total >= MAJORITY
            return (
              <article key={scenario.id} className={`co${scenario.id === result.primaryId ? ' lead' : ''}`}>
                <div className="t">
                  <span>{scenario.name}</span>
                  <em>{scenario.total}</em>
                </div>
                <p className="hint">{enough ? t.enough(scenario.outside.length > 0) : t.shortBy(MAJORITY - scenario.total)}</p>
                <div className="bar">
                  {scenario.ids.map((id) => (
                    <span key={id} style={{ width: `${((result.seats[id] ?? 0) / SEAT_COUNT) * 100}%`, background: partyById(id).color }} />
                  ))}
                  <em style={{ left: `${(MAJORITY / SEAT_COUNT) * 100}%` }} />
                </div>
                <p className="note">{scenario.note}</p>
                {scenario.pm && <p className="note">{t.speakerCandidate(partyLeader(locale, scenario.pm))}</p>}
                <div className="chips" style={{ marginTop: 8 }}>
                  {scenario.ids.map((id) => (
                    <span key={id} className="pill">{partyName(locale, id)} {result.seats[id]}</span>
                  ))}
                  {scenario.outside.map((id) => (
                    <span key={id} className="pill">{t.outsidePrefix}: {partyName(locale, id)} {result.seats[id]}</span>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {result.coalitions.length > 0 && (
        <section className="box">
          <h3>{t.shortestTitle}</h3>
          <p className="hint">{t.shortestLead}</p>
          <div className="coal">
            {result.coalitions.map((coalition) => (
              <article key={coalition.ids.join('-')} className="co">
                <div className="t">
                  <span>{coalition.ids.map((id) => partyName(locale, id)).join(' + ')}</span>
                  <em>{coalition.seats}</em>
                </div>
                <p className="note">{t.speakerWord} {partyLeader(locale, coalition.pm)}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {result.cabinet && (
        <section className="box">
          <h3>{t.postsTitle}</h3>
          <p className="hint">{t.postsLead}</p>
          <ul className="posts">
            {result.cabinet.map((seat) => (
              <li key={seat.post} className="post">
                <span>{postName(locale, seat.post)}</span>
                <span style={{ textAlign: 'end' }}>
                  <b>{partyName(locale, seat.partyId)}</b>
                  <small>{partyLeader(locale, seat.partyId)}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="box">
        <h3>{result.outlookTitle}</h3>
        <p className="lead" style={{ marginBottom: 0 }}>{result.outlookText}</p>
        <p className="hint" style={{ marginTop: 8 }}>{t.outlookCaveat}</p>
      </section>

      <section className="box">
        <h3>{t.themesTitle}</h3>
        <p className="hint">{t.themesLead}</p>
        <div className="ths">
          {result.blocks.filter((block) => themes.some((theme) => theme.id === block.themeId)).map((block) => {
            const theme = themes.find((item) => item.id === block.themeId)
            if (!theme) return null
            const named = themeText(locale, theme.id)
            const quiet = !questions.some((question) => question.theme === theme.id && answers[question.id] != null)
            return (
              <div key={block.themeId} className="tr">
                <span className="nm">
                  <i className="dot" style={{ background: theme.color }} />
                  {named.name}
                  {quiet && <small> · {t.unanswered}</small>}
                </span>
                <span className="n">{block.total}</span>
                <span className="tb">
                  {parties.filter((party) => block.seats[party.id]).map((party) => (
                    <i key={party.id} style={{ width: `${(block.seats[party.id] / Math.max(1, block.total)) * 100}%`, background: party.color }} title={`${partyName(locale, party.id)}: ${block.seats[party.id]}`} />
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="box">
        <h3>{t.billsTitle}</h3>
        <p className="hint">{t.billsLead}</p>
        {bills.map((bill) => {
          const copy = billText(locale, bill.id)
          const tally = tallyBill(bill.questionId, bill.yes, result.seats)
          const width = SEAT_COUNT || 1
          return (
            <article key={bill.id} className="bill">
              <div className="h">
                <b>{copy.name}</b>
                <span className={`pill ${tally.pass ? 'ok' : 'bad'}`}>{tally.pass ? t.billPass : t.billFail}</span>
              </div>
              <p className="hint">{copy.summary}</p>
              <div className="vbar">
                <span className="y" style={{ width: `${(tally.yes / width) * 100}%` }} />
                <span className="a" style={{ width: `${(tally.abs / width) * 100}%` }} />
                <span className="n" style={{ width: `${(tally.no / width) * 100}%` }} />
                <em style={{ left: `${(MAJORITY / width) * 100}%` }} />
              </div>
              <div className="vnum">
                <span><b>{t.billYes}</b> {tally.yes}</span>
                <span><b>{t.billAbs}</b> {tally.abs}</span>
                <span><b>{t.billNo}</b> {tally.no}</span>
              </div>
              <p className="hint">
                {[
                  tally.yesIds.length ? `${t.billYes}: ${tally.yesIds.map((id) => partyName(locale, id)).join(', ')}` : '',
                  tally.noIds.length ? `${t.billNo}: ${tally.noIds.map((id) => partyName(locale, id)).join(', ')}` : '',
                ].filter(Boolean).join(' · ')}
              </p>
            </article>
          )
        })}
      </section>

      <div className="box">
        <h3>{t.whereTitle}</h3>
        <p className="hint">{t.whereLead}</p>
        <div className="cmp">
          <Compass user={result.compassUser} parties={result.compassParties} />
        </div>
      </div>

      <section className="box">
        <h3>{t.questionsTitle}</h3>
        <p className="hint">{t.themesLead}</p>
        <div className="fleg">
          {parties.map((party) => (
            <span key={party.id}><i className="dot" style={{ background: party.color }} />{partyName(locale, party.id)}</span>
          ))}
          <span><i className="dot you" />{t.compassYou}</span>
        </div>
        <div className="strips">
          {themeIdsOf(ordered).map((themeId) => (
            <ThemeStrip key={themeId} themeId={themeId} ordered={ordered} answers={answers} />
          ))}
        </div>
      </section>

      <section className="box">
        <h3>{t.besidePolls}</h3>
        <p className="hint">{t.besideLead}</p>
        <table className="cmptbl">
          <thead>
            <tr>
              <th>{t.colList}</th>
              <th className="num">{t.colYou}</th>
              <th className="num">{t.colPolls}</th>
            </tr>
          </thead>
          <tbody>
            {parties.map((party) => (
              <tr key={party.id}>
                <td>
                  <i className="dot" style={{ background: party.color }} />
                  {partyName(locale, party.id)}
                </td>
                <td className="num">{result.seats[party.id]}</td>
                <td className="num">{party.poll}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="acts">
        <button type="button" className="cta" onClick={onCopy}>{copied ? t.copied : t.copy}</button>
        <button type="button" className="cta ghost" onClick={onEdit}>{t.editAnswers}</button>
        <button type="button" className="link" onClick={onReset}>{t.restart}</button>
      </div>

      <details className="det box">
        <summary>{t.howSummary}</summary>
        {t.methodParas.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </details>
      <p className="fine">{t.disclaimer}</p>
    </div>
  )
}

function ThemeStrip({ themeId, ordered, answers }: { themeId: string; ordered: Question[]; answers: Answers }) {
  const { t, locale } = useI18n()
  const rows = ordered.filter((question) => question.theme === themeId)
  const known = rows.filter((question) => question.id in answers && answers[question.id] != null)
  if (!known.length) return null
  const user = known.reduce((sum, question) => sum + (answers[question.id] as number), 0) / known.length
  const w = 300
  const x = (value: number) => 12 + ((value + 1) / 2) * (w - 24)
  return (
    <div className="strip">
      <div className="l">
        <span>{t.marks[0]}</span>
        <b>{themeText(locale, themeId).name}</b>
        <span>{t.marks[1]}</span>
      </div>
      <svg viewBox={`0 0 ${w} 26`} aria-hidden="true">
        <rect x="12" y="10" width={w - 24} height="6" rx="3" fill="var(--line2)" />
        {parties.map((party) => {
          const stance = rows.reduce((sum, question) => sum + (question.stance[party.id] ?? 0), 0) / rows.length
          return <circle key={party.id} cx={x(stance)} cy="13" r="5" fill={party.color}><title>{partyName(locale, party.id)}</title></circle>
        })}
        <circle cx={x(user)} cy="13" r="7" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2.5" />
      </svg>
      <details className="qd">
        <summary>{t.perQuestion(rows.length)}</summary>
        {rows.map((question) => {
          const value = question.id in answers ? answers[question.id] : undefined
          const copy = questionText(locale, question.id)
          const best = typeof value === 'number' ? nearestWing(question, value) : null
          return (
            <div key={question.id} className="qr">
              <div className="h">
                <b>{copy.title}</b>
                {best ? (
                  <span className="near" style={{ ['--c' as string]: best.color }}>
                    <i className="dot" />
                    {partyName(locale, best.id)}
                  </span>
                ) : (
                  <span className="near off">{t.skippedMark}</span>
                )}
              </div>
              <svg viewBox={`0 0 ${w} 20`} role="img" aria-label={copy.title}>
                <rect x="12" y="8" width={w - 24} height="4" rx="2" fill="var(--pend)" />
                {parties.map((party) => (
                  <circle key={party.id} cx={x(question.stance[party.id] ?? 0)} cy="10" r={party.id === best?.id ? 6 : 3.5} fill={party.color} opacity={best && party.id !== best.id ? 0.4 : 0.9} />
                ))}
                {typeof value === 'number' && <circle cx={x(value)} cy="10" r="5.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />}
              </svg>
              <div className="ab">
                <span>{copy.a}</span>
                <span>{copy.b}</span>
              </div>
            </div>
          )
        })}
      </details>
    </div>
  )
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return name.slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function WikiCard({ result }: { result: SeatResult }) {
  const { t, locale } = useI18n()
  const ranked = parties.filter((party) => result.seats[party.id] > 0).slice().sort((a, b) => result.seats[b.id] - result.seats[a.id] || b.poll - a.poll)
  const top = ranked.slice(0, 6)
  const rest = ranked.slice(6)
  const groups = groupsFrom(result.seats).map((group) => ({ ...group, name: partyName(locale, group.id) }))
  const chunks: (typeof top)[] = []
  for (let index = 0; index < top.length; index += 3) chunks.push(top.slice(index, index + 3))

  function row(group: typeof top, label: string, render: (id: string) => string | number) {
    return (
      <tr>
        <th scope="row">{label}</th>
        {group.map((party) => <td key={party.id}>{render(party.id)}</td>)}
        {Array.from({ length: 3 - group.length }, (_, index) => <td key={`pad-${index}`} />)}
      </tr>
    )
  }

  return (
    <section className="box">
      <h3>{t.reportTitle}</h3>
      <p className="hint">{t.wikiFaces}</p>
      <table className="wb">
        <tbody>
          <tr>
            <th colSpan={4} className="wb-title">
              {t.wikiTitle}
              <div>{t.wikiBy}</div>
            </th>
          </tr>
          <tr>
            <td colSpan={4} className="wb-sub">
              {t.wikiAll(SEAT_COUNT, seatsWord(locale, SEAT_COUNT))}
              <br />
              {t.wikiNeed(MAJORITY, seatsWord(locale, MAJORITY))}
              <br />
              {t.wikiVeto(VETO)}
            </td>
          </tr>
          {chunks.map((group) => (
            <Fragment key={group[0].id}>
              <tr key={`${group[0].id}-face`}>
                <th scope="row" />
                {group.map((party) => (
                  <td key={party.id}>
                    <div className="wb-ph" style={{ background: party.color }}>{initials(partyName(locale, party.id))}</div>
                  </td>
                ))}
                {Array.from({ length: 3 - group.length }, (_, index) => <td key={`face-${index}`} />)}
              </tr>
              {row(group, t.wikiLeader, (id) => partyLeader(locale, id))}
              <tr key={`${group[0].id}-wing`}>
                <th scope="row">{t.wikiWing}</th>
                {group.map((party) => (
                  <td key={party.id}>
                    <span className="wb-pn"><i style={{ display: 'block', height: 5, margin: '0 auto 3px', width: '80%', background: party.color }} />{partyName(locale, party.id)}</span>
                  </td>
                ))}
                {Array.from({ length: 3 - group.length }, (_, index) => <td key={`wing-${index}`} />)}
              </tr>
              {row(group, t.wikiGot, (id) => result.seats[id] ?? 0)}
              {row(group, t.wikiShare, (id) => `${formatPct((result.seats[id] ?? 0) / SEAT_COUNT, locale)}%`)}
              <tr key={`${group[0].id}-hr`}><td colSpan={4} className="wb-hr" /></tr>
            </Fragment>
          ))}
          <tr>
            <td colSpan={4}>
              <Hemicycle groups={groups} label={String(SEAT_COUNT)} sub={t.hemicycleSub} />
              <div className="wb-cap">{t.wikiCap}</div>
            </td>
          </tr>
          {rest.length > 0 && (
            <tr>
              <th scope="row">{t.wikiRest}</th>
              <td colSpan={3} className="wb-left">{rest.map((party) => `${partyName(locale, party.id)} ${result.seats[party.id]}`).join(', ')}</td>
            </tr>
          )}
          <tr>
            <th scope="row">{t.systemLabel}</th>
            <td colSpan={3} className="wb-left">{t.wikiSystem}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
