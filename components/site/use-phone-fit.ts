'use client'

import { useEffect, useState, type RefObject } from 'react'
import { barAway, phoneScale, visibleFraction } from '@/lib/site/phone'
import { PHONE_ID } from './ids'

export const SMALL_QUERY = '(max-width: 900px)'
/** Mobile browsers fire `resize` as the URL bar collapses; ignore pure height jitter below this. */
const HEIGHT_JITTER = 100

/** True when the stylesheet can already fit the phone on its own (tan/atan2 length division, svh-stable). */
export const cssFitsPhone = () =>
  typeof CSS !== 'undefined' && !!CSS.supports?.('width', 'calc(tan(atan2(1px, 1px)) * 1px)')

/** Keep `--s` (scale of the 390x800 device) on the phone slot in step with the window. */
export function usePhoneFit(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (cssFitsPhone()) return // the CSS fit is exact from first paint and ignores URL-bar jitter
    let w = window.innerWidth
    let h = window.innerHeight
    const fit = () => ref.current?.style.setProperty('--s', String(phoneScale(w, h)))
    const onResize = () => {
      const nw = window.innerWidth, nh = window.innerHeight
      if (nw === w && Math.abs(nh - h) < HEIGHT_JITTER) return
      w = nw; h = nh
      fit()
    }
    fit()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [ref])
}

/** True while the black bar should slide away: the phone has its own tab bar while it is on screen. */
export function useBarAway(panelOpen: boolean): boolean {
  const [away, setAway] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(SMALL_QUERY)
    const sync = () => {
      const slot = document.getElementById(PHONE_ID)
      const visible = slot ? visibleFraction(slot.getBoundingClientRect(), window.innerHeight) : 0
      setAway(barAway({ small: mq.matches, panelOpen, visible }))
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    mq.addEventListener?.('change', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      mq.removeEventListener?.('change', sync)
    }
  }, [panelOpen])
  return away
}
