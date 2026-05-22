/**
 * CycleJourneyRing — 170px compact ring hero for the cycle home.
 *
 * 28 day-stickers around a circle. Phase-tinted fills:
 *   days 1–5    → pink-soft  🩸  menstruation
 *   days 6–12   → green-soft 🌱  follicular
 *   days 13–16  → peach-soft ✨  ovulation
 *   days 17–28  → lilac-soft 🌙  luteal
 *
 * Today's day is coral with a hard offset shadow and an enlarged sticker.
 * Tap any day to jump (Slice 1: callback only — onSelectDay).
 * Drag to spin (Slice 1: visual scrub only — committed value via onSelectDay
 * after the gesture settles; we reuse the pregnancy pan-responder pattern).
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { View, Text, PanResponder, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, useAnimatedReaction,
  runOnJS, withTiming, cancelAnimation, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../../constants/theme'
import type { CyclePhase } from '../../../lib/cycleLogic'

const SVG_SIZE = 170
const CX = SVG_SIZE / 2
const CY = SVG_SIZE / 2
const RING_R = 72
const ANCHOR_DEG = 90
const COUNT = 28

interface Props {
  /** 1-based current day in the cycle. */
  cycleDay: number
  /** Total cycle length (typically 28, clamped 21–60 upstream). */
  cycleLength: number
  /** Localized phase label, already capitalised. */
  phaseLabel: string
  /** Display-ready phase noun (e.g. "Menstruation"). */
  phase: CyclePhase
  /** Italic word in the left-column title (e.g. "quiet day"). */
  titleItalic: string
  /** Sub-line (e.g. "May 16 · Menstruation"). */
  subline: string
  /** Period progress copy (e.g. "Period day 1 of ~5"). */
  periodLine: string
  /** Tap hint copy (e.g. "↻ tap any day"). */
  hint: string
  /** Called when the user taps or scrubs to a day. */
  onSelectDay?: (day: number) => void
}

function phaseSticker(d: number): string {
  if (d <= 5) return '🩸'
  if (d <= 12) return '🌱'
  if (d <= 16) return '✨'
  return '🌙'
}

function phaseTint(d: number, st: ReturnType<typeof useTheme>['stickers']): string {
  if (d <= 5) return st.pinkSoft
  if (d <= 12) return st.greenSoft
  if (d <= 16) return st.peachSoft
  return st.lilacSoft
}

