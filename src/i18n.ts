import { createContext, useContext } from 'react'
import { parties, partyById, posts, questions, themes } from './data'

export type Locale = 'ru' | 'en'

export const locales: Locale[] = ['ru', 'en']

const LANG_KEY = 'house-lang'

export function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    /* private mode */
  }
  return 'ru'
}

export function saveLocale(locale: Locale) {
  localStorage.setItem(LANG_KEY, locale)
}

type PartyBits = { name: string; leader: string }
type QuestionBits = { title: string; a: string; b: string }
type ThemeBits = { name: string; hint: string }

const enParties: Record<string, PartyBits> = {
  prog: { name: 'Progressives', leader: 'Alexandria Ocasio-Cortez' },
  dem: { name: 'Democrats', leader: 'Hakeem Jeffries' },
  modd: { name: 'Moderate Democrats', leader: 'Josh Gottheimer' },
  ind: { name: 'Independents', leader: 'no shared leader' },
  modr: { name: 'Moderate Republicans', leader: 'Brian Fitzpatrick' },
  gop: { name: 'Republicans', leader: 'Mike Johnson' },
  hfc: { name: 'Freedom Caucus', leader: 'Jim Jordan' },
}

const enQuestions: Record<string, QuestionBits> = {
  taxes: {
    title: 'Taxes',
    a: 'Extend the rate cuts and cut them further',
    b: 'Raise taxes on high incomes and corporations',
  },
  tariffs: {
    title: 'Tariffs',
    a: 'Keep broad tariffs even if prices rise',
    b: 'Lift tariffs where they raise the cost of living',
  },
  prices: {
    title: 'Prices',
    a: 'Inflation comes from spending: cut the budget',
    b: 'Antitrust, housing, and relief if a shock hits',
  },
  aca: {
    title: 'Health insurance',
    a: 'Let the enhanced ACA subsidies expire and shrink Medicaid',
    b: 'Keep the subsidies and widen coverage',
  },
  social: {
    title: 'Social Security and Medicare',
    a: 'Raise the retirement age and slow benefit growth',
    b: 'Leave benefits alone and collect more tax on high wages',
  },
  drugs: {
    title: 'Drug prices',
    a: 'The market and the patent set the price',
    b: 'Medicare negotiates and caps the price',
  },
  border: {
    title: 'Deportations',
    a: 'Mass deportations and a closed asylum path',
    b: 'Border enforcement plus a legal path and asylum processing',
  },
  visas: {
    title: 'Legal immigration',
    a: 'Cut legal immigration, including work visas',
    b: 'Expand legal immigration',
  },
  cities: {
    title: 'Sanctuary cities',
    a: 'Take federal money from cities that do not help deportations',
    b: 'Immigration is federal. Do not punish cities for local policing',
  },
  abortion: {
    title: 'Abortion',
    a: 'No federal right: a state may ban it, and federal money stays out',
    b: 'Congress writes a nationwide right to abortion',
  },
  guns: {
    title: 'Guns',
    a: 'Permit reciprocity and no new bans',
    b: 'A universal background check and a ban on assault rifles',
  },
  schools: {
    title: 'Schools',
    a: 'Parents and the state set the curriculum, including gender and race',
    b: 'Federal rules protect students, including LGBTQ students',
  },
  doj: {
    title: 'The Justice Department',
    a: 'The president runs DOJ and fires officials who block the program',
    b: 'DOJ and the civil service do not answer to the White House',
  },
  courts: {
    title: 'The Supreme Court',
    a: 'Remake the court after an election: more justices, or a narrower jurisdiction',
    b: 'Leave the size and independence of the court alone',
  },
  floor: {
    title: 'House rules',
    a: 'The majority closes amendments and writes the agenda',
    b: 'Members of both parties can force bills onto the floor',
  },
  ukraine: {
    title: 'Ukraine',
    a: 'Wind military aid down. Europe should pay',
    b: 'Keep aid until there is a ceasefire that can be defended',
  },
  china: {
    title: 'China',
    a: 'Decouple: tariffs, tech bans, and a navy aimed at Beijing',
    b: 'Compete, but do not tear up trade or steer toward war',
  },
  nato: {
    title: 'Alliances',
    a: 'Allies are freeloaders. Pull back from NATO commitments',
    b: 'NATO and the Pacific alliances are worth the cost',
  },
}

