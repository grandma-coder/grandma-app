/**
 * HormonesCard — small card on the cycle home screen showing
 * idealized LH / Estrogen / Progesterone curves across the cycle,
 * with a dot marking today's cycle day.
 *
 * No real hormone tracking table exists — the curves are computed
 * from cycle day only. This is an illustrative widget, not data.
 *
 * Exports HormonesLiveChart so the detail sheet can reuse the same
 * animated chart at a larger size.
 */

import { useEffect, useState, useRef, useMemo } from 'react'
import { View, StyleSheet, PanResponder, type GestureResponderEvent } from 'react-native'
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg'
import { useTheme } from '../../../constants/theme'
import { MonoCaps, Body, Display } from '../../ui/Typography'
import type { CyclePhase } from '../../../lib/cycleLogic'

interface Props {
  cycleDay: number
  cycleLength: number
}

/** Hormone curves by cycle day (roughly based on a 28-day cycle). */
function lhCurve(day: number, len: number): number {
  const ov = len - 14
  const d = day - ov
  return Math.exp(-(d * d) / 4)
}
function estrogenCurve(day: number, len: number): number {
  const ov = len - 14
  const a = Math.exp(-((day - (ov - 1)) ** 2) / 10)
  const b = 0.6 * Math.exp(-((day - (ov + 7)) ** 2) / 20)
  return Math.max(a, b)
}
function progesteroneCurve(day: number, len: number): number {
  const ov = len - 14
  if (day < ov) return 0.05
  const rise = Math.min(1, (day - ov) / 7)
  const fall = Math.max(0, 1 - (day - ov - 7) / 6)
  return Math.max(0.05, rise * fall)
}

function buildCurves(cycleLength: number) {
  const days = Array.from({ length: cycleLength }, (_, i) => i + 1)
  return {
    lh: days.map((d) => lhCurve(d, cycleLength)),
    es: days.map((d) => estrogenCurve(d, cycleLength)),
    pr: days.map((d) => progesteroneCurve(d, cycleLength)),
  }
}

// Traveling-sine perturbation. Returns the live value at sample index i.
function liveAt(values: number[], i: number, t: number, speed: number, amp: number, phase: number) {
  const N = values.length
  const v = values[i]
  const wave = Math.sin((i / N) * Math.PI * 2.5 - t * speed + phase)
  return Math.max(0, Math.min(1, v + wave * amp * (0.25 + v)))
}

