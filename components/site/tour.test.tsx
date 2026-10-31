// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/messages/en.json'
import pt from '@/messages/pt.json'

vi.mock('@/lib/waitlist/action', () => ({ joinWaitlist: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
  usePathname: () => '/',
  useRouter: () => ({ replace: () => {} }),
}))

import { useDemo, type DemoContextValue } from '@/components/demo/demo'
import { SiteShell } from './site-shell'
import { Hero } from './hero'
import { Tour } from './tour'
import { useMobileUi, type MobileUi } from './mobile-context'
import { MODES_ID } from './ids'

const realMatchMedia = window.matchMedia
const realRaf = window.requestAnimationFrame
const realCaf = window.cancelAnimationFrame
const t = en.v3.tour

let demo: DemoContextValue
let ui: MobileUi
function Grab() { demo = useDemo(); ui = useMobileUi(); return null }

let queue: Map<number, FrameRequestCallback>
let nextId: number
let below: boolean
const flush = () => act(() => {
  const run = [...queue.values()]
  queue.clear()
  run.forEach((cb) => cb(0))
})

function mockMedia(small: boolean, reduce = true) {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('max-width') ? small : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {},
  })) as unknown as typeof window.matchMedia
}

function setup(locale: 'en' | 'pt' = 'en') {
  render(
    <NextIntlClientProvider locale={locale} messages={locale === 'pt' ? pt : en}>
      <SiteShell><Hero /><Tour /><Grab /></SiteShell>
    </NextIntlClientProvider>,
  )
  flush()
}

beforeEach(() => {
  queue = new Map(); nextId = 1; below = false
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => { queue.set(nextId, cb); return nextId++ }) as typeof window.requestAnimationFrame
  window.cancelAnimationFrame = ((id: number) => { queue.delete(id) }) as typeof window.cancelAnimationFrame
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const top = below && this.closest('[data-tour], #modes') ? 2000 : 200
    return { left: 100, top, width: 80, height: 40, right: 180, bottom: top + 40, x: 100, y: top, toJSON() {} } as DOMRect
  })
  mockMedia(false)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.matchMedia = realMatchMedia
  window.requestAnimationFrame = realRaf
  window.cancelAnimationFrame = realCaf
})

const coach = () => document.querySelector('[data-coach]') as HTMLElement
const hit = () => [...document.querySelectorAll('.tour-hit')]