export function CycleJourneyRing({
  cycleDay, cycleLength, phaseLabel, phase, titleItalic, subline, periodLine, hint, onSelectDay,
}: Props) {
  const { colors, stickers, font, radius, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const coral = stickers.coral

  // 28-day visualization regardless of actual cycleLength — Slice 1 keeps it
  // simple; we map cycleDay/cycleLength onto the 28-step ring proportionally.
  const todayIndex = useMemo(() => {
    const ratio = (Math.max(1, Math.min(cycleLength, cycleDay)) - 1) / Math.max(1, cycleLength - 1)
    return Math.round(ratio * (COUNT - 1))
  }, [cycleDay, cycleLength])

  const initialRot = 180 - (todayIndex / COUNT) * 360
  const rotationDeg = useSharedValue(initialRot)

  const dotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationDeg.value}deg` }],
  }))

  const [selectedIdx, setSelectedIdx] = useState(todayIndex)
  const selectedDerived = useDerivedValue(() => {
    let best = 0
    let bestDiff = Infinity
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * 360 - 90 + rotationDeg.value
      const normalized = (((a - ANCHOR_DEG) % 360) + 360) % 360
      const absDiff = normalized > 180 ? 360 - normalized : normalized
      if (absDiff < bestDiff) { bestDiff = absDiff; best = i }
    }
    return best
  })

  useAnimatedReaction(
    () => selectedDerived.value,
    (idx, prev) => {
      if (idx !== prev) runOnJS(setSelectedIdx)(idx)
    },
  )

  const snapToIndex = useCallback((idx: number) => {
    const target = 180 - (idx / COUNT) * 360
    let diff = ((target - rotationDeg.value) % 360 + 360) % 360
    if (diff > 180) diff -= 360
    cancelAnimation(rotationDeg)
    rotationDeg.value = withTiming(rotationDeg.value + diff, {
      duration: 320, easing: Easing.out(Easing.cubic),
    })
    onSelectDay?.(idx + 1)
  }, [rotationDeg, onSelectDay])

  // Tangent-projection pan responder — see PregnancyJourneyRing for the math.
  const tangentRef = useRef({ x: 0, y: 1 })
  const lastDxRef = useRef(0)
  const lastDyRef = useRef(0)
  const totalMoveRef = useRef(0)
  const initLocRef = useRef({ x: 0, y: 0 })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        cancelAnimation(rotationDeg)
        const lx = e.nativeEvent.locationX
        const ly = e.nativeEvent.locationY
        initLocRef.current = { x: lx, y: ly }
        const rx = lx - CX
        const ry = ly - CY
        const r = Math.sqrt(rx * rx + ry * ry) || RING_R
        tangentRef.current = { x: -ry / r, y: rx / r }
        lastDxRef.current = 0
        lastDyRef.current = 0
        totalMoveRef.current = 0
      },
      onPanResponderMove: (_e, g) => {
        const ddx = g.dx - lastDxRef.current
        const ddy = g.dy - lastDyRef.current
        const arc = ddx * tangentRef.current.x + ddy * tangentRef.current.y
        const delta = (arc / RING_R) * (180 / Math.PI)
        rotationDeg.value += delta
        lastDxRef.current = g.dx
        lastDyRef.current = g.dy
        totalMoveRef.current += Math.abs(delta)
      },
      onPanResponderRelease: () => {
        if (totalMoveRef.current < 5) {
          // Tap — snap nearest day to the anchor
          const lx = initLocRef.current.x
          const ly = initLocRef.current.y
          let best = 0
          let bestDist = Infinity
          for (let i = 0; i < COUNT; i++) {
            const a = (i / COUNT) * 360 - 90 + rotationDeg.value
            const rad = a * (Math.PI / 180)
            const x = CX + RING_R * Math.cos(rad)
            const y = CY + RING_R * Math.sin(rad)
            const d2 = (x - lx) ** 2 + (y - ly) ** 2
            if (d2 < bestDist) { bestDist = d2; best = i }
          }
          snapToIndex(best)
        } else {
          // Drag — snap to nearest selected
          snapToIndex(selectedIdx)
        }
      },
    }),
  ).current

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: ink, fontFamily: font.display }]}>
          a <Text style={{ fontFamily: font.italic, color: coral }}>{titleItalic}</Text>
        </Text>
        <Text style={[styles.subline, { color: colors.textMuted, fontFamily: font.body }]}>
          {subline}
        </Text>
        <Text style={[styles.periodLine, { color: colors.textMuted, fontFamily: font.body }]}>
          {periodLine}
        </Text>
        <View style={[styles.phasePill, { backgroundColor: stickers.pinkSoft, borderColor: ink }]}>
          <Text style={[styles.phasePillText, { color: ink, fontFamily: font.bodyBold }]} numberOfLines={1}>
            {phaseLabel}
          </Text>
        </View>
        <Text style={[styles.hint, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
          {hint}
        </Text>
      </View>

      <View style={styles.ringWrap} {...panResponder.panHandlers}>
        <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
          <Circle cx={CX} cy={CY} r={RING_R} fill="none" stroke={ink} strokeOpacity={0.25} strokeWidth={0.8} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, dotsAnimatedStyle]}>
          {Array.from({ length: COUNT }, (_, i) => {
            const angle = (i / COUNT) * 2 * Math.PI - Math.PI / 2
            const x = CX + RING_R * Math.cos(angle) - 9
            const y = CY + RING_R * Math.sin(angle) - 9
            const d = i + 1
            const isToday = i === todayIndex
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: isToday ? x - 4 : x,
                  top: isToday ? y - 4 : y,
                  width: isToday ? 26 : 18,
                  height: isToday ? 26 : 18,
                  borderRadius: 999,
                  backgroundColor: isToday ? coral : phaseTint(d, stickers),
                  borderWidth: isToday ? 2 : 1,
                  borderColor: ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: isToday ? 2 : 1,
                  ...(isToday ? { shadowColor: ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 1.5, height: 1.5 }, elevation: 3 } : null),
                }}
                pointerEvents="none"
              >
                <Text style={{ fontSize: isToday ? 13 : 10 }}>{phaseSticker(d)}</Text>
              </View>
            )
          })}
        </Animated.View>

        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.dayLabel, { color: coral, fontFamily: font.bodyBold }]}>Day</Text>
          <Text style={[styles.dayNum, { color: coral, fontFamily: font.displayBold }]}>{cycleDay}</Text>
          <Text style={[styles.dayOf, { color: colors.textMuted, fontFamily: font.bodyBold }]}>
            of {cycleLength}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  left: { flex: 1, gap: 4 },
  title: { fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  subline: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  periodLine: { fontSize: 11, lineHeight: 16 },
  phasePill: {
    alignSelf: 'flex-start', marginTop: 8,
    borderWidth: 1.5, borderRadius: 999,
    paddingVertical: 5, paddingHorizontal: 11,
    shadowColor: '#141313', shadowOpacity: 1, shadowRadius: 0,
    shadowOffset: { width: 2, height: 2 }, elevation: 2,
  },
  phasePillText: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' },
  hint: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 10 },

  ringWrap: { width: SVG_SIZE, height: SVG_SIZE, justifyContent: 'center', alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  dayLabel: { fontSize: 8, letterSpacing: 1.8, textTransform: 'uppercase' },
  dayNum: { fontSize: 42, lineHeight: 44 },
  dayOf: { fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
})
