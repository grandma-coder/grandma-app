// @vitest-environment happy-dom
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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
import { QuickJoin } from './quick-join'
import { Hero } from './hero'
import { PhaseSwitch } from './phase-switch'
import { StickerSheet } from './sticker-sheet'
import { WaitlistSection } from './waitlist-section'
import { Nav } from './nav'
import { Footer } from './footer'
import { WAITLIST_ID } from './ids'

const demoEn = getDemoData('en')
const realMatchMedia = window.matchMedia

function Probe() {
  const { state, dispatch, onNudge } = useDemo()
  return (
    <div>
      <output data-testid="mode">{state.mode}</output>
      <output data-testid="screen">{state.screen}</output>
      <output data-testid="step">{state.tour.step}</output>
      <output data-testid="tour-joined">{String(state.tour.joined)}</output>
      <button type="button" data-testid="advance" onClick={() => { dispatch({ type: 'tourDone', key: 'log' }); dispatch({ type: 'tourDone', key: 'week' }) }}>advance</button>
      <button type="button" data-testid="nudge" onClick={() => onNudge?.()}>nudge</button>
    </div>
  )
}

function setup(children: ReactNode, locale: 'en' | 'pt' = 'en') {
  const user = userEvent.setup()
  render(
    <NextIntlClientProvider locale={locale} messages={locale === 'pt' ? pt : en}>
      <SiteShell>{children}<Probe /></SiteShell>
    </NextIntlClientProvider>,
  )
  return user
}

