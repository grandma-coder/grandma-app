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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Pressable, PanResponder, StyleSheet } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, useDerivedValue, useAnimatedReaction,
  runOnJS, withDecay, withTiming, withSpring, cancelAnimation, Easing,
} from 'react-native-reanimated'
import { useTheme, motion, useDiffuseTheme, getModeField, getDiffuseAccent, diffuseFont } from '../../../constants/theme'
import { useIsDiffuse, SoftBloom } from '../../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../../lib/i18n'
import type { TranslationKey } from '../../../lib/i18n'
import {
  getCycleInfo, toDateStr,
  type CycleConfig, type CyclePhase,
} from '../../../lib/cycleLogic'
import { DaySticker } from './dayStickers'

// ─── Diffuse phase palette ────────────────────────────────────────────────
// Under Diffuse the phase hues come from the cycle field (coral→rose→lilac→
// peach) rather than the sticker palette, so the ring reads as a soft bloom.
function diffusePhaseColor(phase: CyclePhase, field: [string, string, string, string]): string {
  const [coral, rose, lilac, peach] = field
  switch (phase) {
    case 'menstruation': return coral
    case 'follicular':   return peach
    case 'ovulation':    return rose
    case 'luteal':       return lilac
  }
}

// Soft, muted glyph fills for the wheel — calmer than the saturated sticker
// accents (which read loud), warmer than the near-grey field. Hand-tuned to
// match the reference's gentle sage / coral / lilac / warm-coral tones.
const DIFFUSE_GLYPH_LIGHT: Record<CyclePhase, string> = {
  menstruation: '#E89A8E',  // soft coral
  follicular:   '#A9C77E',  // sage green
  ovulation:    '#EBA97F',  // warm apricot
  luteal:       '#B9A6DE',  // gentle lilac
}
const DIFFUSE_GLYPH_DARK: Record<CyclePhase, string> = {
  menstruation: '#C9776B',
  follicular:   '#8FB06A',
  ovulation:    '#CE8E68',
  luteal:       '#9E8CC4',
}
function diffuseGlyphColor(phase: CyclePhase, isDark: boolean): string {
  return (isDark ? DIFFUSE_GLYPH_DARK : DIFFUSE_GLYPH_LIGHT)[phase]
}


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

// Saturated dark variant of each phase hue — high contrast against the soft
// tints, so the selected day's outline + label read clearly (the mid `accent`
// is nearly the same lightness as its own `*Soft` tint and washes out).
function phaseInk(phase: CyclePhase, stickers: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return stickers.coralInk
    case 'follicular':   return stickers.greenInk
    case 'ovulation':    return stickers.peachInk
    case 'luteal':       return stickers.lilacInk
  }
}

type TFn = (key: TranslationKey) => string

function phaseTitleItalic(phase: CyclePhase, t: TFn): string {
  return t(`cycleRing_title_${phase}` as TranslationKey)
}

function phaseLabel(phase: CyclePhase, t: TFn): string {
  return t(`cycleRing_label_${phase}` as TranslationKey)
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
  /** Fired (YYYY-MM-DD) whenever the scrubbed/selected ring day changes, so the
   *  host can keep sibling surfaces (e.g. the daily nudge) in sync. */
  onSelectedDateChange?: (date: string) => void
  /** When true, suspend the "glide back to today" auto-return — set by the host
   *  while a log/month sheet is open so the wheel doesn't snap away mid-log. */
  freezeAutoReturn?: boolean
  /** Programmatically select a date (YYYY-MM-DD) — used by the month sheet to
   *  jump the ring to a picked day. Only dates within the current cycle window
   *  map to a ring position; out-of-window dates are clamped to today. */
  selectDate?: string | null
  /** Open the full-month picker sheet (host-owned). When set, a small "month"
   *  affordance renders under the 7-day strip. */
  onOpenMonth?: () => void
  /** Fired (YYYY-MM-DD) when the user TAPS a strip date — an intent to log that
   *  day. The host opens the log launcher (same flow as the Calendar tab). This
   *  is distinct from onSelectedDateChange, which also fires on passive scrub. */
  onDatePress?: (date: string) => void
}

