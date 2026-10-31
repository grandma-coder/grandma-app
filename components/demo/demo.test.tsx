// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { DemoProvider, useDemo } from './demo'
import { DemoDevice } from './device'
import { getDemoData } from '@/lib/demo'
import type { Mode } from '@/lib/modes'

const en = getDemoData('en')
const pt = getDemoData('pt')

function Controls() {
  const { state, dispatch } = useDemo()
  return (
    <div>
      {(['pre', 'preg', 'kids', 'meno'] as Mode[]).map((m) => (
        <button key={m} data-testid={`mode-${m}`} onClick={() => dispatch({ type: 'setMode', mode: m })}>{m}</button>
      ))}
      <output data-testid="screen">{state.screen}</output>
      <output data-testid="tour">{state.tour.step}</output>
    </div>
  )
}

function setup(locale: 'en' | 'pt' = 'en') {
  const user = userEvent.setup()
  render(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <DemoProvider>
        <Controls />
        <DemoDevice />
      </DemoProvider>
    </NextIntlClientProvider>,
  )
  return user
}

afterEach(cleanup)

describe('demo home', () => {
  it('the date label is the demo date (Friday, Oct 30), not the real clock', () => {
    setup()
    expect(screen.getByTestId('home-date').textContent).toBe('Friday, Oct 30')
    cleanup()
    setup('pt')
    expect(screen.getByTestId('home-date').textContent).toBe('sexta-feira, 30 de out.')
  })
  it('pre: the goal switch changes the hero', async () => {
    const user = setup()
    await user.click(screen.getByTestId('mode-pre'))
    expect(screen.getByText('fertile phase')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: en.ui.home.goalTtc }))
    expect(screen.getByText('fertile window')).toBeTruthy()
    expect(screen.queryByText('fertile phase')).toBeNull()
  })

  it('kids: duo cards and the kid switch filters Today', async () => {
    const user = setup()
    const today = () => screen.getByTestId('today')
    expect(screen.getByText(en.phases.kids.kidHero!.kenji.em)).toBeTruthy()
    expect(screen.getByText(en.phases.kids.kidHero!.lua.em)).toBeTruthy()
    expect(within(today()).getAllByRole('listitem')).toHaveLength(5)
    await user.click(screen.getByRole('button', { name: new RegExp(`^${en.kids.lua.name}$`) }))
    const rows = within(today()).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    rows.forEach((r) => expect(r.textContent).toContain(en.kids.lua.name))
    await user.click(screen.getByRole('button', { name: en.ui.all }))
    expect(within(today()).getAllByRole('listitem')).toHaveLength(5)
  })

  it('preg: size card follows the week slider', async () => {
    setup()
    fireEvent.click(screen.getByTestId('mode-preg'))
    const slider = screen.getByRole('slider', { name: en.ui.size.sliderAria })
    expect(screen.getByText(en.ui.size.here)).toBeTruthy()
    expect(screen.getByText(`About the size of ${en.weeks[4].name}`)).toBeTruthy()
    fireEvent.change(slider, { target: { value: '1' } })
    expect(screen.getByText(`About the size of ${en.weeks[1].name}`)).toBeTruthy()
    expect(screen.getByText(`Week ${en.weeks[1].week}`)).toBeTruthy()
  })

  it('renders pt copy under the pt locale', () => {
    setup('pt')
    expect(screen.getByText(pt.ui.home.today)).toBeTruthy()
  })
})

describe('log sheet', () => {
  it('tapping a chip opens the sheet', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /^Food$/ }))
    expect(screen.getByRole('dialog', { name: 'Log food' })).toBeTruthy()
  })

  it('saving a pick adds a Today row with the chosen label and closes the sheet', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /^Food$/ }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Fruit/ }))
    await user.click(within(dialog).getByRole('button', { name: en.ui.save }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const rows = within(screen.getByTestId('today')).getAllByRole('listitem')
    expect(rows).toHaveLength(6)
    expect(rows[0].textContent).toContain('fruit')
    expect(screen.getByTestId('tour').textContent).toBe('1')
    expect(screen.getByText(en.ui.log.saved)).toBeTruthy()
  })

  it('milestones say Saved! and keep memories', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /^Milestone$/ }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: en.ui.save }))
    expect(screen.getByText(en.ui.log.milestoneSaved)).toBeTruthy()
  })

  it('renders a typed note as literal text', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /^Food$/ }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByPlaceholderText(en.ui.log.notePlaceholder), 'a <b>bold</b> move')
    await user.click(within(dialog).getByRole('button', { name: en.ui.save }))
    const first = within(screen.getByTestId('today')).getAllByRole('listitem')[0]
    expect(first.textContent).toContain('a <b>bold</b> move')
    expect(first.querySelectorAll('b')).toHaveLength(1) // only the row label, not the typed one
  })

  it('range chips show the value and save it with the unit', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /^Sleep$/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('slider'), { target: { value: '8.5' } })
    await user.click(within(dialog).getByRole('button', { name: en.ui.save }))
    expect(within(screen.getByTestId('today')).getAllByRole('listitem')[0].textContent).toContain('8.5h')
  })
})

describe('sheet focus', () => {
  it('moves focus into the dialog, Escape closes it and focus returns to the chip', async () => {
    const user = setup()
    const chip = screen.getByRole('button', { name: /^Food$/ })
    await user.click(chip)
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(chip)
  })
})

describe('css', () => {
  it('the button reset is :where()-scoped so component classes win', () => {
    const css = readFileSync('components/demo/demo.module.css', 'utf8')
    expect(css).toMatch(/:where\(\.device\) button\s*\{/)
    expect(css).not.toMatch(/^\.device button/m)
  })
})

describe('tab bar and sheets', () => {
  it('tabs dispatch screen changes and the tour', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: en.ui.tabs.agenda }))
    expect(screen.getByTestId('screen').textContent).toBe('agenda')
    await user.click(screen.getByRole('button', { name: en.ui.tabs.home }))
    expect(screen.getByTestId('screen').textContent).toBe('home')
  })

  it('the week tab advances the tour only after the log step', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: /^Food$/ }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: en.ui.save }))
    await user.click(screen.getByRole('button', { name: en.ui.tabs.week }))
    expect(screen.getByTestId('screen').textContent).toBe('week')
    expect(screen.getByTestId('tour').textContent).toBe('2')
  })

  it('the centre button opens shortcuts and tours', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: en.ui.tabs.shortcuts }))
    expect(screen.getByRole('dialog', { name: en.ui.shortcuts.title })).toBeTruthy()
  })

  it('quick access opens a feature screen id', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: new RegExp(en.ui.screens.vaccines.title) }))
    expect(screen.getByTestId('screen').textContent).toBe('vaccines')
  })
})
