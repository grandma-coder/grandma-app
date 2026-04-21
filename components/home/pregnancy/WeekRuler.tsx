/**
 * WeekRuler — 51cm pregnancy growth ruler
 *
 * Mirrors the ruler at the bottom of each card in pregnancy-weeks.html.
 * Shows a horizontal line with tick marks (0–51cm), a position dot for
 * the current week's length, and end labels (0 / 25cm / 51cm).
 */

import { View, StyleSheet } from 'react-native'
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg'

interface WeekRulerProps {
  /** Baby length in centimeters (0–51) */
  cm: number
  /** Color of the position dot (brand accent). */
  dotColor: string
  /** Color of the tick marks and labels. */
  lineColor: string
  /** Color of the cm value label above the dot. */
  textColor: string
  /** Stroke color for the dot outline (to stand out on dot background). */
  dotStroke: string
}

const RULER_VB_W = 360
const RULER_VB_H = 46
const X_START = 10
const X_END = 350
const MAX_CM = 51
const TICKS = 6 // 0, ~10, 20, 30, 40, 51

export function WeekRuler({ cm, dotColor, lineColor, textColor, dotStroke }: WeekRulerProps) {
  const clamped = Math.max(0, Math.min(MAX_CM, cm))
  const x = X_START + (clamped / MAX_CM) * (X_END - X_START)
  const label = clamped < 1 ? `${clamped.toFixed(2)}cm` : clamped < 10 ? `${clamped.toFixed(1)}cm` : `${Math.round(clamped)}cm`

  const tickXs = Array.from({ length: TICKS }, (_, i) => X_START + (i / (TICKS - 1)) * (X_END - X_START))

  return (
    <View style={styles.wrap}>
      <Svg width="100%" height={RULER_VB_H} viewBox={`0 0 ${RULER_VB_W} ${RULER_VB_H}`} preserveAspectRatio="xMidYMid meet">
        {/* Base line */}
        <Line x1={X_START} y1={22} x2={X_END} y2={22} stroke={lineColor} strokeWidth={1.5} />
        {/* Tick marks */}
        {tickXs.map((tx, i) => (
          <Line key={i} x1={tx} y1={20} x2={tx} y2={26} stroke={lineColor} strokeWidth={1.5} />
        ))}
        {/* Position dot */}
        <Circle cx={x} cy={22} r={8} fill={dotColor} stroke={dotStroke} strokeWidth={2} />
        {/* Value label above dot */}
        <SvgText
          x={x}
          y={12}
          fontFamily="Fraunces_700Bold"
          fontSize={11}
          fontWeight="700"
          fill={textColor}
          textAnchor="middle"
        >
          {label}
        </SvgText>
        {/* End labels */}
        <SvgText
          x={X_START}
          y={42}
          fontFamily="DMSans_500Medium"
          fontSize={9}
          fill={lineColor}
          textAnchor="start"
          letterSpacing={1.1}
        >
          0
        </SvgText>
        <SvgText
          x={(X_START + X_END) / 2}
          y={42}
          fontFamily="DMSans_500Medium"
          fontSize={9}
          fill={lineColor}
          textAnchor="middle"
          letterSpacing={1.1}
        >
          25cm
        </SvgText>
        <SvgText
          x={X_END}
          y={42}
          fontFamily="DMSans_500Medium"
          fontSize={9}
          fill={lineColor}
          textAnchor="end"
          letterSpacing={1.1}
        >
          51cm
        </SvgText>
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginTop: 14 },
})
