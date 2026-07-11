// Maps a card's sticker color to the cream-paper "soft tint + colored ink" pair
// the rest of grandma.app uses (soft wash background, ink-colored serif text on
// it), instead of a full-saturation fill. Not every sticker key ships a *Soft or
// *Ink token, so this table is explicit and safe.
import { stickers } from '../../constants/theme'
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
