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

// Sticker glyph per pillar — same shape language as the pillar list + ring.
function PillarShape({ pillar, size, color }: { pillar: CollagePillarKey; size: number; color: string }) {
  const { colors } = useDiffuseTheme()
  const stroke = colors.ink
  switch (pillar) {
    case 'nutrition': return <Leaf size={size} fill={color} stroke={stroke} />
    case 'sleep':     return <Moon size={size} fill={color} stroke={stroke} />
    case 'mood':      return <Heart size={size} fill={color} stroke={stroke} />
    case 'health':    return <Cross size={size} fill={color} stroke={stroke} />
    case 'growth':    return <Star size={size} fill={color} stroke={stroke} />
    case 'activity':  return <Burst size={size} fill={color} stroke={stroke} points={8} />
  }
}

// Gentle per-index rotations so the collage feels hand-placed, not gridded
// (within the app's sticker-rotation band, −14°…+14°).
const ROTATIONS = [-9, 7, -5, 11, -13, 6]

// Tile size scales with score: no-data smallest, 10/10 largest.
function tileSizeFor(score: PillarScore | undefined): number {
  const MIN = 96
  const MAX = 132
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
        const glyph = Math.round(tile * 0.42)
        const has = !!item.score?.hasData
        const rot = ROTATIONS[i % ROTATIONS.length]
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
            {/* Soft grainy bloom in the pillar hue — the Diffuse "colour" layer. */}
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <SoftBloom color={item.color} cx="50%" cy="42%" opacity={isDark ? 0.3 : 0.4} spread={0.5} radius="52%" />
              <DiffuseGrain radius={tile / 2} opacity={0.05} />
            </View>

            {/* Counter-rotate the content so text stays upright inside the tilted tile. */}
            <View style={[styles.inner, { transform: [{ rotate: `${-rot}deg` }] }]}>
              <PillarShape pillar={item.key} size={glyph} color={item.color} />
              <Text style={[styles.label, { color: colors.ink }]} numberOfLines={1}>{item.label}</Text>
              <Text style={[styles.score, { color: has ? colors.ink2 : colors.ink3 }]}>
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
    gap: 6,
    marginTop: 4,
  },
  tile: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontFamily: diffuseFont.display,
    fontSize: 14,
    letterSpacing: -0.2,
    marginTop: 4,
  },
  score: {
    fontFamily: diffuseFont.mono,
    fontSize: 12,
    letterSpacing: 0.6,
  },
})
