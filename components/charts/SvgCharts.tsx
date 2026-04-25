/**
 * SVG Chart Components — polished custom charts using react-native-svg.
 *
 * LineChart, BarChart, HeatmapGrid, BubbleGrid, DotTimeline
 * Features: smooth curves, Y-axis labels, grid lines, value labels, gradient fills, rounded bars.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import Svg, {
  Circle, Rect, Line, Path,
  Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg'
import { useTheme, brand } from '../../constants/theme'
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/** Compute nice Y-axis ticks (3-4 ticks) spanning [min, max] without forcing 0 */
function niceScale(min: number, max: number, ticks = 4): number[] {
  if (max === min) {
    const pad = Math.max(1, Math.abs(max) * 0.1)
    return [min - pad, min, min + pad]
  }
  const range = max - min
  // Choose a "nice" step size (1, 2, 2.5, 5, 10, …)
  const rawStep = range / ticks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  let niceStep: number
  if (normalized < 1.5) niceStep = 1
  else if (normalized < 3) niceStep = 2
  else if (normalized < 7) niceStep = 5
  else niceStep = 10
  niceStep *= magnitude

  const scaleMin = Math.floor(min / niceStep) * niceStep
  const scaleMax = Math.ceil(max / niceStep) * niceStep
  const result: number[] = []
  for (let v = scaleMin; v <= scaleMax + niceStep / 2; v += niceStep) {
    result.push(Number(v.toFixed(6)))
    if (result.length > ticks + 2) break
  }
  return result
}

function formatNum(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(1)
}

