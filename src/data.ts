// Редакционные позиции крыльев Палаты представителей перед выборами 3 ноября 2026.
// Это не прогноз конкретного округа и не калькулятор FEC: оценка по тому,
// как крыло голосует и с кем оно готово избирать спикера.

export type Side = 'D' | 'R' | 'I'

export type Party = {
  id: string
  name: string
  en: string
  leader: string
  color: string
  side: Side
  poll: number
  lr: number
  fit: string[]
  organize: boolean
}

export type Theme = {
  id: string
  name: string
  hint: string
}

export type Question = {
  id: string
  theme: string
  title: string
  a: string
  b: string
  /** Куда тянет вариант Б по горизонтали: +1 рынок и ограничения, −1 расходы и регулирование. */
  x: number
  /** Куда тянет вариант Б по вертикали: +1 институты и союзы, −1 популистское большинство. */
  y: number
  stance: Record<string, number>
}

export const SEAT_COUNT = 435
export const MAJORITY = 218
/** Доля независимых по стране, с которой модель начинает отдавать им округа. Ниже голос сгорает. */
export const THIRD_PARTY_FLOOR = 0.25

export const demIds = ['prog', 'dem', 'modd']
export const gopIds = ['modr', 'gop', 'hfc']

export const themes: Theme[] = [
  { id: 'money', name: 'Цены и налоги', hint: 'Тарифы, ставки, стоимость жизни' },
  { id: 'care', name: 'Медицина и пособия', hint: 'ACA, лекарства, Social Security' },
  { id: 'border', name: 'Граница', hint: 'Депортации, визы, города' },
  { id: 'rights', name: 'Права', hint: 'Аборты, оружие, школы' },
  { id: 'power', name: 'Власть', hint: 'Минюст, суд, правила палаты' },
  { id: 'world', name: 'Мир', hint: 'Украина, Китай, союзы' },
]

export const weightLevels = [
  { id: 0, name: 'Не важно', w: 0 },
  { id: 1, name: 'Слабо', w: 1 },
  { id: 2, name: 'Важно', w: 2.2 },
  { id: 3, name: 'Решающе', w: 4 },
] as const

export const parties: Party[] = [
  {
    id: 'prog',
    name: 'Прогрессисты',
    en: 'Progressives',
    leader: 'Александрия Окасио-Кортес',
    color: '#4338CA',
    side: 'D',
    poll: 34,
    lr: 1.2,
    fit: ['jud', 'rules'],
    organize: true,
  },
  {
    id: 'dem',
    name: 'Демократы',
    en: 'Democrats',
    leader: 'Хаким Джеффрис',
    color: '#1D4ED8',
    side: 'D',
    poll: 184,
    lr: 3.1,
    fit: ['speaker', 'leader', 'whip', 'rules', 'approps', 'ways', 'jud'],
    organize: true,
  },
  {
    id: 'modd',
    name: 'Умеренные демократы',
    en: 'Moderate Democrats',
    leader: 'Джош Готхаймер',
    color: '#38BDF8',
    side: 'D',
    poll: 20,
    lr: 4.5,
    fit: ['approps', 'ways', 'armed'],
    organize: true,
  },
  {
    id: 'ind',
    name: 'Независимые',
    en: 'Independents',
    leader: 'нет общего лидера',
    color: '#A16207',
    side: 'I',
    poll: 0,
    lr: 5.1,
    fit: [],
    organize: true,
  },
  {
    id: 'modr',
    name: 'Умеренные республиканцы',
    en: 'Moderate Republicans',
    leader: 'Брайан Фицпатрик',
    color: '#FB7185',
    side: 'R',
    poll: 18,
    lr: 6.3,
    fit: ['approps', 'armed', 'ways'],
    organize: true,
  },
  {
    id: 'gop',
    name: 'Республиканцы',
    en: 'Republicans',
    leader: 'Майк Джонсон',
    color: '#DC2626',
    side: 'R',
    poll: 124,
    lr: 7.7,
    fit: ['speaker', 'leader', 'whip', 'rules', 'approps', 'ways', 'jud', 'armed'],
    organize: true,
  },
  {
    id: 'hfc',
    name: 'Кокус свободы',
    en: 'Freedom Caucus',
    leader: 'Джим Джордан',
    color: '#7F1D1D',
    side: 'R',
    poll: 55,
    lr: 9.3,
    fit: ['jud', 'rules'],
    organize: true,
  },
]