function buildPath(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  t: number,
  speed: number,
  amp: number,
  phase: number,
): string {
  if (values.length === 0) return ''
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const N = values.length
  let d = ''
  for (let i = 0; i < N; i++) {
    const x = padX + (i / (N - 1)) * innerW
    const y = padY + innerH - liveAt(values, i, t, speed, amp, phase) * innerH
    if (i === 0) d += `M ${x.toFixed(1)} ${y.toFixed(1)}`
    else {
      const prevX = padX + ((i - 1) / (N - 1)) * innerW
      const prevY = padY + innerH - liveAt(values, i - 1, t, speed, amp, phase) * innerH
      const midX = (prevX + x) / 2
      d += ` Q ${midX.toFixed(1)} ${prevY.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
    }
  }
  return d
}

/** Same shape as buildPath but closed back to the baseline — for the
 *  pastel "ribbon" fill underneath each curve. */
function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
  t: number,
  speed: number,
  amp: number,
  phase: number,
): string {
  const stroke = buildPath(values, width, height, padX, padY, t, speed, amp, phase)
  if (!stroke) return ''
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const baseline = padY + innerH
  const xRight = padX + innerW
  return `${stroke} L ${xRight.toFixed(1)} ${baseline.toFixed(1)} L ${padX.toFixed(1)} ${baseline.toFixed(1)} Z`
}

function useLiveTime(): number {
  const [t, setT] = useState(0)
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const now = Date.now()
      if (now - lastRef.current >= 33) {
        lastRef.current = now
        setT((now - start) / 1000)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])
  return t
}

interface LiveChartProps {
  cycleDay: number
  cycleLength: number
  width: number
  height: number
  /** Multiplier on the wave amplitude so larger surfaces feel proportionally alive. */
  liveness?: number
  strokeWidth?: number
  markerBg?: string
}

/** Animated LH/E/P chart. Used by both HormonesCard and HormonesDetail. */
export function HormonesLiveChart({
  cycleDay,
  cycleLength,
  width,
  height,
  liveness = 1,
  strokeWidth = 2.5,
  markerBg,
}: LiveChartProps) {
  const { colors, stickers, isDark } = useTheme()
  const t = useLiveTime()
  const { lh, es, pr } = buildCurves(cycleLength)

  const padX = 8
  const padY = 8

  const lhAmp = 0.05 * liveness
  const esAmp = 0.06 * liveness
  const prAmp = 0.055 * liveness

  const lhPath = buildPath(lh, width, height, padX, padY, t, 1.6, lhAmp, 0)
  const esPath = buildPath(es, width, height, padX, padY, t, 1.1, esAmp, 1.3)
  const prPath = buildPath(pr, width, height, padX, padY, t, 0.8, prAmp, 2.7)

  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const idx = Math.min(cycleLength - 1, Math.max(0, cycleDay - 1))
  const mx = padX + (idx / (cycleLength - 1)) * innerW
  const my = padY + innerH - liveAt(lh, idx, t, 1.6, lhAmp, 0) * innerH
  const markerR = strokeWidth + 1.5 + Math.sin(t * 2.4) * 1.2

  const fallbackBg = isDark ? colors.surfaceRaised : colors.bg

  return (
    <Svg width={width} height={height}>
      <Path d={esPath} stroke={stickers.lilac} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      <Path d={prPath} stroke={stickers.green} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      <Path d={lhPath} stroke={stickers.coral} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
      <Circle
        cx={mx}
        cy={my}
        r={markerR}
        fill={stickers.coral}
        stroke={markerBg ?? fallbackBg}
        strokeWidth={2}
      />
    </Svg>
  )
}

const SMALL_W = 180
const SMALL_H = 90

export function HormonesCard({ cycleDay, cycleLength }: Props) {
  const { colors, stickers, isDark } = useTheme()
  const cardBg = isDark ? colors.surfaceRaised : colors.bg

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
      <MonoCaps size={10} color={colors.textMuted}>HORMONES</MonoCaps>
      <View style={styles.chartWrap}>
        <HormonesLiveChart
          cycleDay={cycleDay}
          cycleLength={cycleLength}
          width={SMALL_W}
          height={SMALL_H}
          markerBg={cardBg}
        />
      </View>
      <View style={styles.legend}>
        <LegendItem color={stickers.coral} label="LH" />
        <LegendItem color={stickers.lilac} label="E" />
        <LegendItem color={stickers.green} label="P" />
      </View>
    </View>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Body size={11} color={colors.textMuted}>{label}</Body>
    </View>
  )
}

// ─── Interactive scrubbable chart ─────────────────────────────────────────
// Used in the detail sheet. Drag horizontally to scrub through the cycle —
// readouts and curve hit-points follow your finger while the lines breathe.

interface InteractiveProps {
  cycleDay: number
  cycleLength: number
  /** Period length in days (used to draw the menstruation band). */
  periodLength: number
  /** Luteal phase length in days (used to compute ovulation day). */
  lutealPhase: number
  width: number
  height: number
}

const PHASE_LABEL: Record<CyclePhase, string> = {
  menstruation: 'Menstruation',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
}

function phaseForDay(day: number, periodLength: number, ovDay: number): CyclePhase {
  if (day <= periodLength) return 'menstruation'
  if (day >= ovDay - 1 && day <= ovDay + 1) return 'ovulation'
  if (day < ovDay - 1) return 'follicular'
  return 'luteal'
}

export function HormonesInteractiveChart({
  cycleDay,
  cycleLength,
  periodLength,
  lutealPhase,
  width,
  height,
}: InteractiveProps) {
  const { colors, stickers, isDark } = useTheme()
  const t = useLiveTime()
  const { lh, es, pr } = buildCurves(cycleLength)

  const padX = 16
  const padY = 28
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const ovDay = cycleLength - lutealPhase

  const [selDay, setSelDay] = useState(cycleDay)

  const dayToX = (day: number) => padX + ((day - 1) / (cycleLength - 1)) * innerW
  const valueToY = (v: number) => padY + innerH - v * innerH
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
  const xToDay = (x: number) =>
    clamp(Math.round(((x - padX) / innerW) * (cycleLength - 1)) + 1, 1, cycleLength)

  // Pan responder — captures drag anywhere over the chart.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e: GestureResponderEvent) => {
          setSelDay(xToDay(e.nativeEvent.locationX))
        },
        onPanResponderMove: (e: GestureResponderEvent) => {
          setSelDay(xToDay(e.nativeEvent.locationX))
        },
      }),
    // We intentionally rebuild only when geometry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycleLength, innerW],
  )

  // Phase bands (background + labeled chips above the chart).
  const bands = [
    { from: 1, to: periodLength, color: stickers.pinkSoft, label: 'PERIOD' },
    { from: periodLength + 1, to: ovDay - 2, color: stickers.lilacSoft, label: 'FOLLICULAR' },
    { from: ovDay - 1, to: ovDay + 1, color: stickers.greenSoft, label: 'OVULATION' },
    { from: ovDay + 2, to: cycleLength, color: stickers.yellowSoft, label: 'LUTEAL' },
  ]

  // Live amplitude — proportional to chart width/height so motion always reads.
  const amp = 0.05

  const lhPath = buildPath(lh, width, height, padX, padY, t, 1.6, amp, 0)
  const esPath = buildPath(es, width, height, padX, padY, t, 1.1, amp, 1.3)
  const prPath = buildPath(pr, width, height, padX, padY, t, 0.8, amp, 2.7)

  const idx = clamp(selDay - 1, 0, cycleLength - 1)
  const selX = dayToX(selDay)
  const selLH = liveAt(lh, idx, t, 1.6, amp, 0)
  const selES = liveAt(es, idx, t, 1.1, amp, 1.3)
  const selPR = liveAt(pr, idx, t, 0.8, amp, 2.7)

  const todayX = dayToX(cycleDay)
  const selPhase = phaseForDay(selDay, periodLength, ovDay)
  const ink = isDark ? colors.text : '#141313'
  const cardBg = isDark ? colors.surfaceRaised : colors.bg

  const isToday = selDay === cycleDay
  const dayDelta = selDay - cycleDay
  const relLabel =
    isToday ? 'TODAY' : dayDelta < 0 ? `${Math.abs(dayDelta)} DAY${dayDelta === -1 ? '' : 'S'} AGO` : `IN ${dayDelta} DAY${dayDelta === 1 ? '' : 'S'}`

  const pct = (v: number) => `${Math.round(v * 100)}`

  // Area fills (pastel ribbons under each line).
  const lhArea = buildAreaPath(lh, width, height, padX, padY, t, 1.6, amp, 0)
  const esArea = buildAreaPath(es, width, height, padX, padY, t, 1.1, amp, 1.3)
  const prArea = buildAreaPath(pr, width, height, padX, padY, t, 0.8, amp, 2.7)

  // Day-tick dots along the baseline (every 7 days + first/last).
  const tickDays: number[] = []
  for (let d = 1; d <= cycleLength; d += 7) tickDays.push(d)
  if (tickDays[tickDays.length - 1] !== cycleLength) tickDays.push(cycleLength)

  return (
    <View style={interactive.wrap}>
      {/* Readout — paper chip with phase label + values, updates live as you drag */}
      <View style={[interactive.readout, { borderColor: colors.borderLight }]}>
        <View style={interactive.readoutHeader}>
          <MonoCaps size={10} color={colors.textMuted}>DAY {selDay} · {relLabel}</MonoCaps>
          <Body size={11} color={colors.textMuted}>{cycleLength}-day cycle</Body>
        </View>
        <View style={interactive.phaseRow}>
          <View style={[interactive.phasePill, { backgroundColor: phaseSoft(selPhase, stickers), borderColor: colors.borderLight }]}>
            <Display size={20} color={ink}>{PHASE_LABEL[selPhase]}</Display>
          </View>
        </View>
        <View style={interactive.statRow}>
          <StatChip color={stickers.coral} label="LH" value={pct(selLH)} ink={ink} muted={colors.textMuted} bg={cardBg} border={colors.borderLight} />
          <StatChip color={stickers.lilac} label="E" value={pct(selES)} ink={ink} muted={colors.textMuted} bg={cardBg} border={colors.borderLight} />
          <StatChip color={stickers.green} label="P" value={pct(selPR)} ink={ink} muted={colors.textMuted} bg={cardBg} border={colors.borderLight} />
        </View>
      </View>

      {/* Phase chips row above the chart — each chip sits over its band */}
      <View style={{ width, height: 22, position: 'relative' }}>
        {bands.map((b, i) => {
          const x1 = dayToX(Math.max(1, b.from))
          const x2 = dayToX(Math.min(cycleLength, b.to))
          const w = Math.max(0, x2 - x1)
          if (w < 28) return null
          return (
            <View
              key={i}
              style={[
                interactive.bandChip,
                {
                  left: x1,
                  width: w,
                  backgroundColor: b.color,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <MonoCaps size={8} color={ink}>{b.label}</MonoCaps>
            </View>
          )
        })}
      </View>

      {/* Chart with pan handlers */}
      <View {...pan.panHandlers} style={{ width, height }}>
        <Svg width={width} height={height}>
          {/* Soft phase-band wash behind curves — extends full height */}
          {bands.map((b, i) => {
            const x1 = dayToX(Math.max(1, b.from))
            const x2 = dayToX(Math.min(cycleLength, b.to))
            const w = Math.max(0, x2 - x1)
            if (w <= 0) return null
            return (
              <Rect
                key={i}
                x={x1}
                y={padY}
                width={w}
                height={innerH}
                fill={b.color}
                opacity={0.45}
                rx={10}
              />
            )
          })}

          {/* Baseline (hand-drawn ink line) */}
          <Line
            x1={padX}
            x2={padX + innerW}
            y1={padY + innerH}
            y2={padY + innerH}
            stroke={ink}
            strokeWidth={1}
            opacity={0.18}
          />

          {/* Filled ribbons under each curve */}
          <Path d={prArea} fill={stickers.green} opacity={0.22} />
          <Path d={esArea} fill={stickers.lilac} opacity={0.22} />
          <Path d={lhArea} fill={stickers.coral} opacity={0.22} />

          {/* Curves */}
          <Path d={esPath} stroke={stickers.lilac} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={prPath} stroke={stickers.green} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={lhPath} stroke={stickers.coral} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* Day-tick dots on the baseline */}
          {tickDays.map((d) => {
            const x = dayToX(d)
            return (
              <Circle key={d} cx={x} cy={padY + innerH} r={2.2} fill={ink} opacity={0.45} />
            )
          })}

          {/* Today marker — small ink star tick on the baseline */}
          <Circle cx={todayX} cy={padY + innerH} r={4} fill={cardBg} stroke={ink} strokeWidth={1.5} />
          <Circle cx={todayX} cy={padY + innerH} r={1.5} fill={ink} />

          {/* Scrubber line — coral, sticker-feel */}
          <Line
            x1={selX}
            x2={selX}
            y1={padY - 4}
            y2={padY + innerH}
            stroke={stickers.coral}
            strokeWidth={2}
            opacity={0.9}
          />

          {/* Hit dots on each curve at scrubber position — sticker style with ink outline */}
          <Circle cx={selX} cy={valueToY(selLH)} r={6} fill={stickers.coral} stroke={ink} strokeWidth={1.5} />
          <Circle cx={selX} cy={valueToY(selES)} r={6} fill={stickers.lilac} stroke={ink} strokeWidth={1.5} />
          <Circle cx={selX} cy={valueToY(selPR)} r={6} fill={stickers.green} stroke={ink} strokeWidth={1.5} />

          {/* Scrubber handle on top — coral disc with ink outline (matches sticker style) */}
          <Circle cx={selX} cy={padY - 4} r={9} fill={stickers.coral} stroke={ink} strokeWidth={1.5} />
          <Circle cx={selX} cy={padY - 4} r={3} fill={cardBg} />
        </Svg>
      </View>

      <Body size={12} color={colors.textMuted} style={{ textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
        drag across the chart to scrub through your cycle
      </Body>
    </View>
  )
}

function phaseSoft(phase: CyclePhase, stickers: ReturnType<typeof useTheme>['stickers']): string {
  switch (phase) {
    case 'menstruation': return stickers.pinkSoft
    case 'follicular': return stickers.lilacSoft
    case 'ovulation': return stickers.greenSoft
    case 'luteal': return stickers.yellowSoft
  }
}

function StatChip({
  color,
  label,
  value,
  ink,
  muted,
  bg,
  border,
}: {
  color: string
  label: string
  value: string
  ink: string
  muted: string
  bg: string
  border: string
}) {
  return (
    <View style={[interactive.statChip, { backgroundColor: bg, borderColor: border }]}>
      <View style={[interactive.statDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <MonoCaps size={9} color={muted}>{label}</MonoCaps>
        <Display size={18} color={ink}>{value}</Display>
      </View>
    </View>
  )
}

const interactive = StyleSheet.create({
  wrap: { gap: 14 },
  readout: {
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  readoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseRow: {
    flexDirection: 'row',
  },
  phasePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  bandChip: {
    position: 'absolute',
    top: 0,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    minHeight: 160,
  },
  chartWrap: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