const emailFields = () => screen.queryAllByRole('textbox') as HTMLInputElement[]
const submitOf = (input: HTMLInputElement) => within(input.closest('form')!).getByRole('button')
const reduceMotion = (reduce: boolean) => {
  window.matchMedia = ((q: string) => ({ matches: reduce && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
}

beforeEach(() => { join.mockReset(); reduceMotion(false) })
afterEach(() => { cleanup(); window.matchMedia = realMatchMedia })

describe('QuickJoin', () => {
  it('submitting one field flips every field to joined, even one mid-edit', async () => {
    join.mockResolvedValue({ status: 'success' })
    const user = setup(<><QuickJoin variant="hero" /><QuickJoin variant="section" /></>)
    const [hero, section] = emailFields()
    await user.type(section, 'half@typ')
    await user.type(hero, 'ana@example.com')
    await user.click(submitOf(hero))

    await screen.findByText(en.v3.waitlist.joinedInline)
    expect(screen.getByText(en.v3.waitlist.joinedTitle)).toBeTruthy()
    expect(emailFields()).toHaveLength(0)
    expect(screen.getByTestId('tour-joined').textContent).toBe('true')

    expect(join).toHaveBeenCalledTimes(1)
    const fd = join.mock.calls[0][1] as FormData
    expect(fd.get('email')).toBe('ana@example.com')
    expect(fd.get('mode')).toBe('kids')
    expect(fd.get('locale')).toBe('en')
    expect(fd.get('company')).toBe('')
  })

  it('a failed submit keeps the typed email and shows the error under that field only', async () => {
    join.mockResolvedValue({ status: 'invalid', fieldErrors: { email: 'email_invalid' } })
    const user = setup(<><QuickJoin variant="hero" /><QuickJoin variant="section" /></>)
    const [hero, section] = emailFields()
    await user.type(section, 'other@x.com')
    await user.type(hero, 'nope')
    await user.click(submitOf(hero))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(en.v3.waitlist.errors.email_invalid)
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(hero.value).toBe('nope')
    expect(hero.getAttribute('aria-invalid')).toBe('true')
    expect(hero.getAttribute('aria-describedby')).toBe(alert.id)
    expect(section.value).toBe('other@x.com')
    expect(section.getAttribute('aria-invalid')).toBeNull()
    expect(hero.closest('form')!.parentElement!.contains(alert)).toBe(true)
    expect(section.closest('form')!.contains(alert)).toBe(false)
  })

  it('rate limit and server errors show inline too', async () => {
    join.mockResolvedValueOnce({ status: 'rate_limited' }).mockResolvedValueOnce({ status: 'error' })
    const user = setup(<QuickJoin variant="section" />)
    const [field] = emailFields()
    await user.type(field, 'ana@example.com')
    await user.click(submitOf(field))
    expect((await screen.findByRole('alert')).textContent).toBe(en.v3.waitlist.errors.rate_limited)
    await user.click(submitOf(field))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(en.v3.waitlist.errors.generic))
    expect(field.value).toBe('ana@example.com')
  })

  it('the hero field posts the demo phase, following the phase switch', async () => {
    const user = setup(<><PhaseSwitch /><QuickJoin variant="hero" /></>)
    const hidden = () => emailFields()[0].closest('form')!.querySelector<HTMLInputElement>('input[name="mode"]')!
    expect(hidden().value).toBe('kids')
    await user.click(screen.getByRole('tab', { name: demoEn.phases.pre.name }))
    expect(hidden().value).toBe('pre')
  })

  it('section radios default to the demo phase; picking one does not change the demo', async () => {
    const user = setup(<><PhaseSwitch /><QuickJoin variant="section" /></>)
    expect((screen.getByRole('radio', { name: demoEn.phases.kids.name }) as HTMLInputElement).checked).toBe(true)
    await user.click(screen.getByRole('tab', { name: demoEn.phases.preg.name }))
    expect((screen.getByRole('radio', { name: demoEn.phases.preg.name }) as HTMLInputElement).checked).toBe(true)
    await user.click(screen.getByRole('radio', { name: demoEn.phases.meno.name }))
    expect(screen.getByTestId('mode').textContent).toBe('preg')
    await user.click(screen.getByRole('tab', { name: demoEn.phases.pre.name }))
    expect((screen.getByRole('radio', { name: demoEn.phases.meno.name }) as HTMLInputElement).checked).toBe(true)
  })

  it('success throws a sticker burst, unless motion is reduced', async () => {
    join.mockResolvedValue({ status: 'success' })
    const user = setup(<QuickJoin variant="hero" />)
    await user.type(emailFields()[0], 'ana@example.com')
    await user.click(submitOf(emailFields()[0]))
    await screen.findByText(en.v3.waitlist.joinedInline)
    expect(document.querySelectorAll('[data-burst]')).toHaveLength(10)
  })

  it('no burst with reduced motion', async () => {
    reduceMotion(true)
    join.mockResolvedValue({ status: 'success' })
    const user = setup(<QuickJoin variant="pop" />)
    await user.type(emailFields()[0], 'ana@example.com')
    await user.click(submitOf(emailFields()[0]))
    await screen.findByText(en.v3.waitlist.joinedTitle)
    expect(document.querySelectorAll('[data-burst]')).toHaveLength(0)
  })
})

describe('hero rebus', () => {
  it('renders one sticker per token, glued to the word before it', () => {
    setup(<Hero />)
    const h1 = screen.getByRole('heading', { level: 1 })
    const stickers = h1.querySelectorAll('svg')
    expect(stickers).toHaveLength(3)
    const glued = [...stickers].map((s) => s.closest('span[style*="nowrap"]') as HTMLElement)
    expect(glued.map((g) => g.textContent!.trim())).toEqual(['life', "kids' ,", 'app .'])
    expect(h1.textContent!.replace(/\s+/g, ' ').replace(/ ([,.])/g, '$1').trim()).toBe("Your life and your kids', in one app.")
    expect([...h1.querySelectorAll<HTMLElement>('[style*="--i"]')].map((e) => e.style.getPropertyValue('--i'))).toEqual(['0', '1', '2'])
  })
})

describe('phase switch', () => {
  it('dispatches setMode and tourDone("mode")', async () => {
    const user = setup(<PhaseSwitch />)
    await user.click(screen.getByTestId('advance'))
    expect(screen.getByTestId('step').textContent).toBe('2')
    const tab = screen.getByRole('tab', { name: demoEn.phases.meno.name })
    await user.click(tab)
    expect(screen.getByTestId('mode').textContent).toBe('meno')
    expect(screen.getByTestId('step').textContent).toBe('3')
    expect(tab.getAttribute('aria-selected')).toBe('true')
  })
})

describe('sticker sheet', () => {
  it('a tap shows the caption and, on desktop, drives the phone', async () => {
    const user = setup(<StickerSheet />)
    const growth = demoEn.feats.find((f) => 'screen' in f.action && f.action.screen === 'growth')!
    const cycle = demoEn.feats.find((f) => 'mode' in f.action && f.action.mode === 'pre')!
    await user.click(screen.getByRole('button', { name: cycle.title }))
    expect(screen.getByTestId('mode').textContent).toBe('pre')
    expect(screen.getByText(cycle.desc)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: growth.title }))
    expect(screen.getByTestId('mode').textContent).toBe('kids')
    expect(screen.getByTestId('screen').textContent).toBe('growth')
    expect(screen.getByRole('button', { name: growth.title }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('page shell', () => {
  it('the in-phone nudge scrolls to the waitlist section', async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const user = setup(<WaitlistSection />)
    await user.click(screen.getByTestId('nudge'))
    expect(scroll).toHaveBeenCalledTimes(1)
    expect((scroll.mock.contexts[0] as HTMLElement).id).toBe(WAITLIST_ID)
  })

  it.each(['en', 'pt'] as const)('%s copy has no Brazil-first / country-order text', (locale) => {
    render(
      <NextIntlClientProvider locale={locale} messages={locale === 'pt' ? pt : en}>
        <Nav />
        <SiteShell><Hero /><StickerSheet /><WaitlistSection /></SiteShell>
        <Footer />
      </NextIntlClientProvider>,
    )
    const text = document.body.textContent ?? ''
    expect(text).toContain(locale === 'pt' ? pt.v3.hero.sub : en.v3.hero.sub)
    expect(text).not.toMatch(/brasil|brazil|then the us|depois os eua|in my country|no meu país/i)
  })
})
