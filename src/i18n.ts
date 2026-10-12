import { createContext, useContext } from 'react'
import { bills, parties, partyById, posts, questions, themes } from './data'

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
  wage: {
    title: 'Minimum wage',
    a: 'Leave the federal minimum where it is',
    b: 'Raise it and index it to prices',
  },
  ceiling: {
    title: 'The debt ceiling',
    a: 'Hold the ceiling as leverage to cut spending',
    b: 'Raise it on its own, with no threat of a Treasury default',
  },
  housing: {
    title: 'Housing',
    a: 'Lift local bans and leave building to the market',
    b: 'Federal money for affordable and public housing',
  },
  leave: {
    title: 'Paid leave',
    a: 'Employers and states decide family leave',
    b: 'A federal paid-leave program',
  },
  tuition: {
    title: 'Student debt',
    a: 'Borrowers repay. No mass cancellation',
    b: 'Cancel a large share and expand grants',
  },
  snap: {
    title: 'Food aid',
    a: 'Tighter work rules and a smaller SNAP benefit',
    b: 'Keep the benefit and raise it with food prices',
  },
  wall: {
    title: 'The wall',
    a: 'Finish the wall and expand detention',
    b: 'Technology and ports of entry, not a longer wall',
  },
  asylum: {
    title: 'Asylum',
    a: 'Raise the bar and speed removals',
    b: 'Keep the right to seek asylum and add judges',
  },
  dream: {
    title: 'People brought as children',
    a: 'End DACA and require them to leave',
    b: 'A path to citizenship for people brought as children',
  },
  voting: {
    title: 'Voting',
    a: 'Strict ID and shorter early voting. States write the rules',
    b: 'A federal floor: early voting, same-day registration, and the Voting Rights Act',
  },
  minors: {
    title: 'Care for minors',
    a: 'A federal ban on gender medical care for minors',
    b: 'No federal ban: the doctor, the family, and the state decide',
  },
  religion: {
    title: 'Religion and services',
    a: 'A broad religious exemption from equal-treatment laws',
    b: 'Equal-treatment law also covers businesses open to the public',
  },
  oversight: {
    title: 'Oversight',
    a: 'Oversight follows the president’s party and drops inconvenient cases',
    b: 'Subpoenas and inspectors general do not depend on who is in the White House',
  },
  maps: {
    title: 'District maps',
    a: 'The majority party in the state draws the maps',
    b: 'An independent commission draws the maps',
  },
  shutdown: {
    title: 'A shutdown',
    a: 'A shutdown is a valid way to force cuts',
    b: 'The government stays open, and the budget is argued in regular order',
  },
  israel: {
    title: 'Aid to Israel',
    a: 'Military aid with no extra conditions',
    b: 'Aid conditioned on civilian protection and a ceasefire track',
  },
  taiwan: {
    title: 'Taiwan',
    a: 'New arms packages and a clearer commitment to defend it',
    b: 'No new package: keep strategic ambiguity',
  },
  defense: {
    title: 'The Pentagon budget',
    a: 'Real growth in the defense budget',
    b: 'Cut it and spend the money at home',
  },
}

