/**
 * HealthScoreRing — 6 colored arcs around a circle with sticker chips on the rim.
 * Big Fraunces score in the center. Ported from the feature-screens reference.
 *
 * Animations (react-native-reanimated):
 *  - Each arc draws clockwise via strokeDashoffset, staggered 80ms.
 *  - Center score counts up from 0 → target (animated TextInput trick).
 *  - Sticker chips fade + spring-scale in after their arc finishes.
 *  - Continuous gentle radial breathing (±1.5px, 4s sine) on the chips.
 */

import { useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../../constants/theme'
import { Heart, Moon, Drop, Cross, Leaf, Flower, Star, Burst } from '../../ui/Stickers'

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

export interface RingSegment {
  /** Sticker key: renders the matching paper-bordered chip */
  sticker: 'heart' | 'moon' | 'drop' | 'cross' | 'leaf' | 'flower' | 'star' | 'burst'
  /** Arc color (use token.stickers.*) */
  color: string
  /** Optional identifier passed back to onSegmentPress (e.g. pillar key). */
  id?: string
}

interface Props {
  score: number
  /** Text below the score (e.g. "your score", "thriving") */
  caption?: string
  /** Exactly 6 segments. Order begins at -90° (top) and wraps clockwise. */
  segments: RingSegment[]
  size?: number
  /** Called when a sticker chip is tapped. Receives the segment's id. */
  onSegmentPress?: (id: string) => void
}

const STAGGER_MS = 80
const ARC_DURATION = 520
const CHIP_DELAY_OFFSET = 260      // chip pops partway through arc draw
const SCORE_INTRO_DELAY = 200
const SCORE_DURATION = 900
const BREATHE_PERIOD = 4000

export function HealthScoreRing({
  score,
  caption = 'your score',
  segments,
  size = 220,
  onSegmentPress,
}: Props) {
  const { colors, font } = useTheme()
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38

  const arcCount = Math.min(6, segments.length)
  const segAngle = 360 / arcCount
  // Each arc spans (segAngle - gap) degrees; arcLength = r * arc_rad
  const arcDegrees = Math.max(1, segAngle - 8)
  const arcLen = ((arcDegrees * Math.PI) / 180) * r

  const arcPath = (from: number, to: number) => {
    const fr = (from * Math.PI) / 180
    const tr = (to * Math.PI) / 180
    const x1 = cx + r * Math.cos(fr)
    const y1 = cy + r * Math.sin(fr)
    const x2 = cx + r * Math.cos(tr)
    const y2 = cy + r * Math.sin(tr)
    const large = to - from > 180 ? 1 : 0
    return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`
  }

  // ─── Shared values ───────────────────────────────────────────────────────
  // Arc draw progress (0 → 1)
  const d0 = useSharedValue(0)
  const d1 = useSharedValue(0)
  const d2 = useSharedValue(0)
  const d3 = useSharedValue(0)
  const d4 = useSharedValue(0)
  const d5 = useSharedValue(0)
  const draws = [d0, d1, d2, d3, d4, d5]

  // Chip scale/opacity (0 → 1)
  const c0 = useSharedValue(0)
  const c1 = useSharedValue(0)
  const c2 = useSharedValue(0)
  const c3 = useSharedValue(0)
  const c4 = useSharedValue(0)
  const c5 = useSharedValue(0)
  const chips = [c0, c1, c2, c3, c4, c5]

  // Center score (0 → target) + fade
  const scoreV = useSharedValue(0)
  const scoreOpacity = useSharedValue(0)

  // Continuous radial breathing phase
  const breathe = useSharedValue(0)

  // ─── Run animations when score changes ────────────────────────────────────
  useEffect(() => {
    // Reset
    draws.forEach((s) => {
      s.value = 0
    })
    chips.forEach((s) => {
      s.value = 0
    })
    scoreV.value = 0
    scoreOpacity.value = 0

    // Arc draw-ins — staggered
    draws.forEach((s, i) => {
      s.value = withDelay(
        i * STAGGER_MS,
        withTiming(1, { duration: ARC_DURATION, easing: Easing.out(Easing.cubic) }),
      )
    })

    // Chip pop-ins — spring after arc starts drawing
    chips.forEach((s, i) => {
      s.value = withDelay(
        i * STAGGER_MS + CHIP_DELAY_OFFSET,
        withSpring(1, { damping: 12, stiffness: 180, mass: 0.6 }),
      )
    })

    // Score count-up + fade
    scoreOpacity.value = withDelay(
      SCORE_INTRO_DELAY,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
    )
    scoreV.value = withDelay(
      SCORE_INTRO_DELAY,
      withTiming(score, { duration: SCORE_DURATION, easing: Easing.out(Easing.cubic) }),
    )

    // Breathing — start once, infinite loop
    breathe.value = 0
    breathe.value = withRepeat(
      withTiming(Math.PI * 2, { duration: BREATHE_PERIOD, easing: Easing.linear }),
      -1,
      false,
    )

    return () => {
      cancelAnimation(breathe)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score])

  // ─── Animated arc props — strokeDashoffset from arcLen → 0 ───────────────
  const ap0 = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - d0.value) }))
  const ap1 = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - d1.value) }))
  const ap2 = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - d2.value) }))
  const ap3 = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - d3.value) }))
  const ap4 = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - d4.value) }))
  const ap5 = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - d5.value) }))
  const arcAnimProps = [ap0, ap1, ap2, ap3, ap4, ap5]

  // ─── Chip animated styles — position (with wobble) + scale + opacity ─────
  // Wobble: each chip drifts radially ±1.5px, phase-offset for organic feel.
  // Inlined per-index to satisfy hooks-rules (same pattern as WellnessScoreArc).
  const wobbleAmp = 1.5
  const chipSize = 36
  const chipPos = (i: number): number => {
    'worklet'
    return -90 + i * segAngle + segAngle / 2
  }

  const cs0 = useAnimatedStyle(() => { const a = (chipPos(0) * Math.PI) / 180; const rr = r + wobbleAmp * Math.sin(breathe.value + 0 * 1.05); return { left: cx + rr * Math.cos(a) - chipSize / 2, top: cy + rr * Math.sin(a) - chipSize / 2, opacity: c0.value, transform: [{ scale: 0.6 + 0.4 * c0.value }] } })
  const cs1 = useAnimatedStyle(() => { const a = (chipPos(1) * Math.PI) / 180; const rr = r + wobbleAmp * Math.sin(breathe.value + 1 * 1.05); return { left: cx + rr * Math.cos(a) - chipSize / 2, top: cy + rr * Math.sin(a) - chipSize / 2, opacity: c1.value, transform: [{ scale: 0.6 + 0.4 * c1.value }] } })
  const cs2 = useAnimatedStyle(() => { const a = (chipPos(2) * Math.PI) / 180; const rr = r + wobbleAmp * Math.sin(breathe.value + 2 * 1.05); return { left: cx + rr * Math.cos(a) - chipSize / 2, top: cy + rr * Math.sin(a) - chipSize / 2, opacity: c2.value, transform: [{ scale: 0.6 + 0.4 * c2.value }] } })
  const cs3 = useAnimatedStyle(() => { const a = (chipPos(3) * Math.PI) / 180; const rr = r + wobbleAmp * Math.sin(breathe.value + 3 * 1.05); return { left: cx + rr * Math.cos(a) - chipSize / 2, top: cy + rr * Math.sin(a) - chipSize / 2, opacity: c3.value, transform: [{ scale: 0.6 + 0.4 * c3.value }] } })
  const cs4 = useAnimatedStyle(() => { const a = (chipPos(4) * Math.PI) / 180; const rr = r + wobbleAmp * Math.sin(breathe.value + 4 * 1.05); return { left: cx + rr * Math.cos(a) - chipSize / 2, top: cy + rr * Math.sin(a) - chipSize / 2, opacity: c4.value, transform: [{ scale: 0.6 + 0.4 * c4.value }] } })
  const cs5 = useAnimatedStyle(() => { const a = (chipPos(5) * Math.PI) / 180; const rr = r + wobbleAmp * Math.sin(breathe.value + 5 * 1.05); return { left: cx + rr * Math.cos(a) - chipSize / 2, top: cy + rr * Math.sin(a) - chipSize / 2, opacity: c5.value, transform: [{ scale: 0.6 + 0.4 * c5.value }] } })
  const chipStyles = [cs0, cs1, cs2, cs3, cs4, cs5]

  // ─── Center score animated props + style ─────────────────────────────────
  const scoreTextProps = useAnimatedProps(() => {
    const v = scoreV.value
    // Show 1 decimal so the running digits feel alive
    return { text: v.toFixed(1), defaultValue: v.toFixed(1) } as any
  })
  const scoreContainerStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: 0.88 + 0.12 * scoreOpacity.value }],
  }))

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {segments.slice(0, arcCount).map((seg, i) => {
          const from = -90 + i * segAngle + 4
          const to = -90 + (i + 1) * segAngle - 4
          return (
            <AnimatedPath
              key={i}
              d={arcPath(from, to)}
              stroke={seg.color}
              strokeWidth={22}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${arcLen}, ${arcLen}`}
              animatedProps={arcAnimProps[i]}
            />
          )
        })}
      </Svg>

      {/* Sticker chips — animated position + scale, tappable if handler provided */}
      {segments.slice(0, arcCount).map((seg, i) => {
        const isTappable = !!(seg.id && onSegmentPress)
        const baseStyle = [
          styles.chip,
          {
            width: chipSize,
            height: chipSize,
            backgroundColor: colors.surface,
            borderColor: colors.text,
          },
          chipStyles[i],
        ]
        if (isTappable) {
          return (
            <AnimatedPressable
              key={i}
              hitSlop={8}
              onPress={() => onSegmentPress!(seg.id!)}
              style={baseStyle}
            >
              <StickerByKey kind={seg.sticker} color={seg.color} />
            </AnimatedPressable>
          )
        }
        return (
          <Animated.View key={i} style={baseStyle}>
            <StickerByKey kind={seg.sticker} color={seg.color} />
          </Animated.View>
        )
      })}

      {/* Center score — animated count-up via TextInput trick */}
      <Animated.View style={[styles.center, scoreContainerStyle]} pointerEvents="none">
        <AnimatedTextInput
          editable={false}
          underlineColorAndroid="transparent"
          style={[
            styles.scoreText,
            { color: colors.text, fontFamily: font.display },
          ]}
          animatedProps={scoreTextProps}
        />
        <Text
          style={[
            styles.captionText,
            { color: colors.textMuted, fontFamily: font.body },
          ]}
        >
          {caption}
        </Text>
      </Animated.View>
    </View>
  )
}

// Animated Pressable — so `style` can accept animated values
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

function StickerByKey({ kind, color }: { kind: RingSegment['sticker']; color: string }) {
  const size = 22
  switch (kind) {
    case 'heart':
      return <Heart size={size} fill={color} />
    case 'moon':
      return <Moon size={size} fill={color} />
    case 'drop':
      return <Drop size={size} fill={color} />
    case 'cross':
      return <Cross size={size} fill={color} />
    case 'leaf':
      return <Leaf size={size} fill={color} />
    case 'flower':
      return <Flower size={size} petal={color} />
    case 'star':
      return <Star size={size} fill={color} />
    case 'burst':
      return <Burst size={size} fill={color} />
  }
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    position: 'relative',
  },
  chip: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 54,
    lineHeight: 62,
    padding: 0,
    textAlign: 'center',
    minWidth: 100,
  },
  captionText: {
    fontSize: 12,
    marginTop: 4,
  },
})
