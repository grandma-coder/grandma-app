/**
 * CyclePhaseGlyph — tiny colored phase glyph for the Diffuse cycle calendar.
 *
 * Reuses the existing DaySticker set (Drop / Leaf / LogOvulation / Moon) so the
 * calendar day markers match the Log Activity sheet + journey-ring visual
 * language. Sized small (~11px) and colored by the phase so the month grid can
 * be read at a glance: droplet = period, sprout = fertile/follicular,
 * ovulation glyph = the peak, moon = luteal.
 *
 * Presentational only — given a phase + color, draws the glyph. Phase math and
 * color mapping live in the caller (CycleMonthGrid).
 */

import { View } from 'react-native'
import { DaySticker, DayCharacter } from '../home/cycle/dayStickers'
import type { CyclePhase } from '../../lib/cycleLogic'

interface Props {
  phase: CyclePhase
  /** Phase color used as the glyph fill (from the caller's phaseAccent map). */
  color: string
  /** Glyph size in px. Default 11 — small enough not to crowd the hairline grid. */
  size?: number
  /** When true, render the Diffuse Character blob instead of the legacy sticker. */
  diffuse?: boolean
  /** Blob background (used only when `diffuse` is true). */
  bg?: string
}

export function CyclePhaseGlyph({ phase, color, size = 11, diffuse = false, bg }: Props) {
  if (diffuse) return <DayCharacter phase={phase} size={size} color={color} bg={bg} />
  return <DaySticker phase={phase} size={size} bg={color} />
}

// Re-export the phase → color map so callers + the legend stay in one place.
export const CYCLE_PHASE_ORDER: CyclePhase[] = [
  'menstruation',
  'follicular',
  'ovulation',
  'luteal',
]
