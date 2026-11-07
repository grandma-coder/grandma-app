// @vitest-environment happy-dom
import type { Dispatch } from 'react'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDemoData } from '@/lib/demo'
import type { DemoAction, DemoState } from '@/lib/demo/reducer'
import { DemoProvider, useDemo } from '../demo'
import { DemoDevice } from '../device'
import { DemoScreen } from './index'

const en = getDemoData('en')
let send: Dispatch<DemoAction>
let snap: DemoState

function Probe() {
  const { state, dispatch } = useDemo()
  send = dispatch
  snap = state
  return null
}

function mount(device = false) {
  render(
    <NextIntlClientProvider locale="en" messages={{}}>
      <DemoProvider>
        <Probe />
        {device ? <DemoDevice /> : <DemoScreen />}
      </DemoProvider>
    </NextIntlClientProvider>,
  )
}
const go = (a: DemoAction) => act(() => send(a))

const realMatchMedia = window.matchMedia
afterEach(() => { cleanup(); vi.useRealTimers(); window.matchMedia = realMatchMedia })

describe('village', () => {
  beforeEach(() => mount())
  const post = (title: string) => screen.getByText(title).closest('article') as HTMLElement

  it('like toggles the count', async () => {
    go({ type: 'openScreen', screen: 'village' })
    const user = userEvent.setup()
    const like = within(post('Stroller')).getByRole('button', { name: /like/i })
    expect(like.textContent).toContain('12')
    await user.click(like)
    expect(like.textContent).toContain('13')
    expect(like.getAttribute('aria-pressed')).toBe('true')
    await user.click(like)
    expect(like.textContent).toContain('12')
  })

  it('comment appends literal text, never HTML', async () => {
    go({ type: 'openScreen', screen: 'village' })
    const user = userEvent.setup()
    const p = post('Stroller')
    await user.click(within(p).getByRole('button', { name: /comments/i }))
    await user.type(within(p).getByRole('textbox'), '<b>x</b>')
    await user.click(within(p).getByRole('button', { name: 'Send' }))
    expect(within(p).getByText('<b>x</b>')).toBeTruthy()
    expect(p.querySelector('b b')).toBeNull()
    expect(snap.posts[0].comments.at(-1)?.text).toBe('<b>x</b>')
  })

  it('filter hides non-matching posts', async () => {
    go({ type: 'openScreen', screen: 'village' })
    const user = userEvent.setup()
    expect(screen.queryByText('Travel crib')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Free' }))
    expect(screen.queryByText('Travel crib')).toBeTruthy()
    expect(screen.queryByText('Stroller')).toBeNull()
    expect(screen.getByRole('button', { name: 'Free' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('community and chat', () => {
  it('lists channels and opens one', async () => {
    mount()
    go({ type: 'openScreen', screen: 'community' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Baby sleep/ }))
    expect(snap.screen).toBe('chat')
    expect(snap.arg).toBe('babySleep')
    expect(screen.getByText(/Anyone else with a 5-month-old/)).toBeTruthy()
  })

  it('send appends own bubble as text, shows typing, then the reply arrives', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mount()
    go({ type: 'openScreen', screen: 'chat', arg: 'babySleep' })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const before = snap.chats.babySleep.length
    await user.type(screen.getByRole('textbox', { name: 'Message' }), '<i>hi</i>')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(screen.getByText('<i>hi</i>')).toBeTruthy()
    expect(document.querySelector('i')).toBeNull()
    expect(screen.getByText('someone is typing…')).toBeTruthy()
    expect(snap.chats.babySleep).toHaveLength(before + 1)
    act(() => { vi.advanceTimersByTime(1400) })
    expect(screen.queryByText('someone is typing…')).toBeNull()
    expect(snap.chats.babySleep).toHaveLength(before + 2)
    expect(snap.typing).toBeNull()
  })

  it('reply is immediate under reduced motion', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    mount()
    go({ type: 'openScreen', screen: 'chat', arg: 'babySleep' })
    const before = snap.chats.babySleep.length
    go({ type: 'sendChat', channel: 'babySleep', text: 'yo' })
    act(() => { vi.advanceTimersByTime(0) })
    expect(snap.chats.babySleep).toHaveLength(before + 2)
  })

  it('a pending reply is cancelled when leaving the chat', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mount()
    go({ type: 'openScreen', screen: 'chat', arg: 'babySleep' })
    const before = snap.chats.babySleep.length
    go({ type: 'sendChat', channel: 'babySleep', text: 'yo' })
    go({ type: 'back' })
    act(() => { vi.advanceTimersByTime(5000) })
    expect(snap.chats.babySleep).toHaveLength(before + 1)
  })

  it('like on a message toggles', async () => {
    mount()
    go({ type: 'openScreen', screen: 'chat', arg: 'babySleep' })
    const user = userEvent.setup()
    const btn = screen.getAllByRole("button", { name: /like message/i })[0]
    expect(btn.textContent).toContain('6')
    await user.click(btn)
    expect(btn.textContent).toContain('7')
  })

  it('unknown channel falls back to the community list', () => {
    mount()
    go({ type: 'openScreen', screen: 'chat', arg: 'ttc' }) // not a channel of the kids phase
    expect(screen.getByText(en.ui.screens.community.note)).toBeTruthy()
    go({ type: 'openScreen', screen: 'chat' })
    expect(screen.getByText(en.ui.screens.community.note)).toBeTruthy()
  })

  it('composer exists only on a chat', () => {
    mount()
    go({ type: 'openScreen', screen: 'community' })
    expect(screen.queryByRole('textbox', { name: 'Message' })).toBeNull()
  })
})

describe('exams', () => {
  it('lists exams and opens detail with values', async () => {
    mount()
    go({ type: 'openScreen', screen: 'exams' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Blood count/ }))
    expect(snap.screen).toBe('exam')
    expect(screen.getByText('Hemoglobin')).toBeTruthy()
    expect(screen.getByText(en.ui.screens.exams.readBy)).toBeTruthy()
  })

  it('guards an out-of-range exam index', () => {
    mount()
    go({ type: 'openScreen', screen: 'exam', arg: 99 })
    expect(screen.getByText(en.ui.screens.exams.add)).toBeTruthy()
    go({ type: 'openScreen', screen: 'exam', arg: -1 })
    expect(screen.getByText(en.ui.screens.exams.add)).toBeTruthy()
  })

  it('add flow: sheet, scan, then the new exam opens', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mount(true)
    go({ type: 'openScreen', screen: 'exams' })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const n = snap.exams.kids.length
    await user.click(screen.getByRole('button', { name: new RegExp(en.ui.screens.exams.add) }))
    expect(snap.sheet.kind).toBe('addExam')
    await user.click(screen.getByRole('button', { name: en.ui.screens.exams.takePhoto }))
    expect(screen.getByRole('button', { name: en.ui.screens.exams.reading })).toBeTruthy()
    expect(snap.screen).toBe('exams')
    act(() => { vi.advanceTimersByTime(1600) })
    expect(snap.screen).toBe('exam')
    expect(snap.arg).toBe(0)
    expect(snap.exams.kids).toHaveLength(n + 1)
    expect(snap.sheet.kind).toBe('none')
    expect(screen.getByText(en.ui.screens.exams.done)).toBeTruthy()
    expect(screen.getAllByText(en.ui.screens.exams.newExam.title).length).toBeGreaterThan(0)
  })

  it('closing the sheet mid-scan does not open the exam', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mount(true)
    go({ type: 'openScreen', screen: 'exams' })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(screen.getByRole('button', { name: new RegExp(en.ui.screens.exams.add) }))
    await user.click(screen.getByRole('button', { name: en.ui.screens.exams.takePhoto }))
    go({ type: 'closeSheet' })
    act(() => { vi.advanceTimersByTime(3000) })
    expect(snap.screen).toBe('exams')
  })
})

describe('toasts', () => {
  it('village want/buy and new memory cheer through the device toast', async () => {
    mount(true)
    go({ type: 'openScreen', screen: 'village' })
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button', { name: 'Buy' })[0])
    expect(screen.getByText(en.ui.screens.village.requestSent)).toBeTruthy()
    go({ type: 'openScreen', screen: 'memories' })
    await user.click(screen.getByRole('button', { name: new RegExp(en.ui.screens.memories.newMemory) }))
    expect(screen.getByText(en.ui.screens.memories.saved)).toBeTruthy()
  })
})

describe('memories', () => {
  it('new memory prepends and is shown', async () => {
    mount()
    go({ type: 'openScreen', screen: 'memories' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: new RegExp(en.ui.screens.memories.newMemory) }))
    expect(snap.mems.kids[0].title).toBe(en.ui.log.newMemory)
    const titles = Array.from(document.querySelectorAll('[data-memory] b')).map((b) => b.textContent)
    expect(titles[0]).toBe(en.ui.log.newMemory)
  })

  it('respects the kid filter', () => {
    mount()
    go({ type: 'setKid', kid: 'lua' })
    go({ type: 'openScreen', screen: 'memories' })
    expect(screen.queryByText('First day at daycare')).toBeNull()
    expect(screen.getByText('Rolled over on her own!')).toBeTruthy()
  })
})

