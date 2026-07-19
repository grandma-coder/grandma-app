/**
 * SymptomSticker — 16px glyph per SymptomId for the unified cycle log forms.
 *
 * Reuses brand stickers where they fit (Drop, Heart, Sleepy, Sad, Bolt);
 * inline SVG for symptoms without a matching brand sticker. Raw hex inside
 * SVG path strings is allowed (design-system exception for sticker assets).
 */
import type { ReactNode } from 'react'
import { View } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { Drop, Heart, Sleepy, Sad, Bolt } from '../ui/Stickers'
import type { SymptomId } from '../../lib/cycleSymptoms'

interface Props {
  id: SymptomId
  size?: number
}

export function SymptomSticker({ id, size = 16 }: Props) {
  switch (id) {
    case 'cramps':         return <Cramp size={size} />
    case 'headache':       return <Headache size={size} />
    case 'bloated':        return <Bloated size={size} />
    case 'fatigue':        return <Sleepy size={size} fill="#9DC3E8" />
    case 'nausea':         return <Nausea size={size} />
    case 'back-pain':      return <BackPain size={size} />
    case 'tender-breasts': return <Heart size={size} fill="#F2B2C7" />
    case 'acne':           return <Acne size={size} />
    case 'insomnia':       return <Moon16 size={size} />
    case 'cravings':       return <Cravings size={size} />
    case 'low-mood':       return <Sad size={size} fill="#9DC3E8" />
    case 'spotting':       return <Drop size={size} fill="#EE7B6D" />
    case 'energetic':      return <Bolt size={size} fill="#F5D652" />
    case 'restless':       return <Restless size={size} />
  }
}

const INK = '#141313'

function Wrap({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  )
}

function Cramp({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M5 12 Q 8 7, 12 9 T 19 12 Q 17 18, 12 16 T 6 14"
          fill="none" stroke="#EE7B6D" strokeWidth={2.2} strokeLinecap="round"
        />
      </Svg>
    </Wrap>
  )
}

function Headache({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} fill="#F5B896" stroke={INK} strokeWidth={1.2} />
        <Path d="M13 6 L 9 13 L 12 13 L 10 18 L 15 11 L 12 11 Z" fill={INK} />
      </Svg>
    </Wrap>
  )
}

function Bloated({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={13} r={8.5} fill="#C8B6E8" stroke={INK} strokeWidth={1.2} />
        <Path d="M8 11 q 4 -3 8 0" stroke={INK} strokeWidth={1} fill="none" />
      </Svg>
    </Wrap>
  )
}

function Nausea({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9} fill="#BDD48C" stroke={INK} strokeWidth={1.2} />
        <Path d="M8 14 q 2 -2 4 0 t 4 0" stroke={INK} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </Wrap>
  )
}

function BackPain({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 4 v 16" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={12} cy={4} r={2.5} fill="#F5B896" stroke={INK} strokeWidth={1} />
        <Path d="M9 9 h 6 M9 13 h 6 M9 17 h 6" stroke="#EE7B6D" strokeWidth={1.4} strokeLinecap="round" />
      </Svg>
    </Wrap>
  )
}

function Acne({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={9} cy={9} r={2.4} fill="#EE7B6D" stroke={INK} strokeWidth={1} />
        <Circle cx={15} cy={11} r={1.8} fill="#EE7B6D" stroke={INK} strokeWidth={1} />
        <Circle cx={10} cy={15} r={2} fill="#EE7B6D" stroke={INK} strokeWidth={1} />
      </Svg>
    </Wrap>
  )
}

function Moon16({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M16 13 a 7 7 0 1 1 -6.5 -8.5 A 6 6 0 0 0 16 13 Z"
          fill="#C8B6E8" stroke={INK} strokeWidth={1.2}
        />
      </Svg>
    </Wrap>
  )
}

function Cravings({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M6 15 h 12 l -2 6 h -8 z" fill="#F5D652" stroke={INK} strokeWidth={1.2} />
        <Circle cx={12} cy={10} r={5} fill="#F2B2C7" stroke={INK} strokeWidth={1.2} />
      </Svg>
    </Wrap>
  )
}

function Restless({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M5 8 q 3 -4 7 0 t 7 0 M5 12 q 3 -4 7 0 t 7 0 M5 16 q 3 -4 7 0 t 7 0"
          stroke="#7048B8" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      </Svg>
    </Wrap>
  )
}

// ─── SymptomBlob — soft-tinted round chip wrapping the existing glyph ──────
// Per-symptom hue, reused from the glyph functions above (same hex values).
// The blob tint is the hue at ~22% alpha (hex `38` suffix) so the glyph on
// top renders at full opacity.
export const SYMPTOM_HUE: Record<SymptomId, string> = {
  cramps: '#EE7B6D',
  headache: '#F5B896',
  bloated: '#C8B6E8',
  fatigue: '#9DC3E8',
  nausea: '#BDD48C',
  'back-pain': '#EE7B6D',
  'tender-breasts': '#F2B2C7',
  acne: '#EE7B6D',
  insomnia: '#C8B6E8',
  cravings: '#F5D652',
  'low-mood': '#9DC3E8',
  spotting: '#EE7B6D',
  energetic: '#F5D652',
  restless: '#7048B8',
}

export function SymptomBlob({ id, size = 40 }: { id: SymptomId; size?: number }) {
  const hue = SYMPTOM_HUE[id]
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: `${hue}38`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SymptomSticker id={id} size={Math.round(size * 0.55)} />
    </View>
  )
}

// Neutral fallback blob for free-text 'Other' symptoms that have no glyph.
export function CustomSymptomBlob({ size = 40 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: `${INK}38`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={Math.round(size * 0.4)} height={Math.round(size * 0.4)} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={4} fill={INK} />
      </Svg>
    </View>
  )
}
