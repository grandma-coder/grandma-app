// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { DemoProvider, useDemo } from '../demo'
import { DemoScreen } from './index'
import { getDemoData } from '@/lib/demo'
import type { ScreenName } from '@/lib/demo/reducer'
import type { Mode } from '@/lib/modes'

const en = getDemoData('en')

function Controls() {
  const { state, dispatch } = useDemo()
  return (
    <div>
      {(['pre', 'preg', 'kids', 'meno'] as Mode[]).map((m) => (
        <button key={m} data-testid={`mode-${m}`} onClick={() => dispatch({ type: 'setMode', mode: m })}>{m}</button>
      ))}
      {(['agenda', 'week', 'profile'] as ScreenName[]).map((s) => (
        <button key={s} data-testid={`go-${s}`} onClick={() => dispatch({ type: 'openScreen', screen: s })}>{s}</button>
      ))}
      <button data-testid="kid-lua" onClick={() => dispatch({ type: 'setKid', kid: 'lua' })}>lua</button>
      <output data-testid="screen">{state.screen}</output>
    </div>
  )
}

async function setup(mode: Mode, to: ScreenName) {
  const user = userEvent.setup()
  render(
    <NextIntlClientProvider locale="en" messages={{}}>
      <DemoProvider>
        <Controls />
        <DemoScreen />
      </DemoProvider>
    </NextIntlClientProvider>,
  )
  await user.click(screen.getByTestId(`mode-${mode}`))
  await user.click(screen.getByTestId(`go-${to}`))
  return user
}

afterEach(cleanup)

const cell = (n: number) => document.querySelector(`[data-day="${n}"]`) as HTMLElement

describe('agenda', () => {
  it('renders October 2026 starting on a Thursday, with period and fertile days (pre)', async () => {
    await setup('pre', 'agenda')
    expect(screen.getByText(/October 2026/)).toBeTruthy()
    expect(document.querySelectorAll('[data-blank]')).toHaveLength(4)
    expect(document.querySelectorAll('[data-day]')).toHaveLength(31)
    for (const d of en.phases.pre.cal.per) expect(cell(d).hasAttribute('data-per')).toBe(true)
    for (const d of en.phases.pre.cal.fer) expect(cell(d).hasAttribute('data-fer')).toBe(true)
    expect(cell(30).hasAttribute('data-today')).toBe(true)
    expect(cell(1).hasAttribute('data-per')).toBe(false)
    expect(screen.getByRole('img', { name: '17, period' })).toBeTruthy()
    expect(screen.getByRole('img', { name: '30, today' })).toBeTruthy()
    expect(cell(1).getAttribute('role')).toBeNull()
  })

  it('kids: one dot per child, respecting the kid filter', async () => {
    const user = await setup('kids', 'agenda')
    expect(cell(3).querySelectorAll('[data-kid-dot]')).toHaveLength(2)
    expect(cell(1).querySelectorAll('[data-kid-dot="kenji"]')).toHaveLength(1)
    expect(screen.getByRole('img', { name: '3, Kenji, Lua' })).toBeTruthy()
    await user.click(screen.getByTestId('kid-lua'))
    expect(cell(1).querySelectorAll('[data-kid-dot]')).toHaveLength(0)
    expect(cell(2).querySelectorAll('[data-kid-dot="lua"]')).toHaveLength(1)
  })
})

describe('week', () => {
  it('pre: tapping a wheel day changes the centre', async () => {
    const user = await setup('pre', 'week')
    const centre = () => screen.getByTestId('wheel-centre')
    expect(screen.getByRole('button', { name: 'Day 14, Ovulation' }).getAttribute('aria-current')).toBe('date')
    expect(centre().textContent).toContain('14')
    expect(centre().textContent).toContain(en.cyc.ovu.name)
    await user.click(screen.getByRole('button', { name: 'Day 3, Period' }))
    expect(centre().textContent).toContain('3')
    expect(centre().textContent).toContain(en.cyc.per.name)
    expect(centre().textContent).not.toContain(en.ui.cycle.todayPrefix.trim())
  })

  it('preg: hearts for kicks', async () => {
    await setup('preg', 'week')
    expect(within(screen.getByTestId('kicks')).getAllByTestId('heart')).toHaveLength(43)
    expect(screen.getByText(en.ui.charts.pregTiles.gainValue)).toBeTruthy()
    expect(screen.getByRole('img', { name: /Kicks per day.*M 10/ }) ).toBeTruthy()
    expect(screen.getByRole('img', { name: /Weight gain/ })).toBeTruthy()
  })

  it('kids: nights, plate and feeds follow the kid filter', async () => {
    const user = await setup('kids', 'week')
    expect(screen.getByText(en.ui.charts.plateTitle)).toBeTruthy()
    expect(screen.getByRole('img', { name: /Kenji’s plate: Protein 28%/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Nights/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Lua’s feeds/ })).toBeTruthy()
    expect(document.querySelectorAll('[data-night="kenji"]')).toHaveLength(7)
    expect(document.querySelectorAll('[data-night="lua"]')).toHaveLength(7)
    await user.click(screen.getByTestId('kid-lua'))
    expect(screen.queryByText(en.ui.charts.plateTitle)).toBeNull()
    expect(document.querySelectorAll('[data-night="kenji"]')).toHaveLength(0)
    expect(document.querySelectorAll('[data-night="lua"]')).toHaveLength(7)
    expect(screen.getByText(en.ui.charts.feedsTitle)).toBeTruthy()
  })

  it('meno: heat grid and weekly trend', async () => {
    await setup('meno', 'week')
    expect(within(screen.getByTestId('heat')).getAllByTestId('flame')).toHaveLength(9)
    expect(within(screen.getByTestId('trend')).getAllByTestId('flame')).toHaveLength(38)
    expect(screen.getByText(en.ui.charts.menoTiles.dropValue)).toBeTruthy()
    expect(screen.getByRole('img', { name: /When they show up/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Hot flashes per week.*W1 9/ })).toBeTruthy()
  })
})

describe('profile', () => {
  it('lists items that open their screen', async () => {
    const user = await setup('kids', 'profile')
    expect(screen.getByText(en.ui.user)).toBeTruthy()
    for (const it of en.ui.profile.items) expect(screen.getByRole('button', { name: new RegExp(it.title) })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: new RegExp(en.ui.profile.items[0].title) }))
    expect(screen.getByTestId('screen').textContent).toBe(en.ui.profile.items[0].screen)
  })
})
