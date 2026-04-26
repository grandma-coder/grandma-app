/**
 * SVG Chart Components — polished custom charts using react-native-svg.
 *
 * LineChart, BarChart, HeatmapGrid, BubbleGrid, DotTimeline
 * Features: smooth curves, Y-axis labels, grid lines, value labels, gradient fills, rounded bars.
 */

import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native'
import Svg, {
  Circle, Rect, Line, Path, G,
  Text as SvgText,
} from 'react-native-svg'
import { useTheme, brand } from '../../constants/theme'
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'

const STICKER_INK = '#141313'
const MOOD_STRIP_BASE_SIZE = 32
const MOOD_STRIP_SIZE_RANGE = 10

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

/** Downsample a daily series to ≤ maxBuckets by summing each bucket. */
function binSeries(data: number[], labels: string[] | undefined, maxBuckets = 14): { data: number[]; labels: string[] | undefined } {
  const n = data.length
  if (n <= maxBuckets) return { data, labels }
  const stride = Math.ceil(n / maxBuckets)
  const out: number[] = []
  const outLabels: string[] = []
  for (let i = 0; i < n; i += stride) {
    let sum = 0
    for (let j = i; j < Math.min(i + stride, n); j++) sum += data[j]
    out.push(sum)
    if (labels) outLabels.push(labels[i] ?? '')
  }
  return { data: out, labels: labels ? outLabels : undefined }
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
  data: rawData,
  labels: rawLabels,
  color,
  width = 300,
  height = 200,
  showAverage = false,
  unit = '',
  onPress,
}: LineChartProps) {
  const { colors } = useTheme()
  const lineColor = color ?? colors.primary

  if (rawData.length < 2) return null

  // Bin wide windows so lines aren't unreadably dense.
  // For LineChart, take avg per bucket so the curve reflects values not totals.
  const data = rawData.length <= 14 ? rawData : (() => {
    const stride = Math.ceil(rawData.length / 14)
    const out: number[] = []
    for (let i = 0; i < rawData.length; i += stride) {
      let sum = 0; let n = 0
      for (let j = i; j < Math.min(i + stride, rawData.length); j++) { sum += rawData[j]; n++ }
      out.push(n > 0 ? sum / n : 0)
    }
    return out
  })()
  const labels = rawLabels && rawLabels.length === rawData.length && rawData.length > 14
    ? (() => {
        const stride = Math.ceil(rawLabels.length / 14)
        const out: string[] = []
        for (let i = 0; i < rawLabels.length; i += stride) out.push(rawLabels[i])
        return out
      })()
    : rawLabels

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

          {/* Grid lines + Y labels */}
          {ticks.map((tick, i) => {
            const y = topPad + chartH - ((tick - scaleMin) / range) * chartH
            return (
              <G key={i}>
                <Line
                  x1={leftPad} y1={y} x2={width - rightPad} y2={y}
                  stroke={colors.border} strokeWidth={1} opacity={0.5}
                  strokeDasharray={i === 0 ? undefined : '3,5'}
                  strokeLinecap="round"
                />
                <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end" fontFamily="DMSans_500Medium">
                  {formatNum(tick)}
                </SvgText>
              </G>
            )
          })}

          {/* Area fill — solid sticker tint */}
          <Path d={areaPath} fill={lineColor} opacity={0.14} />

          {/* Average line */}
          {showAverage && (
            <G>
              <Line
                x1={leftPad} y1={avgY} x2={width - rightPad} y2={avgY}
                stroke={lineColor} strokeWidth={1.25} strokeDasharray="5,5" opacity={0.5}
                strokeLinecap="round"
              />
              <SvgText x={width - rightPad + 4} y={avgY + 3} fill={lineColor} fontSize={10} fontWeight="600" opacity={0.7} fontFamily="DMSans_500Medium">
                avg
              </SvgText>
            </G>
          )}

          {/* Smooth curve line — hand-drawn ink feel */}
          <Path
            d={curvePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.75}
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
              <G key={i}>
                {/* Soft sticker halo */}
                <Circle cx={p.x} cy={p.y} r={9} fill={lineColor} opacity={0.15} />
                <Circle cx={p.x} cy={p.y} r={5} fill={lineColor} stroke={colors.surface} strokeWidth={2.5} />
                {showLabel && (
                  <G>
                    <Rect
                      x={p.x - 19} y={p.y - 26} width={38} height={18}
                      rx={9} fill={colors.surface}
                      stroke={lineColor} strokeWidth={1} opacity={0.95}
                    />
                    <SvgText
                      x={p.x} y={p.y - 13}
                      fill={isMax ? lineColor : colors.text}
                      fontSize={11} fontWeight="700" textAnchor="middle"
                      fontFamily="Fraunces_600SemiBold"
                    >
                      {formatNum(p.v)}{unit}
                    </SvgText>
                  </G>
                )}
              </G>
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
  data: rawData,
  labels: rawLabels,
  color,
  width = 300,
  height = 200,
  showValues = true,
  onPress,
}: BarChartProps) {
  const { colors } = useTheme()
  const barColor = color ?? colors.primary

  if (rawData.length === 0) return null

  // Bin wide windows to ≤14 buckets so bars stay readable
  const binned = binSeries(rawData, rawLabels, 14)
  const data = binned.data
  const labels = binned.labels

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
          {/* Grid lines + Y labels */}
          {ticks.map((tick, i) => {
            const y = topPad + chartH - (tick / scaleMax) * chartH
            return (
              <G key={i}>
                <Line
                  x1={leftPad} y1={y} x2={width - rightPad} y2={y}
                  stroke={colors.border} strokeWidth={1} opacity={0.45}
                  strokeDasharray={i === 0 ? undefined : '3,5'}
                  strokeLinecap="round"
                />
                <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end" fontFamily="DMSans_500Medium">
                  {formatNum(tick)}
                </SvgText>
              </G>
            )
          })}

          {/* Bars with rounded top corners — sticker chip style */}
          {data.map((v, i) => {
            const rawH = (v / scaleMax) * chartH
            const barH = Math.max(rawH, 3)
            const x = leftPad + (i + 0.5) * (chartW / data.length) - barW / 2
            const y = topPad + chartH - barH

            // Rounded top rect via path
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
              <G key={i}>
                {/* Soft tint base behind bar */}
                {v > 0 && (
                  <Path d={barPath} fill={barColor} opacity={0.18} transform="translate(0 1)" />
                )}
                {/* Solid sticker bar */}
                <Path d={barPath} fill={barColor} />
                {/* Value on top */}
                {showValues && v > 0 && (
                  <SvgText
                    x={x + barW / 2} y={y - 8}
                    fill={colors.text} fontSize={12} fontWeight="700" textAnchor="middle"
                    fontFamily="Fraunces_600SemiBold"
                  >
                    {formatNum(v)}
                  </SvgText>
                )}
              </G>
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
  const { colors, isDark } = useTheme()
  const maxVal = Math.max(...items.map((i) => i.value), 1)
  const ink = isDark ? colors.text : STICKER_INK

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View style={styles.bubbleWrap}>
        {items.map((item, i) => {
          const size = 56 + (item.value / maxVal) * 44
          const bg = item.color ?? colors.primary
          return (
            <View
              key={i}
              style={[styles.bubble, {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bg + '40',
                borderWidth: 1.5,
                borderColor: ink,
              }]}
            >
              <Text style={[styles.bubbleCount, { color: ink, fontSize: Math.max(16, size / 4), fontFamily: 'Fraunces_600SemiBold' }]}>
                {item.value}
              </Text>
              <Text style={[styles.bubbleLabel, { color: ink, fontSize: Math.max(10, size / 7), fontFamily: 'DMSans_500Medium' }]} numberOfLines={1}>
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

interface MoodStickerStripProps {
  days: MoodStripDay[]
}

export function MoodStickerStrip({ days }: MoodStickerStripProps) {
  const { colors, isDark } = useTheme()
  const connectLineColor = isDark ? '#C5DA98' : '#BDD48C'

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
    <View style={moodStyles.stripContainer}>
      {/* Dashed connecting line behind bubbles */}
      {linePath && (
        <Svg
          width="100%"
          height={60}
          viewBox={`0 0 ${vbW} 60`}
          preserveAspectRatio="none"
          style={moodStyles.svgOverlay}
          pointerEvents="none"
        >
          <Path
            d={linePath}
            stroke={connectLineColor}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      )}

      {/* Day columns */}
      <View style={moodStyles.stripRow}>
        {days.map((day) => {
          const size = MOOD_STRIP_BASE_SIZE + Math.round(day.intensityRatio * MOOD_STRIP_SIZE_RANGE)
          const fill = day.dominantMood ? moodFaceFill(day.dominantMood) : null
          const variant = day.dominantMood ? moodFaceVariant(day.dominantMood) : null
          const stroke = isDark ? (fill ?? colors.border) : STICKER_INK

          return (
            <View
              key={day.label}
              style={moodStyles.dayColumn}
            >
              {fill && variant ? (
                // Soap bubble wrapper
                <View
                  style={[
                    moodStyles.soapBubble,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: fill + '40',
                      borderColor: fill + '70',
                      shadowColor: fill,
                    },
                  ]}
                >
                  {/* Shine crescent */}
                  <View style={moodStyles.shineCrescent} />
                  <MoodFace
                    size={Math.round(size * 0.72)}
                    variant={variant}
                    fill={fill}
                    stroke={stroke}
                  />
                </View>
              ) : (
                // Empty day — dashed circle
                <View style={[moodStyles.emptyCircle, { borderColor: colors.border }]} />
              )}
              <Text style={[moodStyles.dayLabel, { color: day.dominantMood ? colors.textMuted : colors.textMuted + '66' }]}>
                {day.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

// ─── Mood Bubble Cluster ───────────────────────────────────────────────────

export interface MoodBubbleItem {
  mood: string
  count: number
}

interface MoodBubbleClusterProps {
  items: MoodBubbleItem[]
}

const BUBBLE_MIN_SIZE = 80
const BUBBLE_MAX_SIZE = 140

export function MoodBubbleCluster({ items }: MoodBubbleClusterProps) {
  const { isDark, colors } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const inkMuted = isDark ? colors.textMuted : 'rgba(20,19,19,0.55)'

  const sorted = [...items]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const maxCount = sorted[0]?.count ?? 1
  const totalCount = sorted.reduce((sum, item) => sum + item.count, 0)

  return (
    <View style={bubbleClusterStyles.container}>
      {sorted.map((item) => {
        const size = Math.round(
          BUBBLE_MIN_SIZE + (item.count / maxCount) * (BUBBLE_MAX_SIZE - BUBBLE_MIN_SIZE),
        )
        const fill = moodFaceFill(item.mood)
        const variant = moodFaceVariant(item.mood)
        const stroke = isDark ? (fill || STICKER_INK) : STICKER_INK
        const label = item.mood.charAt(0).toUpperCase() + item.mood.slice(1)
        const pct = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0

        return (
          <View key={item.mood} style={bubbleClusterStyles.cell}>
            <View
              style={[
                bubbleClusterStyles.bubble,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: fill + '55',
                  borderColor: STICKER_INK,
                  shadowColor: STICKER_INK,
                },
              ]}
            >
              <View style={bubbleClusterStyles.shine} />
              <MoodFace
                size={Math.round(size * 0.55)}
                variant={variant}
                fill={fill}
                stroke={stroke}
              />
            </View>
            <Text style={[bubbleClusterStyles.bubbleCount, { color: ink }]}>
              {item.count}
            </Text>
            <Text style={[bubbleClusterStyles.bubbleLabel, { color: ink }]} numberOfLines={1}>
              {label}
            </Text>
            <Text style={[bubbleClusterStyles.bubblePct, { color: inkMuted }]}>
              {pct}%
            </Text>
          </View>
        )
      })}
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

const moodStyles = StyleSheet.create({
  stripContainer: {
    position: 'relative',
  },
  stripRow: {
    flexDirection: 'row',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  soapBubble: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shineCrescent: {
    position: 'absolute',
    top: '14%',
    left: '18%',
    width: '30%',
    height: '20%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '-22deg' }],
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  emptyCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})

const bubbleClusterStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 18,
    paddingVertical: 16,
  },
  cell: {
    alignItems: 'center',
    gap: 4,
    minWidth: 96,
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  shine: {
    position: 'absolute',
    top: '12%',
    left: '16%',
    width: '32%',
    height: '22%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '-22deg' }],
  },
  bubbleCount: {
    fontFamily: 'Fraunces_800ExtraBold',
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 32,
    marginTop: 8,
    fontWeight: '800',
  },
  bubbleLabel: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  bubblePct: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 12,
    opacity: 0.75,
  },
})
