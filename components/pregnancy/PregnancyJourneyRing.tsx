import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, PanResponder, StyleSheet,
} from 'react-native'
import Svg, { Circle, Polygon } from 'react-native-svg'
import { BabyIllustration } from '../home/pregnancy/babyIllustrations'
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
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { getWeekData } from '../../lib/pregnancyData'
import { getWeekStat } from '../../lib/weekStats'
import { useTheme } from '../../constants/theme'

// ─── Layout constants ────────────────────────────────────────────────────────
const SVG_SIZE = 320
const CX = SVG_SIZE / 2
const CY = SVG_SIZE / 2
const RING_R = 128
const ANCHOR_DEG = 90

// ─── Color helpers ───────────────────────────────────────────────────────────
// Warm earthy palette — matches WeekCard cream/peach/coral aesthetic
const TRI_COLOR = {
  t1: '#BDD48C', // sage — early weeks (fresh, growing)
  t2: '#EE7B6D', // coral — middle weeks (vibrant)
  t3: '#D94A3E', // terracotta — late weeks (rich, ripe)
} as const

const TRI_NAMES = ['FIRST', 'SECOND', 'THIRD'] as const

function triColor(w: number): string {
  if (w <= 13) return TRI_COLOR.t1
  if (w <= 26) return TRI_COLOR.t2
  return TRI_COLOR.t3
}

function triIndex(w: number): 0 | 1 | 2 {
  if (w <= 13) return 0
  if (w <= 26) return 1
  return 2
}

function articleFor(name: string): 'a' | 'an' {
  return /^[aeiou]/i.test(name.trim()) ? 'an' : 'a'
}

