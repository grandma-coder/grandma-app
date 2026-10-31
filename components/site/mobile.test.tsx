// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/messages/en.json'
import pt from '@/messages/pt.json'
import { getDemoData } from '@/lib/demo'

const { join } = vi.hoisted(() => ({ join: vi.fn() }))
vi.mock('@/lib/waitlist/action', () => ({ joinWaitlist: join }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
  usePathname: () => '/',
  useRouter: () => ({ replace: () => {} }),
}))

import { useDemo } from '@/components/demo/demo'
import { SiteShell } from './site-shell'
import { MobileBar } from './mobile-bar'
import { QuickJoin } from './quick-join'
import { Hero } from './hero'
import { PHONE_ID, MODES_ID, TABBAR_ID, EXPLORE_ID, POP_ID } from './ids'

const demoEn = getDemoData('en')
const realMatchMedia = window.matchMedia
const m = en.v3.mobile

function Probe() {
  const { state } = useDemo()
  return (
    <div>
      <output data-testid="mode">{state.mode}</output>
      <output data-testid="screen">{state.screen}</output>
      <output data-testid="sheet">{state.sheet.kind}</output>
    </div>
  )
}

function mockMedia(small: boolean, reduce = true) {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('max-width') ? small : q.includes('reduce') ? reduce : false,
    media: q, addEventListener() {}, removeEventListener() {},
  })) as unknown as typeof window.matchMedia
}

function setup(children: ReactNode = null, locale: 'en' | 'pt' = 'en') {
  const user = userEvent.setup()
  render(
    <NextIntlClientProvider locale={locale} messages={locale === 'pt' ? pt : en}>
      <SiteShell><MobileBar />{children}<Probe /></SiteShell>
    </NextIntlClientProvider>,
  )
  return user
}

const tab = (name: string) => within(document.getElementById(TABBAR_ID)!).getByRole('button', { name, hidden: true })
const out = (id: string) => screen.getByTestId(id).textContent

beforeEach(() => { join.mockReset(); mockMedia(true); window.scrollTo = vi.fn() as unknown as typeof window.scrollTo })
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia })

