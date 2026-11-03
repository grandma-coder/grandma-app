import { MODES_ID } from './ids'
import { SMALL_QUERY } from './use-phone-fit'

export const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Phones only: bring the phase switch (and with it the whole phone) back under the site bar after driving it from the black bar. */
export function showPhone() {
  if (!window.matchMedia?.(SMALL_QUERY).matches) return
  const el = document.getElementById(MODES_ID)
  if (!el) return
  const top = el.getBoundingClientRect().top
  if (top < 60 || top > window.innerHeight * 0.3) {
    window.scrollTo({ top: window.scrollY + top - 66, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }
}
