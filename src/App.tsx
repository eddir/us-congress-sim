import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
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
import { Hemicycle, StackedBar } from '@/components/Hemicycle'
import { groupsFrom } from '@/hemicycle'
import {
  demIds,
  gopIds,
  MAJORITY,
  parties,
  questions,
  SEAT_COUNT,
  themes,
  THIRD_PARTY_FLOOR,
  weightLevels,
} from '@/data'
import { defaultWeights, formatPct, simulate, type Answers, type SeatResult, type Weights } from '@/model'
import { I18nContext, loadLocale, partyLeader, partyName, postName, questionText, saveLocale, themeText, ui, useI18n, type Locale } from '@/i18n'

type Phase = 'intro' | 'weights' | 'questions' | 'results'

type Save = {
  phase: Phase
  weights: Weights
  answers: Answers
  index: number
}

const STORAGE = 'house-2026-v1'
const choices = [
  { value: -1, key: '1' },
  { value: -0.5, key: '2' },
  { value: 0, key: '3' },
  { value: 0.5, key: '4' },
  { value: 1, key: '5' },
]
const choiceValues = new Set(choices.map((choice) => choice.value))
const weightValues = new Set<number>(weightLevels.map((level) => level.id))

function loadSave(): Save {
  const empty: Save = { phase: 'intro', weights: defaultWeights(), answers: {}, index: 0 }
  try {
    const raw = localStorage.getItem(STORAGE)
    if (!raw) return empty
    const data = JSON.parse(raw) as Partial<Save>
    const phase: Phase = data.phase === 'weights' || data.phase === 'questions' || data.phase === 'results' ? data.phase : 'intro'
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
        else if (typeof value === 'number' && choiceValues.has(value)) answers[question.id] = value
      }
    }
    const index = Number.isFinite(data.index) ? Math.round(data.index ?? 0) : 0
    return {
      phase,
      weights,
      answers,
      index: Math.max(0, Math.min(questions.length - 1, index)),
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

export default function App() {
  const [initial] = useState(loadSave)
  const [phase, setPhase] = useState<Phase>(initial.phase)
  const [weights, setWeights] = useState<Weights>(initial.weights)
  const [answers, setAnswers] = useState<Answers>(initial.answers)
  const [index, setIndex] = useState(initial.index)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [locale, setLocaleState] = useState<Locale>(loadLocale)
  const t = ui[locale]
  const theme = useTheme()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const timer = useRef<number>(0)
  const result = useMemo(() => simulate(answers, weights, locale), [answers, weights, locale])
  const shareKey = parties.map((party) => result.seats[party.id]).join('.')
  const copied = copiedKey === shareKey

  useEffect(() => {
    const save: Save = { phase, weights, answers, index }
    localStorage.setItem(STORAGE, JSON.stringify(save))
  }, [phase, weights, answers, index])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopiedKey(null), 2200)
    return () => window.clearTimeout(id)
  }, [copied])

  useEffect(() => {
    if (phase === 'questions') headingRef.current?.focus()
    window.scrollTo(0, 0)
  }, [phase, index])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = 'ltr'
    document.title = t.pageTitle
  }, [locale, t.pageTitle])

  function setLocale(next: Locale) {
    setLocaleState(next)
    saveLocale(next)
  }

  const answered = questions.filter((question) => question.id in answers).length

  function go(next: Phase) {
    window.clearTimeout(timer.current)
    if (next !== 'results') setActiveId(null)
    setPhase(next)
  }

  function reset() {
    setAnswers({})
    setWeights(defaultWeights())
    setIndex(0)
    setActiveId(null)
    go('intro')
  }

  const backQuestion = useCallback(() => {
    window.clearTimeout(timer.current)
    if (index === 0) setPhase('weights')
    else setIndex((current) => current - 1)
  }, [index])

  const pick = useCallback((value: number | null) => {
    const question = questions[index]
    setAnswers((current) => ({ ...current, [question.id]: value }))
    window.clearTimeout(timer.current)
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180
    timer.current = window.setTimeout(() => {
      if (index >= questions.length - 1) {
        setActiveId(null)
        setPhase('results')
      } else setIndex((current) => current + 1)
    }, delay)
  }, [index])

  useEffect(() => {
    if (phase !== 'questions') return
    function onKey(event: KeyboardEvent) {
      if (event.repeat || event.defaultPrevented) return
      if (document.querySelector('[role="dialog"]')) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const choice = choices.find((item) => item.key === event.key)
      if (choice) {
        event.preventDefault()
        pick(choice.value)
      } else if (event.key === '0' || event.key === 'Escape') {
        event.preventDefault()
        pick(null)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        backQuestion()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [phase, pick, backQuestion])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
    <div className="min-h-svh">
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <button type="button" className="text-start" onClick={() => go('intro')}>
          <span className="block text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{t.brandKicker}</span>
          <span className="font-heading text-lg leading-none">{t.brand}</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5" role="group" aria-label={t.language}>
            {(['ru', 'en'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={locale === code}
                onClick={() => setLocale(code)}
                className={`h-7 rounded-md px-2 text-xs font-semibold ${locale === code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                {code === 'ru' ? 'RU' : 'EN'}
              </button>
            ))}
          </div>
          <MethodDialog />
          <Button type="button" variant="outline" size="icon" aria-label={theme.dark ? t.lightTheme : t.darkTheme} onClick={theme.toggle}>
            {theme.dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
        {phase === 'intro' && <Intro onStart={() => go('weights')} onSkip={() => { setIndex(0); go('questions') }} />}
        {phase === 'weights' && (
          <Weights
            weights={weights}
            onChange={(themeId, level) => setWeights((current) => ({ ...current, [themeId]: level }))}
            onNext={() => { setIndex(0); go('questions') }}
          />
        )}
        {phase === 'questions' && (
          <Question
            index={index}
            answers={answers}
            result={result}
            headingRef={headingRef}
            onPick={pick}
            onBack={backQuestion}
          />
        )}
        {phase === 'results' && (
          <Results
            result={result}
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
            onEdit={() => { setIndex(questions.length - 1); go('questions') }}
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
        <div className="space-y-3 text-sm leading-relaxed text-foreground">
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
    <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">{t.date}</p>
        <h1 className="font-heading mt-3 text-4xl leading-[1.05] font-semibold sm:text-5xl">{t.introTitle}</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{t.introLead}</p>
        <dl className="mt-6 grid grid-cols-3 gap-2">
          {[
            [String(SEAT_COUNT), t.seatsShort],
            ['1', t.districtShort],
            [String(MAJORITY), t.majorityShort],
          ].map(([value, name]) => (
            <div key={name} className="rounded-xl border bg-card px-3 py-3">
              <dt className="font-heading text-2xl leading-none">{value}</dt>
              <dd className="mt-1 text-xs text-muted-foreground">{name}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button" className="h-11 px-5" onClick={onStart}>{t.start}</Button>
          <Button type="button" variant="ghost" className="h-11" onClick={onSkip}>{t.skipToQuestions}</Button>
        </div>
        <p className="mt-4 max-w-xl text-sm text-muted-foreground">{t.pollNow(dem, gop)}</p>
      </div>
      <figure className="rounded-2xl border bg-card p-3 sm:p-5">
        <Hemicycle groups={groups} label={String(SEAT_COUNT)} sub={t.hemicycleSub} />
        <figcaption className="px-2 pb-1 text-sm text-muted-foreground">{t.figcaption}</figcaption>
      </figure>
    </div>
  )
}

function Weights({
  weights,
  onChange,
  onNext,
}: {
  weights: Weights
  onChange: (themeId: string, level: number) => void
  onNext: () => void
}) {
  const { t, locale } = useI18n()
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">{t.step}</p>
      <h1 className="font-heading mt-2 text-3xl font-semibold sm:text-4xl">{t.weightsTitle}</h1>
      <p className="mt-3 text-muted-foreground">{t.weightsLead}</p>
      <div className="mt-6 space-y-3">
        {themes.map((item) => {
          const copy = themeText(locale, item.id)
          return (
          <div key={item.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-medium">{copy.name}</h2>
                <p className="text-sm text-muted-foreground">{copy.hint}</p>
              </div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4" role="radiogroup" aria-label={copy.name}>
                {weightLevels.map((level) => {
                  const on = weights[item.id] === level.id
                  return (
                    <button
                      key={level.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => onChange(item.id, level.id)}
                      className={`h-9 rounded-lg px-2 text-xs font-medium ${on ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}
                    >
                      {t.weights[level.id]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          )
        })}
      </div>
      <Button type="button" className="mt-6 h-11 px-5" onClick={onNext}>{t.toQuestions}</Button>
    </div>
  )
}

function Question({
  index,
  answers,
  result,
  headingRef,
  onPick,
  onBack,
}: {
  index: number
  answers: Answers
  result: SeatResult
  headingRef: RefObject<HTMLHeadingElement | null>
  onPick: (value: number | null) => void
  onBack: () => void
}) {
  const { t, locale } = useI18n()
  const question = questions[index]
  const copy = questionText(locale, question.id)
  const theme = themeText(locale, question.theme)
  const current = question.id in answers ? answers[question.id] : undefined
  const started = Object.keys(answers).length > 0
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{theme.name}</span>
        <span>{t.questionOf(index + 1, questions.length)}</span>
      </div>
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary" style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="font-heading text-3xl font-semibold outline-none sm:text-4xl">{copy.title}</h1>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Pole text={copy.a} hot={typeof current === 'number' && current < 0} label={t.option(t.marks[0])} />
        <Pole text={copy.b} hot={typeof current === 'number' && current > 0} label={t.option(t.marks[1])} />
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t.answerLabel}>
        {choices.map((choice, choiceIndex) => {
          const on = current === choice.value
          const name = t.choices[choiceIndex]
          return (
            <button
              key={choice.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${choice.key} ${name}`}
              onClick={() => onPick(choice.value)}
              className={`min-h-16 rounded-xl border px-1 text-center text-xs leading-tight font-medium sm:text-sm ${on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'}`}
            >
              <span className="block text-[10px] opacity-70">{choice.key}</span>
              {name}
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>{t.back}</Button>
        <Button type="button" variant="outline" onClick={() => onPick(null)}>{t.skip}</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t.keysHint}</p>
      {started && (
        <div className="mt-8">
          <p className="mb-2 text-sm text-muted-foreground">{t.draft}</p>
          <StackedBar seats={result.seats} />
        </div>
      )}
    </div>
  )
}

function Pole({ text, hot, label }: { text: string; hot: boolean; label: string }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${hot ? 'ring-2 ring-primary' : ''}`}>
      <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</span>
      <p className="mt-1 leading-snug">{text}</p>
    </div>
  )
}

function Results({
  result,
  answered,
  activeId,
  onActive,
  copied,
  onCopy,
  onEdit,
  onReset,
}: {
  result: SeatResult
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
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">{t.yourHouse}</p>
      <h1 className="font-heading mt-2 max-w-3xl text-4xl leading-tight font-semibold sm:text-5xl">{result.verdictTitle}</h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{result.verdictText}</p>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{t.twoParty(formatPct(result.twoPartyDem, locale), demSeats)}</p>
      {wasted && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t.wasted(formatPct(result.raw.ind, locale))}</p>}
      {answered < 4 && <p className="mt-2 text-sm text-muted-foreground">{t.fewAnswers}</p>}
      <p className="mt-4 max-w-3xl">
        {t.closestBefore} <strong>{partyName(locale, closestId)}</strong>
        {locale === 'ru' && <span className="text-muted-foreground"> {parties.find((party) => party.id === closestId)?.en}</span>}
        {`, ${partyLeader(locale, closestId)}. ${t.matchWord} ${formatPct(result.closeness[closestId], locale)}%.`}
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border bg-card p-3 sm:p-5">
          <Hemicycle
            groups={groups}
            activeId={activeId}
            onPick={(id) => onActive(activeId === id ? null : id)}
            label={String(SEAT_COUNT)}
            sub={t.hemicycleSub}
          />
        </div>
        <ul className="space-y-1.5">
          {parties
            .filter((party) => result.seats[party.id] > 0)
            .slice()
            .sort((a, b) => result.seats[b.id] - result.seats[a.id])
            .map((party) => (
              <li key={party.id}>
                <button
                  type="button"
                  onClick={() => onActive(activeId === party.id ? null : party.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start ${activeId === party.id ? 'bg-muted' : ''}`}
                >
                  <i className="size-3 shrink-0 rounded-full" style={{ background: party.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{partyName(locale, party.id)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {locale === 'ru' ? <>{party.en} · {partyLeader(locale, party.id)}</> : partyLeader(locale, party.id)}
                    </span>
                  </span>
                  <span className="font-heading text-xl">{result.seats[party.id]}</span>
                </button>
              </li>
            ))}
          {below.length > 0 && (
            <li className="px-2 pt-3 text-sm text-muted-foreground">
              {t.noSeatsLine(below.map((party) => `${partyName(locale, party.id)} (${formatPct(result.raw[party.id], locale)}%)`).join(', '))}
            </li>
          )}
        </ul>
      </div>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">{t.whoBuilds}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {result.scenarios.map((scenario) => {
            const enough = scenario.total >= MAJORITY
            const lead = scenario.id === result.primaryId
            return (
              <article key={scenario.id} className={`rounded-xl border bg-card p-4 ${lead ? 'ring-2 ring-primary' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{scenario.name}</h3>
                  <p className={`font-heading text-3xl leading-none ${enough ? 'text-primary' : ''}`}>{scenario.total}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{enough ? t.enough(scenario.outside.length > 0) : t.shortBy(MAJORITY - scenario.total)}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {scenario.ids.map((id) => (
                    <span key={id} className="rounded-full bg-muted px-2 py-0.5 text-xs">{partyName(locale, id)} {result.seats[id]}</span>
                  ))}
                  {scenario.outside.map((id) => (
                    <span key={id} className="rounded-full border border-dashed px-2 py-0.5 text-xs">{t.outsidePrefix}: {partyName(locale, id)} {result.seats[id]}</span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed">{scenario.note}</p>
                {scenario.pm && <p className="mt-2 text-sm">{t.speakerCandidate(partyLeader(locale, scenario.pm))}</p>}
              </article>
            )
          })}
        </div>
      </section>

      {result.coalitions.length > 0 && (
        <section className="mt-10">
          <h2 className="font-heading text-2xl font-semibold">{t.shortestTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t.shortestLead}</p>
          <ul className="mt-4 space-y-2">
            {result.coalitions.map((coalition) => (
              <li key={coalition.ids.join('-')} className="rounded-xl border bg-card px-4 py-3 text-sm">
                <span className="font-medium">{coalition.ids.map((id) => partyName(locale, id)).join(' + ')}</span>
                <span className="text-muted-foreground"> · {coalition.seats} · {t.speakerWord} {partyLeader(locale, coalition.pm)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.cabinet && (
        <section className="mt-10">
          <h2 className="font-heading text-2xl font-semibold">{t.postsTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.postsLead}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {result.cabinet.map((seat) => (
              <li key={seat.post} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                <span>{postName(locale, seat.post)}</span>
                <span className="text-end">
                  <span className="block font-medium">{partyName(locale, seat.partyId)}</span>
                  <span className="block text-xs text-muted-foreground">{partyLeader(locale, seat.partyId)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-2xl border bg-card p-5">
        <h2 className="font-heading text-2xl font-semibold">{result.outlookTitle}</h2>
        <p className="mt-2 max-w-3xl leading-relaxed">{result.outlookText}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t.outlookCaveat}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">{t.besidePolls}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.besideLead}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-start text-muted-foreground">
              <tr>
                <th className="py-2 pe-3 text-start font-medium">{t.colList}</th>
                <th className="py-2 ps-3 text-end font-medium">{t.colYou}</th>
                <th className="py-2 ps-3 text-end font-medium">{t.colPolls}</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((party) => (
                <tr key={party.id} className="border-t">
                  <td className="py-2 pe-3">
                    <span className="me-2 inline-block size-2.5 rounded-full align-middle" style={{ background: party.color }} />
                    {partyName(locale, party.id)}
                  </td>
                  <td className="py-2 ps-3 text-end tabular-nums">{result.seats[party.id]}</td>
                  <td className="py-2 ps-3 text-end tabular-nums">{party.poll}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-2xl font-semibold">{t.whereTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t.whereLead}</p>
        <div className="mt-4 max-w-lg">
          <Compass user={result.compassUser} parties={result.compassParties} />
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button type="button" className="h-11 px-5" onClick={onCopy}>{copied ? t.copied : t.copy}</Button>
        <Button type="button" variant="outline" className="h-11" onClick={onEdit}>{t.editAnswers}</Button>
        <Button type="button" variant="ghost" className="h-11" onClick={onReset}>{t.restart}</Button>
      </div>
      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground">{t.disclaimer}</p>
    </div>
  )
}