describe('growth', () => {
  it('tab switch changes the chart title', async () => {
    mount()
    go({ type: 'openScreen', screen: 'growth' })
    const user = userEvent.setup()
    expect(screen.getByText(/^Weight \(/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Head' }))
    expect(screen.getByText(/^Head circumference \(/)).toBeTruthy()
    expect(snap.growthTab).toBe('head')
  })

  it('kid switch is respected (Lua has her own milestones)', async () => {
    mount()
    go({ type: 'openScreen', screen: 'growth' })
    expect(screen.getByText('Walked')).toBeTruthy()
    go({ type: 'setKid', kid: 'lua' })
    expect(screen.queryByText('Walked')).toBeNull()
    expect(screen.getByText('Rolled over')).toBeTruthy()
    expect(screen.getByText(en.ui.screens.growth.next.lua)).toBeTruthy()
  })
})

describe('vaccines and simple screens', () => {
  it('vaccines list follows the kid', () => {
    mount()
    go({ type: 'openScreen', screen: 'vaccines' })
    for (const v of en.vax.kenji) expect(screen.getAllByText(v.name).length).toBeGreaterThan(0)
    go({ type: 'setKid', kid: 'lua' })
    const lua = en.vax.lua.map((v) => v.name)
    const kenjiOnly = en.vax.kenji.map((v) => v.name).filter((n) => !lua.includes(n))
    for (const n of lua) expect(screen.getAllByText(n).length).toBeGreaterThan(0)
    for (const n of kenjiOnly) expect(screen.queryByText(n)).toBeNull()
  })

  it.each(['care', 'appointments', 'reminders', 'pediatric', 'privacy'] as const)('%s renders its title and goes back home', async (key) => {
    mount()
    go({ type: 'openScreen', screen: key })
    const title = en.ui.screens[key].title
    expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: en.ui.back }))
    expect(snap.screen).toBe('home')
  })
})