/** Пары, которые в этой кампании не собирают одно большинство для спикера. Редакционная оценка. */
export const vetoPairs: [string, string][] = [
  ['prog', 'hfc'],
  ['prog', 'gop'],
  ['prog', 'modr'],
  ['dem', 'hfc'],
  ['dem', 'gop'],
  ['dem', 'modr'],
  ['modd', 'hfc'],
  ['modd', 'gop'],
  ['ind', 'prog'],
  ['ind', 'hfc'],
]

const speakerWings = new Set(['prog', 'dem', 'gop', 'hfc'])

export function partyById(id: string) {
  const party = parties.find((item) => item.id === id)
  if (!party) throw new Error(`unknown party ${id}`)
  return party
}

export function canBeSpeaker(id: string) {
  return speakerWings.has(id)
}

function stance(row: number[]): Record<string, number> {
  const ids = ['prog', 'dem', 'modd', 'ind', 'modr', 'gop', 'hfc']
  return Object.fromEntries(ids.map((id, index) => [id, row[index]]))
}

// Строка позиции: prog dem modd ind modr gop hfc
// −1 = вариант А, +1 = вариант Б
export const questions: Question[] = [
  {
    id: 'taxes',
    theme: 'money',
    title: 'Налоги',
    a: 'Продлить снижения ставок и урезать их ещё',
    b: 'Поднять налоги на высокие доходы и корпорации',
    x: -0.9,
    y: 0.15,
    stance: stance([0.95, 0.8, 0.25, 0.05, -0.4, -0.8, -0.9]),
  },
  {
    id: 'tariffs',
    theme: 'money',
    title: 'Пошлины',
    a: 'Держать широкие пошлины, даже если цены растут',
    b: 'Снимать пошлины там, где они дорожают жизнь',
    x: 0.35,
    y: 0.75,
    stance: stance([0.2, 0.7, 0.55, 0.25, 0.5, -0.15, -0.95]),
  },
  {
    id: 'prices',
    theme: 'money',
    title: 'Цены',
    a: 'Инфляция от расходов: резать бюджет',
    b: 'Антимонопольные дела, жильё и помощь, если ударит шок',
    x: -0.7,
    y: 0.1,
    stance: stance([0.9, 0.65, 0.2, 0, -0.25, -0.7, -0.9]),
  },
  {
    id: 'aca',
    theme: 'care',
    title: 'Медицинская страховка',
    a: 'Дать расширенным субсидиям ACA истечь и ужать Medicaid',
    b: 'Сохранить субсидии и расширить покрытие',
    x: -0.85,
    y: 0.2,
    stance: stance([1, 0.9, 0.4, 0.1, -0.2, -0.75, -0.95]),
  },
  {
    id: 'social',
    theme: 'care',
    title: 'Social Security и Medicare',
    a: 'Поднять возраст и замедлить рост выплат',
    b: 'Не трогать выплаты, добрать налог с высоких зарплат',
    x: -0.65,
    y: 0.4,
    stance: stance([0.9, 0.85, 0.55, 0.2, 0.05, -0.5, -0.75]),
  },
  {
    id: 'drugs',
    theme: 'care',
    title: 'Цены на лекарства',
    a: 'Цену задают рынок и патент',
    b: 'Medicare торгуется и ставит потолок',
    x: -0.55,
    y: 0.15,
    stance: stance([1, 0.9, 0.55, 0.3, 0.1, -0.45, -0.8]),
  },
  {
    id: 'border',
    theme: 'border',
    title: 'Депортации',
    a: 'Массовые депортации и закрытый путь для убежища',
    b: 'Охрана границы плюс легальный путь и разбор убежища',
    x: -0.75,
    y: 0.15,
    stance: stance([0.95, 0.7, 0.1, -0.05, -0.4, -0.85, -1]),
  },
  {
    id: 'visas',
    theme: 'border',
    title: 'Легальная иммиграция',
    a: 'Сокращать легальную иммиграцию, включая рабочие визы',
    b: 'Расширять легальную иммиграцию',
    x: 0.2,
    y: 0.45,
    stance: stance([0.35, 0.6, 0.45, 0.15, 0.4, -0.2, -0.9]),
  },
  {
    id: 'cities',
    theme: 'border',
    title: 'Города-убежища',
    a: 'Забирать федеральные деньги у городов, которые не помогают депортациям',
    b: 'Иммиграция это федеральное дело, города за местную полицию не наказывать',
    x: -0.5,
    y: 0.4,
    stance: stance([0.9, 0.75, 0.15, 0, -0.25, -0.75, -1]),
  },
  {
    id: 'abortion',
    theme: 'rights',
    title: 'Аборты',
    a: 'Федерального права нет: штат может запретить, федеральные деньги не участвуют',
    b: 'Конгресс фиксирует право на аборт по всей стране',
    x: -0.8,
    y: 0.2,
    stance: stance([1, 0.9, 0.3, 0, -0.25, -0.8, -1]),
  },
  {
    id: 'guns',
    theme: 'rights',
    title: 'Оружие',
    a: 'Взаимное признание разрешений и никаких новых запретов',
    b: 'Общая проверка покупателя и запрет штурмовых винтовок',
    x: -0.7,
    y: 0.05,
    stance: stance([1, 0.85, 0.2, 0, -0.3, -0.85, -1]),
  },
  {
    id: 'schools',
    theme: 'rights',
    title: 'Школы',
    a: 'Программу решают родители и штат, включая темы пола и расы',
    b: 'Федеральные правила защищают учеников, в том числе ЛГБТК',
    x: -0.6,
    y: 0.1,
    stance: stance([0.95, 0.8, 0.15, 0, -0.35, -0.8, -1]),
  },
  {
    id: 'doj',
    theme: 'power',
    title: 'Министерство юстиции',
    a: 'Президент руководит Минюстом и увольняет тех, кто мешает программе',
    b: 'Минюст и гражданская служба не подчиняются Белому дому',
    x: -0.15,
    y: 0.95,
    stance: stance([0.65, 0.9, 0.75, 0.4, 0.55, -0.4, -1]),
  },
  {
    id: 'courts',
    theme: 'power',
    title: 'Верховный суд',
    a: 'Менять суд под выборы: больше судей или урезание юрисдикции',
    b: 'Размер и независимость суда не трогать',
    x: 0.25,
    y: 0.85,
    stance: stance([-0.8, -0.1, 0.55, 0.45, 0.55, 0.9, -0.15]),
  },
  {
    id: 'floor',
    theme: 'power',
    title: 'Правила палаты',
    a: 'Большинство закрывает поправки и само пишет повестку',
    b: 'Члены обеих партий могут выносить законопроекты на голосование',
    x: 0.05,
    y: 0.9,
    stance: stance([0.15, -0.3, 0.8, 0.5, 0.85, -0.65, -0.2]),
  },
  {
    id: 'ukraine',
    theme: 'world',
    title: 'Украина',
    a: 'Сворачивать военную помощь: пусть платит Европа',
    b: 'Держать помощь, пока не будет обороноспособного прекращения огня',
    x: 0.1,
    y: 0.85,
    stance: stance([0.2, 0.85, 0.65, 0.2, 0.7, 0.15, -0.9]),
  },
  {
    id: 'china',
    theme: 'world',
    title: 'Китай',
    a: 'Развязка: пошлины, запрет технологий и флот против Пекина',
    b: 'Соревноваться, но не рвать торговлю и не идти курсом на войну',
    x: -0.45,
    y: 0.35,
    stance: stance([0.6, 0.3, -0.05, 0.05, -0.2, -0.75, -0.9]),
  },
  {
    id: 'nato',
    theme: 'world',
    title: 'Союзы',
    a: 'Союзники нахлебники. Сворачивать обязательства перед НАТО',
    b: 'НАТО и союзы в Тихом океане стоят своих денег',
    x: 0.05,
    y: 0.95,
    stance: stance([0.25, 0.85, 0.7, 0.35, 0.8, 0.4, -0.9]),
  },
]

export const posts: { id: string; name: string }[] = [
  { id: 'speaker', name: 'Спикер' },
  { id: 'leader', name: 'Лидер большинства' },
  { id: 'whip', name: 'Главный организатор' },
  { id: 'rules', name: 'Комитет по правилам' },
  { id: 'approps', name: 'Ассигнования' },
  { id: 'ways', name: 'Доходы и бюджет' },
  { id: 'jud', name: 'Юридический комитет' },
  { id: 'armed', name: 'Вооружённые силы' },
]
