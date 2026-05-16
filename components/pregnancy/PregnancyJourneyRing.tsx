import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, PanResponder, StyleSheet,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
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
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { getWeekData } from '../../lib/pregnancyData'
import { getWeekStat } from '../../lib/weekStats'
import { toDateStr } from '../../lib/cycleLogic'
import { useTranslation } from '../../lib/i18n'
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
  // Inverse of weekForDate(): week W contains the 7 days ending
  // (40 - W) * 7 days before the due date.
  const due = new Date(dueDate + 'T00:00:00')
  const end = new Date(due)
  end.setDate(due.getDate() - (40 - week) * 7)
  const start = new Date(end)
  start.setDate(end.getDate() - 6)
  const toISO = (d: Date) => toDateStr(d)
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
// Per-log-type color map. Labels resolve via i18n at render time via
// LOG_LABEL_KEY below.
const LOG_DISPLAY: Record<string, { labelKey: string; color: string }> = {
  weight:      { labelKey: 'preg_ring_log_weight',      color: '#EE7B6D' }, // coral
  mood:        { labelKey: 'preg_ring_log_mood',        color: '#F5D652' }, // mustard
  kick:        { labelKey: 'preg_ring_log_kicks',       color: '#D94A3E' }, // terracotta
  symptom:     { labelKey: 'preg_ring_log_symptom',     color: '#F5B896' }, // peach
  sleep:       { labelKey: 'preg_ring_log_sleep',       color: '#2A1F4A' }, // deep purple
  appointment: { labelKey: 'preg_ring_log_appointment', color: '#F5D652' }, // mustard
  exercise:    { labelKey: 'preg_ring_log_exercise',    color: '#BDD48C' }, // sage
  water:       { labelKey: 'preg_ring_log_water',       color: '#BDD48C' }, // sage
  vitamins:    { labelKey: 'preg_ring_log_vitamins',    color: '#F5B896' }, // peach
  contraction: { labelKey: 'preg_ring_log_contraction', color: '#D94A3E' }, // terracotta
  nutrition:   { labelKey: 'preg_ring_log_nutrition',   color: '#BDD48C' }, // sage
  kegel:       { labelKey: 'preg_ring_log_kegel',       color: '#C8A8E8' }, // lilac
  kick_count:  { labelKey: 'preg_ring_log_kicks',       color: '#D94A3E' }, // terracotta
  nesting:     { labelKey: 'preg_ring_log_nesting',     color: '#F5D652' }, // mustard
  birth_prep:  { labelKey: 'preg_ring_log_birthPrep',   color: '#F5B896' }, // peach
  exam_result: { labelKey: 'preg_ring_log_examResult',  color: '#F5D652' }, // mustard
}