describe('Tour', () => {
  it('shows the step text from the reducer, with progress and a skip button', () => {
    setup()
    expect(screen.getByText(t.log)).toBeTruthy()
    expect(screen.getByText('1 of 5')).toBeTruthy()
    expect(screen.getByRole('button', { name: t.skip }).tagName).toBe('BUTTON')
    expect(coach().dataset.on).toBe('true')
    act(() => demo.dispatch({ type: 'tourDone', key: 'log' }))
    flush()
    expect(screen.getByText(t.week)).toBeTruthy()
    expect(screen.getByText('2 of 5')).toBeTruthy()
  })

  it('reads the Portuguese copy', () => {
    setup('pt')
    expect(screen.getByText(pt.v3.tour.log)).toBeTruthy()
    expect(screen.getByText('1 de 5')).toBeTruthy()
  })

  it('keeps the arrow and halo out of the accessibility tree and announces the step text politely', () => {
    setup()
    expect(coach().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(coach().querySelector('[data-halo]')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText(t.log).closest('[aria-live]')?.getAttribute('aria-live')).toBe('polite')
  })

  it('moves the breathing class to the next target and removes it at the end', () => {
    setup()
    const chip = document.querySelector('#phone [data-tour="log"]')!
    expect(hit()).toEqual([chip])
    act(() => demo.dispatch({ type: 'tourDone', key: 'log' }))
    flush()
    expect(hit()).toEqual([document.querySelector('#phone [data-tour="week"]')])
    act(() => demo.dispatch({ type: 'tourDone', key: 'week' }))
    flush()
    const modes = document.querySelectorAll(`#${MODES_ID} button`)
    expect(hit()).toEqual([[...modes].find((b) => b.getAttribute('aria-pressed') !== 'true')])
    act(() => demo.dispatch({ type: 'skipTour' }))
    flush()
    expect(hit()).toEqual([])
  })

  it('hides the note while a sheet or a phone panel is open', () => {
    setup()
    act(() => demo.dispatch({ type: 'openSheet', sheet: { kind: 'shortcuts' } }))
    flush()
    expect(coach().dataset.on).toBe('false')
    expect(hit()).toEqual([])
    act(() => demo.dispatch({ type: 'closeSheet' }))
    flush()
    expect(coach().dataset.on).toBe('true')
    act(() => ui.openExplore())
    flush()
    expect(coach().dataset.on).toBe('false')
    act(() => ui.close())
    flush()
    expect(coach().dataset.on).toBe('true')
  })

  it('hides the note when the target is off screen and offers "Try the app" when it is below', async () => {
    below = true
    setup()
    expect(coach().dataset.on).toBe('false')
    const pill = screen.getByRole('button', { name: en.v3.mobile.goTry })
    expect(pill.dataset.on).toBe('true')
    const scroll = vi.fn()
    document.getElementById(MODES_ID)!.scrollIntoView = scroll
    await userEvent.click(pill)
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    below = false
    flush()
    expect(pill.dataset.on).toBe('false')
    expect(coach().dataset.on).toBe('true')
  })

  it('does not offer the pill on the last step', () => {
    setup()
    for (const key of ['log', 'week', 'mode', 'shortcuts'] as const) act(() => demo.dispatch({ type: 'tourDone', key }))
    below = true
    flush()
    expect(screen.getByRole('button', { name: en.v3.mobile.goTry }).dataset.on).toBe('false')
  })

  it('ends on skip', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: t.skip }))
    expect(demo.state.tour.active).toBe(false)
    expect(coach()).toBeNull()
    expect(screen.queryByRole('button', { name: en.v3.mobile.goTry })).toBeNull()
  })

  it('ends when the visitor joins', () => {
    setup()
    act(() => demo.dispatch({ type: 'joined' }))
    expect(coach()).toBeNull()
    expect(hit()).toEqual([])
  })

  it('stops its animation-frame loop once the tour is over, and pauses while the tab is hidden', () => {
    setup()
    expect(queue.size).toBe(1)
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(queue.size).toBe(0)
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(queue.size).toBe(1)
    act(() => demo.dispatch({ type: 'skipTour' }))
    expect(queue.size).toBe(0)
    flush(); flush()
    expect(queue.size).toBe(0)
  })

  it('reads one rect per frame and writes no styles or classes while nothing changes', () => {
    setup()
    flush()
    const halo = coach().querySelector('[data-halo]') as HTMLElement
    // sentinels: any write from the loop would overwrite them
    halo.style.left = '1px'
    coach().dataset.on = 'x'
    const toggle = vi.spyOn(Object.getPrototypeOf(coach().classList) as DOMTokenList, 'toggle')
    const rect = vi.mocked(HTMLElement.prototype.getBoundingClientRect)
    rect.mockClear()
    flush(); flush(); flush()
    expect(rect).toHaveBeenCalledTimes(3)
    expect(halo.style.left).toBe('1px')
    expect(coach().dataset.on).toBe('x')
    expect(toggle).not.toHaveBeenCalled()
    // a moved target is picked up on the next frame
    below = true
    flush()
    expect(coach().dataset.on).toBe('false')
  })

  it('cancels its loop on unmount', () => {
    setup()
    cleanup()
    expect(queue.size).toBe(0)
    expect(hit()).toEqual([])
  })

  it('puts the breathing class back when a re-render overwrites the target className', () => {
    setup()
    const chip = document.querySelector('#phone [data-tour="log"]') as HTMLElement
    expect(chip.classList.contains('tour-hit')).toBe(true)
    chip.className = 'rewritten'
    flush()
    expect(chip.classList.contains('tour-hit')).toBe(true)
    expect(chip.classList.contains('rewritten')).toBe(true)
  })

  it('calls showPhone once on a double tap of the pill (phones)', () => {
    vi.useFakeTimers()
    try {
      mockMedia(true)
      below = true
      setup()
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
      document.getElementById(MODES_ID)!.scrollIntoView = vi.fn()
      const pill = screen.getByRole('button', { name: en.v3.mobile.goTry })
      act(() => { pill.click(); pill.click() })
      act(() => { vi.advanceTimersByTime(500) })
      // showPhone scrolls only when #modes is out of place; with the mocked rect (top 2000) it does, once
      expect(spy).toHaveBeenCalledTimes(1)
    } finally { vi.useRealTimers() }
  })
})
