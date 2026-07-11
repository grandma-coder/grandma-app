/**
 * PillarCharacters — playful hand-drawn creature glyphs for the 6 kids pillars.
 *
 * Each pillar is an organic blob silhouette with two little dot eyes, filled
 * flat in the pillar's hue (no outline) — the "character sticker" language.
 * Replaces the traditional line-icons in the Vault pillar-band rows.
 *
 * This is an ILLUSTRATION ASSET file: raw hex in SVG path/eye fills is allowed
 * per DESIGN_SYSTEM.md §0. Colour comes in via the `color` prop (the pillar hue)
 * and `eye` (contrasting dot colour).
 */

import Svg, { Path, Circle } from 'react-native-svg'

export type PillarCharacterKey = 'nutrition' | 'sleep' | 'mood' | 'health' | 'growth' | 'activity'

interface Props {
  pillar: PillarCharacterKey
  size?: number
  /** Blob fill — the pillar hue. */
  color: string
  /** Dot-eye colour (defaults to a warm near-black that reads on every hue). */
  eye?: string
}

// Silhouette path (48×48 viewBox) + eye coordinates per pillar — ported from the
// approved glyph exploration.
const PATHS: Record<PillarCharacterKey, { d: string; e: [number, number, number, number] }> = {
  // sprout — round belly with two little leaves up top
  nutrition: {
    d: 'M24 44c-9 0-16-6-16-15 0-7 5-12 11-13-2-4-1-9 3-11 1-1 2 0 2 1 0 2-1 4 0 6 2-3 5-4 8-3 1 0 1 2 0 2-3 1-5 3-5 6 6 1 13 6 13 14 0 9-7 13-16 13Z',
    e: [19, 30, 29, 30],
  },
  // moon — plump crescent creature
  sleep: {
    d: 'M32 4C18 4 8 13 8 25s10 21 24 20c2 0 2-2 0-3-8-3-14-9-14-18S24 9 32 6c2-1 2-2 0-2Z',
    e: [19, 20, 27, 23],
  },
  // heart — soft wobbly heart
  mood: {
    d: 'M24 43C11 34 6 26 6 18 6 11 11 7 16 7c4 0 7 3 8 6 1-3 4-6 8-6 5 0 10 4 10 11 0 8-5 16-18 25Z',
    e: [18, 19, 30, 19],
  },
  // plus — rounded chubby cross
  health: {
    d: 'M19 8c0-2 2-4 5-4s5 2 5 4v6h6c2 0 4 2 4 5s-2 5-4 5h-6v6c0 2-2 4-5 4s-5-2-5-4v-6H8c-2 0-4-2-4-5s2-5 4-5h11V8Z',
    e: [20, 25, 28, 25],
  },
  // star — lumpy 5-point, soft tips
  growth: {
    d: 'M24 4c1 0 2 1 3 3l3 7c1 1 2 2 3 2l8 1c3 0 4 3 2 5l-6 5c-1 1-1 2-1 3l2 8c1 3-2 4-4 3l-7-4c-1-1-2-1-3 0l-7 4c-2 1-5 0-4-3l2-8c0-1 0-2-1-3l-6-5c-2-2-1-5 2-5l8-1c1 0 2-1 3-2l3-7c1-2 2-3 3-3Z',
    e: [21, 24, 27, 24],
  },
  // spark — soft 6-point blossom
  activity: {
    d: 'M24 3c1 0 2 1 2 3 1 4 2 6 5 5 3-2 5 0 4 3-1 3-1 5 2 6 3 1 3 4 0 5-3 1-3 3-2 6 1 3-1 5-4 3-3-1-4 1-5 5 0 2-1 3-2 3s-2-1-2-3c-1-4-2-6-5-5-3 2-5 0-4-3 1-3 1-5-2-6-3-1-3-4 0-5 3-1 3-3 2-6-1-3 1-5 4-3 3 1 4-1 5-5 0-2 1-3 2-3Z',
    e: [21, 22, 27, 22],
  },
}

export function PillarCharacter({ pillar, size = 24, color, eye = '#1A1916' }: Props) {
  const { d, e } = PATHS[pillar]
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d={d} fill={color} />
      <Circle cx={e[0]} cy={e[1]} r={2.2} fill={eye} />
      <Circle cx={e[2]} cy={e[3]} r={2.2} fill={eye} />
    </Svg>
  )
}
