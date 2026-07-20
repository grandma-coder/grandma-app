/**
 * dayStickers — per-day glyphs around the CycleJourneyRingFull.
 *
 * Reuses the existing brand sticker set (Drop / Leaf / Moon / LogOvulation)
 * so wheel icons match the Log Activity sheet visual language: filled
 * phase color + ink stroke, no white-on-color disc.
 */

import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Drop, Moon, Leaf } from '../../ui/Stickers'
import { LogOvulation } from '../../stickers/RewardStickers'
import { Character, type CharacterName } from '../../characters/Characters'
import type { CyclePhase } from '../../../lib/cycleLogic'

interface Props {
  phase: CyclePhase
  size: number
  /** Phase accent color used as the sticker fill. */
  bg: string
  /** Glyph color — kept for API parity with previous DaySticker; unused now
   *  because the brand stickers carry their own dark ink stroke. */
  glyph?: string
}

export function DaySticker({ phase, size, bg }: Props) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {phase === 'menstruation' && <Drop size={size} fill={bg} />}
      {phase === 'follicular'   && <Leaf size={size} fill={bg} />}
      {phase === 'ovulation'    && <LogOvulation size={size} fill={bg} />}
      {phase === 'luteal'       && <Moon size={size} fill={bg} />}
    </View>
  )
}

const PHASE_CHARACTER: Record<CyclePhase, CharacterName> = {
  menstruation: 'period',
  follicular: 'sparkle',
  ovulation: 'ovulation',
  luteal: 'night',
}

/** Diffuse per-day phase glyph — Character blob (matches CycleAnalytics). */
export function DayCharacter({ phase, size, color, bg }: { phase: CyclePhase; size: number; color: string; bg?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Character name={PHASE_CHARACTER[phase]} size={size} color={color} bg={bg} />
    </View>
  )
}

/**
 * TodayAura — a ring of tiny dots/sparkles surrounding the today sticker.
 * Renders as an SVG that's slightly bigger than the sticker so the dots
 * sit just outside it. The dots are filled with `color` (phase accent).
 */
interface AuraProps {
  /** Total auras size (should be sticker size + ~10). */
  size: number
  /** Dot color — phase accent. */
  color: string
  /** Number of dots around the ring. */
  count?: number
}

export function TodayAura({ size, color, count = 8 }: AuraProps) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 1.5
  const dotR = Math.max(1.2, size * 0.07)
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(a) * r
        const y = cy + Math.sin(a) * r
        return <Circle key={i} cx={x} cy={y} r={dotR} fill={color} />
      })}
    </Svg>
  )
}
