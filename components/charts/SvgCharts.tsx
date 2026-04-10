/**
 * SVG Chart Components — polished custom charts using react-native-svg.
 *
 * LineChart, BarChart, HeatmapGrid, BubbleGrid, DotTimeline
 * Features: Y-axis labels, grid lines, value labels, gradient fills, rounded bars.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import Svg, {
  Polyline, Circle, Rect, Line, Path,
  Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg'
import { useTheme, brand } from '../../constants/theme'

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Compute nice Y-axis ticks (3-4 ticks) */
function niceScale(min: number, max: number, ticks = 4): number[] {
  if (max === min) return [min]
  const range = max - min
  const step = Math.ceil(range / ticks)
  const result: number[] = []
  for (let v = 0; v <= max + step; v += step) {
    result.push(v)
    if (result.length >= ticks + 1) break
  }
  return result
}

function formatNum(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(1)
}

// ─── Line Chart ────────────────────────────────────────────────────────────

interface LineChartProps {
  data: number[]
  labels?: string[]
  color?: string
  width?: number
  height?: number
  showAverage?: boolean
  unit?: string
  onPress?: () => void
}

export function LineChart({
  data,
  labels,
  color,
  width = 300,
  height = 140,
  showAverage = false,
  unit = '',
  onPress,
}: LineChartProps) {
  const { colors } = useTheme()
  const lineColor = color ?? colors.primary

  if (data.length < 2) return null

  const leftPad = 36
  const rightPad = 12
  const topPad = 16
  const bottomPad = 24
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad

  const minV = Math.min(...data)
  const maxV = Math.max(...data)
  const ticks = niceScale(Math.floor(minV), Math.ceil(maxV), 3)
  const scaleMin = ticks[0]
  const scaleMax = ticks[ticks.length - 1]
  const range = scaleMax - scaleMin || 1
  const avg = data.reduce((a, b) => a + b, 0) / data.length

  const pts = data.map((v, i) => ({
    x: leftPad + (i / (data.length - 1)) * chartW,
    y: topPad + chartH - ((v - scaleMin) / range) * chartH,
    v,
  }))

  const avgY = topPad + chartH - ((avg - scaleMin) / range) * chartH
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')

  // Area fill path
  const areaPath = `M ${pts[0].x},${topPad + chartH} L ${polyline.replace(/,/g, ' ').split(' ').reduce((acc, val, i) => {
    if (i % 2 === 0) return acc + `L ${val},`
    return acc + `${val} `
  }, '').trim()} L ${pts[pts.length - 1].x},${topPad + chartH} Z`

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.chartWrap}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`lineGrad_${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.2" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Grid lines + Y labels */}
          {ticks.map((tick, i) => {
            const y = topPad + chartH - ((tick - scaleMin) / range) * chartH
            return (
              <View key={i}>
                <Line x1={leftPad} y1={y} x2={width - rightPad} y2={y} stroke={colors.border} strokeWidth={0.5} opacity={0.5} />
                <SvgText x={leftPad - 6} y={y + 3.5} fill={colors.textMuted} fontSize={9} fontWeight="500" textAnchor="end">
                  {formatNum(tick)}
                </SvgText>
              </View>
            )
          })}

          {/* Area fill */}
          <Path d={areaPath} fill={`url(#lineGrad_${lineColor.replace('#', '')})`} />

          {/* Average line */}
          {showAverage && (
            <>
              <Line x1={leftPad} y1={avgY} x2={width - rightPad} y2={avgY} stroke={lineColor} strokeWidth={1} strokeDasharray="5,4" opacity={0.5} />
              <SvgText x={width - rightPad + 2} y={avgY + 3} fill={lineColor} fontSize={8} fontWeight="600" opacity={0.7}>
                avg
              </SvgText>
            </>
          )}

          {/* Line */}
          <Polyline
            points={polyline}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {pts.map((p, i) => (
            <View key={i}>
              <Circle cx={p.x} cy={p.y} r={4.5} fill={lineColor} stroke={colors.surface} strokeWidth={2} />
              {/* Value label on first, last, max */}
              {(i === 0 || i === pts.length - 1 || p.v === maxV) && (
                <SvgText x={p.x} y={p.y - 10} fill={colors.text} fontSize={9} fontWeight="700" textAnchor="middle">
                  {formatNum(p.v)}{unit}
                </SvgText>
              )}
            </View>
          ))}
        </Svg>

        {/* X labels */}
        {labels && (
          <View style={[styles.labelRow, { width, paddingLeft: leftPad, paddingRight: rightPad }]}>
            {labels.map((l, i) => (
              <Text key={i} style={[styles.label, { color: colors.textMuted }]}>{l}</Text>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  )
}

// ─── Bar Chart ─────────────────────────────────────────────────────────────

interface BarChartProps {
  data: number[]
  labels?: string[]
  color?: string
  width?: number
  height?: number
  showValues?: boolean
  onPress?: () => void
}

export function BarChart({
  data,
  labels,
  color,
  width = 300,
  height = 140,
  showValues = true,
  onPress,
}: BarChartProps) {
  const { colors } = useTheme()
  const barColor = color ?? colors.primary

  if (data.length === 0) return null

  const leftPad = 32
  const rightPad = 12
  const topPad = 20
  const bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad

  const maxV = Math.max(...data)
  const ticks = niceScale(0, Math.ceil(maxV), 3)
  const scaleMax = ticks[ticks.length - 1] || 1
  const barW = Math.min(28, chartW / data.length - 10)

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.chartWrap}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`barGrad_${barColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={barColor} stopOpacity="0.95" />
              <Stop offset="1" stopColor={barColor} stopOpacity="0.55" />
            </LinearGradient>
          </Defs>

          {/* Grid lines + Y labels */}
          {ticks.map((tick, i) => {
            const y = topPad + chartH - (tick / scaleMax) * chartH
            return (
              <View key={i}>
                <Line x1={leftPad} y1={y} x2={width - rightPad} y2={y} stroke={colors.border} strokeWidth={0.5} opacity={0.4} />
                <SvgText x={leftPad - 6} y={y + 3.5} fill={colors.textMuted} fontSize={9} fontWeight="500" textAnchor="end">
                  {formatNum(tick)}
                </SvgText>
              </View>
            )
          })}

          {/* Bars */}
          {data.map((v, i) => {
            const barH = (v / scaleMax) * chartH
            const x = leftPad + (i + 0.5) * (chartW / data.length) - barW / 2
            const y = topPad + chartH - barH
            return (
              <View key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(barH, 2)}
                  rx={barW / 3}
                  fill={`url(#barGrad_${barColor.replace('#', '')})`}
                />
                {/* Value on top */}
                {showValues && v > 0 && (
                  <SvgText x={x + barW / 2} y={y - 5} fill={colors.text} fontSize={9} fontWeight="700" textAnchor="middle">
                    {formatNum(v)}
                  </SvgText>
                )}
              </View>
            )
          })}
        </Svg>

        {/* X labels */}
        {labels && (
          <View style={[styles.labelRow, { width, paddingLeft: leftPad, paddingRight: rightPad }]}>
            {labels.map((l, i) => (
              <Text key={i} style={[styles.label, { color: colors.textMuted }]}>{l}</Text>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  )
}

// ─── Heatmap Grid ──────────────────────────────────────────────────────────

interface HeatmapProps {
  data: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  color?: string
  onPress?: () => void
}

export function HeatmapGrid({ data, rowLabels, colLabels, color, onPress }: HeatmapProps) {
  const { colors, radius } = useTheme()
  const heatColor = color ?? colors.primary
  const cellSize = 30
  const gap = 4

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View>
        {colLabels && (
          <View style={[styles.heatColLabels, { marginLeft: rowLabels ? 34 : 0 }]}>
            {colLabels.map((l, i) => (
              <Text key={i} style={[styles.heatLabel, { width: cellSize + gap, color: colors.textMuted }]}>{l}</Text>
            ))}
          </View>
        )}
        {data.map((row, ri) => (
          <View key={ri} style={styles.heatRow}>
            {rowLabels && (
              <Text style={[styles.heatRowLabel, { color: colors.textMuted }]}>{rowLabels[ri] ?? ''}</Text>
            )}
            {row.map((val, ci) => (
              <View
                key={ci}
                style={[
                  styles.heatCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 6,
                    backgroundColor: val > 0 ? heatColor : colors.surfaceRaised,
                    opacity: val > 0 ? 0.2 + val * 0.8 : 0.3,
                    margin: gap / 2,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </Pressable>
  )
}

// ─── Bubble Grid ───────────────────────────────────────────────────────────

interface BubbleItem {
  label: string
  value: number
  color?: string
}

interface BubbleGridProps {
  items: BubbleItem[]
  onPress?: () => void
}

export function BubbleGrid({ items, onPress }: BubbleGridProps) {
  const { colors } = useTheme()
  const maxVal = Math.max(...items.map((i) => i.value), 1)

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.bubbleWrap}>
        {items.map((item, i) => {
          const size = 40 + (item.value / maxVal) * 36
          const bg = item.color ?? colors.primary
          return (
            <View
              key={i}
              style={[styles.bubble, {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bg + '20',
                borderWidth: 1.5,
                borderColor: bg + '40',
              }]}
            >
              <Text style={[styles.bubbleCount, { color: bg, fontSize: Math.max(12, size / 4.5) }]}>
                {item.value}
              </Text>
              <Text style={[styles.bubbleLabel, { color: bg, fontSize: Math.max(8, size / 7) }]} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          )
        })}
      </View>
    </Pressable>
  )
}

// ─── Dot Timeline ──────────────────────────────────────────────────────────

interface DotTimelineProps {
  dots: number[]
  cycleLength?: number
  color?: string
  width?: number
  onPress?: () => void
}

export function DotTimeline({ dots, cycleLength = 28, color, width = 300, onPress }: DotTimelineProps) {
  const { colors } = useTheme()
  const dotColor = color ?? brand.prePregnancy
  const height = 40
  const pad = 16
  const dotSet = new Set(dots)

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.chartWrap}>
        <Svg width={width} height={height}>
          <Line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke={colors.border} strokeWidth={1} />
          <Rect
            x={pad + ((8 / cycleLength) * (width - pad * 2))}
            y={4}
            width={(7 / cycleLength) * (width - pad * 2)}
            height={height - 8}
            rx={4}
            fill={brand.phase.ovulation}
            opacity={0.1}
          />
          {Array.from({ length: cycleLength }, (_, i) => i + 1).map((day) => {
            const x = pad + ((day - 1) / (cycleLength - 1)) * (width - pad * 2)
            const hasDot = dotSet.has(day)
            return (
              <Circle
                key={day}
                cx={x}
                cy={height / 2}
                r={hasDot ? 6 : 2}
                fill={hasDot ? dotColor : colors.border}
                opacity={hasDot ? 1 : 0.5}
              />
            )
          })}
        </Svg>
      </View>
    </Pressable>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chartWrap: { alignItems: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  heatColLabels: { flexDirection: 'row', marginBottom: 2 },
  heatLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  heatRow: { flexDirection: 'row', alignItems: 'center' },
  heatRowLabel: { width: 30, fontSize: 9, fontWeight: '600', textAlign: 'right', marginRight: 4 },
  heatCell: {},
  bubbleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingVertical: 4 },
  bubble: { alignItems: 'center', justifyContent: 'center', gap: 1 },
  bubbleCount: { fontWeight: '800' },
  bubbleLabel: { fontWeight: '600', textAlign: 'center' },
})
