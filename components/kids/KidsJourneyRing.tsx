/**
 * KidsJourneyRing — interactive rotating wheel of 10 growth leaps.
 *
 * Mirrors PregnancyJourneyRing's rotation/snap/tap mechanics but adapted for
 * kids: each dot represents one growth leap (week 5 → week 75), labeled W{n}
 * inside, colored per leap, anchored at 6 o'clock when selected.
 */

import React, { useRef, useState, useMemo, useCallback } from 'react'
import { View, Text, ScrollView, PanResponder, StyleSheet } from 'react-native'
import Svg, { Circle, Polygon } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
  withDecay,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../constants/theme'

// ─── Layout constants ────────────────────────────────────────────────────────
const SVG_SIZE = 320
const CX = SVG_SIZE / 2
const CY = SVG_SIZE / 2
const RING_R = 128
const ANCHOR_DEG = 90

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Leap {
  week: number
  name: string
  desc: string
  color: string
}

interface DotConfig {
  index: number
  bx: number
  by: number
  size: number
  color: string
  state: 'past' | 'current' | 'future'
}

interface Props {
  leaps: Leap[]
  /** Child's current age in weeks (post-birth) — drives current/past/future */
  weekAge: number
  childName: string
}

function leapState(weekAge: number, leapWeek: number): 'past' | 'current' | 'future' {
  if (weekAge >= leapWeek - 2 && weekAge <= leapWeek + 1) return 'current'
  if (weekAge > leapWeek + 1) return 'past'
  return 'future'
}

function buildDotConfigs(leaps: Leap[], weekAge: number): DotConfig[] {
  return leaps.map((l, i) => {
    const angleDeg = (i / leaps.length) * 360 - 90
    const angleRad = angleDeg * (Math.PI / 180)
    const bx = CX + RING_R * Math.cos(angleRad)
    const by = CY + RING_R * Math.sin(angleRad)
    const state = leapState(weekAge, l.week)
    const size = state === 'current' ? 56 : state === 'past' ? 44 : 38
    return { index: i, bx, by, size, color: l.color, state }
  })
}