const enBills: Record<string, { name: string; summary: string }> = {
  'tax-cuts': {
    name: 'Extend the rate cuts',
    summary: 'Extend the current income-tax cuts and do not raise the rate on high incomes.',
  },
  aca: {
    name: 'Keep the ACA subsidies',
    summary: 'Keep the enhanced insurance subsidies and do not shrink Medicaid in this budget.',
  },
  deport: {
    name: 'Fund mass deportations',
    summary: 'Dedicated money for mass deportations and a closed asylum path.',
  },
  abortion: {
    name: 'A federal right to abortion',
    summary: 'A statute that writes a nationwide right to abortion and limits state bans.',
  },
  ukraine: {
    name: 'Aid to Ukraine',
    summary: 'A new military-aid package until there is a ceasefire that can be defended.',
  },
  ceiling: {
    name: 'A clean debt-ceiling increase',
    summary: 'Raise the debt ceiling with no attached cuts, so the Treasury does not reach a default.',
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

export function billText(locale: Locale, id: string) {
  const source = bills.find((item) => item.id === id)
  if (locale === 'en') return enBills[id] ?? { name: source?.name ?? id, summary: source?.summary ?? '' }
  return { name: source?.name ?? id, summary: source?.summary ?? '' }
}

export function seatsWord(locale: Locale, n: number) {
  if (locale === 'en') return Math.abs(n) === 1 ? 'seat' : 'seats'
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return 'мест'
  if (last === 1) return 'место'
  if (last >= 2 && last <= 4) return 'места'
  return 'мест'
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
  originalBefore: string
  originalName: string
  originalAfter: string
  originalHref: string
  compassBeforeTitle: string
  compassBeforeLead: string
  next: string
  noOpinion: string
  valEmpty: string
  valMid: string
  valNear: (side: string) => string
  valClear: (side: string) => string
  valFull: (side: string) => string
  atStake: (n: number, word: string) => string
  inSection: (current: number, total: number) => string
  sectionOf: (current: number, total: number) => string
  gives: string
  nextSection: (name: string) => string
  showHouse: string
  majorityMark: (n: number) => string
  boardByAnswers: string
  boardNoAnswers: string
  leadOut: (name: string) => string
  leadTake: (name: string) => string
  leadKeep: (name: string) => string
  leadMajority: (name: string) => string
  seatsLeft: (n: number, word: string) => string
  pendingSeats: string
  ofTotal: (n: number) => string
  wikiTitle: string
  wikiBy: string
  wikiAll: (n: number, word: string) => string
  wikiNeed: (n: number, word: string) => string
  wikiVeto: (n: number) => string
  wikiSystem: string
  wikiCap: string
  wikiLeader: string
  wikiWing: string
  wikiGot: string
  wikiShare: string
  wikiRest: string
  themesTitle: string
  themesLead: string
  ownTitle: string
  ownLead: string
  ownEmpty: string
  ownVeto: (left: string, right: string) => string
  ownHave: (total: number) => string
  ownShort: (total: number, gap: number) => string
  ownSpeaker: (name: string) => string
  ownFight: string
  billYouYes: string
  billYouNo: string
  billYouAbs: string
  billYouSkip: string
  vetoLine: (n: number) => string
  unanswered: string
  billsTitle: string
  billsLead: string
  billYes: string
  billNo: string
  billAbs: string
  billPass: string
  billFail: string
  perQuestion: (n: number) => string
  nearestLabel: string
  skippedMark: string
  howSummary: string
  reportTitle: string
  systemLabel: string
  wikiFaces: string
  questionsTitle: string
  needTheme: string
  quizSize: (questions: number, sections: number) => string
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
      'Округа делятся между разделами по важности, методом наибольших остатков. Ответы раздела решают только его округа. Пропущенный вопрос из раздела выпадает. Если в разделе нет ни одного ответа, его округа делятся как при ровной стране.',
      'Внутри раздела места двух партий считаются от их доли в двупартийном голосовании. Один пункт двигает места с эластичностью 1,35. Полмандатных пункта заложены в пользу республиканцев: так редакционно учтена география округов. Это не формула Бюро переписи.',
      'Внутри партии места делятся между крыльями. Безопасные округа сидят ближе к флангу, колеблющиеся чаще берут умеренных. Если вся страна отвечает как фланг, праймериз сдвигаются туда же.',
      'Чтобы организовать палату, нужно 218 из 435. Спикера избирает палата, не партия. Крыло, которое больше запаса большинства, может провалить кандидата. Так в январе 2023 года Кевина Маккарти избирали с 15-й попытки. Для преодоления вето нужно 290, но президент в этом тесте не голосует.',
      'Ваши ответы не выбирают одного кандидата. Они собирают палату так, как если бы страна ответила так же. Цифры на первом экране: 238 у демократов и 197 у республиканцев, округление опубликованных прогнозов начала октября 2026 года. Делёж этих мест по крыльям редакционный. Прогнозы публикуют партию, не кокус.',
    ],
    close: 'Закрыть',
    lightTheme: 'Светлая тема',
    darkTheme: 'Тёмная тема',
    language: 'Язык',
    date: '3 ноября 2026',
    introTitle: 'Соберите Палату своими ответами',
    introLead: 'Шесть разделов по шесть вопросов: цены, медицина, граница, права, власть и мир. После каждого раздела палата показывает промежуточный зал. В конце подробный отчёт: карточка итогов, голосования и каждый вопрос. Сенат и президент здесь не считаются.',
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
    weightsLead: 'Чем важнее раздел, тем больше округов из 435 он раздаёт. Раздел с отметкой «Не важно» тест пропустит. По умолчанию все шесть делят места поровну.',
    weights: ['Не важно', 'Слабо', 'Важно', 'Решающе'],
    toQuestions: 'К вопросам',
    questionOf: (current, total) => `Вопрос ${current} из ${total}`,
    option: (mark) => `Вариант ${mark}`,
    marks: ['А', 'Б'],
    answerLabel: 'Ответ',
    choices: ['Первый', 'Скорее первый', 'Середина', 'Скорее второй', 'Второй'],
    back: 'Назад',
    skip: 'Пропустить',
    keysHint: 'С клавиатуры: стрелки двигают ползунок, Home и End ставят края, 1-5 ставят деления, Enter дальше, 0 без мнения.',
    originalBefore: 'Вопросы, промежуточный зал и отчёт сделаны по образцу',
    originalName: 'Duma Simulator',
    originalAfter: '. Считается Палата представителей Соединённых Штатов, не Государственная дума.',
    originalHref: 'https://bolshoiprikol2.github.io/Duma-Simulator/ru/',
    compassBeforeTitle: 'Где стоят крылья',
    compassBeforeLead: 'Так крылья расположены до ваших ответов. В конце теста на этой же карте появится ваша точка.',
    next: 'Дальше',
    noOpinion: 'Без мнения',
    valEmpty: 'Сдвиньте ползунок к варианту, который вам ближе',
    valMid: 'Ровно посередине',
    valNear: (side) => `Немного ближе к ${side}`,
    valClear: (side) => `Заметно ближе к ${side}`,
    valFull: (side) => `Полностью за ${side}`,
    atStake: (n, word) => `${n} ${word} на кону`,
    inSection: (current, total) => `Вопрос ${current} из ${total}`,
    sectionOf: (current, total) => `Раздел ${current} из ${total}`,
    gives: 'раздаёт',
    nextSection: (name) => `Дальше: ${name}`,
    showHouse: 'Показать мою Палату',
    majorityMark: (n) => `Абсолютное большинство: ${n}`,
    boardByAnswers: 'По вашим ответам в этом разделе',
    boardNoAnswers: 'В этом разделе нет ответов: округа поделены как при ровной стране',
    leadOut: (name) => `${name} выходит вперёд`,
    leadTake: (name) => `${name} перехватывает лидерство`,
    leadKeep: (name) => `${name} сохраняет лидерство`,
    leadMajority: (name) => `${name}: абсолютное большинство`,
    seatsLeft: (n, word) => `осталось ${n} ${word}`,
    pendingSeats: 'Ещё не роздано',
    ofTotal: (n) => `из ${n}`,
    wikiTitle: 'Выборы в Палату представителей (2026)',
    wikiBy: 'по ответам на тест',
    wikiAll: (n, word) => `Все ${n} ${word} в Палате представителей`,
    wikiNeed: (n, word) => `Для большинства необходимо ${n} ${word}`,
    wikiVeto: (n) => `Для преодоления вето нужно ${n}`,
    wikiSystem: 'Одномандатные округа, один победитель',
    wikiCap: 'Распределение мест по итогам теста',
    wikiLeader: 'Лицо крыла',
    wikiWing: 'Крыло',
    wikiGot: 'Мест получено',
    wikiShare: 'Доля мест',
    wikiRest: 'Остальные',
    themesTitle: 'Места по разделам',
    themesLead: 'Нажмите раздел, чтобы подсветить его округа в зале наверху. Поменяйте важность, и палата пересчитается. Последний живой раздел выключить нельзя.',
    ownTitle: 'Своя коалиция',
    ownLead: 'Отметьте крылья, которые войдут в одно голосование за спикера.',
    ownEmpty: 'Отметьте крылья, которые голосуют вместе.',
    ownVeto: (left, right) => `«${left}» и «${right}» не собирают одно большинство.`,
    ownHave: (total) => `${total} из 435: 218 есть.`,
    ownShort: (total, gap) => `${total} из 435: до 218 не хватает ${gap}.`,
    ownSpeaker: (name) => `Спикер в этом составе: ${name}.`,
    ownFight: 'Запас меньше крыльев, которые могут провалить кандидата: спикер может не пройти с первой попытки.',
    billYouYes: 'Вы проголосовали бы за.',
    billYouNo: 'Вы проголосовали бы против.',
    billYouAbs: 'Вы скорее воздержались бы.',
    billYouSkip: 'По этому вопросу у вас нет ответа.',
    vetoLine: (n) => `Хватает и на ${n}, чтобы преодолеть вето.`,
    unanswered: 'без ответов',
    billsTitle: 'Как проголосовала бы Палата',
    billsLead: 'Шесть счетов по вашим же вопросам. Крыло голосует, если его позиция заметно по одну сторону. Счёт проходит, только если «за» набирает 218: это большинство всего состава, не только явившихся.',
    billYes: 'За',
    billNo: 'Против',
    billAbs: 'Воздержались',
    billPass: 'Проходит',
    billFail: 'Не набирает 218',
    perQuestion: (n) => `Вопрос за вопросом (${n})`,
    nearestLabel: 'Ближе всего',
    skippedMark: 'Без мнения',
    howSummary: 'Как это считается',
    reportTitle: 'Итоги выборов',
    systemLabel: 'Система',
    wikiFaces: 'Имена это лица крыла, не победители конкретных округов. Карточку удобно сохранить снимком экрана.',
    questionsTitle: 'Каждый вопрос',
    needTheme: 'Выберите хотя бы один раздел',
    quizSize: (count, sections) => {
      const word = (n: number, one: string, few: string, many: string) => {
        const abs = Math.abs(n) % 100
        const last = abs % 10
        if (abs > 10 && abs < 20) return many
        if (last === 1) return one
        if (last >= 2 && last <= 4) return few
        return many
      }
      return `${count} ${word(count, 'вопрос', 'вопроса', 'вопросов')} в ${sections} ${word(sections, 'разделе', 'разделах', 'разделах')}`
    },
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
      'Districts are split across sections by importance, by the largest-remainder method. A section’s answers decide only its districts. A skipped question drops out of its section. A section with no answers is split as an even country would split it.',
      'Inside a section, the two parties’ seats come from their share of the two-party vote. One point moves seats with an elasticity of 1.35. Half a point is built in for Republicans, an editorial nod to district geography. It is not a Census Bureau formula.',
      'Inside a party, seats are split among wings. Safe districts sit toward the flank. Swing districts more often elect moderates. If the whole country answers like a flank, the primaries move that way too.',
      'Organizing the House takes 218 of 435. The House elects the speaker, not the party. A wing larger than the majority’s cushion can vote the nominee down. That is how Kevin McCarthy was elected on the 15th ballot in January 2023. Overriding a veto takes 290, but the president does not vote in this test.',
      'Your answers do not pick a single candidate. They build a House as if the country answered the same way. The first screen uses 238 Democratic seats and 197 Republican seats, a rounding of published forecasts from early October 2026. The split of those seats among wings is editorial. Forecasts publish a party, not a caucus.',
    ],
    close: 'Close',
    lightTheme: 'Light theme',
    darkTheme: 'Dark theme',
    language: 'Language',
    date: '3 November 2026',
    introTitle: 'Build the House with your answers',
    introLead: 'Six sections of six questions: prices, health care, the border, rights, power, and the world. After each section the chamber shows a running total. At the end there is a full report: a results card, floor votes, and every question. The Senate and the presidency are not in this model.',
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
    weightsLead: 'The more a section matters, the more of the 435 districts it awards. A section marked “not important” is skipped. By default all six split the seats evenly.',
    weights: ['Not important', 'A little', 'Important', 'Decisive'],
    toQuestions: 'To the questions',
    questionOf: (current, total) => `Question ${current} of ${total}`,
    option: (mark) => `Option ${mark}`,
    marks: ['A', 'B'],
    answerLabel: 'Answer',
    choices: ['First', 'Leaning first', 'Middle', 'Leaning second', 'Second'],
    back: 'Back',
    skip: 'Skip',
    keysHint: 'Keyboard: arrows move the slider, Home and End set the ends, 1-5 set a stop, Enter continues, 0 is no opinion.',
    originalBefore: 'The questions, the scoreboard, and the report follow',
    originalName: 'Duma Simulator',
    originalAfter: '. The count is the United States House of Representatives.',
    originalHref: 'https://bolshoiprikol2.github.io/Duma-Simulator/',
    compassBeforeTitle: 'Where the wings stand',
    compassBeforeLead: 'This is the map before your answers. At the end of the test your own point appears on the same chart.',
    next: 'Next',
    noOpinion: 'No opinion',
    valEmpty: 'Move the slider toward the option you prefer',
    valMid: 'Right in the middle',
    valNear: (side) => `A little closer to ${side}`,
    valClear: (side) => `Clearly closer to ${side}`,
    valFull: (side) => `Fully for ${side}`,
    atStake: (n, word) => `${n} ${word} at stake`,
    inSection: (current, total) => `Question ${current} of ${total}`,
    sectionOf: (current, total) => `Section ${current} of ${total}`,
    gives: 'awards',
    nextSection: (name) => `Next: ${name}`,
    showHouse: 'Show my House',
    majorityMark: (n) => `Absolute majority: ${n}`,
    boardByAnswers: 'From your answers in this section',
    boardNoAnswers: 'This section has no answers: its districts are split as in an even country',
    leadOut: (name) => `${name} moves ahead`,
    leadTake: (name) => `${name} takes the lead`,
    leadKeep: (name) => `${name} keeps the lead`,
    leadMajority: (name) => `${name}: an absolute majority`,
    seatsLeft: (n, word) => `${n} ${word} left`,
    pendingSeats: 'Not yet awarded',
    ofTotal: (n) => `of ${n}`,
    wikiTitle: 'United States House of Representatives elections (2026)',
    wikiBy: 'from your answers',
    wikiAll: (n, word) => `All ${n} ${word} in the House of Representatives`,
    wikiNeed: (n, word) => `${n} ${word} are required for a majority`,
    wikiVeto: (n) => `${n} are required to override a veto`,
    wikiSystem: 'Single-member districts, one winner',
    wikiCap: 'Seats at the end of the test',
    wikiLeader: 'Face of the wing',
    wikiWing: 'Wing',
    wikiGot: 'Seats won',
    wikiShare: 'Share of seats',
    wikiRest: 'The rest',
    themesTitle: 'Seats by section',
    themesLead: 'Click a section to highlight its districts in the chamber above. Change its importance and the House is counted again. The last live section cannot be switched off.',
    ownTitle: 'Your own coalition',
    ownLead: 'Mark the wings that would vote together for one speaker.',
    ownEmpty: 'Mark the wings that vote together.',
    ownVeto: (left, right) => `${left} and ${right} do not build one majority.`,
    ownHave: (total) => `${total} of 435: 218 is there.`,
    ownShort: (total, gap) => `${total} of 435: short of 218 by ${gap}.`,
    ownSpeaker: (name) => `Speaker in this lineup: ${name}.`,
    ownFight: 'The cushion is smaller than wings that can vote a nominee down, so the speaker may not win on the first ballot.',
    billYouYes: 'You would have voted aye.',
    billYouNo: 'You would have voted no.',
    billYouAbs: 'You would most likely have voted present.',
    billYouSkip: 'You left this question unanswered.',
    vetoLine: (n) => `Also enough for ${n}, the votes to override a veto.`,
    unanswered: 'no answers',
    billsTitle: 'How the House would vote',
    billsLead: 'Six bills drawn from the same questions. A wing votes when its position is clearly on one side. A bill passes only if the ayes reach 218: a majority of the whole House, not of those who voted.',
    billYes: 'Aye',
    billNo: 'No',
    billAbs: 'Present',
    billPass: 'Passes',
    billFail: 'Short of 218',
    perQuestion: (n) => `Question by question (${n})`,
    nearestLabel: 'Closest',
    skippedMark: 'No opinion',
    howSummary: 'How this is counted',
    reportTitle: 'Election results',
    systemLabel: 'System',
    wikiFaces: 'The names are faces of a wing, not the winners of particular districts. The card is easy to save as a screenshot.',
    questionsTitle: 'Every question',
    needTheme: 'Choose at least one section',
    quizSize: (count, sections) =>
      `${count} ${count === 1 ? 'question' : 'questions'} in ${sections} ${sections === 1 ? 'section' : 'sections'}`,
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