describe('black bar', () => {
  it('has the five tabs with the eye raised in the middle', () => {
    setup()
    const nav = screen.getByRole('navigation', { name: m.barAria })
    expect(nav.id).toBe(TABBAR_ID)
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual([m.home, m.log, m.explore, m.memories, m.list])
  })

  it('Home opens the home screen', async () => {
    const user = setup()
    await user.click(tab(m.memories))
    expect(out('screen')).toBe('memories')
    await user.click(tab(m.home))
    expect(out('screen')).toBe('home')
    expect(out('sheet')).toBe('none')
  })

  it('Log goes home then opens the register sheet', async () => {
    const user = setup()
    await user.click(tab(m.memories))
    await user.click(tab(m.log))
    expect(out('screen')).toBe('home')
    await waitFor(() => expect(out('sheet')).toBe('register'))
  })

  it('Memories opens the memories screen', async () => {
    const user = setup()
    await user.click(tab(m.memories))
    expect(out('screen')).toBe('memories')
  })

  it('scrolls the phase switch into view after driving the phone (phones only)', async () => {
    document.body.innerHTML = ''
    const user = setup(<div id={MODES_ID} />)
    vi.spyOn(document.getElementById(MODES_ID)!, 'getBoundingClientRect').mockReturnValue({ top: 500, bottom: 540, height: 40 } as DOMRect)
    await user.click(tab(m.memories))
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('does not scroll on desktop widths', async () => {
    mockMedia(false)
    const user = setup(<div id={MODES_ID} />)
    await user.click(tab(m.memories))
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})

describe('Explorar', () => {
  const panel = () => document.getElementById(EXPLORE_ID)!

  it('is closed and inert until the eye is tapped; the eye toggles it', async () => {
    const user = setup()
    expect(panel().getAttribute('aria-hidden')).toBe('true')
    expect(panel().hasAttribute('inert')).toBe(true)
    await user.click(tab(m.explore))
    expect(panel().getAttribute('aria-hidden')).toBe('false')
    expect(panel().hasAttribute('inert')).toBe(false)
    expect(tab(m.explore).getAttribute('aria-expanded')).toBe('true')
    await user.click(tab(m.explore))
    expect(panel().getAttribute('aria-hidden')).toBe('true')
  })

  it('lists every feature sticker; tapping one runs it on the phone and closes the panel', async () => {
    const user = setup()
    await user.click(tab(m.explore))
    const buttons = within(panel()).getAllByRole('button').filter((b) => b.dataset.feat !== undefined)
    expect(buttons).toHaveLength(demoEn.feats.length)
    expect(within(panel()).getByText(en.v3.explore.title)).toBeTruthy()

    // a kids-only feature from another phase switches to kids first (shared with the sticker sheet)
    const n = demoEn.feats.findIndex((f) => 'screen' in f.action && f.action.screen === 'growth')
    expect(n).toBeGreaterThan(-1)
    await user.click(within(panel()).getByRole('button', { name: new RegExp(demoEn.feats[n].title, 'i') }))
    expect(out('screen')).toBe('growth')
    expect(out('mode')).toBe('kids')
    expect(panel().getAttribute('aria-hidden')).toBe('true')
    expect(window.scrollTo).not.toHaveBeenCalled() // no #modes in this tree
  })

  it('a phase feature switches the phase', async () => {
    const user = setup()
    await user.click(tab(m.explore))
    const n = demoEn.feats.findIndex((f) => 'mode' in f.action && f.action.mode === 'pre')
    await user.click(within(panel()).getByRole('button', { name: new RegExp(`^${demoEn.feats[n].title}$`, 'i') }))
    expect(out('mode')).toBe('pre')
  })

  it('"Join the list" swaps Explorar for the list pop-up', async () => {
    const user = setup()
    await user.click(tab(m.explore))
    await user.click(within(panel()).getByRole('button', { name: en.v3.explore.join }))
    expect(panel().getAttribute('aria-hidden')).toBe('true')
    expect(document.getElementById(POP_ID)!.getAttribute('aria-hidden')).toBe('false')
  })

  it('Escape and the scrim close it', async () => {
    const user = setup()
    await user.click(tab(m.explore))
    await user.keyboard('{Escape}')
    expect(panel().getAttribute('aria-hidden')).toBe('true')
    await user.click(tab(m.explore))
    await user.click(document.querySelector('[data-scrim]')!)
    expect(panel().getAttribute('aria-hidden')).toBe('true')
  })
})

describe('list pop-up', () => {
  const pop = () => document.getElementById(POP_ID)!

  it('opens from the List tab as a modal dialog with the pop quick-join', async () => {
    const user = setup()
    expect(pop().getAttribute('aria-hidden')).toBe('true')
    expect(pop().hasAttribute('inert')).toBe(true)
    await user.click(tab(m.list))
    expect(pop().getAttribute('role')).toBe('dialog')
    expect(pop().getAttribute('aria-modal')).toBe('true')
    expect(pop().getAttribute('aria-hidden')).toBe('false')
    expect(within(pop()).getByText(en.v3.pop.title)).toBeTruthy()
    expect(within(pop()).getByPlaceholderText(en.v3.pop.emailPlaceholder)).toBeTruthy()
  })

  it('its close button closes it', async () => {
    const user = setup()
    await user.click(tab(m.list))
    await user.click(within(pop()).getByRole('button', { name: en.v3.pop.close }))
    expect(pop().getAttribute('aria-hidden')).toBe('true')
  })

  it('joining from the pop-up flips every other field to joined', async () => {
    join.mockResolvedValue({ status: 'success' })
    const user = setup(<QuickJoin variant="hero" />)
    await user.click(tab(m.list))
    const input = within(pop()).getByPlaceholderText(en.v3.pop.emailPlaceholder)
    await user.type(input, 'ana@example.com')
    await user.click(within(input.closest('form')!).getByRole('button'))
    await screen.findByText(en.v3.waitlist.joinedInline)
    expect(within(pop()).getByText(en.v3.waitlist.joinedTitle)).toBeTruthy()
    expect(screen.queryAllByRole('textbox', { hidden: true })).toHaveLength(0)
  })

  it('a field joined elsewhere shows the joined state in the pop-up', async () => {
    join.mockResolvedValue({ status: 'success' })
    const user = setup(<QuickJoin variant="hero" />)
    const hero = screen.getAllByRole('textbox').find((i) => !pop().contains(i))!
    await user.type(hero, 'ana@example.com')
    await user.click(within(hero.closest('form')!).getByRole('button'))
    await screen.findByText(en.v3.waitlist.joinedInline)
    await user.click(tab(m.list))
    expect(within(pop()).getByText(en.v3.waitlist.joinedTitle)).toBeTruthy()
  })

  it('any other tab closes it', async () => {
    const user = setup()
    await user.click(tab(m.list))
    expect(pop().getAttribute('aria-hidden')).toBe('false')
    await user.click(tab(m.home)) // any other tab closes it
    expect(pop().getAttribute('aria-hidden')).toBe('true')
  })
})

describe('black bar steps aside while the phone is on screen', () => {
  const bar = () => document.getElementById(TABBAR_ID)!
  const rectOf = (top: number, h: number) => ({ top, bottom: top + h, height: h }) as DOMRect

  function withSlot(top: number) {
    const slot = document.createElement('div')
    slot.id = PHONE_ID
    document.body.appendChild(slot)
    slot.getBoundingClientRect = () => rectOf(top, 400)
    return slot
  }

  it('is away when the phone is mostly visible, back when it scrolls off', () => {
    const slot = withSlot(100)
    window.innerHeight = 800
    setup()
    expect(bar().getAttribute('data-away')).toBe('true')
    // away = off screen AND out of the tab order / accessibility tree
    expect(bar().hasAttribute('inert')).toBe(true)
    expect(bar().getAttribute('aria-hidden')).toBe('true')
    slot.getBoundingClientRect = () => rectOf(900, 400)
    act(() => { window.dispatchEvent(new Event('scroll')) })
    expect(bar().getAttribute('data-away')).toBe('false')
    expect(bar().hasAttribute('inert')).toBe(false)
    expect(bar().getAttribute('aria-hidden')).toBeNull()
    slot.remove()
  })

  it('stays visible while Explorar is open even with the phone on screen', async () => {
    const slot = withSlot(100)
    window.innerHeight = 800
    const user = setup()
    expect(bar().getAttribute('data-away')).toBe('true')
    await user.click(tab(m.explore))
    expect(bar().getAttribute('data-away')).toBe('false')
    slot.remove()
  })
})

describe('modal behaviour (Explorar and the list pop-up)', () => {
  const page = () => screen.getByTestId('page')
  const ui = (id: string) => document.getElementById(id)!

  it.each([
    ['Explorar', () => tab(m.explore), EXPLORE_ID],
    ['the list pop-up', () => tab(m.list), POP_ID],
  ])('%s: inerts the page, moves focus in, Escape closes and focus returns to the opener', async (_n, opener, id) => {
    const user = setup(<main data-testid="page"><button>behind</button></main>)
    const btn = opener()
    await user.click(btn)
    expect(ui(id).getAttribute('aria-modal')).toBe('true')
    expect(page().hasAttribute('inert')).toBe(true)
    expect(ui(TABBAR_ID).hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(ui(id))
    await user.keyboard('{Escape}')
    expect(page().hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(btn)
  })

  it('the pop-up opened from Explorar returns focus to the List tab, not the inert Explorar button', async () => {
    const user = setup(<main data-testid="page" />)
    await user.click(tab(m.explore))
    await user.click(within(ui(EXPLORE_ID)).getByRole('button', { name: en.v3.explore.join }))
    expect(document.activeElement).toBe(ui(POP_ID))
    await user.click(within(ui(POP_ID)).getByRole('button', { name: en.v3.pop.close }))
    expect(document.activeElement).toBe(tab(m.list))
  })

  it('does not steal focus when another tab closed it', async () => {
    const user = setup(<main data-testid="page" />)
    await user.click(tab(m.list))
    await user.click(tab(m.home))
    expect(document.activeElement).toBe(tab(m.home))
  })
})

describe('Log tab timer', () => {
  it('a fast Log -> Memories tap does not open the register sheet over Memories', async () => {
    mockMedia(true, false) // motion allowed: 250 ms delay
    const user = userEvent.setup({ delay: null })
    setup()
    await user.click(tab(m.log))
    await user.click(tab(m.memories))
    await new Promise((r) => setTimeout(r, 400))
    expect(out('screen')).toBe('memories')
    expect(out('sheet')).toBe('none')
  })

  it('is cleared on unmount', async () => {
    mockMedia(true, false)
    const user = setup()
    await user.click(tab(m.log))
    cleanup()
    await new Promise((r) => setTimeout(r, 400)) // would throw / warn on a dispatch after unmount
  })
})

describe('phone fit', () => {
  it('leaves --s to the stylesheet when CSS can fit the phone itself', () => {
    vi.stubGlobal('CSS', { supports: () => true })
    window.innerWidth = 320; window.innerHeight = 568
    setup(<Hero />)
    expect(document.getElementById(PHONE_ID)!.style.getPropertyValue('--s')).toBe('')
    vi.unstubAllGlobals()
  })

  it('Hero sets --s on the phone slot from the window size', () => {
    vi.stubGlobal('CSS', { supports: () => false }) // no tan/atan2: the JS fallback fits it
    window.innerWidth = 320; window.innerHeight = 568
    setup(<Hero />)
    expect(document.getElementById(PHONE_ID)!.style.getPropertyValue('--s')).toBe('0.41')
    vi.unstubAllGlobals()
  })
})
