'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { joinWaitlist } from '@/lib/waitlist/action'
import type { WaitlistState } from '@/lib/waitlist/types'
import { MODES, type Mode } from '@/lib/modes'
import { COUNTRIES, type Country } from '@/lib/countries'
import { ActionRule, BloomPicker, Chip, Mark, UnderlineField } from '@/components/diffuse'

const INITIAL: WaitlistState = { status: 'idle' }
const UTM = ['utm_source', 'utm_medium', 'utm_campaign'] as const

export function WaitlistForm({ defaultCountry }: { defaultCountry: Country }) {
  const t = useTranslations('form')
  const locale = useLocale()
  const [state, action, pending] = useActionState(joinWaitlist, INITIAL)
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState<Country>(defaultCountry)
  const [mode, setMode] = useState<Mode | ''>('')
  // Starts expanded so the full form works before hydration / without JS; collapses on small screens after mount.
  const [expanded, setExpanded] = useState(true)
  const [attrib, setAttrib] = useState<Record<string, string>>({})
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setExpanded(false)
    const p = new URLSearchParams(window.location.search)
    const a: Record<string, string> = {}
    for (const k of UTM) { const v = p.get(k); if (v) a[k] = v }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) a.referrer = document.referrer
    setAttrib(a)
  }, [])
  useEffect(() => { if (state.status !== 'idle') { setExpanded(true); statusRef.current?.focus() } }, [state])

  if (state.status === 'success') {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="outline-none">
        <Mark size={72} />
        <p className="mt-3 font-display text-[44px] leading-none [&_em]:italic [&_em]:text-ink-2">{t.rich('success.title', { em: (c) => <em>{c}</em> })}</p>
        <p className="mt-3 text-[16px] font-light text-ink-2">{t(`success.${state.country}`)}</p>
      </div>
    )
  }

  const errs = state.status === 'invalid' ? state.fieldErrors : {}
  const show = expanded || email.length > 0
  return (
    <form action={action} noValidate className="grid gap-7">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="country" value={country} />
      {Object.entries(attrib).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label>{t('honeypot')}<input type="text" name="company" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <UnderlineField label={t('email')} name="email" type="email" autoComplete="email" required placeholder={t('emailPh')}
        value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setExpanded(true)}
        error={errs.email ? t(`errors.${errs.email}`) : undefined} />

      <div className={show ? 'grid gap-7' : 'hidden md:grid md:gap-7'}>
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3" id="country-label">{t('country')}</p>
          <div role="radiogroup" aria-labelledby="country-label" className="flex flex-wrap gap-2.5">
            {COUNTRIES.map((c) => <Chip key={c} role="radio" aria-checked={country === c} selected={country === c} onClick={() => setCountry(c)}>{t(`countries.${c}`)}</Chip>)}
          </div>
          {errs.country && <p className="mt-2 text-[14px] text-err">{t(`errors.${errs.country}`)}</p>}
        </div>
        <BloomPicker name="mode" value={mode} onChange={setMode}
          legend={t.rich('mode', { em: (c) => <em>{c}</em> })}
          options={MODES.map((m) => { const [kicker, label] = t.raw(`modes.${m}`) as [string, string]; return { value: m, kicker, label, mode: m } })}
          error={errs.mode ? t(`errors.${errs.mode}`) : undefined} />
        <UnderlineField label={t('name')} name="name" autoComplete="given-name" maxLength={80} placeholder={t('namePh')} error={errs.name ? t(`errors.${errs.name}`) : undefined} />
        <label className="flex cursor-pointer items-start gap-3 text-[15px] font-light text-ink-2">
          <input type="checkbox" name="notify_launch" className="mt-1.5 h-4 w-4 accent-[var(--ink)]" />{t('notify')}
        </label>
      </div>

      <div ref={statusRef} tabIndex={-1} aria-live="polite" className="outline-none">
        {state.status === 'rate_limited' && <p className="rounded-d-sm border border-err/50 bg-white/45 px-4 py-3 text-[14.5px] text-err">{t('rateLimited')}</p>}
        {state.status === 'error' && <p className="rounded-d-sm border border-err/50 bg-white/45 px-4 py-3 text-[14.5px] text-err">{t('error')}</p>}
      </div>

      <ActionRule type="submit" pending={pending}>{pending ? t('submitting') : state.status === 'error' ? t('retry') : t('submit')}</ActionRule>
      <p className="m-0 text-[12.5px] font-light leading-[1.6] text-ink-3">
        {t.rich('consent', { link: (c) => <Link href="/privacy#waitlist-data" className="text-ink underline underline-offset-2">{c}</Link> })}
      </p>
    </form>
  )
}