function formatWeightValue(g: number | null): string {
  if (g == null) return '<1'
  if (g < 1000) return String(g)
  return (g / 1000).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function formatWeightUnit(g: number | null): string {
  if (g == null || g < 1000) return 'g'
  return 'kg'
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

// ─── Log type display map — palette harmonized with WeekCard ────────────────
const LOG_DISPLAY: Record<string, { label: string; color: string }> = {
  weight:      { label: 'Weight',       color: '#EE7B6D' }, // coral
  mood:        { label: 'Mood',         color: '#F5D652' }, // mustard
  kick:        { label: 'Kicks',        color: '#D94A3E' }, // terracotta
  symptom:     { label: 'Symptom',      color: '#F5B896' }, // peach
  sleep:       { label: 'Sleep',        color: '#2A1F4A' }, // deep purple
  appointment: { label: 'Appt',         color: '#F5D652' }, // mustard
  exercise:    { label: 'Exercise',     color: '#BDD48C' }, // sage
  water:       { label: 'Water',        color: '#BDD48C' }, // sage
  vitamins:    { label: 'Vitamins',     color: '#F5B896' }, // peach
  contraction: { label: 'Contractions', color: '#D94A3E' }, // terracotta
}

// ─── Pre-calculated dot geometry ────────────────────────────────────────────
type DotState = 'past' | 'current' | 'future'

interface DotConfig {
  week: number
  bx: number
  by: number
  size: number
  state: DotState
  color: string  // trimester accent (future outline + past fade tone)
  opacity: number
}

function buildDotConfigs(currentWeek: number): DotConfig[] {
  return Array.from({ length: 40 }, (_, i) => {
    const w = i + 1
    const angleDeg = (i / 40) * 360 - 90
    const angleRad = angleDeg * (Math.PI / 180)
    const bx = CX + RING_R * Math.cos(angleRad)
    const by = CY + RING_R * Math.sin(angleRad)
    const state: DotState = w === currentWeek ? 'current' : w < currentWeek ? 'past' : 'future'
    // Past fruits grow gently across the journey so later weeks read bigger
    const pastSize = 14 + (i / 40) * 4   // 14 → 18
    const size =
      state === 'current' ? 26 :
      state === 'past'    ? pastSize :
      8                                   // future: small outline marker
    const opacity =
      state === 'future' ? 1 :
      state === 'past'   ? 0.55 + (i / Math.max(1, currentWeek)) * 0.40 : // 0.55 → 0.95
      1
    return { week: w, bx, by, size, state, color: triColor(w), opacity }
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
  const insets = useSafeAreaInsets()

  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  const dots = useMemo(() => buildDotConfigs(weekNumber), [weekNumber])

  const initialRot = 180 - ((weekNumber - 1) / 40) * 360
  const rotationDeg = useSharedValue(initialRot)

  const dotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationDeg.value}deg` }],
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
        // Velocity: gestureState.vx/vy in px/ms → project → deg/s, cap ±300
        const tangVel = gestureState.vx * tangentRef.current.x +
                        gestureState.vy * tangentRef.current.y
        velocityRef.current = Math.max(-300, Math.min(300,
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
            if (dist < 18 && dist < bestDist) { bestDist = dist; best = i }
          }
          if (best !== null) snapToWeek(best + 1)
        } else {
          // Drag: momentum decay, then snap to nearest week
          rotationDeg.value = withDecay(
            { velocity: velocityRef.current, deceleration: 0.94 },
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
  const stat = getWeekStat(selectedWeek)
  const triName = TRI_NAMES[triIndex(selectedWeek)]
  const sizeName = weekData.babySize.toLowerCase()
  const article = articleFor(sizeName)
  const statusLabel = isCurrWeek ? 'You are here' : isPastWeek ? 'Completed' : 'Upcoming'
  const dateLabel = dueDate ? formatDateRange(dueDate, selectedWeek) : '—'

  // Theme-aware colors for SVG (must be strings for SVG props)
  const orbitStroke = colors.border

  return (
    <View style={styles.container}>
      {/* ── Ring ── */}
      <View style={styles.ringWrap}>
        <View {...panResponder.panHandlers} style={styles.ringStage}>
          {/* Animated layer: per-week fruit stickers rotate around SVG center */}
          <Animated.View style={[StyleSheet.absoluteFill, dotsAnimatedStyle]}>
            {dots.map((d) => (
              <View
                key={d.week}
                style={{
                  position: 'absolute',
                  left: d.bx - d.size / 2,
                  top:  d.by - d.size / 2,
                  width: d.size,
                  height: d.size,
                  opacity: d.opacity,
                }}
              >
                {d.state === 'future' ? (
                  // Tiny hollow circle marker
                  <Svg width={d.size} height={d.size}>
                    <Circle
                      cx={d.size / 2} cy={d.size / 2} r={d.size / 2 - 1}
                      fill="none"
                      stroke={d.color}
                      strokeWidth={1.2}
                    />
                  </Svg>
                ) : (
                  // Past + current: little fruit silhouette (no eyes/smile at this size)
                  <BabyIllustration
                    week={d.week}
                    size={d.size}
                    character={false}
                  />
                )}
              </View>
            ))}
          </Animated.View>
          {/* Static layer: orbit track + fixed anchor chevron at 6 o'clock */}
          <Svg width={SVG_SIZE} height={SVG_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={CX} cy={CY} r={RING_R}
              fill="none"
              stroke={orbitStroke}
              strokeWidth={1.5}
            />
            {/* Triangle chevron pointing up at 6 o'clock — trimester color */}
            <Polygon
              points={`${CX},${CY + RING_R - 6} ${CX - 9},${CY + RING_R + 9} ${CX + 9},${CY + RING_R + 9}`}
              fill={col}
            />
          </Svg>

          {/* Center overlay — inside ringStage so it centers on the SVG, not the full row */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.centerInner}>
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
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.textFaint, fontFamily: font.body }]}>
        ↺ drag to spin · tap any week
      </Text>

      {/* ── Bottom panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Trimester meta + status pill */}
        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: col, fontFamily: font.bodySemiBold }]}>
            WEEK · {triName} TRIMESTER
          </Text>
          <View style={[styles.statusPill, { borderColor: col + '55', backgroundColor: col + '1A' }]}>
            <Text style={[styles.statusPillText, { color: col, fontFamily: font.bodySemiBold }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Size name + date range */}
        <View style={styles.sizeRow}>
          <Text style={[styles.dateLabel, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
            {dateLabel}
          </Text>
          <Text style={[styles.sizeText, { color: colors.text, fontFamily: font.display }]} numberOfLines={1}>
            {article}{' '}
            <Text style={[styles.sizeNameAccent, { color: col, fontFamily: font.italic }]}>
              {sizeName}
            </Text>
          </Text>
        </View>

        {/* LENGTH / WEIGHT stats — Fraunces serif numbers */}
        <View style={styles.statsRow}>
          <View style={[styles.statCell, { borderTopColor: col + '66' }]}>
            <Text style={[styles.statLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
              LENGTH
            </Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: font.display }]}>
              {stat.cm}
              <Text style={[styles.statUnit, { color: colors.textSecondary, fontFamily: font.italic }]}>
                cm
              </Text>
            </Text>
          </View>
          <View style={[styles.statCell, { borderTopColor: col + '66' }]}>
            <Text style={[styles.statLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
              WEIGHT
            </Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: font.display }]}>
              {formatWeightValue(stat.g)}
              <Text style={[styles.statUnit, { color: colors.textSecondary, fontFamily: font.italic }]}>
                {formatWeightUnit(stat.g)}
              </Text>
            </Text>
          </View>
        </View>

        {/* This week milestone note */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
            THIS WEEK
          </Text>
          <Text style={[styles.noteText, { color: colors.textSecondary, fontFamily: font.body }]}>
            {weekData.developmentFact}
          </Text>
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
      </ScrollView>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  ringWrap: { alignItems: 'center', position: 'relative' },
  ringStage: { width: SVG_SIZE, height: SVG_SIZE, position: 'relative' },
  hint: { fontSize: 10, textAlign: 'center', marginTop: 2 },

  centerInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel:  { fontSize: 11, letterSpacing: 1.5, marginBottom: 2 },
  centerNumber: { fontSize: 58, lineHeight: 62 },
  centerStatus: { fontSize: 9, letterSpacing: 1.2, marginTop: 2 },

  panel:        { flex: 1 },
  panelContent: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },

  // Trimester meta row
  metaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  metaLabel:      { fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', flex: 1 },
  statusPill:     { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  statusPillText: { fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Size + date row — date small/muted on left, size name big on right
  sizeRow:        { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  dateLabel:      { fontSize: 12, letterSpacing: 0.2 },
  sizeText:       { fontSize: 26, letterSpacing: -0.4, textAlign: 'right' },
  sizeNameAccent: { fontSize: 26, fontStyle: 'italic', fontWeight: '400' },

  // Length / Weight stats
  statsRow:       { flexDirection: 'row', gap: 24 },
  statCell:       { flex: 1, borderTopWidth: 1.5, paddingTop: 8, gap: 2 },
  statLabel:      { fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 },
  statValue:      { fontSize: 32, letterSpacing: -1, lineHeight: 36 },
  statUnit:       { fontSize: 14, fontStyle: 'italic', fontWeight: '400' },

  // Sections
  section:      { gap: 8 },
  sectionLabel: { fontSize: 9.5, letterSpacing: 1.8, textTransform: 'uppercase' },
  noteText:     { fontSize: 14, lineHeight: 22 },

  // Log chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 99,
    paddingVertical: 6, paddingHorizontal: 13,
  },
  chipDot:   { width: 6, height: 6, borderRadius: 3 },
  chipText:  { fontSize: 12 },
  emptyLogs: { fontSize: 12, fontStyle: 'italic' },
})
