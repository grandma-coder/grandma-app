/**
 * CycleJourneyRingFull — full-size cycle journey ring (home hero).
 *
 * Mirrors PregnancyJourneyRing UX:
 *   • 320px wheel, ring radius 128, anchor at 6 o'clock.
 *   • One sticker per day around the ring, sized + tinted by phase.
 *   • Smooth drag-with-momentum via tangent-projection PanResponder +
 *     withDecay, then snap to nearest day.
 *   • Tap on a sticker (no drag) → snap that day to the anchor.
 *   • Bottom panel: phase + status pill, fertility %, this-day note,
 *     "Logged this day" list from cycle_logs.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, PanResponder, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, useAnimatedReaction,
  runOnJS, withDecay, withTiming, cancelAnimation, Easing,
} from 'react-native-reanimated'
import { useTheme } from '../../../constants/theme'
import {
  getCycleInfo, toDateStr,
  type CycleConfig, type CyclePhase,
} from '../../../lib/cycleLogic'
import { DaySticker, TodayAura } from './dayStickers'

// ─── Layout ─────────────────────────────────────────────────────────────────
const SVG_SIZE = 260
const CX = SVG_SIZE / 2
const CY = SVG_SIZE / 2
const RING_R = 104
const ANCHOR_DEG = 90

// ─── Phase helpers ──────────────────────────────────────────────────────────
function getPhaseForDay(
  day: number,
  cfg: { cycleLength: number; periodLength: number; lutealPhase: number },
): CyclePhase {
  const ovulationDay = cfg.cycleLength - cfg.lutealPhase
  if (day <= cfg.periodLength) return 'menstruation'
  if (day < ovulationDay - 1) return 'follicular'
  if (day <= ovulationDay + 1) return 'ovulation'
  return 'luteal'
}

function phaseTint(phase: CyclePhase, stickers: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return stickers.pinkSoft
    case 'follicular':   return stickers.greenSoft
    case 'ovulation':    return stickers.peachSoft
    case 'luteal':       return stickers.lilacSoft
  }
}

function phaseAccent(phase: CyclePhase, stickers: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return stickers.coral
    case 'follicular':   return stickers.green
    case 'ovulation':    return stickers.peach
    case 'luteal':       return stickers.lilac
  }
}

function phaseTitleItalic(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'quiet day'
    case 'follicular':   return 'rising day'
    case 'ovulation':    return 'peak day'
    case 'luteal':       return 'soft day'
  }
}

function phaseLabel(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'Menstruation'
    case 'follicular':   return 'Follicular'
    case 'ovulation':    return 'Ovulation'
    case 'luteal':       return 'Luteal'
  }
}

function thisDayNote(phase: CyclePhase): string {
  switch (phase) {
    case 'menstruation': return 'Your body is shedding the uterine lining — energy may dip; rest is fuel.'
    case 'follicular':   return 'Estrogen rises and follicles mature — focus, drive, and stamina trend up.'
    case 'ovulation':    return 'Peak fertility window — an egg is released and lives ~24 hours.'
    case 'luteal':       return 'Progesterone takes the lead — slower pace, softer days, prep for the next cycle.'
  }
}

// ─── Dot geometry ───────────────────────────────────────────────────────────
type DayState = 'past' | 'today' | 'future'

interface DotConfig {
  day: number
  bx: number
  by: number
  size: number
  state: DayState
  phase: CyclePhase
  opacity: number
}

function buildDotConfigs(
  cycleDay: number,
  cycleLength: number,
  periodLength: number,
  lutealPhase: number,
): DotConfig[] {
  return Array.from({ length: cycleLength }, (_, i) => {
    const d = i + 1
    const angleDeg = (i / cycleLength) * 360 - 90
    const angleRad = angleDeg * (Math.PI / 180)
    const bx = CX + RING_R * Math.cos(angleRad)
    const by = CY + RING_R * Math.sin(angleRad)
    const state: DayState = d === cycleDay ? 'today' : d < cycleDay ? 'past' : 'future'
    const baseSize = 22 + (i / cycleLength) * 2
    const size = baseSize
    const opacity =
      state === 'today' ? 1 :
      state === 'past'   ? 0.75 + (i / Math.max(1, cycleDay)) * 0.25 :
      0.75
    const phase = getPhaseForDay(d, { cycleLength, periodLength, lutealPhase })
    return { day: d, bx, by, size, state, phase, opacity }
  })
}

// ─── Date helpers ───────────────────────────────────────────────────────────
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Phase legend ───────────────────────────────────────────────────────────
const LEGEND: { phase: CyclePhase; label: string; meaning: string }[] = [
  { phase: 'menstruation', label: 'Menstruation', meaning: 'period days' },
  { phase: 'follicular',   label: 'Follicular',   meaning: 'estrogen rising' },
  { phase: 'ovulation',    label: 'Ovulation',    meaning: 'fertile window' },
  { phase: 'luteal',       label: 'Luteal',       meaning: 'progesterone phase' },
]

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  cycleConfig: CycleConfig
}

// ─── Component ──────────────────────────────────────────────────────────────
export function CycleJourneyRingFull({ cycleConfig }: Props) {
  const { colors, stickers, font } = useTheme()

  const todayStr = toDateStr(new Date())
  const todayInfo = getCycleInfo(cycleConfig, todayStr)
  const cycleDayToday = todayInfo.cycleDay
  const cycleLength = todayInfo.cycleLength
  const periodLength = cycleConfig.periodLength ?? 5
  const lutealPhase = cycleConfig.lutealPhase ?? 14

  const dots = useMemo(
    () => buildDotConfigs(cycleDayToday, cycleLength, periodLength, lutealPhase),
    [cycleDayToday, cycleLength, periodLength, lutealPhase],
  )

  const initialRot = 180 - ((cycleDayToday - 1) / cycleLength) * 360
  const rotationDeg = useSharedValue(initialRot)
  const dotsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationDeg.value}deg` }],
  }))

  const [selectedDay, setSelectedDay] = useState(cycleDayToday)

  const selectedDerived = useDerivedValue(() => {
    let best = 0
    let bestDiff = Infinity
    for (let i = 0; i < cycleLength; i++) {
      const a = (i / cycleLength) * 360 - 90 + rotationDeg.value
      const normalized = (((a - ANCHOR_DEG) % 360) + 360) % 360
      const absDiff = normalized > 180 ? 360 - normalized : normalized
      if (absDiff < bestDiff) { bestDiff = absDiff; best = i }
    }
    return best + 1
  })

  useAnimatedReaction(
    () => selectedDerived.value,
    (day, prev) => {
      if (day !== prev) runOnJS(setSelectedDay)(day)
    },
  )

  // Date for the selected day in the *current* cycle
  const selectedDate = useMemo(() => {
    return addDays(todayStr, selectedDay - cycleDayToday)
  }, [todayStr, selectedDay, cycleDayToday])

  // ── Gesture ───────────────────────────────────────────────────────────────
  const tangentRef = useRef({ x: 0, y: 1 })
  const lastDxRef = useRef(0)
  const lastDyRef = useRef(0)
  const velocityRef = useRef(0)
  const totalMoveRef = useRef(0)
  const initLocRef = useRef({ x: 0, y: 0 })

  const snapToDay = useCallback((d: number) => {
    const target = 180 - ((d - 1) / cycleLength) * 360
    let diff = ((target - rotationDeg.value) % 360 + 360) % 360
    if (diff > 180) diff -= 360
    cancelAnimation(rotationDeg)
    rotationDeg.value = withTiming(rotationDeg.value + diff, {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    })
  }, [rotationDeg, cycleLength])

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
        velocityRef.current = 0
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
        const tangVel = g.vx * tangentRef.current.x + g.vy * tangentRef.current.y
        velocityRef.current = Math.max(-300, Math.min(300,
          (tangVel / RING_R) * (180 / Math.PI) * 1000,
        ))
      },
      onPanResponderRelease: () => {
        if (totalMoveRef.current < 5) {
          // Tap — find nearest sticker to initial touch
          const lx = initLocRef.current.x
          const ly = initLocRef.current.y
          let best: number | null = null
          let bestDist = Infinity
          for (let i = 0; i < cycleLength; i++) {
            const rad = ((i / cycleLength) * 360 - 90 + rotationDeg.value) * (Math.PI / 180)
            const dotX = CX + RING_R * Math.cos(rad)
            const dotY = CY + RING_R * Math.sin(rad)
            const dist = Math.hypot(lx - dotX, ly - dotY)
            if (dist < 22 && dist < bestDist) { bestDist = dist; best = i }
          }
          if (best !== null) snapToDay(best + 1)
        } else {
          rotationDeg.value = withDecay(
            { velocity: velocityRef.current, deceleration: 0.94 },
            (finished) => {
              'worklet'
              if (!finished) return
              let best = 0, bestDiff = Infinity
              for (let i = 0; i < cycleLength; i++) {
                const a = (i / cycleLength) * 360 - 90 + rotationDeg.value
                const norm = (((a - ANCHOR_DEG) % 360) + 360) % 360
                const d = norm > 180 ? 360 - norm : norm
                if (d < bestDiff) { bestDiff = d; best = i }
              }
              const target = 180 - (best / cycleLength) * 360
              let diff = ((target - rotationDeg.value) % 360 + 360) % 360
              if (diff > 180) diff -= 360
              rotationDeg.value = withTiming(rotationDeg.value + diff, {
                duration: 380, easing: Easing.out(Easing.cubic),
              })
            },
          )
        }
      },
    }),
  ).current

  // ── Derived display ──────────────────────────────────────────────────────
  const selectedInfo = getCycleInfo(cycleConfig, selectedDate)
  const selPhase = selectedInfo.phase as CyclePhase
  const accent = phaseAccent(selPhase, stickers)
  const tint = phaseTint(selPhase, stickers)
  const isToday = selectedDay === cycleDayToday
  const isPast = selectedDay < cycleDayToday

  const statusLabel = isToday ? 'TODAY' : isPast ? 'PAST' : 'UPCOMING'
  const titleItalic = phaseTitleItalic(selPhase)
  const fertilityPct = useMemo(() => {
    switch (selectedInfo.conceptionProbability) {
      case 'peak':   return 95
      case 'high':   return 70
      case 'medium': return 40
      case 'low':    return 12
      default:       return 3
    }
  }, [selectedInfo.conceptionProbability])

  // 7-day strip centered on the selected day (3 before, selected, 3 after).
  const strip = useMemo(() => {
    const out: { date: string; day: number; weekday: string; phase: CyclePhase; isSelected: boolean; isToday: boolean }[] = []
    for (let offset = -3; offset <= 3; offset++) {
      const date = addDays(selectedDate, offset)
      const info = getCycleInfo(cycleConfig, date)
      const wd = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
      out.push({
        date,
        day: info.cycleDay,
        weekday: wd,
        phase: info.phase as CyclePhase,
        isSelected: offset === 0,
        isToday: date === todayStr,
      })
    }
    return out
  }, [selectedDate, cycleConfig, todayStr])

  const onStripPress = useCallback((day: number) => snapToDay(day), [snapToDay])

  return (
    <View style={styles.container}>
      {/* ── Ring ── */}
      <View style={styles.ringWrap}>
        <View {...panResponder.panHandlers} style={styles.ringStage}>
          {/* Animated dot layer */}
          <Animated.View style={[StyleSheet.absoluteFill, dotsAnimatedStyle]}>
            {dots.map((d) => {
              const accentBg = phaseAccent(d.phase, stickers)
              return (
                <View
                  key={d.day}
                  style={{
                    position: 'absolute',
                    left: d.bx - d.size / 2,
                    top: d.by - d.size / 2,
                    width: d.size,
                    height: d.size,
                    opacity: d.opacity,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  pointerEvents="none"
                >
                  {d.state === 'today' && selectedDay !== cycleDayToday ? (
                    <View
                      style={{
                        position: 'absolute',
                        width: d.size + 8,
                        height: d.size + 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <TodayAura size={d.size + 8} color={accentBg} count={6} />
                    </View>
                  ) : null}
                  <DaySticker
                    phase={d.phase}
                    size={d.size}
                    bg={accentBg}
                    glyph="#FFFEF8"
                  />
                </View>
              )
            })}
          </Animated.View>

          {/* Static layer: orbit + anchor frame */}
          <Svg width={SVG_SIZE} height={SVG_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={CX} cy={CY} r={RING_R}
              fill="none"
              stroke={colors.border}
              strokeWidth={1.5}
            />
            <Circle cx={CX} cy={CY + RING_R} r={14} fill="none" stroke={accent} strokeWidth={1.5} />
          </Svg>

          {/* Center overlay */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.centerInner}>
              <Text style={[styles.centerLabel, { color: accent, fontFamily: font.bodySemiBold }]}>
                DAY
              </Text>
              <Text style={[styles.centerNumber, { color: accent, fontFamily: font.display }]}>
                {selectedDay}
              </Text>
              <Text style={[styles.centerStatus, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
                of {cycleLength}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.textFaint, fontFamily: font.body }]}>
        ↻ drag to spin · tap any day
      </Text>

      {/* ── Legend (inline, single row) ── */}
      <View style={styles.legendRowInline}>
        {LEGEND.map((item) => {
          const bg = phaseAccent(item.phase, stickers)
          return (
            <View key={item.phase} style={styles.legendInlineItem}>
              <DaySticker phase={item.phase} size={18} bg={bg} />
              <Text
                numberOfLines={1}
                style={[styles.legendInlineText, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}
              >
                {item.label}
              </Text>
            </View>
          )
        })}
      </View>

      {/* ── 7-day strip ── */}
      <View style={styles.strip}>
        {strip.map((s) => {
          const sAccent = phaseAccent(s.phase, stickers)
          const sTint = phaseTint(s.phase, stickers)
          return (
            <Pressable
              key={s.date}
              onPress={() => onStripPress(s.day)}
              style={[
                styles.stripCell,
                {
                  backgroundColor: s.isSelected ? sAccent : sTint,
                  borderColor: s.isToday ? sAccent : 'transparent',
                  borderWidth: s.isToday ? 2 : 0,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: s.isSelected ? '#FFFEF8' : sAccent,
                  fontFamily: font.bodySemiBold,
                  fontSize: 9,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                {s.weekday.slice(0, 2)}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: s.isSelected ? '#FFFEF8' : colors.text,
                  fontFamily: font.display,
                  fontSize: 16,
                  lineHeight: 18,
                  marginTop: 2,
                }}
              >
                {s.day}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* ── Bottom panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusBlock}>
            <Text style={[styles.statusTitle, { color: colors.text, fontFamily: font.display }]} numberOfLines={1}>
              a <Text style={[styles.statusTitleAccent, { color: accent, fontFamily: font.italic }]}>{titleItalic}</Text>
            </Text>
            <Text style={[styles.dateLabel, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
              {formatLongDate(selectedDate)} · {phaseLabel(selPhase)}
            </Text>
          </View>
          <View style={[styles.statusPill, { borderColor: accent + '55', backgroundColor: tint }]}>
            <Text style={[styles.statusPillText, { color: accent, fontFamily: font.bodySemiBold }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Fertility cell */}
        <View style={styles.statsRow}>
          <View style={[styles.statCell, { borderTopColor: accent + '66' }]}>
            <Text style={[styles.statLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
              FERTILITY
            </Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: font.display }]}>
              {fertilityPct}
              <Text style={[styles.statUnit, { color: colors.textSecondary, fontFamily: font.italic }]}>%</Text>
            </Text>
          </View>
          <View style={[styles.statCell, { borderTopColor: accent + '66' }]}>
            <Text style={[styles.statLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
              NEXT PERIOD
            </Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: font.display }]}>
              {selectedInfo.daysUntilPeriod}
              <Text style={[styles.statUnit, { color: colors.textSecondary, fontFamily: font.italic }]}>d</Text>
            </Text>
          </View>
        </View>

        {/* This day */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
            THIS DAY
          </Text>
          <Text style={[styles.noteText, { color: colors.textSecondary, fontFamily: font.body }]}>
            {thisDayNote(selPhase)}
          </Text>
        </View>

      </ScrollView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { width: '100%' },
  ringWrap: { alignItems: 'center', position: 'relative' },
  ringStage: { width: SVG_SIZE, height: SVG_SIZE, position: 'relative' },
  hint: { fontSize: 10, textAlign: 'center', marginTop: 2 },

  centerInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { fontSize: 10, letterSpacing: 1.5, marginBottom: 2 },
  centerNumber: { fontSize: 46, lineHeight: 50 },
  centerStatus: { fontSize: 9, letterSpacing: 1.2, marginTop: 2, textTransform: 'uppercase' },

  strip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
  },
  stripCell: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },

  panel: { },
  panelContent: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  statusBlock: { flex: 1, gap: 4 },
  statusTitle: { fontSize: 26, letterSpacing: -0.4 },
  statusTitleAccent: { fontSize: 26, fontStyle: 'italic', fontWeight: '400' },
  dateLabel: { fontSize: 12, letterSpacing: 0.2 },
  statusPill: { paddingHorizontal: 11, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  statusPillText: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },

  statsRow: { flexDirection: 'row', gap: 24 },
  statCell: { flex: 1, borderTopWidth: 1.5, paddingTop: 8, gap: 2 },
  statLabel: { fontSize: 9.5, letterSpacing: 2, opacity: 0.85 },
  statValue: { fontSize: 32, letterSpacing: -1, lineHeight: 36 },
  statUnit: { fontSize: 14, fontStyle: 'italic', fontWeight: '400' },

  section: { gap: 8 },
  sectionLabel: { fontSize: 9.5, letterSpacing: 1.8 },
  noteText: { fontSize: 14, lineHeight: 22 },

  legendRowInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  legendInlineItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendInlineText: {
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
})
