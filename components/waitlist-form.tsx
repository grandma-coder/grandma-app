'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { joinWaitlist } from '@/lib/waitlist/action'
import type { WaitlistState } from '@/lib/waitlist/types'
import { MODES, type Mode } from '@/lib/modes'
import { COUNTRIES, type Country } from '@/lib/countries'
import { ActionRule, BloomPicker, Mark, UnderlineField } from '@/components/diffuse'

const INITIAL: WaitlistState = { status: 'idle' }
const CHIP = 'inline-flex cursor-pointer items-center rounded-full border px-[18px] py-[11px] font-mono text-[12px] tracking-[0.04em] transition-all duration-200'
const UTM = ['utm_source', 'utm_medium', 'utm_campaign'] as const

export function WaitlistForm({ defaultCountry }: { defaultCountry: Country }) {
  const t = useTranslations('form')
  const locale = useLocale()
  const [state, action, pending] = useActionState(joinWaitlist, INITIAL)
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState<Country>(defaultCountry)
  const [mode, setMode] = useState<Mode | ''>('')
  const [name, setName] = useState('')
  const [notify, setNotify] = useState(false)
  // Starts expanded so the full form works before hydration / without JS; collapses on small screens after mount.
  const [expanded, setExpanded] = useState(true)
  const [attrib, setAttrib] = useState<Record<string, string>>({})
  const statusRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setExpanded(false)
    const p = new URLSearchParams(window.location.search)
    const a: Record<string, string> = {}
    for (const k of UTM) { const v = p.get(k); if (v) a[k] = v }
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) a.referrer = document.referrer
    setAttrib(a)
  }, [])
  useEffect(() => {
    if (state.status === 'idle') return
    setExpanded(true)
    if (state.status === 'invalid') {
      const f = state.fieldErrors
      const sel = f.email ? 'input[name="email"]' : f.country ? 'input[name="country"]' : f.mode ? 'input[name="mode"]' : f.name ? 'input[name="name"]' : null
      // Wait a frame so a collapsed (mobile) section is visible before focusing.
      if (sel) { requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>(sel)?.focus()); return }
    }
    statusRef.current?.focus()
  }, [state])

  if (state.status === 'success') {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="outline-none">
        <Mark size={72} />
        <p className="mt-3 font-display text-[clamp(32px,9vw,40px)] font-bold leading-none tracking-[-0.03em] [&_em]:italic [&_em]:text-ink-2">{t.rich('success.title', { em: (c) => <em>{c}</em> })}</p>
        <p className="mt-3 text-[16px] font-light text-ink-2">{t(`success.${state.country}`)}</p>
      </div>
    )
  }

  const errs = state.status === 'invalid' ? state.fieldErrors : {}
  const show = expanded || email.length > 0
  return (
    <form ref={formRef} action={action} noValidate className="grid gap-7">
      <input type="hidden" name="locale" value={locale} />
      {Object.entries(attrib).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div aria-hidden="true" className="fixed left-[-10000px] h-px w-px overflow-hidden">
        <label>{t('honeypot')}<input type="text" name="company" tabIndex={-1} autoComplete="new-password" data-1p-ignore data-lpignore="true" /></label>
      </div>

      <UnderlineField label={t('email')} name="email" type="email" autoComplete="email" required placeholder={t('emailPh')}
        value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setExpanded(true)}
        error={errs.email ? t(`errors.${errs.email}`) : undefined} />

      <div className={show ? 'grid gap-7' : 'hidden md:grid md:gap-7'}>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 p-0 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{t('country')}</legend>
          <div className="flex flex-wrap gap-2.5">
            {COUNTRIES.map((c) => (
              <label key={c} className={`${CHIP} border-line bg-[color-mix(in_oklab,var(--paper)_55%,transparent)] text-ink-3 has-[:checked]:border-hair has-[:checked]:bg-[color-mix(in_oklab,var(--paper)_80%,transparent)] has-[:checked]:font-bold has-[:checked]:text-ink has-[:checked]:shadow-[inset_0_1px_1px_rgba(255,255,255,.5)] has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-hair`}>
                <input type="radio" name="country" value={c} checked={country === c} onChange={() => setCountry(c)} aria-describedby={errs.country ? 'country-err' : undefined} className="sr-only" />
                {t(`countries.${c}`)}
              </label>
            ))}
          </div>
          {errs.country && <p id="country-err" role="alert" className="mt-2 text-[14px] text-err">{t(`errors.${errs.country}`)}</p>}
        </fieldset>
        <BloomPicker name="mode" value={mode} onChange={setMode}
          legend={t.rich('mode', { em: (c) => <em>{c}</em> })}
          options={MODES.map((m) => { const [kicker, label] = t.raw(`modes.${m}`) as [string, string]; return { value: m, kicker, label, mode: m } })}
          error={errs.mode ? t(`errors.${errs.mode}`) : undefined} />
        <UnderlineField label={t('name')} name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={80} placeholder={t('namePh')} error={errs.name ? t(`errors.${errs.name}`) : undefined} />
        <label className="flex cursor-pointer items-start gap-3 text-[15px] font-light text-ink-2">
          <input type="checkbox" name="notify_launch" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-1.5 h-4 w-4 accent-[var(--ink)]" />{t('notify')}
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
