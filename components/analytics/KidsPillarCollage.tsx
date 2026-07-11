/**
 * KidsPillarCollage — the "thriving breakdown" as a scattered sticker collage.
 *
 * Diffuse-only. Reference-style: each pillar is its own organic sticker shape
 * (full pastel-vivid fill + soft ink outline) with the pillar NAME + a smaller
 * value line inside. Shapes are absolutely positioned in a fixed canvas via
 * hand-tuned scatter slots (staggered, some overlap) so they read as a loose
 * collage, not a grid — and are sized by score. Tapping a shape drills into
 * that pillar's detail (same as the old PillarRow list it replaces).
 *
 * Shapes + colours reuse the caller's existing PILLAR_CONFIG mapping. Consumers
 * render it inside a `useIsDiffuse()` branch; it does not gate itself.
 */

import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native'
import { useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { Heart, Moon, Cross, Leaf, Burst, Star } from '../ui/Stickers'
import type { PillarScore } from '../../lib/analyticsData'

const SCREEN_W = Dimensions.get('window').width

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
// Reference match: full saturated fill + a soft ink outline (the shapes ARE the
// colour, like the reference's flat vivid blocks).
function PillarShape({ pillar, size, color, stroke }: { pillar: CollagePillarKey; size: number; color: string; stroke: string }) {
  switch (pillar) {
    case 'nutrition': return <Leaf size={size} fill={color} stroke={stroke} />
    case 'sleep':     return <Moon size={size} fill={color} stroke={stroke} />
    case 'mood':      return <Heart size={size} fill={color} stroke={stroke} />
    case 'health':    return <Cross size={size} fill={color} stroke={stroke} />
    case 'growth':    return <Star size={size} fill={color} stroke={stroke} />
    case 'activity':  return <Burst size={size} fill={color} stroke={stroke} points={8} />
  }
}

// Free scatter layout (reference-style). Each pillar gets a hand-placed slot as
// a fraction of the canvas — staggered rows, varied x, some overlap — so the
// shapes read as a loose collage, not a grid. cx/cy are the shape CENTRE as a
// fraction of canvas width/height; rot tilts it. Deterministic (no random).
const CANVAS_H = 440
const SLOTS: Record<CollagePillarKey, { cx: number; cy: number; rot: number }> = {
  nutrition: { cx: 0.26, cy: 0.17, rot: -8 },   // top-left
  sleep:     { cx: 0.72, cy: 0.20, rot: 9 },    // top-right
  mood:      { cx: 0.24, cy: 0.50, rot: -5 },   // mid-left
  health:    { cx: 0.55, cy: 0.46, rot: 6 },    // mid-centre (overlaps neighbours)
  growth:    { cx: 0.80, cy: 0.54, rot: 12 },   // mid-right
  activity:  { cx: 0.44, cy: 0.82, rot: -11 },  // bottom-centre
}

// Tile size scales with score: no-data smallest, 10/10 largest.
function tileSizeFor(score: PillarScore | undefined): number {
  const MIN = 132
  const MAX = 172
  if (!score?.hasData) return MIN
  const t = Math.max(0, Math.min(1, score.value / 10))
  return Math.round(MIN + (MAX - MIN) * t)
}

export function KidsPillarCollage({ items, onPillarPress }: Props) {
  const { colors } = useDiffuseTheme()
  const canvasW = SCREEN_W - 40 // screen minus the section's horizontal padding

  return (
    <View style={[styles.canvas, { width: canvasW, height: CANVAS_H }]}>
      {items.map((item) => {
        const tile = tileSizeFor(item.score)
        const has = !!item.score?.hasData
        const slot = SLOTS[item.key]
        // Position by centre → top-left corner.
        const left = canvasW * slot.cx - tile / 2
        const top = CANVAS_H * slot.cy - tile / 2
        const nameSize = Math.round(tile * 0.15)
        const valSize = Math.round(tile * 0.12)
        return (
          <Pressable
            key={item.key}
            onPress={() => onPillarPress(item.key)}
            style={({ pressed }) => [
              styles.tile,
              { width: tile, height: tile, left, top, opacity: pressed ? 0.82 : has ? 1 : 0.7, transform: [{ rotate: `${slot.rot}deg` }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}${has ? `, ${item.score!.value.toFixed(1)} out of 10` : ', no data'}`}
          >
            {/* The pillar's organic SHAPE — full pastel-vivid fill (reference
                match), soft ink outline, clean on paper. */}
            <View pointerEvents="none" style={styles.shapeLayer}>
              <PillarShape pillar={item.key} size={tile} color={item.color + 'D9'} stroke={colors.ink + '4D'} />
            </View>

            {/* Counter-rotate so text stays upright. Reference layout: pillar
                NAME (prominent) over a smaller value line. */}
            <View style={[styles.inner, { transform: [{ rotate: `${-slot.rot}deg` }] }]}>
              <Text style={[styles.name, { color: colors.ink, fontSize: nameSize }]} numberOfLines={1}>
                {item.label.toLowerCase()}
              </Text>
              <Text style={[styles.val, { color: colors.ink2, fontSize: valSize }]} numberOfLines={1}>
                {has ? `${item.score!.value.toFixed(1)} / 10` : '—'}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  canvas: {
    alignSelf: 'center',
    marginTop: 4,
    position: 'relative',
  },
  tile: {
    position: 'absolute',
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
    gap: 2,
  },
  name: {
    fontFamily: diffuseFont.displayMedium,
    letterSpacing: -0.3,
  },
  val: {
    fontFamily: diffuseFont.mono,
    letterSpacing: 0.4,
  },
})
