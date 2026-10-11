// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

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
    for (let step = 0; step < 18; step += 1) {
      const choice = await screen.findByRole('radio', { name: /Середина/ })
      await act(async () => {
        fireEvent.click(choice)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
    expect(await screen.findByText('Ваша Палата')).toBeTruthy()
    expect(screen.getByText(/Ближе всего к ответам/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Кто собирает 218' })).toBeTruthy()
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
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(screen.getByText('Вопрос 2 из 18')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: '3 Середина' }))
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(screen.getByText('Вопрос 1 из 18')).toBeTruthy()
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
    expect(screen.getByText('Вопрос 1 из 18')).toBeTruthy()
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
    expect(screen.getByText('Вопрос 18 из 18')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Союзы' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('NaN')
  })

  it('подпись «Скопировано» гаснет', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Сразу к вопросам' }))
    for (let step = 0; step < 18; step += 1) {
      const choice = await screen.findByRole('radio', { name: /Середина/ })
      await act(async () => {
        fireEvent.click(choice)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
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