const enThemes: Record<string, ThemeBits> = {
  money: { name: 'Prices and taxes', hint: 'Tariffs, rates, the cost of living' },
  care: { name: 'Health care and benefits', hint: 'ACA, drugs, Social Security' },
  border: { name: 'The border', hint: 'Deportations, visas, cities' },
  rights: { name: 'Rights', hint: 'Abortion, guns, schools' },
  power: { name: 'Power', hint: 'DOJ, the court, House rules' },
  world: { name: 'The world', hint: 'Ukraine, China, alliances' },
}

const enPosts: Record<string, string> = {
  speaker: 'Speaker',
  leader: 'Majority leader',
  whip: 'Majority whip',
  rules: 'Rules Committee',
  approps: 'Appropriations',
  ways: 'Ways and Means',
  jud: 'Judiciary',
  armed: 'Armed Services',
}

const scenarioCopy: Record<Locale, Record<string, { name: string; note: string }>> = {
  ru: {
    dem: {
      name: 'Демократическое большинство',
      note: 'Прогрессисты, основное демократическое крыло и умеренные демократы, у которых есть округа.',
    },
    gop: {
      name: 'Республиканское большинство',
      note: 'Умеренные республиканцы, основное крыло и кокус свободы, у которых есть округа.',
    },
    outside: {
      name: 'Большинство с независимыми',
      note: 'Независимые не входят в руководство. Их голоса за спикера возможны на один вечер, не по договору.',
    },
  },
  en: {
    dem: {
      name: 'Democratic majority',
      note: 'Progressives, the main Democratic wing, and moderate Democrats who won districts.',
    },
    gop: {
      name: 'Republican majority',
      note: 'Moderate Republicans, the main wing, and the Freedom Caucus, where they won districts.',
    },
    outside: {
      name: 'A majority with independents',
      note: 'Independents do not enter the leadership. Their votes for speaker are possible for one evening, not by a deal.',
    },
  },
}

export function scenarioText(locale: Locale, id: string) {
  return scenarioCopy[locale][id] ?? scenarioCopy.ru[id]
}

export function partyName(locale: Locale, id: string) {
  if (locale === 'en') return enParties[id]?.name ?? partyById(id).name
  return partyById(id).name
}

export function partyLeader(locale: Locale, id: string) {
  if (locale === 'en') return enParties[id]?.leader ?? partyById(id).leader
  return partyById(id).leader
}

export function leaderOf(locale: Locale, id: string | null) {
  if (!id) return locale === 'en' ? 'no one' : 'некому'
  return partyLeader(locale, id)
}

export function questionText(locale: Locale, id: string): QuestionBits {
  const source = questions.find((item) => item.id === id)
  const fallback = { title: source?.title ?? id, a: source?.a ?? '', b: source?.b ?? '' }
  if (locale === 'en') return enQuestions[id] ?? fallback
  return fallback
}

export function themeText(locale: Locale, id: string): ThemeBits {
  const source = themes.find((item) => item.id === id)
  const fallback = { name: source?.name ?? id, hint: source?.hint ?? '' }
  if (locale === 'en') return enThemes[id] ?? fallback
  return fallback
}

export function postName(locale: Locale, id: string) {
  const source = posts.find((item) => item.id === id)
  if (locale === 'en') return enPosts[id] ?? source?.name ?? id
  return source?.name ?? id
}

type Ui = {
  pageTitle: string
  brandKicker: string
  brand: string
  methodButton: string
  methodTitle: string
  methodLead: string
  methodParas: string[]
  close: string
  lightTheme: string
  darkTheme: string
  language: string
  date: string
  introTitle: string
  introLead: string
  seatsShort: string
  districtShort: string
  majorityShort: string
  start: string
  skipToQuestions: string
  pollNow: (dem: number, gop: number) => string
  hemicycleSub: string
  figcaption: string
  step: string
  weightsTitle: string
  weightsLead: string
  weights: string[]
  toQuestions: string
  questionOf: (current: number, total: number) => string
  option: (mark: string) => string
  marks: [string, string]
  answerLabel: string
  choices: string[]
  back: string
  skip: string
  keysHint: string
  draft: string
  yourHouse: string
  fewAnswers: string
  closestBefore: string
  matchWord: string
  twoParty: (pct: string, seats: number) => string
  wasted: (pct: string) => string
  whoBuilds: string
  enough: (outside: boolean) => string
  shortBy: (gap: number) => string
  outsidePrefix: string
  speakerCandidate: (leader: string) => string
  shortestTitle: string
  shortestLead: string
  speakerWord: string
  postsTitle: string
  postsLead: string
  outlookCaveat: string
  besidePolls: string
  besideLead: string
  colList: string
  colYou: string
  colPolls: string
  noSeatsLine: (list: string) => string
  whereTitle: string
  whereLead: string
  copy: string
  copied: string
  editAnswers: string
  restart: string
  disclaimer: string
  shareText: (lines: string, verdict: string) => string
  compassAria: string
  compassTop: string
  compassBottom: string
  compassLeft: string
  compassRight: string
  compassYou: string
}

