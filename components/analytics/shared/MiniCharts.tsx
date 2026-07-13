/**
 * MiniCharts — bar & line chart variants used inside BigChartCard.
 * Paper-native SVG, no legends. Single color with accent on latest point.
 */

import { useMemo, useState } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native'
import Svg, { Path, Circle, Line, Rect, Defs, Pattern, G, LinearGradient, RadialGradient, Stop } from 'react-native-svg'
import { useTheme } from '../../../constants/theme'
import { useTranslation } from '../../../lib/i18n'

const DEFAULT_CHART_W = Dimensions.get('window').width - 76

interface BarProps {
  /** Values (numeric). Empty → placeholder. */
  data: number[]
  /** Labels below each bar. Same length as data. */
  labels?: string[]
  /** Fill color (defaults to accent). */
  color?: string
  /**
   * Multi-hue palette — each bar cycles through these colors (editorial, mixed
   * look). When set it overrides `color` for the bars; the target line + latest
   * highlight still use `color` (or the first palette entry) as the anchor hue.
   */
  palette?: string[]
  /** Paint latest bar in a bolder variant. */
  highlightLast?: boolean
  height?: number
  /** Optional goal line (drawn dashed across the chart). */
  target?: number
  /** Unit suffix shown in the tap tooltip (e.g. "gl", "min"). */
  unit?: string
  /** Long labels for the tooltip (e.g. dates). Falls back to `labels`. */
  longLabels?: string[]
}

