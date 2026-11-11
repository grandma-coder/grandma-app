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
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { resolveSymptomId, type SymptomId } from '../../lib/cycleSymptoms'

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

// ─── Site look: symptom stickers ────────────────────────────────────────────
// The light look draws every symptom as a hand-drawn site sticker (same family as the log
// stickers). Where the PNG set has a fitting sticker it is used; the rest are drawn here in the
// same grammar — flat pastel fill + thick ink outline — so the 14 chips read as one set and no
// two symptoms share a picture. Diffuse keeps SymptomSticker above, unchanged.
export const SYMPTOM_SITE_STICKER: Partial<Record<SymptomId, SiteStickerName>> = {
  cramps: 'uterus',
  headache: 'headache',
  fatigue: 'battery',
  nausea: 'nausea',
  'tender-breasts': 'bra',
  insomnia: 'owl',
  cravings: 'banana',
  'low-mood': 'face1',
  energetic: 'sun',
}

/**
 * The sticker for a day's logged symptoms (raw `cycle_logs.value` strings, maybe comma-joined):
 * the first logged symptom that has a site PNG. Null when none does — callers keep the generic
 * symptom sticker. Used by the calendar / day-strip marks so cramps don't show as a headache.
 */
export function symptomMarkSticker(rawValues: Iterable<string>): SiteStickerName | null {
  for (const raw of rawValues) {
    for (const part of raw.split(',')) {
      const id = resolveSymptomId(part.trim())
      const name = id ? SYMPTOM_SITE_STICKER[id] : undefined
      if (name) return name
    }
  }
  return null
}

const SW = 2.4 // ink outline at a 40-unit viewBox ≈ the PNG stickers' stroke at 30–40 px

function SiteGlyph({ id, size }: { id: SymptomId; size: number }) {
  const body = (() => {
    switch (id) {
      case 'cramps': // sharp twinge: a coral bolt
        return <Path d="M23 4 L10 22 L18 22 L14 36 L30 16 L21 16 L26 4 Z" fill="#EE7B6D" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      case 'bloated': // a puffed-up lilac balloon
        return (
          <>
            <Path d="M20 30 Q 20 34 17 37" stroke={INK} strokeWidth={SW - 0.6} fill="none" strokeLinecap="round" />
            <Path d="M18 28 L22 28 L20 31 Z" fill="#C8B6E8" stroke={INK} strokeWidth={SW - 0.6} strokeLinejoin="round" />
            <Circle cx={20} cy={16} r={12} fill="#C8B6E8" stroke={INK} strokeWidth={SW} />
            <Path d="M13 11 Q 15 8 18 8" stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          </>
        )
      case 'nausea': // queasy green face: swirly eyes, wavy mouth
        return (
          <>
            <Circle cx={20} cy={20} r={15} fill="#BDD48C" stroke={INK} strokeWidth={SW} />
            <Path d="M12 16 q 2 -3 4 0 M24 16 q 2 -3 4 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
            <Path d="M12 26 q 2 -2.5 4 0 t 4 0 t 4 0 t 4 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
          </>
        )
      case 'back-pain': // a little peach spine with an ache spark
        return (
          <>
            {[5, 13, 21, 29].map((y) => (
              <Path key={y} d={`M13 ${y} h 12 a 2.5 2.5 0 0 1 0 6 h -12 a 2.5 2.5 0 0 1 0 -6 z`} fill="#F5B896" stroke={INK} strokeWidth={SW - 0.4} />
            ))}
            <Path d="M30 14 l 5 -3 M31 19 h 6 M30 24 l 5 3" stroke="#EE7B6D" strokeWidth={2.4} strokeLinecap="round" />
          </>
        )
      case 'acne': // peach face with a few coral spots
        return (
          <>
            <Circle cx={20} cy={20} r={15} fill="#F5D7B8" stroke={INK} strokeWidth={SW} />
            <Circle cx={14} cy={17} r={1.8} fill={INK} />
            <Circle cx={26} cy={17} r={1.8} fill={INK} />
            <Path d="M15 25 q 5 3 10 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
            <Circle cx={10.5} cy={23} r={2.2} fill="#EE7B6D" stroke={INK} strokeWidth={1.2} />
            <Circle cx={29} cy={22} r={2.2} fill="#EE7B6D" stroke={INK} strokeWidth={1.2} />
            <Circle cx={21} cy={10} r={1.8} fill="#EE7B6D" stroke={INK} strokeWidth={1.2} />
          </>
        )
      case 'spotting': // two small pink drops (lighter than the period drop)
        return (
          <>
            <Path d="M14 8 C 14 8 6 18 6 23 a 8 8 0 0 0 16 0 C 22 18 14 8 14 8 Z" fill="#F2B2C7" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
            <Path d="M29 20 C 29 20 24 26 24 29.5 a 5 5 0 0 0 10 0 C 34 26 29 20 29 20 Z" fill="#F2B2C7" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          </>
        )
      case 'restless': // fidgety blue face, zig-zag mouth and motion lines
        return (
          <>
            <Circle cx={19} cy={21} r={13} fill="#9DC3E8" stroke={INK} strokeWidth={SW} />
            <Circle cx={14} cy={18} r={1.8} fill={INK} />
            <Circle cx={24} cy={18} r={1.8} fill={INK} />
            <Path d="M13 26 l 3 -2 l 3 2 l 3 -2 l 3 2" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M34 10 q 3 3 0 6 M37 7 q 4 5 0 10" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          </>
        )
      default:
        return <Circle cx={20} cy={20} r={14} fill="#F5D652" stroke={INK} strokeWidth={SW} />
    }
  })()
  return (
    <Wrap size={size}>
      <Svg width={size} height={size} viewBox="0 0 40 40">{body}</Svg>
    </Wrap>
  )
}

/** Light-look symptom sticker: the site PNG when one fits, else a drawn glyph in the same style. */
export function SymptomSiteSticker({ id, size = 30 }: { id: SymptomId; size?: number }) {
  const name = SYMPTOM_SITE_STICKER[id]
  return name ? <SiteSticker name={name} size={size} /> : <SiteGlyph id={id} size={size} />
}

/** Light-look sticker for a free-text "Other" symptom: a notebook (she writes it down). */
export function CustomSymptomSiteSticker({ size = 30 }: { size?: number }) {
  return <SiteSticker name="notebook" size={size} />
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
