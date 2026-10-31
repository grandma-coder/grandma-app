/** Pure phone-fit and black-bar logic, ported from the mockup's `fitPhone` / `syncBar`. */

export const PHONE_W = 390
export const PHONE_H = 800
/** The black bar steps aside while more than this share of the phone is on screen. */
export const AWAY_THRESHOLD = 0.15

/** Scale of the 390x800 device: it fits between the phase switch (top) and the black bar (bottom), and the column width. */
export function phoneScale(innerWidth: number, innerHeight: number): number {
  const s = Math.min(1, Math.min(innerWidth * 0.82, 340) / PHONE_W, (innerHeight - 240) / PHONE_H)
  return Math.round(Math.max(0.25, s) * 1000) / 1000
}

export interface RectLike { top: number; bottom: number; height: number }

/** Share (0..1) of an element's height inside the viewport. */
export function visibleFraction(r: RectLike, viewportHeight: number): number {
  if (r.height <= 0) return 0
  return Math.max(0, Math.min(r.bottom, viewportHeight) - Math.max(r.top, 0)) / r.height
}

/** Should the black bar slide away? Never on desktop, never while Explorar / the pop-up is open. */
export function barAway({ small, panelOpen, visible }: { small: boolean; panelOpen: boolean; visible: number }): boolean {
  if (!small || panelOpen) return false
  return visible > AWAY_THRESHOLD
}