export function MiniBarChart({
  data,
  labels = [],
  color,
  palette,
  highlightLast = true,
  height = 130,
  target,
  unit,
  longLabels,
}: BarProps) {
  const { colors, stickers, font } = useTheme()
  const anchor = color ?? palette?.[0] ?? stickers.yellow
  const accent = anchor
  // Per-bar hue: cycle the palette when provided, else the single accent.
  const barHue = (i: number) => (palette && palette.length > 0 ? palette[i % palette.length] : accent)

  const [selected, setSelected] = useState<number | null>(null)
  const tooltipLabels = longLabels ?? labels

  if (data.length === 0) {
    return <EmptyChart height={height} />
  }

  const max = Math.max(...data, target ?? 0)
  // Round up to a nice ceiling so bars never touch the top edge
  const ceiling = Math.max(1, max * 1.15)

  const chartW = DEFAULT_CHART_W
  const chartH = height
  const padX = 4
  const padTop = 8
  const padBottom = 4
  const innerH = chartH - padTop - padBottom
  const slot = (chartW - padX * 2) / data.length
  const barW = Math.min(28, Math.max(8, slot * 0.6))
  const radius = Math.min(8, barW / 2)

  const heightFor = (v: number) => Math.max(2, (v / ceiling) * innerH)

  const targetY = target !== undefined
    ? padTop + innerH - (target / ceiling) * innerH
    : null

  return (
    <View style={{ width: '100%' }}>
      <View style={{ width: chartW, height: chartH, alignSelf: 'center' }}>
        <Svg width={chartW} height={chartH}>
          {/* Baseline */}
          <Line
            x1={padX}
            x2={chartW - padX}
            y1={chartH - padBottom}
            y2={chartH - padBottom}
            stroke={colors.border}
            strokeWidth={1}
          />
          {/* Target line */}
          {targetY !== null ? (
            <Line
              x1={padX}
              x2={chartW - padX}
              y1={targetY}
              y2={targetY}
              stroke={accent}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.55}
            />
          ) : null}
          {data.map((v, i) => {
            const cx = padX + slot * (i + 0.5)
            const x = cx - barW / 2
            const h = heightFor(v)
            const y = chartH - padBottom - h
            const isLast = i === data.length - 1 && highlightLast
            const isSel = i === selected
            const hue = barHue(i)
            // Full hue when highlighted/selected; otherwise a soft wash of that
            // same hue so a palette reads as a mix without shouting.
            const fill = isSel || isLast ? hue : hue + '55'
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={radius}
                ry={radius}
                fill={fill}
              />
            )
          })}
        </Svg>
        {/* Tap targets */}
        {data.map((_, i) => {
          const cx = padX + slot * (i + 0.5)
          return (
            <Pressable
              key={i}
              onPress={() => setSelected((s) => (s === i ? null : i))}
              hitSlop={4}
              style={{
                position: 'absolute',
                left: cx - slot / 2,
                top: 0,
                width: slot,
                height: chartH,
              }}
            />
          )
        })}
        {/* Tooltip */}
        {selected !== null ? (
          <BarTooltip
            chartW={chartW}
            cx={padX + slot * (selected + 0.5)}
            top={Math.max(2, chartH - padBottom - heightFor(data[selected]) - 38)}
            value={`${formatBarValue(data[selected])}${unit ? ` ${unit}` : ''}`}
            label={tooltipLabels[selected]}
          />
        ) : null}
      </View>
      {labels.length > 0 && (
        <View style={[styles.labelRow, { width: chartW, alignSelf: 'center', marginTop: 4 }]}>
          {labels.map((l, i) => (
            <Text
              key={i}
              style={[
                styles.barLabel,
                {
                  color: i === selected ? colors.text : colors.textMuted,
                  fontFamily: i === selected ? font.bodySemiBold : font.body,
                },
              ]}
              numberOfLines={1}
            >
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

function formatBarValue(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(1)
}

// ─── PillDivergingChart ───────────────────────────────────────────────────────
// A baseball-card style diverging chart: a center axis, a SOLID rounded capsule
// rising above it for the value you hit, and a HATCHED capsule dropping below it
// for the shortfall to target. Fully-capsule caps (rounded top+bottom). Editorial
// and distinctive — nothing like a plain bar. Tap a column for its value.

let hatchSeq = 0
interface DivergingProps {
  /** Daily values. */
  data: number[]
  /** Target per day (the axis represents "met target"). */
  target: number
  labels?: string[]
  longLabels?: string[]
  /** Solid (met) color + hatched (shortfall) color. */
  upColor: string
  downColor: string
  height?: number
  unit?: string
}

export function PillDivergingChart({
  data, target, labels = [], longLabels, upColor, downColor, height = 200, unit,
}: DivergingProps) {
  const { colors, font } = useTheme()
  const hatchId = useMemo(() => `hatch${hatchSeq++}`, [])
  const [selected, setSelected] = useState<number | null>(null)
  const tips = longLabels ?? labels

  if (data.length === 0) return <EmptyChart height={height} />

  const chartW = DEFAULT_CHART_W
  const chartH = height
  const padX = 4
  const axisY = chartH * 0.42 // axis sits a bit above center → more room below
  const upMax = axisY - 10
  const downMax = chartH - axisY - 22 // leave room for labels

  const slot = (chartW - padX * 2) / data.length
  const barW = Math.min(26, Math.max(10, slot * 0.52))
  const cap = barW / 2

  // Above-axis height scales the portion of target met (capped at target);
  // below-axis height scales the shortfall (0 when target met/exceeded).
  const metFor = (v: number) => Math.min(v, target) / Math.max(1, target)
  const gapFor = (v: number) => Math.max(0, target - v) / Math.max(1, target)

  return (
    <View style={{ width: '100%' }}>
      <View style={{ width: chartW, height: chartH, alignSelf: 'center' }}>
        <Svg width={chartW} height={chartH}>
          <Defs>
            {/* Diagonal hatch for the shortfall capsules */}
            <Pattern id={hatchId} patternUnits="userSpaceOnUse" width={6} height={6} patternTransform="rotate(45)">
              <Line x1={0} y1={0} x2={0} y2={6} stroke={downColor} strokeWidth={1.6} />
            </Pattern>
          </Defs>

          {/* Center axis */}
          <Line x1={padX} x2={chartW - padX} y1={axisY} y2={axisY} stroke={colors.text} strokeWidth={1.5} />

          {data.map((v, i) => {
            const cx = padX + slot * (i + 0.5)
            const x = cx - barW / 2
            const isSel = i === selected
            const up = metFor(v) * upMax
            const down = gapFor(v) * downMax
            return (
              <G key={i}>
                {/* Solid capsule up — the value you hit */}
                {up > cap * 0.4 ? (
                  <Rect
                    x={x}
                    y={axisY - up}
                    width={barW}
                    height={up}
                    rx={cap}
                    ry={cap}
                    fill={upColor}
                    opacity={isSel ? 1 : 0.92}
                  />
                ) : null}
                {/* Hatched capsule down — the shortfall to target */}
                {down > cap * 0.4 ? (
                  <G>
                    <Rect x={x} y={axisY} width={barW} height={down} rx={cap} ry={cap} fill={downColor} opacity={0.12} />
                    <Rect x={x} y={axisY} width={barW} height={down} rx={cap} ry={cap} fill={`url(#${hatchId})`} opacity={0.9} />
                  </G>
                ) : null}
              </G>
            )
          })}
        </Svg>

        {/* Tap targets */}
        {data.map((_, i) => {
          const cx = padX + slot * (i + 0.5)
          return (
            <Pressable
              key={i}
              onPress={() => setSelected((s) => (s === i ? null : i))}
              hitSlop={4}
              style={{ position: 'absolute', left: cx - slot / 2, top: 0, width: slot, height: chartH }}
            />
          )
        })}

        {/* Tooltip */}
        {selected !== null ? (
          <BarTooltip
            chartW={chartW}
            cx={padX + slot * (selected + 0.5)}
            top={Math.max(2, axisY - metFor(data[selected]) * upMax - 40)}
            value={`${formatBarValue(data[selected])}${unit ? ` ${unit}` : ''}`}
            label={tips[selected]}
          />
        ) : null}
      </View>

      {labels.length > 0 && (
        <View style={[styles.labelRow, { width: chartW, alignSelf: 'center', marginTop: 4 }]}>
          {labels.map((l, i) => (
            <Text
              key={i}
              style={[
                styles.barLabel,
                {
                  color: i === selected ? colors.text : colors.textMuted,
                  fontFamily: i === selected ? font.bodySemiBold : font.body,
                },
              ]}
              numberOfLines={1}
            >
              {l}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

function BarTooltip({
  chartW, cx, top, value, label,
}: {
  chartW: number
  cx: number
  top: number
  value: string
  label?: string
}) {
  const { colors, font } = useTheme()
  const w = 90
  const left = Math.max(4, Math.min(chartW - w - 4, cx - w / 2))
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width: w,
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 10,
        backgroundColor: colors.text,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: colors.bg,
          fontFamily: font.bodySemiBold,
          fontSize: 12,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
      {label ? (
        <Text
          style={{
            color: colors.bg,
            fontFamily: font.body,
            fontSize: 9,
            opacity: 0.75,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </View>
  )
}

interface LineProps {
  data: number[]
  color?: string
  height?: number
  /** Width override — defaults to 100% of parent. */
  width?: number
  /** Optional per-point labels (e.g. dates). Tapping a point shows label + value. */
  labels?: string[]
  /** Unit suffix appended to value in the tooltip. */
  unit?: string
}

export function MiniLineChart({
  data, color, height = 130, width = DEFAULT_CHART_W, labels, unit,
}: LineProps) {
  const { colors, stickers, font } = useTheme()
  const accent = color ?? stickers.yellow
  const interactive = !!labels && labels.length === data.length
  const [selected, setSelected] = useState<number | null>(null)

  if (data.length < 2) {
    return <EmptyChart height={height} />
  }

  const pad = 10
  const viewW = width
  const viewH = height

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = Math.max(0.01, max - min)

  const points = data.map((v, i) => {
    const x = pad + (i * (viewW - pad * 2)) / (data.length - 1)
    const y = viewH - pad - ((v - min) / range) * (viewH - pad * 2)
    return { x, y }
  })

  // Smooth path
  const smooth = (() => {
    let d = `M${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const cur = points[i]
      const mx = (prev.x + cur.x) / 2
      d += ` Q${mx},${prev.y} ${cur.x},${cur.y}`
    }
    return d
  })()

  // Area below
  const area = `${smooth} L${points[points.length - 1].x},${viewH - pad} L${points[0].x},${viewH - pad} Z`

  const handlePress = (i: number) => {
    setSelected((cur) => (cur === i ? null : i))
  }

  const sel = selected !== null ? points[selected] : null
  const tooltipW = 120
  const tooltipH = 44
  const tooltipX = sel ? Math.max(4, Math.min(viewW - tooltipW - 4, sel.x - tooltipW / 2)) : 0
  const tooltipY = sel ? Math.max(4, sel.y - tooltipH - 12) : 0

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: viewW, height: viewH }}>
        <Svg width={viewW} height={viewH}>
          <Path d={area} fill={accent} opacity={0.18} />
          <Path d={smooth} stroke={accent} strokeWidth={3} strokeLinecap="round" fill="none" />
          {sel ? (
            <Line
              x1={sel.x}
              y1={pad}
              x2={sel.x}
              y2={viewH - pad}
              stroke={accent}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
          ) : null}
          {points.map((p, i) => {
            const isLast = i === points.length - 1
            const isSel = i === selected
            return (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={isSel ? 6 : isLast ? 5 : 3}
                fill={isSel ? accent : isLast ? colors.text : accent}
                stroke={colors.surface}
                strokeWidth={1.5}
              />
            )
          })}
        </Svg>
        {interactive
          ? points.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => handlePress(i)}
                hitSlop={6}
                style={{
                  position: 'absolute',
                  left: p.x - 14,
                  top: p.y - 14,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                }}
              />
            ))
          : null}
        {sel && labels ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: tooltipX,
              top: tooltipY,
              width: tooltipW,
              minHeight: tooltipH,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 12,
              backgroundColor: colors.text,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.bg,
                fontFamily: font.bodySemiBold,
                fontSize: 13,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {data[selected!].toFixed(1)}{unit ? ` ${unit}` : ''}
            </Text>
            <Text
              style={{
                color: colors.bg,
                fontFamily: font.body,
                fontSize: 10,
                opacity: 0.75,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {labels[selected!]}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

// ─── GlowAreaLine ─────────────────────────────────────────────────────────────
// A smooth line with a GLOWING gradient area beneath (hue → transparent) and a
// bright end-cap dot. Feels lit, not flat — for Weight/growth trends.

let glowSeq = 0
interface GlowLineProps {
  data: number[]
  color: string
  /** Optional secondary hue the area fades toward (defaults to `color`). */
  color2?: string
  height?: number
  width?: number
  labels?: string[]
  unit?: string
}

export function GlowAreaLine({ data, color, color2, height = 150, width = DEFAULT_CHART_W, labels, unit }: GlowLineProps) {
  const { colors, font } = useTheme()
  const seq = useMemo(() => glowSeq++, [])
  const areaId = `glowA${seq}`
  const interactive = !!labels && labels.length === data.length
  const [selected, setSelected] = useState<number | null>(null)

  if (data.length < 2) return <EmptyChart height={height} />

  const pad = 12
  const viewW = width
  const viewH = height
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = Math.max(0.01, max - min)

  const points = data.map((v, i) => ({
    x: pad + (i * (viewW - pad * 2)) / (data.length - 1),
    y: viewH - pad - ((v - min) / range) * (viewH - pad * 2),
  }))

  const smooth = (() => {
    let d = `M${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const cur = points[i]
      const mx = (prev.x + cur.x) / 2
      d += ` Q${mx},${prev.y} ${cur.x},${cur.y}`
    }
    return d
  })()
  const area = `${smooth} L${points[points.length - 1].x},${viewH - pad} L${points[0].x},${viewH - pad} Z`
  const end = points[points.length - 1]
  const sel = selected !== null ? points[selected] : null

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <View style={{ width: viewW, height: viewH }}>
        <Svg width={viewW} height={viewH}>
          <Defs>
            <LinearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color2 ?? color} stopOpacity={0.42} />
              <Stop offset="0.6" stopColor={color} stopOpacity={0.14} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {/* Glow underlay: same path, thick + faint, gives the lit halo */}
          <Path d={smooth} stroke={color} strokeWidth={9} strokeOpacity={0.16} strokeLinecap="round" fill="none" />
          <Path d={area} fill={`url(#${areaId})`} />
          <Path d={smooth} stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          {sel ? (
            <Line x1={sel.x} y1={pad} x2={sel.x} y2={viewH - pad} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          ) : null}
          {/* Bright end cap */}
          <Circle cx={end.x} cy={end.y} r={7} fill={color} opacity={0.25} />
          <Circle cx={end.x} cy={end.y} r={4} fill={color} stroke={colors.surface} strokeWidth={1.5} />
          {sel ? <Circle cx={sel.x} cy={sel.y} r={5} fill={color} stroke={colors.surface} strokeWidth={1.5} /> : null}
        </Svg>
        {interactive
          ? points.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => setSelected((s) => (s === i ? null : i))}
                hitSlop={6}
                style={{ position: 'absolute', left: p.x - 14, top: p.y - 14, width: 28, height: 28, borderRadius: 14 }}
              />
            ))
          : null}
        {sel && labels ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.max(4, Math.min(viewW - 124, sel.x - 60)),
              top: Math.max(4, sel.y - 52),
              width: 120,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 12,
              backgroundColor: colors.text,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.bg, fontFamily: font.bodySemiBold, fontSize: 13 }} numberOfLines={1}>
              {data[selected!].toFixed(1)}{unit ? ` ${unit}` : ''}
            </Text>
            <Text style={{ color: colors.bg, fontFamily: font.body, fontSize: 10, opacity: 0.75 }} numberOfLines={1}>
              {labels[selected!]}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

// ─── BlobCluster ──────────────────────────────────────────────────────────────
// Circle-pack style: each item a soft bloomed circle sized by value, laid out in
// a tidy wrapped row (biggest first). Label + count centred in each blob. A
// playful alternative to a ranked list / bar chart (Symptoms, Movement types).

export interface BlobDatum {
  label: string
  value: number
  color: string
}
interface BlobClusterProps {
  data: BlobDatum[]
  height?: number
  /** Show the numeric value under the label inside each blob. */
  showValue?: boolean
}

let blobSeq = 0
export function BlobCluster({ data, height = 200, showValue = true }: BlobClusterProps) {
  const { colors, font } = useTheme()
  const seq = useMemo(() => blobSeq++, [])
  if (data.length === 0) return <EmptyChart height={height} />

  const chartW = DEFAULT_CHART_W
  const max = Math.max(...data.map((d) => d.value), 1)
  const sorted = [...data].sort((a, b) => b.value - a.value)

  // Size each blob between a min and max diameter by value.
  const minD = 54
  const maxD = Math.min(120, chartW * 0.42)
  const diamFor = (v: number) => minD + (v / max) * (maxD - minD)

  return (
    <View style={{ width: chartW, alignSelf: 'center', minHeight: height }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
        {sorted.map((d, i) => {
          const dia = Math.round(diamFor(d.value))
          const fontSize = Math.max(11, Math.min(15, dia * 0.16))
          return (
            <View key={`${d.label}-${i}`} style={{ width: dia, height: dia, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={dia} height={dia} style={StyleSheet.absoluteFill}>
                <Defs>
                  <RadialGradient id={`blob${seq}-${i}`} cx="42%" cy="38%" r="65%">
                    <Stop offset="0" stopColor={d.color} stopOpacity={0.95} />
                    <Stop offset="1" stopColor={d.color} stopOpacity={0.62} />
                  </RadialGradient>
                </Defs>
                <Circle cx={dia / 2} cy={dia / 2} r={dia / 2} fill={`url(#blob${seq}-${i})`} />
              </Svg>
              <Text
                style={{ color: '#FFFEF8', fontFamily: font.bodySemiBold, fontSize, textAlign: 'center', paddingHorizontal: 6 }}
                numberOfLines={2}
              >
                {d.label}
              </Text>
              {showValue ? (
                <Text style={{ color: '#FFFEF8', fontFamily: font.bodySemiBold, fontSize: fontSize + 2, opacity: 0.92, marginTop: 1 }}>
                  {d.value}
                </Text>
              ) : null}
            </View>
          )
        })}
      </View>
    </View>
  )
}

function EmptyChart({ height }: { height: number }) {
  const { colors, font } = useTheme()
  const { t } = useTranslation()
  return (
    <View style={[styles.empty, { height, borderColor: colors.borderLight }]}>
      <Text
        style={{
          color: colors.textMuted,
          fontFamily: font.body,
          fontSize: 12,
        }}
      >
        {t('miniCharts_notEnoughData')}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  barWrap: {
    justifyContent: 'flex-end',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  barCell: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
  },
  labelRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  barLabel: {
    flex: 1,
    fontSize: 10,
    textAlign: 'center',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
})