export const ui: Record<Locale, Ui> = {
  ru: {
    pageTitle: 'Симулятор Палаты · 2026',
    brandKicker: '120-й Конгресс',
    brand: 'Симулятор',
    methodButton: 'Как считается',
    methodTitle: 'Как собирается Палата',
    methodLead: 'Выборы 3 ноября 2026 года, 435 мест 120-го Конгресса. Модель повторяет правила Палаты, а не карту конкретного округа.',
    methodParas: [
      '435 одномандатных округов. В округе один победитель, относительное большинство. Голос за третью силу почти никогда не берёт округ: 19% Росса Перро в 1992 году не дали независимым ни одного места в Палате. Здесь независимые начинают получать округа только после 25% по стране, и то немного.',
      'Места двух партий считаются от их доли в двупартийном голосовании. Один пункт по стране двигает примерно шесть мест (эластичность 1,35). Полмандатных пункта заложены в пользу республиканцев: так редакционно учтена география округов. Это не формула Бюро переписи.',
      'Внутри партии места делятся между крыльями. Безопасные округа сидят ближе к флангу, колеблющиеся чаще берут умеренных. Если вся страна отвечает как фланг, праймериз сдвигаются туда же.',
      'Чтобы организовать палату, нужно 218 из 435. Спикера избирает палата, не партия. Крыло, которое больше запаса большинства, может провалить кандидата. Так в январе 2023 года Кевина Маккарти избирали с 15-й попытки.',
      'Ваши ответы не выбирают одного кандидата. Они собирают палату так, как если бы страна ответила так же. Цифры на первом экране: 238 у демократов и 197 у республиканцев, округление опубликованных прогнозов начала октября 2026 года. Делёж этих мест по крыльям редакционный. Прогнозы публикуют партию, не кокус.',
    ],
    close: 'Закрыть',
    lightTheme: 'Светлая тема',
    darkTheme: 'Тёмная тема',
    language: 'Язык',
    date: '3 ноября 2026',
    introTitle: 'Соберите Палату своими ответами',
    introLead: 'Восемнадцать вопросов про пошлины, страховку, границу, суд и союзы. На выходе 435 округов и проверка, собирается ли 218 голосов за спикера. Сенат и президент здесь не считаются.',
    seatsShort: 'мест',
    districtShort: 'победитель в округе',
    majorityShort: 'для спикера',
    start: 'Начать',
    skipToQuestions: 'Сразу к вопросам',
    pollNow: (dem, gop) =>
      `Сейчас опубликованные модели отдают демократам около ${dem} мест, республиканцам около ${gop}. Для большинства нужно 218. Это среднее начала октября, не ваш результат.`,
    hemicycleSub: 'мест',
    figcaption: 'Демократы слева, республиканцы справа. Умеренные сидят ближе к центру зала.',
    step: 'Шаг 1',
    weightsTitle: 'Что для вас решает выборы',
    weightsLead: 'Тема с весом «не важно» не влияет на округа. По умолчанию все шесть одинаково важны.',
    weights: ['Не важно', 'Слабо', 'Важно', 'Решающе'],
    toQuestions: 'К вопросам',
    questionOf: (current, total) => `Вопрос ${current} из ${total}`,
    option: (mark) => `Вариант ${mark}`,
    marks: ['А', 'Б'],
    answerLabel: 'Ответ',
    choices: ['Первый', 'Скорее первый', 'Середина', 'Скорее второй', 'Второй'],
    back: 'Назад',
    skip: 'Пропустить',
    keysHint: 'Клавиши 1-5, 0 пропуск, Backspace назад.',
    draft: 'Черновик Палаты по уже данным ответам',
    yourHouse: 'Ваша Палата',
    fewAnswers: 'Ответов мало, поэтому расклад ближе к ровному дележу, чем к настоящей кампании.',
    closestBefore: 'Ближе всего к ответам',
    matchWord: 'Совпадение',
    twoParty: (pct, seats) =>
      `В двупартийном голосовании демократы получают ${pct}% голосов и ${seats} мест. Округа не делятся пропорционально.`,
    wasted: (pct) => `Независимые собирают ${pct}% голосов и ноль округов: при системе одного победителя этот голос сгорает.`,
    whoBuilds: 'Кто собирает 218',
    enough: (outside) => `Хватает на большинство${outside ? ' только с голосами извне' : ''}`,
    shortBy: (gap) => `Не хватает ${gap}`,
    outsidePrefix: 'извне',
    speakerCandidate: (leader) => `Кандидат в спикеры: ${leader}`,
    shortestTitle: 'Самые короткие большинства',
    shortestLead: 'Составы без лишнего крыла: если убрать кого-то одного, 218 уже нет. Пары, которые не садятся организовывать палату вместе, сюда не попадают. Если внутри состава два крыла больше запаса, спикер всё равно не избран.',
    speakerWord: 'спикер',
    postsTitle: 'Кресла руководства',
    postsLead: 'Черновая раскладка по тому, какое крыло в этом большинстве ближе к теме комитета. Это не пакет сделки за спикера.',
    outlookCaveat: 'Сценарий по вашим ответам, не прогноз явки 3 ноября.',
    besidePolls: 'Рядом с прогнозами',
    besideLead: 'Слева ваша Палата, справа округлённое среднее опубликованных прогнозов начала октября 2026 года. Ноль у независимых значит, что модели не отдают им округов.',
    colList: 'Крыло',
    colYou: 'Вы',
    colPolls: 'Прогнозы',
    noSeatsLine: (list) => `Без единого округа: ${list}.`,
    whereTitle: 'Где вы стоите',
    whereLead: 'Горизонталь: от расходов и регулирования к рынку и ограничениям. Вертикаль: от популистского большинства к институтам и союзам. Точка «вы» считается по тем же вопросам.',
    copy: 'Скопировать расклад',
    copied: 'Скопировано',
    editAnswers: 'Изменить ответы',
    restart: 'Сначала',
    disclaimer:
      'Позиции крыльев - редакционная оценка по публичным голосованиям и заявлениям на осень 2026 года. Имена лидеров это лица крыла, не прогноз, что они выиграют свой округ. Проект не связан с Федеральной избирательной комиссией и не является избирательной агитацией.',
    shareText: (lines, verdict) => `Моя Палата-2026: ${lines}. ${verdict}`,
    compassAria: 'Политические координаты',
    compassTop: 'Институты',
    compassBottom: 'Популизм',
    compassLeft: 'Расходы',
    compassRight: 'Рынок',
    compassYou: 'Вы',
  },
  en: {
    pageTitle: 'House simulator · 2026',
    brandKicker: '120th Congress',
    brand: 'Simulator',
    methodButton: 'How it counts',
    methodTitle: 'How the House is built',
    methodLead: 'The election is on 3 November 2026, for 435 seats in the 120th Congress. The model follows House rules. It is not a map of any one district.',
    methodParas: [
      '435 single-member districts. One winner per district, by plurality. A third-party vote almost never takes a seat: Ross Perot’s 19% in 1992 won independents nothing in the House. Here independents start winning districts only after 25% nationwide, and then only a few.',
      'The two parties’ seats come from their share of the two-party vote. One national point moves about six seats (elasticity 1.35). Half a point is built in for Republicans, an editorial nod to district geography. It is not a Census Bureau formula.',
      'Inside a party, seats are split among wings. Safe districts sit toward the flank. Swing districts more often elect moderates. If the whole country answers like a flank, the primaries move that way too.',
      'Organizing the House takes 218 of 435. The House elects the speaker, not the party. A wing larger than the majority’s cushion can vote the nominee down. That is how Kevin McCarthy was elected on the 15th ballot in January 2023.',
      'Your answers do not pick a single candidate. They build a House as if the country answered the same way. The first screen uses 238 Democratic seats and 197 Republican seats, a rounding of published forecasts from early October 2026. The split of those seats among wings is editorial. Forecasts publish a party, not a caucus.',
    ],
    close: 'Close',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
    language: 'Language',
    date: '3 November 2026',
    introTitle: 'Build the House with your answers',
    introLead: 'Eighteen questions on tariffs, insurance, the border, the court, and alliances. You get 435 districts and a check on whether 218 votes for speaker come together. The Senate and the presidency are not in this model.',
    seatsShort: 'seats',
    districtShort: 'winner per district',
    majorityShort: 'for speaker',
    start: 'Start',
    skipToQuestions: 'Skip to the questions',
    pollNow: (dem, gop) =>
      `Published models currently give Democrats about ${dem} seats and Republicans about ${gop}. A majority takes 218. That is the early-October average, not your result.`,
    hemicycleSub: 'seats',
    figcaption: 'Democrats on the left, Republicans on the right. Moderates sit closer to the center of the chamber.',
    step: 'Step 1',
    weightsTitle: 'What decides the election for you',
    weightsLead: 'A theme set to “not important” does not move districts. By default all six weigh the same.',
    weights: ['Not important', 'A little', 'Important', 'Decisive'],
    toQuestions: 'To the questions',
    questionOf: (current, total) => `Question ${current} of ${total}`,
    option: (mark) => `Option ${mark}`,
    marks: ['A', 'B'],
    answerLabel: 'Answer',
    choices: ['First', 'Leaning first', 'Middle', 'Leaning second', 'Second'],
    back: 'Back',
    skip: 'Skip',
    keysHint: 'Keys 1-5, 0 to skip, Backspace to go back.',
    draft: 'A draft House from the answers so far',
    yourHouse: 'Your House',
    fewAnswers: 'There are few answers, so the result is closer to an even split than to a real campaign.',
    closestBefore: 'Closest to your answers',
    matchWord: 'Match',
    twoParty: (pct, seats) =>
      `Democrats get ${pct}% of the two-party vote and ${seats} seats. Districts are not shared out in proportion.`,
    wasted: (pct) => `Independents take ${pct}% of the vote and zero districts: under a one-winner system that vote is wasted.`,
    whoBuilds: 'Who gets to 218',
    enough: (outside) => `Enough for a majority${outside ? ' only with outside votes' : ''}`,
    shortBy: (gap) => `Short by ${gap}`,
    outsidePrefix: 'outside',
    speakerCandidate: (leader) => `Candidate for speaker: ${leader}`,
    shortestTitle: 'The shortest majorities',
    shortestLead: 'Lineups with no spare wing: drop any one of them and 218 is gone. Pairs that will not organize the House together are left out. If two wings inside a lineup are each larger than the cushion, the speaker is still not elected.',
    speakerWord: 'speaker',
    postsTitle: 'Leadership chairs',
    postsLead: 'A rough split by which wing in this majority is closer to the committee. This is not the deal that elected the speaker.',
    outlookCaveat: 'A scenario from your answers, not a turnout forecast for 3 November.',
    besidePolls: 'Next to the forecasts',
    besideLead: 'Your House is on the left. A rounded average of published forecasts from early October 2026 is on the right. Zero for independents means the models give them no districts.',
    colList: 'Wing',
    colYou: 'You',
    colPolls: 'Forecasts',
    noSeatsLine: (list) => `No district at all: ${list}.`,
    whereTitle: 'Where you stand',
    whereLead: 'Horizontal: from spending and regulation toward markets and restriction. Vertical: from populist majority rule toward institutions and alliances. The “you” point uses the same questions.',
    copy: 'Copy the result',
    copied: 'Copied',
    editAnswers: 'Edit answers',
    restart: 'Start over',
    disclaimer:
      'Wing positions are an editorial reading of public votes and statements in autumn 2026. Named leaders are faces of a wing, not a prediction that they win their own district. This project is not affiliated with the Federal Election Commission and is not campaign material.',
    shareText: (lines, verdict) => `My House 2026: ${lines}. ${verdict}`,
    compassAria: 'Political coordinates',
    compassTop: 'Institutions',
    compassBottom: 'Populism',
    compassLeft: 'Spending',
    compassRight: 'Markets',
    compassYou: 'You',
  },
}

export type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Ui
}

const defaultI18n: I18nValue = {
  locale: 'ru',
  setLocale: () => {},
  t: ui.ru,
}

export const I18nContext = createContext<I18nValue>(defaultI18n)

export function useI18n() {
  return useContext(I18nContext)
}

export const partyIds = parties.map((party) => party.id)
