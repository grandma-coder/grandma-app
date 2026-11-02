'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useDemo } from '@/components/demo/demo'
import { TOUR_STEPS, type TourKey } from '@/lib/demo/reducer'
import { useMobileUi } from './mobile-context'
import { MODES_ID } from './ids'
import { prefersReducedMotion, showPhone } from './phone-nav'
import { SMALL_QUERY } from './use-phone-fit'
import s from './tour.module.css'

const HIT = 'tour-hit'

/** The thing to tap for each step (all live inside the phone, except the phase switch and the hero field). */
const TARGET: Record<TourKey, string> = {
  log: '#phone [data-tour="log"]',
  week: '#phone [data-tour="week"]',
  mode: `#${MODES_ID} button:not([aria-pressed="true"])`,
  shortcuts: '#phone [data-tour="shortcuts"]',
  join: '[data-tour="join"]',
}

const isSmall = () => !!window.matchMedia?.(SMALL_QUERY).matches

/**
 * Hand-drawn onboarding: a sticky note, a drawn arrow and a halo that follow the next thing to tap. Steps live in
 * the demo reducer (`tourDone` advances only on the current key; `skipTour` / `joined` end it). One fixed overlay,
 * positioned from getBoundingClientRect in a rAF loop that stops with the tour and pauses with the tab. Each frame reads
 * the target's rect (plus its phone screen, tab bar and, on small screens, the sticky phase switch, to catch a scrolled-away or covered target) once and writes only when the rect, step, viewport, visibility or busy state changed.
 */
export function Tour() {
  const { state, dispatch } = useDemo()
  const { panel } = useMobileUi()
  const t = useTranslations('v3.tour')
  const tMobile = useTranslations('v3.mobile')
  const { active, step } = state.tour
  const key = TOUR_STEPS[Math.min(step, TOUR_STEPS.length - 1)]
  const busy = state.sheet.kind !== 'none' || panel !== 'none'

  // the loop reads the latest values from here, so it never restarts when they change
  const live = useRef({ key, busy })
  live.current = { key, busy }
  const coach = useRef<HTMLDivElement>(null)
  const note = useRef<HTMLDivElement>(null)
  const arrow = useRef<SVGSVGElement>(null)
  const halo = useRef<HTMLDivElement>(null)
  const go = useRef<HTMLButtonElement>(null)
  const goTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!active) return
    let raf = 0
    let prev: Element | null = null
    const setOn = (el: HTMLElement | null, on: boolean) => {
      if (!el) return
      el.classList.toggle(s.on, on)
      el.dataset.on = String(on)
    }
    const mark = (el: Element | null) => {
      // React can rewrite className on re-render, so re-assert the class every frame
      if (prev && prev !== el) prev.classList.remove(HIT)
      if (el && !el.classList.contains(HIT)) el.classList.add(HIT)
      prev = el
    }
    // last inputs that were written out; a frame whose inputs match touches no styles or classes
    let last = ''
    // the target last scrolled into view inside the phone; once per target, so a reader scrolling away isn't fought
    let nudged: Element | null = null
    const place = () => {
      const { key: k, busy: b } = live.current
      const el = document.querySelector(TARGET[k])
      // layout reads (no writes between): the target, then, inside the phone, its screen and the tab bar over it
      const r = el?.getBoundingClientRect()
      const sc = el?.closest<HTMLElement>('[data-screen]')
      const clip = sc?.getBoundingClientRect()
      const bar = sc && document.querySelector('#phone nav')?.getBoundingClientRect()
      // on small screens the phase switch sticks over the top of the phone, hiding what scrolls under it
      const modes = sc && isSmall() ? document.getElementById(MODES_ID)?.getBoundingClientRect() : undefined
      // a target can sit inside the window yet be scrolled out of the phone screen or under its tab bar
      const floor = clip ? Math.min(clip.bottom, bar ? bar.top - 8 : clip.bottom) : 0
      const inScreen = !clip || (!!r && r.top >= clip.top - 2 && r.bottom <= floor)
      if (sc && clip && r && !inScreen && !b && nudged !== el) {
        nudged = el
        const scale = sc.clientHeight ? clip.height / sc.clientHeight : 1
        const dy = r.bottom > floor ? r.bottom - floor + 16 : r.top - clip.top - 16
        sc.scrollBy?.({ top: dy / scale, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      }
      const iw = window.innerWidth, ih = window.innerHeight
      const underModes = !!modes && !!r && r.top < modes.bottom - 2
      const vis = !!r && r.width > 0 && inScreen && !underModes && r.bottom > 70 && r.top < ih - (isSmall() ? 90 : 10)
      const below = !!r && r.top >= ih - 10 && k !== 'join'
      const show = vis && !b
      const pill = below && !b
      mark(show ? el! : null)
      const sig = `${k}|${show}|${pill}|${iw}x${ih}|${show ? `${r!.left},${r!.top},${r!.width},${r!.height}` : ''}`
      if (sig === last) return
      last = sig
      setOn(coach.current, show)
      setOn(go.current, pill)
      const n = note.current, a = arrow.current, h = halo.current
      if (!show || !r || !n || !a || !h) return
      // the note's size changes only with its text or the viewport, both part of the signature
      const nw = n.offsetWidth, nh = n.offsetHeight
      const pad = 6, cx = r.left + r.width / 2
      Object.assign(h.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` })
      const up = r.top - nh - 52 > 64
      Object.assign(n.style, {
        left: `${Math.max(8, Math.min(iw - nw - 8, cx - nw * 0.75))}px`,
        top: `${up ? r.top - nh - 48 : r.bottom + 48}px`,
      })
      Object.assign(a.style, { left: `${cx - 34}px`, top: `${up ? r.top - 48 : r.bottom + 4}px`, transform: up ? 'none' : 'scaleY(-1)' })
    }
    const frame = () => { place(); raf = requestAnimationFrame(frame) }
    const start = () => { if (!raf) raf = requestAnimationFrame(frame) }
    const stop = () => { cancelAnimationFrame(raf); raf = 0 }
    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)
    if (!document.hidden) start()
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(goTimer.current)
      mark(null)
    }
  }, [active])

  if (!active) return null

  const tryApp = () => {
    document.getElementById(MODES_ID)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    clearTimeout(goTimer.current)
    if (isSmall()) goTimer.current = setTimeout(showPhone, 450)
  }

  return (
    <>
      <div ref={coach} className={s.coach} data-coach data-on="false">
        <svg ref={arrow} className={s.arrow} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
          <g filter="url(#wob)" fill="none" stroke="#161513" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 4C26 6 34 18 30 38" />
            <path d="M22 31L30 39L37 30" />
          </g>
        </svg>
        <div ref={halo} className={s.halo} data-halo aria-hidden="true" />
        <div ref={note} className={s.note} role="region" aria-label={t('label')}>
          <span aria-live="polite">{t(key)}</span>
          <small>
            <span>{t('progress', { n: step + 1, total: TOUR_STEPS.length })}</span>
            <button type="button" onClick={() => dispatch({ type: 'skipTour' })}>{t('skip')}</button>
          </small>
        </div>
      </div>
      <button ref={go} type="button" className={s.go} data-on="false" onClick={tryApp}>{tMobile('goTry')}</button>
    </>
  )
}