function formatLogDay(dateISO: string): string {
  const d = new Date(dateISO + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

// ─── Pillar grouping ─────────────────────────────────────────────────────────
// Each log_type rolls up into a single high-level summary for the week.
// `summarize` returns the right-hand text shown next to the pillar label.
type WeekLogLite = {
  log_type: string
  value: string | null
  notes: string | null
  severity: string | null
  duration_seconds: number | null
  log_date: string
}

function num(s: string | null): number | null {
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

function summarizePillar(type: string, logs: WeekLogLite[]): string {
  const count = logs.length
  if (count === 0) return ''
  const lastByDate = [...logs].sort((a, b) => (a.log_date < b.log_date ? 1 : -1))
  const last = lastByDate[0]
  const nums = logs.map((l) => num(l.value)).filter((n): n is number => n != null)
  const sum = nums.reduce((a, b) => a + b, 0)
  const avg = nums.length ? sum / nums.length : null
  const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString()

  switch (type) {
    case 'weight':
      return last.value ? `${last.value} kg · latest` : `${count}× logged`
    case 'water':
      return nums.length ? `${fmt(sum, 0)} ml total · ${count}×` : `${count}× logged`
    case 'sleep':
      return avg != null ? `${fmt(avg)} h avg · ${count} nights` : `${count}× logged`
    case 'exercise':
      return nums.length ? `${fmt(sum, 0)} min · ${count} sessions` : `${count}× logged`
    case 'nutrition':
      return nums.length ? `${fmt(sum, 0)} kcal · ${count} meals` : `${count} meals`
    case 'kick':
    case 'kick_count':
      return nums.length ? `${fmt(sum, 0)} kicks · ${count} sessions` : `${count}× logged`
    case 'mood': {
      const moods = logs.map((l) => l.value).filter((v): v is string => !!v)
      const tally = moods.reduce<Record<string, number>>((acc, m) => {
        acc[m] = (acc[m] ?? 0) + 1
        return acc
      }, {})
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]
      return top ? `mostly ${top} · ${count} entries` : `${count} entries`
    }
    case 'symptom': {
      const names = Array.from(new Set(logs.map((l) => l.value).filter((v): v is string => !!v)))
      if (names.length === 0) return `${count}× logged`
      if (names.length <= 2) return `${names.join(', ')} · ${count}×`
      return `${names.slice(0, 2).join(', ')} +${names.length - 2} · ${count}×`
    }
    case 'vitamins':
      return `${count} day${count === 1 ? '' : 's'} taken`
    case 'contraction':
      return `${count} session${count === 1 ? '' : 's'}`
    case 'kegel':
      return `${count} session${count === 1 ? '' : 's'}`
    case 'appointment':
      return `${count} appointment${count === 1 ? '' : 's'}`
    case 'nesting':
    case 'birth_prep':
      return `${count} task${count === 1 ? '' : 's'}`
    case 'exam_result':
      return `${count} result${count === 1 ? '' : 's'}`
    default:
      return `${count}× logged`
  }
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
    // All weeks render as fruit illustrations — size grows gently along the
    // journey so later weeks read bigger; current week pops slightly larger.
    const baseSize = 14 + (i / 40) * 4 // 14 → 18
    const size = state === 'current' ? 26 : baseSize
    const opacity =
      state === 'current' ? 1 :
      state === 'past'    ? 0.55 + (i / Math.max(1, currentWeek)) * 0.40 : // 0.55 → 0.95
      0.45                                                                  // future: faded but visible
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
  const { t } = useTranslation()

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

  // ── Logged entries for selected week ───────────────────────────────────────
  interface WeekLog {
    id: string
    log_type: string
    log_date: string
    value: string | null
    notes: string | null
    severity: string | null
    duration_seconds: number | null
  }

  const { data: weekLogs = [], refetch: refetchWeekLogs } = useQuery({
    queryKey: ['pregnancy-week-logs', userId, selectedWeek, dueDate, weekNumber],
    queryFn: async (): Promise<WeekLog[]> => {
      if (!userId) return []
      let start: string
      let end: string
      if (dueDate) {
        const range = getWeekDateRange(dueDate, selectedWeek)
        start = range.start
        end = range.end
      } else {
        // No due date set — fall back to a 7-day window ending today for the
        // current week, and show nothing for other selected weeks since we
        // can't anchor them to real dates.
        if (selectedWeek !== weekNumber) return []
        const today = new Date()
        const endD = new Date(today)
        const startD = new Date(today)
        startD.setDate(today.getDate() - 6)
        const toISO = (d: Date) => toDateStr(d)
        start = toISO(startD)
        end = toISO(endD)
      }
      const { data, error } = await supabase
        .from('pregnancy_logs')
        .select('id, log_type, log_date, value, notes, severity, duration_seconds')
        .eq('user_id', userId)
        .gte('log_date', start)
        .lte('log_date', end)
        .order('log_date', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as WeekLog[]
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Refetch logs whenever this screen regains focus (so newly-saved logs show up)
  useFocusEffect(
    useCallback(() => {
      void refetchWeekLogs()
    }, [refetchWeekLogs]),
  )

  // Group logs by pillar (log_type) for the high-level summary list.
  const pillarGroups = useMemo(() => {
    const byType = new Map<string, WeekLog[]>()
    for (const log of weekLogs) {
      const arr = byType.get(log.log_type) ?? []
      arr.push(log)
      byType.set(log.log_type, arr)
    }
    return Array.from(byType.entries())
      .map(([type, logs]) => {
        const display = LOG_DISPLAY[type]
        const label = display ? t(display.labelKey as any) : type
        const color = display?.color ?? '#999'
        const lastDate = logs.reduce((acc, l) => (l.log_date > acc ? l.log_date : acc), logs[0].log_date)
        return {
          type,
          label,
          color,
          summary: summarizePillar(type, logs),
          count: logs.length,
          lastDate,
        }
      })
      .sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1))
  }, [weekLogs, t])

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
  const triIdx = triIndex(selectedWeek)
  const triKey = (['preg_ring_trimester1', 'preg_ring_trimester2', 'preg_ring_trimester3'] as const)[triIdx]
  const triLabel = t(triKey)
  const sizeName = weekData.babySize.toLowerCase()
  const article = articleFor(sizeName)
  const statusLabel = isCurrWeek
    ? t('preg_ring_statusHere')
    : isPastWeek
      ? t('preg_ring_statusCompleted')
      : t('preg_ring_statusUpcoming')
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
                <BabyIllustration
                  week={d.week}
                  size={d.size}
                  character={false}
                />
              </View>
            ))}
          </Animated.View>
          {/* Static layer: orbit track + fixed anchor circle at 6 o'clock that
              frames the currently-selected week's fruit illustration. */}
          <Svg width={SVG_SIZE} height={SVG_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={CX} cy={CY} r={RING_R}
              fill="none"
              stroke={orbitStroke}
              strokeWidth={1.5}
            />
            {/* Soft inner halo so the framed illustration pops on dark surfaces */}
            <Circle
              cx={CX} cy={CY + RING_R} r={14}
              fill={col + '22'}
              stroke="none"
            />
            {/* Outer ring — trimester color */}
            <Circle
              cx={CX} cy={CY + RING_R} r={16}
              fill="none"
              stroke={col}
              strokeWidth={2}
            />
          </Svg>

          {/* Center overlay — inside ringStage so it centers on the SVG, not the full row */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.centerInner}>
              <Text style={[styles.centerLabel, { color: col, fontFamily: font.bodySemiBold }]}>
                {t('preg_ring_weekLabel')}
              </Text>
              <Text style={[styles.centerNumber, { color: col, fontFamily: font.display }]}>
                {selectedWeek}
              </Text>
              <Text style={[styles.centerStatus, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
                {isCurrWeek ? t('preg_ring_statusHere') : isPastWeek ? t('preg_ring_statusCompleted') : t('preg_ring_statusUpcoming')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.textFaint, fontFamily: font.body }]}>
        {t('preg_ring_gestureHint')}
      </Text>

      {/* ── Bottom panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Size name + status pill — fruit anchors left, status on the right.
            (Trimester meta row removed; the wheel already shows week/trimester.) */}
        <View style={styles.sizeRow}>
          <View style={styles.sizeBlock}>
            <Text style={[styles.sizeText, { color: colors.text, fontFamily: font.display }]} numberOfLines={1}>
              {article}{' '}
              <Text style={[styles.sizeNameAccent, { color: col, fontFamily: font.italic }]}>
                {sizeName}
              </Text>
            </Text>
            <Text style={[styles.dateLabel, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
              {dateLabel} · {triLabel}
            </Text>
          </View>
          <View style={[styles.statusPill, { borderColor: col + '55', backgroundColor: col + '1A' }]}>
            <Text style={[styles.statusPillText, { color: col, fontFamily: font.bodySemiBold }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* LENGTH / WEIGHT stats — Fraunces serif numbers */}
        <View style={styles.statsRow}>
          <View style={[styles.statCell, { borderTopColor: col + '66' }]}>
            <Text style={[styles.statLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
              {t('preg_ring_length')}
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
              {t('preg_ring_weight')}
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
            {t('preg_ring_thisWeek')}
          </Text>
          <Text style={[styles.noteText, { color: colors.textSecondary, fontFamily: font.body }]}>
            {weekData.developmentFact}
          </Text>
        </View>

        {/* Logged this week */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
            {t('preg_ring_loggedThisWeek')}
          </Text>
          {pillarGroups.length > 0 ? (
            <View style={styles.logList}>
              {pillarGroups.map((g) => (
                <View key={g.type} style={styles.logRow}>
                  <View style={[styles.logDot, { backgroundColor: g.color }]} />
                  <View style={styles.logBody}>
                    <View style={styles.logHeader}>
                      <Text style={[styles.logLabel, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                        {g.label}
                      </Text>
                      <Text style={[styles.logDay, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
                        {formatLogDay(g.lastDate)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.logDetail, { color: colors.textSecondary, fontFamily: font.body }]}
                      numberOfLines={2}
                    >
                      {g.summary}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyLogs, { color: colors.textFaint, fontFamily: font.body }]}>
              {isCurrWeek
                ? t('preg_ring_emptyCurrent')
                : isPastWeek
                ? t('preg_ring_emptyPast')
                : t('preg_ring_emptyFuture')}
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
  statusPill:     { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  statusPillText: { fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Size + date row — date small/muted on left, size name big on right
  sizeRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sizeBlock:      { flex: 1, gap: 4 },
  dateLabel:      { fontSize: 12, letterSpacing: 0.2 },
  sizeText:       { fontSize: 26, letterSpacing: -0.4, textAlign: 'left' },
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

  // Log entries
  logList:   { gap: 12, marginTop: 2 },
  logRow:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  logDot:    { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  logBody:   { flex: 1, gap: 2 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  logLabel:  { fontSize: 13, letterSpacing: 0.2 },
  logDay:    { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  logDetail: { fontSize: 13, lineHeight: 19 },
  emptyLogs: { fontSize: 12, fontStyle: 'italic' },
})
