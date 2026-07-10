/**
 * arcDial — pure layout math for the WOVE-style arc-scroll number dial.
 *
 * Numbers sit on a circular arc; the selected value anchors dead-center at full
 * size + opacity, and neighbours fan out above/below it, shrinking and fading by
 * how far they are from center. This module is the pure, RN-free port of the
 * `.arcpick` render loop in `docs/design/Onboarding.html` — see the ArcDial
 * component (`components/ui/diffuse/pickers/ArcDial.tsx`) for the gesture layer.
 *
 * Constants are copied verbatim from that HTML JS so the native dial matches the
 * design prototype pixel-for-pixel:
 *   CX = -110, CY = 170, R = 300, STEP = 13°
 *   SIZES = [76, 42, 30, 22]   (font size by |k|)
 *   OPAC  = [1, .5, .32, .18]  (opacity by |k|)
 *   window k = -3..3 (7 rows), each value out of [min,max] skipped.
 * For k in -3..3: v = sel + k; a = k*STEP; x = CX + R*cos(a); y = CY + R*sin(a).
 */

/** Arc origin X in the prototype's coordinate space (px). */
export const CX = -110
/** Arc origin Y in the prototype's coordinate space (px). */
export const CY = 170
/** Arc radius (px). */
export const R = 300
/** Angular spacing between adjacent numbers (radians) — 13°. */
export const STEP = (13 * Math.PI) / 180
/** Font size by absolute distance from center (|k|). */
export const SIZES = [76, 42, 30, 22] as const
/** Opacity by absolute distance from center (|k|). */
export const OPAC = [1, 0.5, 0.32, 0.18] as const
/** Half-window: rows span k = -WINDOW..WINDOW. */
export const WINDOW = 3

export interface ArcRow {
  /** The numeric value shown on this row. */
  value: number
  /** Offset from the selected value (-3..3); k === 0 is the centered value. */
  k: number
  /** X position on the arc (px), relative to the arc origin. */
  x: number
  /** Y position on the arc (px), relative to the arc origin. */
  y: number
  /** Font size in px (SIZES[|k|]). */
  size: number
  /** Opacity 0..1 (OPAC[|k|]). */
  opacity: number
  /** Angle of this row on the arc (radians) — used to rotate the glyph. */
  angleRad: number
}

/**
 * Build the visible rows for a dial centered on `sel`, clamped to [min, max].
 * Values outside the range are skipped, so the window is <7 rows near an edge.
 */
export function arcNumberLayout(sel: number, min: number, max: number): ArcRow[] {
  const rows: ArcRow[] = []
  for (let k = -WINDOW; k <= WINDOW; k++) {
    const value = sel + k
    if (value < min || value > max) continue
    const angleRad = k * STEP
    const x = CX + R * Math.cos(angleRad)
    const y = CY + R * Math.sin(angleRad)
    const i = Math.abs(k)
    rows.push({
      value,
      k,
      x,
      y,
      size: SIZES[i],
      opacity: OPAC[i],
      angleRad,
    })
  }
  return rows
}