// ─── Week-strip cell ──────────────────────────────────────────────────────
// One day in the 7-day strip. Selected = soft tint + bold accent outline ring
// (lighter than a full fill). Press uses the app's standard sticker-press feel
// (withSpring translateY) so tapping a date matches PillButton / StickerButton.
interface StripCellProps {
  weekday: string
  day: number
  ink: string
  tint: string
  isSelected: boolean
  isToday: boolean
  textColor: string
  /** phase accent — used for the today (not-selected) ring outline */
  accentColor: string
  fontSemiBold: string
  fontDisplay: string
  onPress: () => void
  diffuse?: boolean
  diffuseLine?: string
  diffuseAccent?: string
  diffuseInk?: string
  diffuseInk3?: string
  diffuseMono?: string
}

function StripCell({
  weekday, day, ink, tint, isSelected, isToday, textColor, accentColor,
  fontSemiBold, fontDisplay, onPress,
  diffuse, diffuseLine, diffuseAccent, diffuseInk, diffuseInk3, diffuseMono,
}: StripCellProps) {
  const press = useSharedValue(0)
  // Press uses the app's standard sticker-press feel (withSpring translateY).
  // The selected outline is static (not animated): the strip recenters on the
  // selected day each tap, so cells are remounted rather than persisted —
  // there's no stable cell to animate a ring across, and trying to spring it
  // mid-remount glitches. The tactile feedback comes from the press spring.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * motion.pressTranslateY }],
  }))

  // Selected = stronger tint + saturated ink outline so it pops; the label uses
  // ink too. Unselected = soft tint, no border, muted ink weekday.
  // TODAY (when it is NOT the selected cell) = a subtle accent ring outline, so
  // after scrubbing away the user can still spot the real "today" — filled
  // (selected) vs outlined (today) distinguishes the two states.
  // Diffuse: hairline cell, transparent fill, accent ring when selected, mono
  // weekday + serif day (matches the dot-calendar language).
  const todayRing = isToday && !isSelected
  return (
    <Animated.View
      style={[
        styles.stripCellWrap,
        animatedStyle,
        diffuse
          ? {
              backgroundColor: 'transparent',
              borderColor: isSelected ? diffuseAccent! : todayRing ? diffuseAccent! : diffuseLine!,
              borderWidth: 1,
              borderStyle: todayRing ? 'dashed' : 'solid',
            }
          : {
              backgroundColor: tint,
              borderColor: isSelected ? ink : todayRing ? accentColor! : 'transparent',
              borderStyle: todayRing ? 'dashed' : 'solid',
            },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => { press.value = withSpring(1, motion.press) }}
        onPressOut={() => { press.value = withSpring(0, motion.press) }}
        style={styles.stripCellPressable}
      >
        <Text
          numberOfLines={1}
          style={{
            color: diffuse ? diffuseInk3! : ink,
            fontFamily: diffuse ? diffuseMono! : fontSemiBold,
            fontSize: diffuse ? 8 : 9,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            opacity: isSelected ? 1 : isToday ? 0.9 : 0.7,
          }}
        >
          {weekday.slice(0, 2)}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: diffuse ? (isSelected ? diffuseInk! : diffuseInk3!) : (isSelected ? ink : textColor),
            fontFamily: diffuse ? diffuseFont.display : fontDisplay,
            fontSize: 16,
            lineHeight: 18,
            marginTop: 2,
          }}
        >
          {day}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────
