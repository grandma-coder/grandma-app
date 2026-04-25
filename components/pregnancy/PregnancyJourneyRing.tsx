import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, PanResponder, StyleSheet,
} from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
  withDecay,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getWeekData } from '../../lib/pregnancyData'
import { useTheme } from '../../constants/theme'

const AnimatedG = Animated.createAnimatedComponent(G)

// ─── Layout constants ────────────────────────────────────────────────────────
const SVG_SIZE = 320
const CX = SVG_SIZE / 2
const CY = SVG_SIZE / 2
const RING_R = 128
const ANCHOR_DEG = 90

// ─── Color helpers ───────────────────────────────────────────────────────────
function triColor(w: number): string {
  if (w <= 13) return '#A2FF86'
  if (w <= 26) return '#B983FF'
  return '#FF6B35'
}

// ─── Date utilities ──────────────────────────────────────────────────────────
function getWeekDateRange(dueDate: string, week: number): { start: string; end: string } {
  const due = new Date(dueDate)
  const start = new Date(due)
  start.setDate(due.getDate() - (40 - week) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const toISO = (d: Date) => d.toISOString().split('T')[0]
  return { start: toISO(start), end: toISO(end) }
}

function formatDateRange(dueDate: string, week: number): string {
  const { start, end } = getWeekDateRange(dueDate, week)
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`
}

// ─── Log type display map ────────────────────────────────────────────────────
const LOG_DISPLAY: Record<string, { label: string; color: string }> = {
  weight:      { label: 'Weight',       color: '#A2FF86' },
  mood:        { label: 'Mood',         color: '#B983FF' },
  kick:        { label: 'Kicks',        color: '#FF8AD8' },
  symptom:     { label: 'Symptom',      color: '#FF6B35' },
  sleep:       { label: 'Sleep',        color: '#4D96FF' },
  appointment: { label: 'Appt',         color: '#FBBF24' },
  exercise:    { label: 'Exercise',     color: '#A2FF86' },
  water:       { label: 'Water',        color: '#4D96FF' },
  vitamins:    { label: 'Vitamins',     color: '#FF8AD8' },
  contraction: { label: 'Contractions', color: '#FF6B35' },
}

// ─── Pre-calculated dot geometry ────────────────────────────────────────────
interface DotConfig {
  week: number
  bx: number
  by: number
  r: number
  fill: string
  fillOpacity: number
  strokeColor: string
  strokeWidth: number
}

function buildDotConfigs(currentWeek: number): DotConfig[] {
  return Array.from({ length: 40 }, (_, i) => {
    const w = i + 1
    const angleDeg = (i / 40) * 360 - 90
    const angleRad = angleDeg * (Math.PI / 180)
    const bx = CX + RING_R * Math.cos(angleRad)
    const by = CY + RING_R * Math.sin(angleRad)
    const col = triColor(w)
    const baseR = w <= 13 ? 5 : w <= 26 ? 6 : 7
    const isCurr = w === currentWeek
    const isPast = w < currentWeek
    const isFuture = w > currentWeek
    return {
      week: w,
      bx,
      by,
      r: isCurr ? baseR + 3 : baseR,
      fill: isFuture ? 'none' : col,
      fillOpacity: isFuture ? 0 : isPast ? 0.35 + (i / currentWeek) * 0.55 : 1,
      strokeColor: isFuture ? col : 'none',
      strokeWidth: isFuture ? 1 : 0,
    }
  })
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  weekNumber: number
  dueDate: string
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PregnancyJourneyRing({ weekNumber, dueDate }: Props) {
  const { font, colors } = useTheme()

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  const dots = useMemo(() => buildDotConfigs(weekNumber), [weekNumber])

  const initialRot = 180 - ((weekNumber - 1) / 40) * 360
  const rotationDeg = useSharedValue(initialRot)

  const animatedGroupProps = useAnimatedProps(() => ({
    rotation: rotationDeg.value,
    originX: CX,
    originY: CY,
  }))

  // ── Selected week state ────────────────────────────────────────────────────
  const [selectedWeek, setSelectedWeek] = useState(weekNumber)

  const selectedWeekDerived = useDerivedValue(() => {
    let best = 0
    let bestDiff = Infinity
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * 360 - 90 + rotationDeg.value
      // Proper positive modulo — JS % is negative for negative inputs
      const normalized = ((( a - ANCHOR_DEG) % 360) + 360) % 360
      const absDiff = normalized > 180 ? 360 - normalized : normalized
      if (absDiff < bestDiff) {
        bestDiff = absDiff
        best = i
      }
    }
    return best + 1
  })

  useAnimatedReaction(
    () => selectedWeekDerived.value,
    (week, prev) => {
      if (week !== prev) runOnJS(setSelectedWeek)(week)
    },
  )

  // ── Logged activity types for selected week ────────────────────────────────
  const { data: weekLogTypes = [] } = useQuery({
    queryKey: ['pregnancy-week-logs', userId, selectedWeek, dueDate],
    queryFn: async (): Promise<string[]> => {
      if (!userId || !dueDate) return []
      const { start, end } = getWeekDateRange(dueDate, selectedWeek)
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('log_type')
        .eq('user_id', userId)
        .gte('log_date', start)
        .lte('log_date', end)
      if (error) throw error
      return [...new Set((data ?? []).map((r: { log_type: string }) => r.log_type))]
    },
    enabled: !!userId && !!dueDate,
    staleTime: 30_000,
  })

  // ── Gesture refs ──────────────────────────────────────────────────────────────
  // Strategy: tangent-projection avoids all coordinate-system issues with SVG.
  // locationX/locationY is only read ONCE at touch start (reliable — no child
  // interference yet). All subsequent tracking uses gestureState.dx/dy
  // (cumulative translation since start, never jumps).
  const tangentRef   = useRef({ x: 0, y: 1 })  // unit tangent at touch start
  const lastDxRef    = useRef(0)
  const lastDyRef    = useRef(0)
  const velocityRef  = useRef(0)                // deg/s
  const totalMoveRef = useRef(0)                // accumulated |delta| deg
  const initLocRef   = useRef({ x: 0, y: 0 })  // locationX/Y at grant

  // Snap to week — short-arc, JS thread.
  const snapToWeek = useCallback(
    (w: number) => {
      const target = 180 - ((w - 1) / 40) * 360
      let diff = ((target - rotationDeg.value) % 360 + 360) % 360
      if (diff > 180) diff -= 360
      cancelAnimation(rotationDeg)
      rotationDeg.value = withTiming(rotationDeg.value + diff, {
        duration: 380,
        easing: Easing.out(Easing.cubic),
      })
    },
    [rotationDeg],
  )

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: (e) => {
        cancelAnimation(rotationDeg)
        // locationX/Y at first touch is reliable — no SVG child interference yet
        const lx = e.nativeEvent.locationX
        const ly = e.nativeEvent.locationY
        initLocRef.current = { x: lx, y: ly }
        // Unit tangent at touch point: perpendicular to radius (clockwise)
        const rx = lx - CX
        const ry = ly - CY
        const r  = Math.sqrt(rx * rx + ry * ry) || RING_R
        tangentRef.current  = { x: -ry / r, y: rx / r }
        lastDxRef.current   = 0
        lastDyRef.current   = 0
        velocityRef.current = 0
        totalMoveRef.current = 0
      },

      onPanResponderMove: (_e, gestureState) => {
        // Delta from last event using gestureState (cumulative, never jumps)
        const ddx = gestureState.dx - lastDxRef.current
        const ddy = gestureState.dy - lastDyRef.current
        // Project onto tangent → arc length → degrees
        const arc   = ddx * tangentRef.current.x + ddy * tangentRef.current.y
        const delta = (arc / RING_R) * (180 / Math.PI)
        rotationDeg.value   += delta
        lastDxRef.current    = gestureState.dx
        lastDyRef.current    = gestureState.dy
        totalMoveRef.current += Math.abs(delta)
        // Velocity: gestureState.vx/vy in px/ms → project → deg/s
        const tangVel = gestureState.vx * tangentRef.current.x +
                        gestureState.vy * tangentRef.current.y
        velocityRef.current = Math.max(-600, Math.min(600,
          (tangVel / RING_R) * (180 / Math.PI) * 1000,
        ))
      },

      onPanResponderRelease: () => {
        if (totalMoveRef.current < 5) {
          // Tap: find dot nearest to initial touch and snap it to anchor
          const relX = initLocRef.current.x
          const relY = initLocRef.current.y
          let best: number | null = null
          let bestDist = Infinity
          for (let i = 0; i < 40; i++) {
            const rad  = ((i / 40) * 360 - 90 + rotationDeg.value) * (Math.PI / 180)
            const dotX = CX + RING_R * Math.cos(rad)
            const dotY = CY + RING_R * Math.sin(rad)
            const dist = Math.hypot(relX - dotX, relY - dotY)
            if (dist < 32 && dist < bestDist) { bestDist = dist; best = i }
          }
          if (best !== null) snapToWeek(best + 1)
        } else {
          // Drag: momentum decay, then snap to nearest week
          rotationDeg.value = withDecay(
            { velocity: velocityRef.current, deceleration: 0.994 },
            (finished) => {
              'worklet'
              if (!finished) return
              let best = 0, bestDiff = Infinity
              for (let i = 0; i < 40; i++) {
                const a    = (i / 40) * 360 - 90 + rotationDeg.value
                const norm = (((a - ANCHOR_DEG) % 360) + 360) % 360
                const d    = norm > 180 ? 360 - norm : norm
                if (d < bestDiff) { bestDiff = d; best = i }
              }
              const target = 180 - (best / 40) * 360
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
    })
  ).current

  // ── Derived display values ─────────────────────────────────────────────────
  const col = triColor(selectedWeek)
  const isCurrWeek = selectedWeek === weekNumber
  const isPastWeek = selectedWeek < weekNumber
  const weekData = getWeekData(selectedWeek)
  const statusLabel = isCurrWeek ? 'You are here' : isPastWeek ? 'Completed' : 'Upcoming'
  const dateLabel = dueDate ? formatDateRange(dueDate, selectedWeek) : '—'

  // Theme-aware colors for SVG (must be strings for SVG props)
  const orbitStroke = colors.border
  const futureDotBg = colors.border

  return (
    <View style={styles.container}>
      {/* ── Ring ── */}
      <View style={styles.ringWrap}>
        <View {...panResponder.panHandlers}>
          <Svg width={SVG_SIZE} height={SVG_SIZE}>
            {/* Faint orbit track */}
            <Circle
              cx={CX} cy={CY} r={RING_R}
              fill="none"
              stroke={orbitStroke}
              strokeWidth={1.5}
            />
            {/* Rotating dot group */}
            <AnimatedG animatedProps={animatedGroupProps}>
              {dots.map((d) => (
                <Circle
                  key={d.week}
                  cx={d.bx} cy={d.by} r={d.r}
                  fill={d.fill}
                  fillOpacity={d.fillOpacity}
                  stroke={d.strokeColor}
                  strokeWidth={d.strokeWidth}
                />
              ))}
            </AnimatedG>
            {/* Fixed selection ring at anchor (6 o'clock) — trimester color */}
            <Circle
              cx={CX} cy={CY + RING_R} r={14}
              fill={col + '22'}
              stroke={col}
              strokeWidth={2}
            />
            {/* Anchor dot indicator */}
            <Circle cx={CX} cy={CY + RING_R + 10} r={3} fill={col} />
          </Svg>
        </View>

        {/* Center overlay */}
        <View style={styles.centerOverlay} pointerEvents="none">
          <Text style={[styles.centerLabel, { color: col, fontFamily: font.bodySemiBold }]}>
            WEEK
          </Text>
          <Text style={[styles.centerNumber, { color: col, fontFamily: font.display }]}>
            {selectedWeek}
          </Text>
          <Text style={[styles.centerStatus, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
            {isCurrWeek ? 'YOU ARE HERE' : isPastWeek ? 'COMPLETED' : 'UPCOMING'}
          </Text>
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.textFaint, fontFamily: font.body }]}>
        ↺ drag to spin · tap any week
      </Text>

      {/* ── Bottom panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date range + status pill */}
        <View style={styles.dateRow}>
          <Text style={[styles.dateText, { color: col, fontFamily: font.bodySemiBold }]}>
            {dateLabel}
          </Text>
          <View style={[styles.statusPill, { borderColor: col + '44', backgroundColor: col + '18' }]}>
            <Text style={[styles.statusPillText, { color: col, fontFamily: font.bodySemiBold }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Logged this week */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
            LOGGED THIS WEEK
          </Text>
          {weekLogTypes.length > 0 ? (
            <View style={styles.chipsRow}>
              {weekLogTypes.map((type) => {
                const display = LOG_DISPLAY[type] ?? { label: type, color: colors.textSecondary }
                return (
                  <View
                    key={type}
                    style={[styles.chip, {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceGlass,
                    }]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: display.color }]} />
                    <Text style={[styles.chipText, { color: colors.textSecondary, fontFamily: font.bodySemiBold }]}>
                      {display.label}
                    </Text>
                  </View>
                )
              })}
            </View>
          ) : (
            <Text style={[styles.emptyLogs, { color: colors.textFaint, fontFamily: font.body }]}>
              {isCurrWeek
                ? 'Nothing logged yet this week.'
                : isPastWeek
                ? 'No logs recorded for this week.'
                : 'Future week — nothing to log yet.'}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* This week milestone note */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
            THIS WEEK
          </Text>
          <Text style={[styles.noteText, { color: colors.textSecondary, fontFamily: font.body }]}>
            {weekData.developmentFact}
          </Text>
        </View>

        {/* 40-dot progress strip */}
        <View style={styles.progressStrip}>
          {Array.from({ length: 40 }, (_, i) => {
            const w = i + 1
            const dotCol = triColor(w)
            const isSelected = w === selectedWeek
            const isCurr = w === weekNumber
            const isPast = w < weekNumber
            return (
              <View
                key={w}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: isPast || isCurr ? dotCol : futureDotBg,
                    opacity: isPast ? 0.45 : 1,
                    width: isCurr ? 7 : isSelected ? 6 : 5,
                    height: isCurr ? 7 : isSelected ? 6 : 5,
                    borderRadius: 4,
                    shadowColor: isCurr ? dotCol : 'transparent',
                    shadowRadius: isCurr ? 4 : 0,
                    shadowOpacity: isCurr ? 1 : 0,
                  },
                ]}
              />
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  ringWrap: { alignItems: 'center', position: 'relative' },
  hint: { fontSize: 10, textAlign: 'center', marginTop: 2 },

  centerOverlay: {
    position: 'absolute',
    top: 0, left: 0,
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel:  { fontSize: 11, letterSpacing: 1.5, marginBottom: 2 },
  centerNumber: { fontSize: 58, lineHeight: 62 },
  centerStatus: { fontSize: 9, letterSpacing: 1.2, marginTop: 2 },

  panel:        { flex: 1 },
  panelContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 16 },

  dateRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText:       { fontSize: 13, fontWeight: '600' },
  statusPill:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  statusPillText: { fontSize: 10, letterSpacing: 0.5 },

  section:      { gap: 8 },
  sectionLabel: { fontSize: 9, letterSpacing: 1.8 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 99,
    paddingVertical: 6, paddingHorizontal: 13,
  },
  chipDot:   { width: 6, height: 6, borderRadius: 3 },
  chipText:  { fontSize: 12 },
  emptyLogs: { fontSize: 12, fontStyle: 'italic' },

  divider:       { height: 1 },
  noteText:      { fontSize: 14, lineHeight: 22 },

  progressStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  progressDot:   { borderRadius: 3 },
})
