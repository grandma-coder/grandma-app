'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { joinWaitlist } from '@/lib/waitlist/action'
import type { WaitlistState } from '@/lib/waitlist/types'
import { MODES, type Mode } from '@/lib/modes'
import { Sticker } from '@/components/stickers/sticker'
import { useDemo } from '@/components/demo/demo'
import { useJoined } from './joined-context'
import s from './site.module.css'

export type QuickJoinVariant = 'hero' | 'section' | 'pop'

const INITIAL: WaitlistState = { status: 'idle' }
const UTM = ['utm_source', 'utm_medium', 'utm_campaign'] as const
const ERRORS = ['email_required', 'email_invalid', 'email_too_long', 'mode_required'] as const

/** UTM params and an external referrer, read once on mount (the schema accepts them as optional fields). */
function useAttribution() {
  const [attrib, setAttrib] = useState<Record<string, string>>({})
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const a: Record<string, string> = {}
    for (const k of UTM) { const v = p.get(k); if (v) a[k] = v }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) a.referrer = document.referrer
    setAttrib(a)
  }, [])
  return attrib
}

function errorKey(state: WaitlistState): (typeof ERRORS)[number] | 'rate_limited' | 'generic' | null {
  if (state.status === 'rate_limited') return 'rate_limited'
  if (state.status === 'error') return 'generic'
  if (state.status !== 'invalid') return null
  const code = state.fieldErrors.email ?? state.fieldErrors.mode
  return code && (ERRORS as readonly string[]).includes(code) ? (code as (typeof ERRORS)[number]) : 'generic'
}

/**
 * Every email field on the page. All post to `joinWaitlist`; the first success flips every QuickJoin
 * (through JoinedContext) to its joined state. A failure stays on this field, with the typed email kept.
 * - hero: one-line pill, hidden `mode` from the demo phase
 * - section / pop: phase radios (default: the demo phase, not linked back to it) + email
 */
export function QuickJoin({ variant }: { variant: QuickJoinVariant }) {
  const t = useTranslations('v3')
  const locale = useLocale()
  const { state: demo, data } = useDemo()
  const { isJoined, joined } = useJoined()
  const [state, action, pending] = useActionState(joinWaitlist, INITIAL)
  const [email, setEmail] = useState('')
  const [picked, setPicked] = useState<Mode | null>(null)
  const attrib = useAttribution()
  const box = useRef<HTMLDivElement>(null)
  const done = useRef<HTMLDivElement>(null)
  const mine = useRef(false)
  const errId = useId()
  const radioName = useId()
  const mode = picked ?? demo.mode

  useEffect(() => {
    if (state.status !== 'success') return
    mine.current = true
    const r = box.current?.getBoundingClientRect()
    joined(r ? { x: r.left + r.width / 2, y: r.top + (variant === 'hero' ? 0 : 60) } : undefined)
    // runs once per action result; `joined` and `variant` are stable for the field's lifetime
  }, [state])

  // the field that was used keeps focus on its own joined message, so screen readers hear it
  useEffect(() => { if (isJoined && mine.current) done.current?.focus() }, [isJoined])

  const err = errorKey(state)
  const errMsg = err ? t(`waitlist.errors.${err}`) : null
  const field = (placeholder: string, aria: string) => (
    <input
      type="email" name="email" required autoComplete="email" inputMode="email"
      value={email} onChange={(e) => setEmail(e.target.value)}
      placeholder={placeholder} aria-label={aria}
      aria-invalid={state.status === 'invalid' || undefined} aria-describedby={err ? errId : undefined}
    />
  )
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      {/* mode is always posted from state: React resets the form after each action, which would snap radios back */}
      <input type="hidden" name="mode" value={mode} />
      {Object.entries(attrib).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className={s.hp} aria-hidden="true">
        <label>{t('waitlist.honeypot')}<input type="text" name="company" tabIndex={-1} autoComplete="new-password" defaultValue="" data-1p-ignore data-lpignore="true" /></label>
      </div>
    </>
  )
  const error = errMsg && <p id={errId} role="alert" className={s.err}>{errMsg}</p>
  const note = (key: 'hero.note' | 'waitlist.note' | 'pop.note') => (
    <>{t(key)} · <Link href="/privacy#waitlist-data">{t('waitlist.privacy')}</Link></>
  )

  if (variant === 'hero') {
    return (
      <div ref={box}>
        {isJoined ? (
          <div ref={done} tabIndex={-1} role="status" className={`${s.qj} ${s.qjHero} ${s.joined}`}>
            <Sticker name="star" className={s.ico} /><span>{t('waitlist.joinedInline')}</span>
          </div>
        ) : (
          <form action={action} noValidate data-tour="join" className={`${s.qj} ${s.qjHero}`} aria-busy={pending || undefined}>
            {hidden}
            {field(t('hero.emailPlaceholder'), t('hero.emailAria'))}
            <button type="submit" disabled={pending}>{t('hero.join')}</button>
          </form>
        )}
        {error}
        <p className={s.qjNote}>{note('hero.note')}</p>
      </div>
    )
  }

  const pop = variant === 'pop'
  return (
    <div ref={box} className={`${s.join} ${pop ? s.joinPop : ''}`}>
      {isJoined ? (
        <div ref={done} tabIndex={-1} role="status" className={s.done}>
          <Sticker name="star" className={`${s.ico} ${s.star}`} />
          <h3 className={s.hand}>{t('waitlist.joinedTitle')}</h3>
          <p>{t('waitlist.joinedBody')}</p>
          <div className={s.install}>
            <Sticker name="phone" className={s.ico} />
            <span>{t.rich('waitlist.installHint', { b: (c) => <b>{c}</b> })}</span>
          </div>
        </div>
      ) : (
        <>
          {pop && <p className={s.popNote}>{note('pop.note')}</p>}
          {/* outside the <form> so React's post-action reset never touches them; the hidden `mode` posts the pick */}
          <fieldset>
            <legend className={pop ? s.hp : s.q}>{t('waitlist.question')}</legend>
            <div className={s.phases}>
              {MODES.map((m) => (
                <label key={m}>
                  <input type="radio" name={radioName} value={m} checked={mode === m} onChange={() => setPicked(m)} />
                  <Sticker name={data.phases[m].icon} className={s.ico} />{data.phases[m].name}
                </label>
              ))}
            </div>
          </fieldset>
          <form action={action} noValidate aria-busy={pending || undefined}>
            {hidden}
            <div className={s.email}>
              {field(t(pop ? 'pop.emailPlaceholder' : 'waitlist.emailPlaceholder'), t(pop ? 'pop.emailAria' : 'waitlist.emailAria'))}
              <button type="submit" className={`${s.pill} ${s.dark}`} disabled={pending}>{t(pop ? 'pop.submit' : 'waitlist.join')}</button>
            </div>
            {error}
            {!pop && <div className={s.meta}><span>{note('waitlist.note')}</span></div>}
          </form>
        </>
      )}
    </div>
  )
}
