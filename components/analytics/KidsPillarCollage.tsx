/**
 * KidsPillarCollage — the "thriving breakdown" as a soft-bloom sticker collage.
 *
 * Diffuse-only. Takes the reference's playful scattered-shapes layout (each
 * metric its own organic shape, value inside) but renders it in the delicate
 * Diffuse language: a low-saturation grainy SoftBloom in the pillar's colour
 * behind a hairline-outlined sticker glyph, on cream — never a loud flat fill.
 *
 * Each pillar is sized by its score (higher = a touch more present; low / no
 * data sits smaller + fainter), lightly rotated, and laid out in a staggered
 * wrap so it reads as a collage, not a table. Tapping a shape drills into that
 * pillar's detail (same as the old PillarRow list it replaces).
 *
 * Shapes + colours reuse the caller's existing PILLAR_CONFIG / stickerForPillar
 * mapping — nothing new invented. Consumers render it inside a `useIsDiffuse()`
 * branch; it does not gate itself.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { SoftBloom, DiffuseGrain } from '../ui/diffuse/DiffuseKit'
import { Heart, Moon, Cross, Leaf, Burst, Star } from '../ui/Stickers'
import type { PillarScore } from '../../lib/analyticsData'

export type CollagePillarKey = 'nutrition' | 'sleep' | 'mood' | 'health' | 'growth' | 'activity'

interface CollageItem {
  key: CollagePillarKey
  label: string
  color: string
  score: PillarScore | undefined
}

interface Props {
  items: CollageItem[]
  onPillarPress: (key: CollagePillarKey) => void
}

// Sticker shape per pillar — same shape language as the pillar list + ring.
// Rendered Diffuse-soft: a translucent tint fill (not the vivid flat colour)
// with a light hairline stroke, so the collage stays delicate.
function PillarShape({ pillar, size, color }: { pillar: CollagePillarKey; size: number; color: string }) {
  const fill = color + '3A'          // ~23% alpha — a soft wash of the hue
  const stroke = color + '80'        // ~50% alpha — hairline in the hue, not ink
  switch (pillar) {
    case 'nutrition': return <Leaf size={size} fill={fill} stroke={stroke} />
    case 'sleep':     return <Moon size={size} fill={fill} stroke={stroke} />
    case 'mood':      return <Heart size={size} fill={fill} stroke={stroke} />
    case 'health':    return <Cross size={size} fill={fill} stroke={stroke} />
    case 'growth':    return <Star size={size} fill={fill} stroke={stroke} />
    case 'activity':  return <Burst size={size} fill={fill} stroke={stroke} points={8} />
  }
}

// Gentle per-index rotations so the collage feels hand-placed, not gridded
// (within the app's sticker-rotation band, −14°…+14°).
const ROTATIONS = [-9, 7, -5, 11, -13, 6]

// Tile size scales with score: no-data smallest, 10/10 largest. Bigger tiles
// than before so the hero number has room to breathe (reference-style).
function tileSizeFor(score: PillarScore | undefined): number {
  const MIN = 116
  const MAX = 150
  if (!score?.hasData) return MIN
  const t = Math.max(0, Math.min(1, score.value / 10))
  return Math.round(MIN + (MAX - MIN) * t)
}

export function KidsPillarCollage({ items, onPillarPress }: Props) {
  const { colors, isDark } = useDiffuseTheme()

  return (
    <View style={styles.wrap}>
      {items.map((item, i) => {
        const tile = tileSizeFor(item.score)
        const has = !!item.score?.hasData
        const rot = ROTATIONS[i % ROTATIONS.length]
        // Hero number sized to the tile (reference-style big figure).
        const numSize = Math.round(tile * 0.34)
        return (
          <Pressable
            key={item.key}
            onPress={() => onPillarPress(item.key)}
            style={({ pressed }) => [
              styles.tile,
              { width: tile, height: tile, opacity: pressed ? 0.8 : has ? 1 : 0.72, transform: [{ rotate: `${rot}deg` }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}${has ? `, ${item.score!.value.toFixed(1)} out of 10` : ', no data'}`}
          >
            {/* The pillar's organic SHAPE fills the tile as the backdrop — the
                reference's "each metric is its own coloured shape". Rendered
                Diffuse-soft (a faint grainy bloom lifts it off the paper). */}
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <SoftBloom color={item.color} cx="50%" cy="50%" opacity={isDark ? 0.24 : 0.32} spread={0.55} radius="58%" />
            </View>
            <View pointerEvents="none" style={styles.shapeLayer}>
              <PillarShape pillar={item.key} size={tile} color={item.color} />
            </View>
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <DiffuseGrain radius={tile / 2} opacity={0.05} />
            </View>

            {/* Counter-rotate the content so text stays upright inside the tilted tile.
                Reference layout: small pillar name over ONE huge number. No notes. */}
            <View style={[styles.inner, { transform: [{ rotate: `${-rot}deg` }] }]}>
              <Text style={[styles.label, { color: colors.ink }]} numberOfLines={1}>{item.label}</Text>
              <Text style={[styles.hero, { color: colors.ink, fontSize: numSize, lineHeight: numSize * 1.02 }]} numberOfLines={1}>
                {has ? item.score!.value.toFixed(1) : '—'}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: diffuseFont.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  hero: {
    fontFamily: diffuseFont.display,
    letterSpacing: -1,
  },
})