/** Build a smooth cubic bezier SVG path through points */
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]

    const tension = 0.3
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
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
  height = 200,
  showAverage = false,
  unit = '',
  onPress,
}: LineChartProps) {
  const { colors } = useTheme()
  const lineColor = color ?? colors.primary

  if (data.length < 2) return null

  const leftPad = 40
  const rightPad = 16
  const topPad = 28
  const bottomPad = 8
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

  // Smooth curve path
  const curvePath = smoothPath(pts)

  // Area fill path — follow smooth curve then close at bottom
  const areaPath = curvePath + ` L ${pts[pts.length - 1].x} ${topPad + chartH} L ${pts[0].x} ${topPad + chartH} Z`

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.chartWrap}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`lineGrad_${lineColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
              <Stop offset="0.7" stopColor={lineColor} stopOpacity="0.06" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines + Y labels */}
          {ticks.map((tick, i) => {
            const y = topPad + chartH - ((tick - scaleMin) / range) * chartH
            return (
              <View key={i}>
                <Line
                  x1={leftPad} y1={y} x2={width - rightPad} y2={y}
                  stroke={colors.border} strokeWidth={0.5} opacity={0.35}
                  strokeDasharray={i === 0 ? undefined : '4,4'}
                />
                <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
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
              <Line
                x1={leftPad} y1={avgY} x2={width - rightPad} y2={avgY}
                stroke={lineColor} strokeWidth={1} strokeDasharray="6,4" opacity={0.4}
              />
              <SvgText x={width - rightPad + 4} y={avgY + 3} fill={lineColor} fontSize={10} fontWeight="600" opacity={0.6}>
                avg
              </SvgText>
            </>
          )}

          {/* Smooth curve line */}
          <Path
            d={curvePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points + value labels */}
          {pts.map((p, i) => {
            const isFirst = i === 0
            const isLast = i === pts.length - 1
            const isMax = p.v === maxV
            const isMin = p.v === minV && data.length > 3
            const showLabel = isFirst || isLast || isMax || isMin
            return (
              <View key={i}>
                <Circle cx={p.x} cy={p.y} r={5} fill={lineColor} stroke={colors.surface} strokeWidth={2.5} />
                {showLabel && (
                  <View>
                    <Rect
                      x={p.x - 18} y={p.y - 24} width={36} height={17}
                      rx={4} fill={colors.surface} opacity={0.9}
                    />
                    <SvgText
                      x={p.x} y={p.y - 12}
                      fill={isMax ? lineColor : colors.text}
                      fontSize={11} fontWeight="800" textAnchor="middle"
                    >
                      {formatNum(p.v)}{unit}
                    </SvgText>
                  </View>
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
  height = 200,
  showValues = true,
  onPress,
}: BarChartProps) {
  const { colors } = useTheme()
  const barColor = color ?? colors.primary

  if (data.length === 0) return null

  const leftPad = 40
  const rightPad = 16
  const topPad = 28
  const bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad

  const maxV = Math.max(...data)
  const ticks = niceScale(0, Math.ceil(maxV), 3)
  const scaleMax = ticks[ticks.length - 1] || 1
  const barW = Math.min(36, chartW / data.length - 10)
  const barR = Math.min(8, barW / 3)

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.chartWrap}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`barGrad_${barColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={barColor} stopOpacity="1" />
              <Stop offset="1" stopColor={barColor} stopOpacity="0.5" />
            </LinearGradient>
          </Defs>

          {/* Grid lines + Y labels */}
          {ticks.map((tick, i) => {
            const y = topPad + chartH - (tick / scaleMax) * chartH
            return (
              <View key={i}>
                <Line
                  x1={leftPad} y1={y} x2={width - rightPad} y2={y}
                  stroke={colors.border} strokeWidth={0.5} opacity={0.3}
                  strokeDasharray={i === 0 ? undefined : '4,4'}
                />
                <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
                  {formatNum(tick)}
                </SvgText>
              </View>
            )
          })}

          {/* Bars with rounded top corners */}
          {data.map((v, i) => {
            const rawH = (v / scaleMax) * chartH
            const barH = Math.max(rawH, 3)
            const x = leftPad + (i + 0.5) * (chartW / data.length) - barW / 2
            const y = topPad + chartH - barH

            // Rounded top rect via path for better control
            const rTop = rawH > barR * 2 ? barR : Math.min(rawH / 2, barR)
            const barPath = `
              M ${x} ${y + barH}
              L ${x} ${y + rTop}
              Q ${x} ${y}, ${x + rTop} ${y}
              L ${x + barW - rTop} ${y}
              Q ${x + barW} ${y}, ${x + barW} ${y + rTop}
              L ${x + barW} ${y + barH}
              Z
            `

            return (
              <View key={i}>
                <Path
                  d={barPath}
                  fill={`url(#barGrad_${barColor.replace('#', '')})`}
                />
                {/* Subtle glow behind bar */}
                <Path
                  d={barPath}
                  fill={barColor}
                  opacity={0.08}
                />
                {/* Value on top */}
                {showValues && v > 0 && (
                  <SvgText
                    x={x + barW / 2} y={y - 8}
                    fill={colors.text} fontSize={12} fontWeight="800" textAnchor="middle"
                  >
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
  const { colors } = useTheme()
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
          const size = 48 + (item.value / maxVal) * 40
          const bg = item.color ?? colors.primary
          return (
            <View
              key={i}
              style={[styles.bubble, {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bg + '18',
                borderWidth: 1.5,
                borderColor: bg + '35',
              }]}
            >
              <Text style={[styles.bubbleCount, { color: bg, fontSize: Math.max(14, size / 4) }]}>
                {item.value}
              </Text>
              <Text style={[styles.bubbleLabel, { color: bg, fontSize: Math.max(9, size / 7) }]} numberOfLines={1}>
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

// ─── Mood Sticker Strip ────────────────────────────────────────────────────

export interface MoodStripDay {
  label: string       // e.g. 'Mon', 'W1'
  dominantMood: string | null
  intensityRatio: number  // 0–1: dominant count / total that day
}

export function MoodStickerStrip({ days }: { days: MoodStripDay[] }) {
  const { colors, isDark } = useTheme()
  const BASE = 32
  const RANGE = 10
  const ST_GREEN = isDark ? '#C5DA98' : '#BDD48C'

  // Collect x-centre positions of logged days for the connecting line
  const loggedIndices = days.map((d, i) => d.dominantMood ? i : null).filter((i) => i !== null) as number[]

  // Build SVG dashed-line path between logged columns
  // We use a fixed viewBox of (days.length * 40) x 60; each column centre = i*40+20
  const vbW = days.length * 40
  const lineY = 22  // vertical centre of bubbles in the 60-unit viewBox
  const linePath = loggedIndices.length >= 2
    ? 'M ' + loggedIndices.map((i) => `${i * 40 + 20} ${lineY}`).join(' L ')
    : null

  return (
    <View style={{ position: 'relative' }}>
      {/* Dashed connecting line behind bubbles */}
      {linePath && (
        <Svg
          width="100%"
          height={60}
          viewBox={`0 0 ${vbW} 60`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          pointerEvents="none"
        >
          <Path
            d={linePath}
            stroke={ST_GREEN}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      )}

      {/* Day columns */}
      <View style={{ flexDirection: 'row' }}>
        {days.map((day, i) => {
          const size = BASE + Math.round(day.intensityRatio * RANGE)
          const fill = day.dominantMood ? moodFaceFill(day.dominantMood) : undefined
          const variant = day.dominantMood ? moodFaceVariant(day.dominantMood) : undefined
          const stroke = isDark ? (fill ?? colors.border) : '#141313'

          return (
            <View
              key={i}
              style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10 }}
            >
              {day.dominantMood ? (
                // Soap bubble wrapper
                <View
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: (fill ?? '#FBEA9E') + '40',
                    borderWidth: 1.5,
                    borderColor: (fill ?? '#FBEA9E') + '70',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    shadowColor: fill ?? '#FBEA9E',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  {/* Shine crescent */}
                  <View
                    style={{
                      position: 'absolute',
                      top: '14%',
                      left: '18%',
                      width: '30%',
                      height: '20%',
                      borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.5)',
                      transform: [{ rotate: '-22deg' }],
                    }}
                  />
                  <MoodFace
                    size={Math.round(size * 0.72)}
                    variant={variant!}
                    fill={fill!}
                    stroke={stroke}
                  />
                </View>
              ) : (
                // Empty day — dashed circle
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                  }}
                />
              )}
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  color: day.dominantMood ? colors.textMuted : colors.textMuted + '66',
                  letterSpacing: 0.5,
                }}
              >
                {day.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chartWrap: { alignItems: 'center' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  heatColLabels: { flexDirection: 'row', marginBottom: 2 },
  heatLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  heatRow: { flexDirection: 'row', alignItems: 'center' },
  heatRowLabel: { width: 30, fontSize: 10, fontWeight: '600', textAlign: 'right', marginRight: 4 },
  heatCell: {},
  bubbleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingVertical: 8 },
  bubble: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  bubbleCount: { fontWeight: '900' },
  bubbleLabel: { fontWeight: '600', textAlign: 'center' },
})
