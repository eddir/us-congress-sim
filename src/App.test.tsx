// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { questions, themes } from './data'

async function answerMiddle() {
  fireEvent.click(screen.getByRole('radio', { name: /Середина/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Дальше' }))
}

async function finishQuiz() {
  const perTheme = questions.length / themes.length
  for (let step = 0; step < questions.length; step += 1) {
    await answerMiddle()
    if ((step + 1) % perTheme !== 0) continue
    expect(await screen.findByText(/раздаёт/)).toBeTruthy()
    const last = step === questions.length - 1
    fireEvent.click(screen.getByRole('button', { name: last ? 'Показать мою Палату' : /Дальше:/ }))
  }
}

beforeEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.lang = 'ru'
  document.documentElement.dir = 'ltr'
  document.documentElement.classList.remove('dark')
  window.scrollTo = () => {}
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
    onchange: null,
  })) as unknown as typeof window.matchMedia
})

describe('симулятор', () => {
  it('проходит путь от прогноза до Палаты', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Соберите Палату своими ответами' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Сразу к вопросам' }))
    await finishQuiz()
    expect(await screen.findByText('Ваша Палата')).toBeTruthy()
    expect(screen.getByText(/Ближе всего к ответам/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Кто собирает 218' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Итоги выборов' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Места по разделам' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Как проголосовала бы Палата' })).toBeTruthy()
    expect(screen.getAllByText(/Вопрос за вопросом/).length).toBe(themes.length)
    expect(screen.getByText(/Совпадение \d/)).toBeTruthy()
    expect(screen.queryByText(/% \./)).toBeNull()
  })

  it('Назад отменяет ещё не случившийся переход', async () => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false
      },
      onchange: null,
    })) as unknown as typeof window.matchMedia
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Сразу к вопросам' }))
    fireEvent.click(screen.getByRole('radio', { name: '3 Середина' }))
    fireEvent.click(screen.getByRole('button', { name: 'Дальше' }))
    expect(screen.getByText('Вопрос 2 из 6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    expect(screen.getByText('Вопрос 1 из 6')).toBeTruthy()
    expect(screen.getByRole('radio', { name: '3 Середина' }).getAttribute('aria-checked')).toBe('true')
  })

  it('Escape в окне метода не пропускает вопрос', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Сразу к вопросам' }))
    fireEvent.click(screen.getByRole('button', { name: 'Как считается' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      await new Promise((resolve) => setTimeout(resolve, 40))
    })
    expect(screen.getByText('Вопрос 1 из 6')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Ваша Палата' })).toBeNull()
  })

  it('битое сохранение не ломает вопросы', () => {
    localStorage.setItem('house-2026-v1', JSON.stringify({
      phase: 'questions',
      index: 99,
      answers: { taxes: 99, tariffs: 'нет' },
      weights: { money: 9, care: 0 },
    }))
    render(<App />)
    expect(screen.getByText('Вопрос 6 из 6')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Бюджет Пентагона' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('NaN')
  })

  it('подпись «Скопировано» гаснет', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Сразу к вопросам' }))
    await finishQuiz()
    fireEvent.click(await screen.findByRole('button', { name: 'Скопировать расклад' }))
    expect(await screen.findByRole('button', { name: 'Скопировано' })).toBeTruthy()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2400))
    })
    expect(screen.getByRole('button', { name: 'Скопировать расклад' })).toBeTruthy()
  })

  it('переключается на английский', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByRole('heading', { name: 'Build the House with your answers' })).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    fireEvent.click(screen.getByRole('button', { name: 'RU' }))
    expect(screen.getByRole('heading', { name: 'Соберите Палату своими ответами' })).toBeTruthy()
  })
})