export function KidsJourneyRing({ leaps, weekAge, childName }: Props) {
  const { font, colors } = useTheme()
  const insets = useSafeAreaInsets()

  const dots = useMemo(() => buildDotConfigs(leaps, weekAge), [leaps, weekAge])
  const N = leaps.length

  // Default: snap the closest "current" leap to the anchor; otherwise snap the
  // closest leap by week age (whichever leap the child is nearest to).
  const initialIndex = useMemo(() => {
    let best = 0
    let bestDiff = Infinity
    leaps.forEach((l, i) => {
      const d = Math.abs(weekAge - l.week)
      if (d < bestDiff) { bestDiff = d; best = i }
    })
    return best
  }, [leaps, weekAge])

  const initialRot = 180 - (initialIndex / N) * 360
  const rotationDeg = useSharedValue(initialRot)

  const dotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationDeg.value}deg` }],
  }))

  // ── Selected leap state ───────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  const selectedDerived = useDerivedValue(() => {
    let best = 0
    let bestDiff = Infinity
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 360 - 90 + rotationDeg.value
      const normalized = (((a - ANCHOR_DEG) % 360) + 360) % 360
      const absDiff = normalized > 180 ? 360 - normalized : normalized
      if (absDiff < bestDiff) {
        bestDiff = absDiff
        best = i
      }
    }
    return best
  })

  useAnimatedReaction(
    () => selectedDerived.value,
    (idx, prev) => {
      if (idx !== prev) runOnJS(setSelectedIndex)(idx)
    },
  )

  // ── Gesture refs ──────────────────────────────────────────────────────────
  const tangentRef = useRef({ x: 0, y: 1 })
  const lastDxRef = useRef(0)
  const lastDyRef = useRef(0)
  const velocityRef = useRef(0)
  const totalMoveRef = useRef(0)
  const initLocRef = useRef({ x: 0, y: 0 })

  const snapToIndex = useCallback(
    (i: number) => {
      const target = 180 - (i / N) * 360
      let diff = ((target - rotationDeg.value) % 360 + 360) % 360
      if (diff > 180) diff -= 360
      cancelAnimation(rotationDeg)
      rotationDeg.value = withTiming(rotationDeg.value + diff, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      })
    },
    [rotationDeg, N],
  )

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

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
        velocityRef.current = 0
        totalMoveRef.current = 0
      },

      onPanResponderMove: (_e, gestureState) => {
        const ddx = gestureState.dx - lastDxRef.current
        const ddy = gestureState.dy - lastDyRef.current
        const arc = ddx * tangentRef.current.x + ddy * tangentRef.current.y
        const delta = (arc / RING_R) * (180 / Math.PI)
        rotationDeg.value += delta
        lastDxRef.current = gestureState.dx
        lastDyRef.current = gestureState.dy
        totalMoveRef.current += Math.abs(delta)
        const tangVel =
          gestureState.vx * tangentRef.current.x + gestureState.vy * tangentRef.current.y
        velocityRef.current = Math.max(
          -300,
          Math.min(300, (tangVel / RING_R) * (180 / Math.PI) * 1000),
        )
      },

      onPanResponderRelease: () => {
        if (totalMoveRef.current < 5) {
          // Tap: find dot nearest to initial touch and snap to it
          const relX = initLocRef.current.x
          const relY = initLocRef.current.y
          let best: number | null = null
          let bestDist = Infinity
          for (let i = 0; i < N; i++) {
            const rad = ((i / N) * 360 - 90 + rotationDeg.value) * (Math.PI / 180)
            const dotX = CX + RING_R * Math.cos(rad)
            const dotY = CY + RING_R * Math.sin(rad)
            const dist = Math.hypot(relX - dotX, relY - dotY)
            if (dist < 32 && dist < bestDist) {
              bestDist = dist
              best = i
            }
          }
          if (best !== null) snapToIndex(best)
        } else {
          // Drag: momentum decay then snap
          rotationDeg.value = withDecay(
            { velocity: velocityRef.current, deceleration: 0.94 },
            (finished) => {
              'worklet'
              if (!finished) return
              let best = 0
              let bestDiff = Infinity
              for (let i = 0; i < N; i++) {
                const a = (i / N) * 360 - 90 + rotationDeg.value
                const norm = (((a - ANCHOR_DEG) % 360) + 360) % 360
                const d = norm > 180 ? 360 - norm : norm
                if (d < bestDiff) {
                  bestDiff = d
                  best = i
                }
              }
              const target = 180 - (best / N) * 360
              let diff = ((target - rotationDeg.value) % 360 + 360) % 360
              if (diff > 180) diff -= 360
              rotationDeg.value = withTiming(rotationDeg.value + diff, {
                duration: 380,
                easing: Easing.out(Easing.cubic),
              })
            },
          )
        }
      },
    }),
  ).current

  // ── Derived display values ────────────────────────────────────────────────
  const selectedLeap = leaps[selectedIndex] ?? leaps[0]
  const selectedState = leapState(weekAge, selectedLeap.week)
  const col = selectedLeap.color
  const ink = colors.text
  const inkMuted = colors.textMuted
  const inkFaint = colors.textFaint
  const orbitStroke = colors.border

  const statusLabel =
    selectedState === 'current' ? 'Now' : selectedState === 'past' ? 'Done' : 'Upcoming'
  const statusColor =
    selectedState === 'current' ? '#EE7B6D' : selectedState === 'past' ? '#8BB356' : col

  // Approximate calendar window for this leap (±1 week)
  const weekRangeLabel = `Week ${Math.max(1, selectedLeap.week - 1)}–${selectedLeap.week + 1}`

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={[styles.title, { color: ink, fontFamily: font.display }]}>
          {childName}'s Journey
        </Text>
        <Text style={[styles.subtitle, { color: inkMuted, fontFamily: font.bodyMedium }]}>
          Week {weekAge} · {leaps.length} growth leaps
        </Text>
      </View>

      {/* ── Ring ── */}
      <View style={styles.ringWrap}>
        <View {...panResponder.panHandlers} style={styles.ringStage}>
          {/* Animated layer: leap dots rotate around SVG center */}
          <Animated.View style={[StyleSheet.absoluteFill, dotsAnimatedStyle]}>
            {dots.map((d) => {
              const leap = leaps[d.index]
              const isCurrent = d.state === 'current'
              const isPast = d.state === 'past'
              const isFuture = d.state === 'future'
              const fontSize = d.size >= 52 ? 16 : d.size >= 42 ? 14 : 12
              return (
                <View
                  key={d.index}
                  style={{
                    position: 'absolute',
                    left: d.bx - d.size / 2,
                    top: d.by - d.size / 2,
                    width: d.size,
                    height: d.size,
                    borderRadius: d.size / 2,
                    backgroundColor: isFuture ? d.color + '22' : d.color,
                    borderWidth: 1.5,
                    borderColor: '#141313',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#141313',
                    shadowOffset: { width: 0, height: isCurrent ? 2 : 1 },
                    shadowOpacity: isCurrent ? 0.18 : 0.08,
                    shadowRadius: isCurrent ? 6 : 3,
                    elevation: isCurrent ? 4 : 1,
                    opacity: isFuture ? 0.85 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Fraunces_800ExtraBold',
                      fontSize,
                      color: isFuture ? d.color : isPast ? '#FFFEF8' : '#FFFEF8',
                      letterSpacing: -0.3,
                    }}
                  >
                    W{leap.week}
                  </Text>
                </View>
              )
            })}
          </Animated.View>

          {/* Static layer: orbit + anchor chevron */}
          <Svg width={SVG_SIZE} height={SVG_SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Circle
              cx={CX}
              cy={CY}
              r={RING_R}
              fill="none"
              stroke={orbitStroke}
              strokeWidth={1.5}
            />
            {/* Triangle chevron pointing up at 6 o'clock — leap color */}
            <Polygon
              points={`${CX},${CY + RING_R - 6} ${CX - 9},${CY + RING_R + 9} ${CX + 9},${CY + RING_R + 9}`}
              fill={col}
            />
          </Svg>

          {/* Center overlay */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.centerInner}>
              <Text
                style={[styles.centerLabel, { color: col, fontFamily: font.bodySemiBold }]}
              >
                LEAP {selectedIndex + 1} OF {N}
              </Text>
              <Text
                style={[styles.centerName, { color: ink, fontFamily: font.display }]}
                numberOfLines={2}
              >
                {selectedLeap.name}
              </Text>
              <Text
                style={[styles.centerWeek, { color: inkMuted, fontFamily: font.italic }]}
              >
                {weekRangeLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.hint, { color: inkFaint, fontFamily: font.body }]}>
        ↺ drag to spin · tap any leap
      </Text>

      {/* ── Bottom panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status pill */}
        <View style={styles.metaRow}>
          <Text
            style={[styles.metaLabel, { color: col, fontFamily: font.bodySemiBold }]}
          >
            GROWTH LEAP
          </Text>
          <View
            style={[
              styles.statusPill,
              { borderColor: statusColor + '55', backgroundColor: statusColor + '1A' },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: statusColor, fontFamily: font.bodySemiBold },
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Description card */}
        <View
          style={[
            styles.descCard,
            { backgroundColor: col + '14', borderColor: col + '38' },
          ]}
        >
          <Text style={[styles.descText, { color: ink, fontFamily: font.body }]}>
            {selectedLeap.desc}
          </Text>
        </View>

        {/* Mini progress strip — 10 leap dots */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: inkFaint, fontFamily: font.bodySemiBold }]}
          >
            ALL LEAPS
          </Text>
          <View style={styles.stripRow}>
            {leaps.map((l, i) => {
              const state = leapState(weekAge, l.week)
              const isSel = i === selectedIndex
              const isPast = state === 'past'
              const isCurr = state === 'current'
              return (
                <View
                  key={l.week}
                  style={[
                    styles.stripDot,
                    {
                      backgroundColor: isPast || isCurr ? l.color : l.color + '22',
                      borderColor: isSel ? '#141313' : l.color,
                      borderWidth: isSel ? 2 : 1,
                      width: isSel ? 16 : isCurr ? 14 : 11,
                      height: isSel ? 16 : isCurr ? 14 : 11,
                      borderRadius: 8,
                      opacity: isPast ? 0.55 : 1,
                    },
                  ]}
                />
              )
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 12 },
  title: { fontSize: 26, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, marginTop: 2, letterSpacing: 0.2 },

  ringWrap: { alignItems: 'center', position: 'relative' },
  ringStage: { width: SVG_SIZE, height: SVG_SIZE, position: 'relative' },
  hint: { fontSize: 10, textAlign: 'center', marginTop: 4 },

  centerInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  centerLabel: { fontSize: 10.5, letterSpacing: 1.8, marginBottom: 4 },
  centerName: {
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  centerWeek: { fontSize: 14, marginTop: 4, fontStyle: 'italic' },

  panel: { flex: 1 },
  panelContent: { paddingHorizontal: 24, paddingTop: 14, gap: 16 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaLabel: { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', flex: 1 },
  statusPill: {
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },

  descCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  descText: { fontSize: 15, lineHeight: 22 },

  section: { gap: 10 },
  sectionLabel: { fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase' },

  stripRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  stripDot: { borderRadius: 8 },
})
