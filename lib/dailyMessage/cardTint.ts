// Maps a card's sticker color to the cream-paper "soft tint + colored ink" pair
// the rest of grandma.app uses (soft wash background, ink-colored serif text on
// it), instead of a full-saturation fill. Not every sticker key ships a *Soft or
// *Ink token, so this table is explicit and safe.
import { stickers } from '../../constants/theme'
import type { JourneyMode } from '../../types'
import type { StickerColorKey } from './types'

export interface CardTint {
  soft: string // gentle wash background
  ink: string  // readable text/heading color on the wash
}

// Static (light) sticker palette. The surfaces that render these are on the
// current cream system, which uses the light sticker constants.
const TINT: Record<StickerColorKey, CardTint> = {
  yellow: { soft: stickers.yellowSoft, ink: stickers.yellowInk },
  blue:   { soft: stickers.blueSoft,   ink: stickers.blueInk },
  pink:   { soft: stickers.pinkSoft,   ink: stickers.pinkInk },
  green:  { soft: stickers.greenSoft,  ink: stickers.greenInk },
  lilac:  { soft: stickers.lilacSoft,  ink: stickers.lilacInk },
  peach:  { soft: stickers.peachSoft,  ink: stickers.peachInk },
  // coral has no *Soft — reuse the peach wash (warm, adjacent) with coral ink.
  coral:  { soft: stickers.peachSoft,  ink: stickers.coralInk },
  // charcoal is not used as a card background (removed in content), but keep a
  // safe mapping so the type stays total.
  charcoal: { soft: stickers.peachSoft, ink: stickers.charcoal },
}

export function cardTint(color: StickerColorKey): CardTint {
  return TINT[color]
}

// Hairline border tone for a tinted card — the ink at low alpha reads as a soft
// colored edge rather than a hard outline.
export function cardHairline(color: StickerColorKey): string {
  return cardTint(color).ink + '22'
}

// A sticker glyph name per card color, so each card gets a real sticker accent
// (in a tinted socket) instead of a bare dot — matching the app's icon-chip
// grammar. Names map to exports in components/stickers/BrandStickers.tsx.
export type StickerGlyph = 'Heart' | 'Star' | 'Drop' | 'Moon' | 'Flower'

// Pregnancy leans Heart/Star — the baby-and-wonder feel.
const GLYPH_PREGNANCY: Record<StickerColorKey, StickerGlyph> = {
  yellow: 'Star',
  blue: 'Drop',
  pink: 'Heart',
  green: 'Flower',
  lilac: 'Moon',
  peach: 'Heart',
  coral: 'Heart',
  charcoal: 'Star',
}

// Cycle / women's-general leans Moon/Flower/Drop — the lunar-cycle, blossoming,
// flow language. Deliberately no Heart (that reads as the pregnancy/baby motif)
// so the two behaviors are visually distinct even at a glance.
const GLYPH_PREPREGNANCY: Record<StickerColorKey, StickerGlyph> = {
  yellow: 'Star',
  blue: 'Drop',
  pink: 'Flower',
  green: 'Flower',
  lilac: 'Moon',
  peach: 'Moon',
  coral: 'Drop',
  charcoal: 'Star',
}

const GLYPH_BY_MODE: Record<JourneyMode, Record<StickerColorKey, StickerGlyph>> = {
  pregnancy: GLYPH_PREGNANCY,
  'pre-pregnancy': GLYPH_PREPREGNANCY,
  kids: GLYPH_PREGNANCY, // no kids bank yet; safe default keeps the type total
}

export function cardGlyph(color: StickerColorKey, mode: JourneyMode = 'pregnancy'): StickerGlyph {
  return GLYPH_BY_MODE[mode][color]
}
