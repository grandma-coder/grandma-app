/**
 * PhaseFlowChart — the "audience-flow"-style hero chart for Cycle Analytics.
 *
 * Plots the daily conception-probability curve across one full cycle as a
 * smooth filled area (like the reference app's audience-flow graph), shades
 * the fertile window as a vertical band, and drops a "you are here" marker on
 * today's cycle day. All data comes from lib/cycleLogic — this is pure render.
 */

import { View, Text, StyleSheet, Dimensions } from 'react-native'
import Svg, {
  Path, Line, Circle, Rect, Defs, LinearGradient, Stop, G,
} from 'react-native-svg'
import { useTheme, radius } from '../../../constants/theme'

interface Props {
  /** Per-day probability values (index 0 = cycle day 1). */
  curve: number[]
  /** 1-based fertile window start day. */
  fertileStart: number
  /** 1-based fertile window end day. */
  fertileEnd: number
  /** 1-based ovulation day. */
  ovulationDay: number
  /** 1-based current cycle day (the "you are here" marker). */
  cycleDay: number
  /** Accent color for the curve + marker. */
  color: string
  height?: number
}

export function PhaseFlowChart({
  curve, fertileStart, fertileEnd, ovulationDay, cycleDay, color, height = 150,
}: Props) {
  const { colors, font } = useTheme()

  if (curve.length < 2) {
    return (
      <View style={[styles.empty, { height, borderColor: colors.borderLight }]}>
        <Text style={{ color: colors.textMuted, fontFamily: font.body, fontSize: 12 }}>
          Log a period start to map your fertile window.
        </Text>
      </View>
    )
  }

  const W = Dimensions.get('window').width - 76
  const H = height
  const padX = 6
  const padTop = 20
  const padBottom = 22
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom

  const n = curve.length
  const max = Math.max(...curve, 1)
  // x for a 1-based day; xForDay(1) sits at the left edge, xForDay(n) at right.
  const xForDay = (day: number) => padX + ((day - 1) / (n - 1)) * innerW
  const yForVal = (v: number) => padTop + innerH - (v / max) * innerH

  const pts = curve.map((v, i) => ({ x: xForDay(i + 1), y: yForVal(v) }))

  // Smooth spline through the points (quadratic midpoint smoothing).
  const smooth = (() => {
    let d = `M${pts[0].x},${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]
      const cur = pts[i]
      const mx = (prev.x + cur.x) / 2
      d += ` Q${mx},${prev.y} ${cur.x},${cur.y}`
    }
    return d
  })()
  const area = `${smooth} L${pts[n - 1].x},${padTop + innerH} L${pts[0].x},${padTop + innerH} Z`

  const bandX = xForDay(Math.max(1, fertileStart))
  const bandW = Math.max(2, xForDay(Math.min(n, fertileEnd)) - bandX)

  const ovX = xForDay(Math.min(n, Math.max(1, ovulationDay)))

  const todayClamped = Math.min(n, Math.max(1, cycleDay))
  const todayX = xForDay(todayClamped)
  const todayY = yForVal(curve[todayClamped - 1] ?? 0)
  // Keep the "today" pill on-screen at both ends.
  const pillW = 52
  const pillH = 18
  const pillX = Math.max(padX, Math.min(W - padX - pillW, todayX - pillW / 2))
  // Float the pill just above the marker dot, but never above the chart's top
  // padding (otherwise on day 1 — where the dot sits high near padTop — the pill
  // would clip off the top edge and collide with the dot).
  const pillY = Math.max(0, todayY - pillH - 8)

  const gradId = 'phaseFlowGrad'

  return (
    <View style={{ width: '100%' }}>
      <Svg width={W} height={H} style={{ alignSelf: 'center' }}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.32} />
            <Stop offset="1" stopColor={color} stopOpacity={0.04} />
          </LinearGradient>
        </Defs>

        {/* Fertile-window band */}
        <Rect
          x={bandX}
          y={padTop}
          width={bandW}
          height={innerH}
          fill={color}
          opacity={0.12}
          rx={8}
        />
        {/* Ovulation peak guide */}
        <Line
          x1={ovX}
          y1={padTop}
          x2={ovX}
          y2={padTop + innerH}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.5}
        />

        {/* Baseline */}
        <Line
          x1={padX}
          x2={W - padX}
          y1={padTop + innerH}
          y2={padTop + innerH}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* Curve area + line */}
        <Path d={area} fill={`url(#${gradId})`} />
        <Path d={smooth} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />

        {/* "You are here" marker */}
        <G>
          <Line
            x1={todayX}
            y1={todayY}
            x2={todayX}
            y2={padTop + innerH}
            stroke={colors.text}
            strokeWidth={1}
            opacity={0.35}
          />
          <Circle cx={todayX} cy={todayY} r={6} fill={colors.text} stroke={colors.surface} strokeWidth={2} />
        </G>
      </Svg>

      {/* Today pill — rendered as RN view so it can use the app font cleanly */}
      <View
        pointerEvents="none"
        style={[
          styles.todayPill,
          { left: pillX, top: pillY, backgroundColor: colors.text, width: pillW, height: pillH },
        ]}
      >
        <Text style={{ color: colors.bg, fontFamily: font.bodySemiBold, fontSize: 10, letterSpacing: 0.2 }}>
          Day {cycleDay}
        </Text>
      </View>

      {/* Axis hints */}
      <View style={[styles.axisRow, { width: W, alignSelf: 'center' }]}>
        <Text style={[styles.axis, { color: colors.textMuted, fontFamily: font.body }]}>Period</Text>
        <Text style={[styles.axis, { color: color === colors.text ? colors.textMuted : color, fontFamily: font.bodySemiBold }]}>
          Fertile · ovulation
        </Text>
        <Text style={[styles.axis, { color: colors.textMuted, fontFamily: font.body, textAlign: 'right' }]}>
          Next period
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  todayPill: {
    position: 'absolute',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axis: {
    fontSize: 10,
    flex: 1,
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
})