export function CycleJourneyRingFull({ cycleConfig, onSelectedDateChange, freezeAutoReturn, selectDate, onOpenMonth, onDatePress }: Props) {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const field = getModeField('pre-pregnancy', dt.isDark)
  const diffuseAccent = getDiffuseAccent('pre-pregnancy', dt.isDark)
  const { t } = useTranslation()

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

  // Lift the selected date up so sibling surfaces (daily nudge) can follow it.
  useEffect(() => {
    onSelectedDateChange?.(selectedDate)
  }, [selectedDate, onSelectedDateChange])

  // ── Gesture ───────────────────────────────────────────────────────────────
  // Rotate by the finger's angle around the ring center. The angle is computed
  // from the touch-start vector PLUS the gesture's cumulative translation
  // (g.dx/g.dy), which share one stable origin for the whole drag. We avoid
  // per-frame e.nativeEvent.locationX/Y: those are relative to whichever sub-view
  // is under the finger at that instant, so they jump between the SVG layer and
  // the center overlay mid-drag and make the wheel jitter (worst when crossing
  // the 6-o'clock anchor where atan2 wraps).
  const startVecRef = useRef({ x: 0, y: 1 })   // finger vector from center at grant
  const lastAngleRef = useRef(0)
  const velSamplesRef = useRef<number[]>([])   // recent signed angular steps (rolling window)
  const totalMoveRef = useRef(0)
  const initLocRef = useRef({ x: 0, y: 0 })

  // Signed shortest angular delta (deg) from a→b, in (-180, 180].
  const angleDelta = (a: number, b: number) => {
    let d = ((b - a) % 360 + 360) % 360
    if (d > 180) d -= 360
    return d
  }

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

  // Month sheet picked a day → jump the ring to it. The ring only shows the
  // current cycle window (days 1..cycleLength anchored on today), so we convert
  // the picked date to a cycle day via its offset from today and clamp into the
  // window. Out-of-window picks land on the nearest end (honest: the wheel can't
  // show a day it isn't rendering).
  useEffect(() => {
    if (!selectDate) return
    const dayDiff = Math.round(
      (new Date(selectDate + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime())
        / 86400000,
    )
    const targetCycleDay = Math.min(cycleLength, Math.max(1, cycleDayToday + dayDiff))
    snapToDay(targetCycleDay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectDate])

  // Auto-return to today: once the user scrubs to a different day and then
  // stops interacting, the ring gently glides back to today after a short idle
  // window. `interactingRef` pauses the timer while a drag is in flight; the
  // effect re-arms on every selectedDay change (each interaction), so the
  // countdown only completes once the wheel has settled off-today.
  const interactingRef = useRef(false)
  const autoReturnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const AUTO_RETURN_MS = 4000
  useEffect(() => {
    if (selectedDay === cycleDayToday) return
    // Suspended while the host has a log/month sheet open (freezeAutoReturn), so
    // the wheel never snaps back to today mid-log. Re-arms once logging closes.
    if (freezeAutoReturn) return
    const arm = () => {
      autoReturnTimer.current = setTimeout(() => {
        if (interactingRef.current || freezeAutoReturn) { arm(); return }   // wait out an active drag / open sheet
        snapToDay(cycleDayToday)
      }, interactingRef.current ? 600 : AUTO_RETURN_MS)
    }
    arm()
    return () => {
      if (autoReturnTimer.current) clearTimeout(autoReturnTimer.current)
    }
  }, [selectedDay, cycleDayToday, snapToDay, freezeAutoReturn])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        interactingRef.current = true
        cancelAnimation(rotationDeg)
        const lx = e.nativeEvent.locationX
        const ly = e.nativeEvent.locationY
        initLocRef.current = { x: lx, y: ly }
        // Vector from ring center to the finger at touch-down. If the touch lands
        // dead-center, fall back to the 6-o'clock anchor so atan2 is defined.
        let vx = lx - CX
        let vy = ly - CY
        if (Math.hypot(vx, vy) < 1) { vx = 0; vy = RING_R }
        startVecRef.current = { x: vx, y: vy }
        lastAngleRef.current = Math.atan2(vy, vx) * (180 / Math.PI)
        velSamplesRef.current = []
        totalMoveRef.current = 0
      },
      onPanResponderMove: (_e, g) => {
        // Current finger vector from center = start vector + cumulative drag.
        // One stable origin for the whole gesture → no per-frame jumps.
        const vx = startVecRef.current.x + g.dx
        const vy = startVecRef.current.y + g.dy
        const ang = Math.atan2(vy, vx) * (180 / Math.PI)
        const delta = angleDelta(lastAngleRef.current, ang)
        rotationDeg.value += delta
        totalMoveRef.current += Math.abs(delta)
        // Keep a short rolling window of the last few frames' steps. The fling
        // velocity is the average of these — using just the final frame makes
        // the throw die instantly when the finger eases off before lifting.
        const samples = velSamplesRef.current
        samples.push(delta)
        if (samples.length > 4) samples.shift()
        lastAngleRef.current = ang
      },
      onPanResponderRelease: () => {
        interactingRef.current = false
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
          // Throw velocity (deg/sec) ≈ mean of the last few frames' angular
          // steps × ~60fps, clamped so a fast flick can't fling the wheel
          // uncontrollably. Averaging (vs the single final frame) keeps the
          // momentum representative so the wheel glides instead of stopping short.
          const samples = velSamplesRef.current
          const meanStep = samples.length
            ? samples.reduce((sum, d) => sum + d, 0) / samples.length
            : 0
          const throwVel = Math.max(-1200, Math.min(1200, meanStep * 60))
          rotationDeg.value = withDecay(
            { velocity: throwVel, deceleration: 0.997 },
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
  const accent = diffuse ? diffusePhaseColor(selPhase, field) : phaseAccent(selPhase, stickers)
  const tint = diffuse ? dt.colors.surface : phaseTint(selPhase, stickers)
  const isToday = selectedDay === cycleDayToday
  const isPast = selectedDay < cycleDayToday

  const statusLabel = isToday ? 'TODAY' : isPast ? 'PAST' : 'UPCOMING'
  const titleItalic = phaseTitleItalic(selPhase, t)
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
  // A weekday strip (MON/TUE/…) is a CALENDAR affordance, so the number under
  // each weekday is the day-of-MONTH — not the cycle day. (The cycle day is the
  // big number in the ring center.) `cycleDay` is kept separately purely to
  // drive snapToDay on press, which rotates the wheel by cycle position.
  const strip = useMemo(() => {
    const out: { date: string; dayOfMonth: number; cycleDay: number; weekday: string; phase: CyclePhase; isSelected: boolean; isToday: boolean }[] = []
    for (let offset = -3; offset <= 3; offset++) {
      const date = addDays(selectedDate, offset)
      const info = getCycleInfo(cycleConfig, date)
      const jsDate = new Date(date + 'T12:00:00')
      const wd = jsDate.toLocaleDateString('en-US', { weekday: 'short' })
      out.push({
        date,
        dayOfMonth: jsDate.getDate(),
        cycleDay: info.cycleDay,
        weekday: wd,
        phase: info.phase as CyclePhase,
        isSelected: offset === 0,
        isToday: date === todayStr,
      })
    }
    return out
  }, [selectedDate, cycleConfig, todayStr])

  const onStripPress = useCallback((cycleDay: number) => snapToDay(cycleDay), [snapToDay])

  return (
    <View style={styles.container}>
      {/* ── Ring ── */}
      <View style={styles.ringWrap}>
        {diffuse ? (
          // Barely-there feathered field — the reference is nearly flat cream;
          // the icons + hairline ring carry the composition, not a pink radial.
          <View pointerEvents="none" style={styles.ringBloom}>
            <SoftBloom color={diffuseAccent} opacity={dt.isDark ? 0.1 : 0.1} spread={0.55} />
          </View>
        ) : null}
        <View {...panResponder.panHandlers} style={styles.ringStage}>
          {/* Animated dot layer */}
          <Animated.View style={[StyleSheet.absoluteFill, dotsAnimatedStyle]}>
            {dots.map((d) => {
              const accentBg = diffuse ? diffusePhaseColor(d.phase, field) : phaseAccent(d.phase, stickers)
              if (diffuse) {
                // v4 reference: every day carries its phase icon (the design-
                // system DaySticker glyphs — drop / leaf / ovulation-ring /
                // moon) in the phase hue, on the calm cream field. Days rotate
                // through a STATIONARY hairline anchor ring at 6 o'clock (drawn
                // in the static layer below); we don't ring the day itself, so
                // the selection frame stays put as the wheel spins. Future days
                // are softened.
                //
                // The focused day (the one scrubbed into the anchor) simply
                // grows a little larger than its neighbours — no halo, no dot.
                const isSelected = d.day === selectedDay
                const glyphSize = isSelected ? 30 : 22
                return (
                  <View
                    key={d.day}
                    style={{
                      position: 'absolute',
                      // Recenter the larger glyph on the same orbit point.
                      left: d.bx - glyphSize / 2,
                      top: d.by - glyphSize / 2,
                      width: glyphSize,
                      height: glyphSize,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: d.state === 'future' && !isSelected ? 0.65 : 1,
                      zIndex: isSelected ? 5 : undefined,
                    }}
                    pointerEvents="none"
                  >
                    <DaySticker phase={d.phase} size={glyphSize} bg={diffuseGlyphColor(d.phase, dt.isDark)} />
                  </View>
                )
              }
              // The focused day (scrubbed into the anchor) grows a little
              // larger than its neighbours — no halo ring, no dot.
              const isSelected = d.day === selectedDay
              const gSize = isSelected ? Math.round(d.size * 1.4) : d.size
              return (
                <View
                  key={d.day}
                  style={{
                    position: 'absolute',
                    left: d.bx - gSize / 2,
                    top: d.by - gSize / 2,
                    width: gSize,
                    height: gSize,
                    opacity: d.opacity,
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: isSelected ? 5 : undefined,
                  }}
                  pointerEvents="none"
                >
                  <DaySticker
                    phase={d.phase}
                    size={gSize}
                    bg={accentBg}
                    glyph="#FFFEF8"
                  />
                </View>
              )
            })}
          </Animated.View>

          {/* Static layer: orbit + anchor frame */}
          <Svg width={SVG_SIZE} height={SVG_SIZE} style={StyleSheet.absoluteFill}>
            {diffuse ? (
              <Defs>
                <LinearGradient id="cycleRingArc" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={field[0]} />
                  <Stop offset="0.5" stopColor={field[1]} />
                  <Stop offset="1" stopColor={field[2]} />
                </LinearGradient>
              </Defs>
            ) : null}
            <Circle
              cx={CX} cy={CY} r={RING_R}
              fill="none"
              stroke={diffuse ? dt.colors.line : colors.border}
              strokeWidth={diffuse ? 1 : 1.5}
            />
            {diffuse ? (
              // Subtle progress arc = fraction of cycle elapsed (today). Thin +
              // low opacity so it whispers the progression without competing
              // with the phase glyphs.
              <Circle
                cx={CX} cy={CY} r={RING_R}
                fill="none"
                stroke="url(#cycleRingArc)"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.55}
                strokeDasharray={`${(2 * Math.PI * RING_R) * (Math.min(cycleDayToday, cycleLength) / cycleLength)} ${2 * Math.PI * RING_R}`}
                transform={`rotate(-90 ${CX} ${CY})`}
              />
            ) : null}
            {/* No selection frame — the focused day reads by size alone
                (enlarged glyph at 6 o'clock), no ring / halo around it. */}
          </Svg>

          {/* Center overlay */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.centerInner}>
              {diffuse ? (
                <>
                  <Text style={[styles.centerLabelD, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
                    {t('cycle_ring_label_day')}
                  </Text>
                  <Text style={[styles.centerNumberD, { color: diffuseGlyphColor(selPhase, dt.isDark), fontFamily: diffuseFont.display }]}>
                    {selectedDay}
                  </Text>
                  <Text style={[styles.centerStatusD, { color: dt.colors.ink3, fontFamily: diffuseFont.mono }]}>
                    {t('cycle_ring_of_n', { n: cycleLength })}
                  </Text>
                  <Text style={[styles.centerPhaseD, { color: dt.colors.ink2, fontFamily: diffuseFont.italic }]}>
                    {phaseLabel(selPhase, t)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.centerLabel, { color: accent, fontFamily: font.bodySemiBold }]}>
                    {t('cycle_ring_label_day')}
                  </Text>
                  <Text style={[styles.centerNumber, { color: accent, fontFamily: font.display }]}>
                    {selectedDay}
                  </Text>
                  <Text style={[styles.centerStatus, { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
                    {t('cycle_ring_of_n', { n: cycleLength })}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.hint, { color: diffuse ? dt.colors.ink3 : colors.textFaint, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 1.4 : 0, textTransform: diffuse ? 'uppercase' : 'none', fontSize: diffuse ? 8.5 : 10 }]}>
        {t('cycle_ring_drag_hint')}
      </Text>

      {/* ── Legend + Month affordance on one row ──
          The legend flows on the left; the "month" pill sits at the right edge
          of the SAME row (rather than a separate band below the strip that left
          an empty gap before the panel). */}
      <View style={styles.legendMonthRow}>
        <View style={styles.legendRowInline}>
          {LEGEND.map((item) => {
            const bg = diffuse ? diffuseGlyphColor(item.phase, dt.isDark) : phaseAccent(item.phase, stickers)
            return (
              <View key={item.phase} style={styles.legendInlineItem}>
                {diffuse ? (
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: bg }} />
                ) : (
                  <DaySticker phase={item.phase} size={18} bg={bg} />
                )}
                <Text
                  numberOfLines={1}
                  style={[
                    styles.legendInlineText,
                    diffuse
                      ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1 }
                      : { color: colors.textMuted, fontFamily: font.bodySemiBold },
                  ]}
                >
                  {phaseLabel(item.phase, t)}
                </Text>
              </View>
            )
          })}
        </View>
        {onOpenMonth ? (
          <Pressable
            onPress={onOpenMonth}
            hitSlop={8}
            style={({ pressed }) => [
              styles.monthPill,
              {
                borderColor: diffuse ? dt.colors.line2 : colors.border,
                backgroundColor: diffuse ? 'transparent' : colors.surface,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('cycleLog_pickDay')}
          >
            <Text
              style={{
                color: diffuse ? dt.colors.ink3 : colors.textMuted,
                fontFamily: diffuse ? diffuseFont.mono : font.bodySemiBold,
                fontSize: diffuse ? 10 : 12,
                letterSpacing: diffuse ? 1.4 : 0,
                textTransform: diffuse ? 'uppercase' : 'none',
              }}
            >
              {t('cycleLog_month')}
            </Text>
            <Text style={{ color: diffuse ? dt.colors.ink3 : colors.textMuted, fontSize: 11, marginLeft: 5 }}>▾</Text>
          </Pressable>
        ) : null}
      </View>

      {/* ── 7-day strip ── */}
      <View style={styles.strip}>
        {strip.map((s) => (
          <StripCell
            key={s.date}
            weekday={s.weekday}
            day={s.dayOfMonth}
            ink={phaseInk(s.phase, stickers)}
            tint={phaseTint(s.phase, stickers)}
            isSelected={s.isSelected}
            isToday={s.isToday}
            textColor={colors.text}
            accentColor={phaseAccent(s.phase, stickers)}
            fontSemiBold={font.bodySemiBold}
            fontDisplay={font.display}
            onPress={() => { onStripPress(s.cycleDay); onDatePress?.(s.date) }}
            diffuse={diffuse}
            diffuseLine={dt.colors.line}
            diffuseAccent={diffuseAccent}
            diffuseInk={dt.colors.ink}
            diffuseInk3={dt.colors.ink3}
            diffuseMono={diffuseFont.mono}
          />
        ))}
      </View>

      {/* ── Bottom panel ── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusBlock}>
            <Text style={[styles.statusTitle, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]} numberOfLines={1}>
              {t('cycle_ring_phase_prefix')}<Text style={[styles.statusTitleAccent, { color: diffuse ? dt.colors.ink : accent, fontFamily: diffuse ? diffuseFont.italic : font.italic }]}>{titleItalic}</Text>
            </Text>
            <Text style={[styles.dateLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textFaint, fontFamily: font.bodyMedium }]}>
              {t('cycle_ring_date_phase', { date: formatLongDate(selectedDate), phase: phaseLabel(selPhase, t) })}
            </Text>
          </View>
          {diffuse ? (
            <View style={[styles.statusPillD, { borderColor: dt.colors.hairline }]}>
              <Text style={[styles.statusPillTextD, { color: dt.colors.ink, fontFamily: diffuseFont.mono }]}>
                {statusLabel}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusPill, { borderColor: accent + '55', backgroundColor: tint }]}>
              <Text style={[styles.statusPillText, { color: accent, fontFamily: font.bodySemiBold }]}>
                {statusLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Fertility cell */}
        <View style={styles.statsRow}>
          <View style={[styles.statCell, { borderTopColor: diffuse ? dt.colors.line2 : accent + '66' }]}>
            <Text style={[styles.statLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
              {t('cycle_ring_label_fertility')}
            </Text>
            <Text style={[styles.statValue, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
              {fertilityPct}
              <Text style={[styles.statUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontStyle: 'normal' } : { color: colors.textSecondary, fontFamily: font.italic }]}>%</Text>
            </Text>
          </View>
          <View style={[styles.statCell, { borderTopColor: diffuse ? dt.colors.line2 : accent + '66' }]}>
            <Text style={[styles.statLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textFaint, fontFamily: font.bodySemiBold }]}>
              {t('cycle_ring_label_next_period')}
            </Text>
            <Text style={[styles.statValue, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>
              {selectedInfo.daysUntilPeriod}
              <Text style={[styles.statUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, fontStyle: 'normal' } : { color: colors.textSecondary, fontFamily: font.italic }]}>{t('cycle_ring_unit_d')}</Text>
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { width: '100%' },
  ringWrap: { alignItems: 'center', position: 'relative' },
  ringBloom: {
    position: 'absolute',
    width: SVG_SIZE * 0.92,
    height: SVG_SIZE * 0.92,
    top: SVG_SIZE * 0.04,
    alignSelf: 'center',
  },
  ringStage: { width: SVG_SIZE, height: SVG_SIZE, position: 'relative' },
  hint: { fontSize: 10, textAlign: 'center', marginTop: 2 },

  centerInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { fontSize: 10, letterSpacing: 1.5, marginBottom: 2 },
  centerNumber: { fontSize: 46, lineHeight: 50 },
  centerStatus: { fontSize: 9, letterSpacing: 1.2, marginTop: 2, textTransform: 'uppercase' },
  // Diffuse center: mono eyebrow · serif number · mono of-n · serif phase
  centerLabelD: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  centerNumberD: { fontSize: 48, lineHeight: 52, letterSpacing: -1 },
  centerStatusD: { fontSize: 8.5, letterSpacing: 1.6, marginTop: 1, textTransform: 'uppercase' },
  centerPhaseD: { fontSize: 15, letterSpacing: -0.2, marginTop: 4 },

  strip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
  },
  stripCellWrap: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stripCellPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Legend (left, flexes) + Month pill (right) share one row above the strip,
  // so the pill no longer needs its own band below (which left an empty gap
  // before the panel).
  legendMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 6,
    gap: 10,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
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
  statusPillD: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusPillTextD: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },

  statsRow: { flexDirection: 'row', gap: 24 },
  statCell: { flex: 1, borderTopWidth: 1.5, paddingTop: 8, gap: 2 },
  statLabel: { fontSize: 9.5, letterSpacing: 2, opacity: 0.85 },
  statValue: { fontSize: 32, letterSpacing: -1, lineHeight: 36 },
  statUnit: { fontSize: 14, fontStyle: 'italic', fontWeight: '400' },

  section: { gap: 8 },
  sectionLabel: { fontSize: 9.5, letterSpacing: 1.8 },

  legendRowInline: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendInlineItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendInlineText: {
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
})
