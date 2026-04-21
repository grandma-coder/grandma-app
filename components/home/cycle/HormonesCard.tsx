/**
 * HormonesCard — small card on the cycle home screen showing
 * idealized LH / Estrogen / Progesterone curves across the cycle,
 * with a dot marking today's cycle day.
 *
 * No real hormone tracking table exists — the curves are computed
 * from cycle day only. This is an illustrative widget, not data.
 */

import { View, StyleSheet } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { useTheme } from '../../../constants/theme'
import { MonoCaps, Body } from '../../ui/Typography'

interface Props {
  cycleDay: number
  cycleLength: number
}

const WIDTH = 180
const HEIGHT = 90
const PAD_X = 8
const PAD_Y = 8

/** Hormone curves by cycle day (roughly based on a 28-day cycle). */
function lhCurve(day: number, len: number): number {
  const ov = len - 14
  // Spike near ovulation
  const d = day - ov
  return Math.exp(-(d * d) / 4) // 0..1
}
function estrogenCurve(day: number, len: number): number {
  const ov = len - 14
  // Two peaks: just before ovulation + mid-luteal
  const a = Math.exp(-((day - (ov - 1)) ** 2) / 10)
  const b = 0.6 * Math.exp(-((day - (ov + 7)) ** 2) / 20)
  return Math.max(a, b)
}
function progesteroneCurve(day: number, len: number): number {
  const ov = len - 14
  // Rises after ovulation, drops before next period
  if (day < ov) return 0.05
  const rise = Math.min(1, (day - ov) / 7)
  const fall = Math.max(0, 1 - (day - ov - 7) / 6)
  return Math.max(0.05, rise * fall)
}

function buildPath(values: number[]): string {
  if (values.length === 0) return ''
  const innerW = WIDTH - PAD_X * 2
  const innerH = HEIGHT - PAD_Y * 2
  let d = ''
  for (let i = 0; i < values.length; i++) {
    const x = PAD_X + (i / (values.length - 1)) * innerW
    const y = PAD_Y + innerH - values[i] * innerH
    if (i === 0) d += `M ${x.toFixed(1)} ${y.toFixed(1)}`
    else {
      const prevX = PAD_X + ((i - 1) / (values.length - 1)) * innerW
      const prevY = PAD_Y + innerH - values[i - 1] * innerH
      const midX = (prevX + x) / 2
      d += ` Q ${midX.toFixed(1)} ${prevY.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
    }
  }
  return d
}

export function HormonesCard({ cycleDay, cycleLength }: Props) {
  const { colors, stickers, isDark } = useTheme()

  const days = Array.from({ length: cycleLength }, (_, i) => i + 1)
  const lh = days.map((d) => lhCurve(d, cycleLength))
  const es = days.map((d) => estrogenCurve(d, cycleLength))
  const pr = days.map((d) => progesteroneCurve(d, cycleLength))

  const lhPath = buildPath(lh)
  const esPath = buildPath(es)
  const prPath = buildPath(pr)

  // Marker at today
  const innerW = WIDTH - PAD_X * 2
  const innerH = HEIGHT - PAD_Y * 2
  const idx = Math.min(cycleLength - 1, Math.max(0, cycleDay - 1))
  const mx = PAD_X + (idx / (cycleLength - 1)) * innerW
  const my = PAD_Y + innerH - lh[idx] * innerH

  const cardBg = isDark ? colors.surfaceRaised : colors.bg

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
      <MonoCaps size={10} color={colors.textMuted}>HORMONES</MonoCaps>
      <View style={styles.chartWrap}>
        <Svg width={WIDTH} height={HEIGHT}>
          <Path d={esPath} stroke={stickers.lilac} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={prPath} stroke={stickers.green} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Path d={lhPath} stroke={stickers.coral} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <Circle cx={mx} cy={my} r={4} fill={stickers.coral} stroke={cardBg} strokeWidth={2} />
        </Svg>
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
