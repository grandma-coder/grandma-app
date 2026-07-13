// components/home/pregnancy/CardSticker.tsx
// The Daily Message accent: a brand sticker glyph inside a soft-tinted circular
// socket — the app's standard icon-chip grammar (paper carries the ink, color is
// a small contained accent), used in place of a bare colored dot.
import { View, StyleSheet } from 'react-native'
import { Heart, Star, Drop, Moon, Flower } from '../../stickers/BrandStickers'
import { cardTint, cardGlyph } from '../../../lib/dailyMessage/cardTint'
import type { StickerColorKey } from '../../../lib/dailyMessage/types'
import type { JourneyMode } from '../../../types'

interface Props {
  color: StickerColorKey
  size?: number // socket diameter
  /** Which mode's glyph family to use — cycle vs pregnancy read differently. */
  mode?: JourneyMode
}

export function CardSticker({ color, size = 44, mode = 'pregnancy' }: Props) {
  const tint = cardTint(color)
  const glyph = cardGlyph(color, mode)
  const g = Math.round(size * 0.52)
  // Ink-colored glyph on a soft-tint socket — readable, contained accent.
  const common = { size: g, fill: tint.ink, stroke: tint.ink }

  const sticker =
    glyph === 'Heart' ? <Heart {...common} /> :
    glyph === 'Star' ? <Star {...common} /> :
    glyph === 'Drop' ? <Drop {...common} /> :
    glyph === 'Moon' ? <Moon {...common} /> :
    <Flower size={g} petal={tint.ink} center={tint.soft} stroke={tint.ink} />

  return (
    <View style={[styles.socket, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint.soft }]}>
      {sticker}
    </View>
  )
}

const styles = StyleSheet.create({
  socket: { alignItems: 'center', justifyContent: 'center' },
})
