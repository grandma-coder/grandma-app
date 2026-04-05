/**
 * SVG Chart Components — lightweight custom charts using react-native-svg.
 *
 * LineChart, BarChart, HeatmapGrid, BubbleGrid, DotTimeline
 * All tappable via onPress for full-screen expansion.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import Svg, { Polyline, Circle, Rect, Line, Text as SvgText } from 'react-native-svg'
import { useTheme, brand } from '../../constants/theme'

// ─── Line Chart ────────────────────────────────────────────────────────────

interface LineChartProps {
  data: number[]
  labels?: string[]
  color?: string
  width?: number
  height?: number
  showAverage?: boolean
  onPress?: () => void
}

export function LineChart({
  data,
  labels,
  color,
  width = 300,
  height = 120,
  showAverage = false,
  onPress,
}: LineChartProps) {
  const { colors } = useTheme()
  const lineColor = color ?? colors.primary

  if (data.length < 2) return null

  const pad = 20
  const minV = Math.min(...data) - 1
  const maxV = Math.max(...data) + 1
  const range = maxV - minV || 1
  const avg = data.reduce((a, b) => a + b, 0) / data.length

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: height - pad - ((v - minV) / range) * (height - pad * 2),
    v,
  }))

  const avgY = height - pad - ((avg - minV) / range) * (height - pad * 2)
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.chartWrap}>
        <Svg width={width} height={height}>
          {showAverage && (
            <Line
              x1={pad}
              y1={avgY}
              x2={width - pad}
              y2={avgY}
              stroke={lineColor}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.4}
            />
          )}
          <Polyline
            points={polyline}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={lineColor}
              stroke={colors.surface}
              strokeWidth={2}
            />
          ))}
        </Svg>
        {labels && (
          <View style={[styles.labelRow, { width, paddingHorizontal: pad }]}>
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
  onPress?: () => void
}

export function BarChart({
  data,
  labels,
  color,
  width = 300,
  height = 120,
  onPress,
}: BarChartProps) {
  const { colors } = useTheme()
  const barColor = color ?? colors.primary

  if (data.length === 0) return null

  const pad = 20
  const maxV = Math.max(...data) + 1
  const barW = Math.min(32, (width - pad * 2) / data.length - 8)

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.chartWrap}>
        <Svg width={width} height={height}>
          {data.map((v, i) => {
            const barH = (v / maxV) * (height - pad * 2)
            const x = pad + (i / data.length) * (width - pad * 2) + (width - pad * 2) / data.length / 2 - barW / 2
            const y = height - pad - barH
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={barW / 4}
                fill={barColor}
                opacity={0.85}
              />
            )
          })}
        </Svg>
        {labels && (
          <View style={[styles.labelRow, { width, paddingHorizontal: pad }]}>
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
  /** rows x cols grid of intensity 0-1 */
  data: number[][]
  rowLabels?: string[]
  colLabels?: string[]
  color?: string
  onPress?: () => void
}

export function HeatmapGrid({
  data,
  rowLabels,
  colLabels,
  color,
  onPress,
}: HeatmapProps) {
  const { colors, radius } = useTheme()
  const heatColor = color ?? colors.primary

  const cellSize = 28
  const gap = 3

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View>
        {colLabels && (
          <View style={[styles.heatColLabels, { marginLeft: rowLabels ? 32 : 0 }]}>
            {colLabels.map((l, i) => (
              <Text
                key={i}
                style={[styles.heatLabel, { width: cellSize + gap, color: colors.textMuted }]}
              >
                {l}
              </Text>
            ))}
          </View>
        )}
        {data.map((row, ri) => (
          <View key={ri} style={styles.heatRow}>
            {rowLabels && (
              <Text style={[styles.heatRowLabel, { color: colors.textMuted }]}>
                {rowLabels[ri] ?? ''}
              </Text>
            )}
            {row.map((val, ci) => (
              <View
                key={ci}
                style={[
                  styles.heatCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderRadius: radius.sm / 2,
                    backgroundColor: val > 0 ? heatColor : colors.surfaceRaised,
                    opacity: val > 0 ? 0.2 + val * 0.8 : 1,
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
  const { colors, radius } = useTheme()

  const maxVal = Math.max(...items.map((i) => i.value), 1)

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.bubbleWrap}>
        {items.map((item, i) => {
          const size = 32 + (item.value / maxVal) * 40
          const bg = item.color ?? colors.primary
          return (
            <View
              key={i}
              style={[
                styles.bubble,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: bg + '25',
                },
              ]}
            >
              <Text
                style={[styles.bubbleLabel, { color: bg, fontSize: Math.max(9, size / 5) }]}
                numberOfLines={1}
              >
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
  /** Array of cycle days (1-based) where dots should appear */
  dots: number[]
  cycleLength?: number
  color?: string
  width?: number
  onPress?: () => void
}

export function DotTimeline({
  dots,
  cycleLength = 28,
  color,
  width = 300,
  onPress,
}: DotTimelineProps) {
  const { colors } = useTheme()
  const dotColor = color ?? brand.prePregnancy

  const height = 40
  const pad = 16

  const dotSet = new Set(dots)

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.chartWrap}>
        <Svg width={width} height={height}>
          {/* Baseline */}
          <Line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke={colors.border} strokeWidth={1} />
          {/* Fertile window band (days 9-15 approx) */}
          <Rect
            x={pad + ((8 / cycleLength) * (width - pad * 2))}
            y={4}
            width={(7 / cycleLength) * (width - pad * 2)}
            height={height - 8}
            rx={4}
            fill={brand.phase.ovulation}
            opacity={0.1}
          />
          {/* Dots */}
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
  chartWrap: {
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  heatColLabels: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  heatLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  heatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heatRowLabel: {
    width: 28,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'right',
    marginRight: 4,
  },
  heatCell: {},
  bubbleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleLabel: {
    fontWeight: '700',
    textAlign: 'center',
  },
})
