/**
 * MiniCharts — bar & line chart variants used inside BigChartCard.
 * Paper-native SVG, no legends. Single color with accent on latest point.
 */

import { useMemo, useState } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native'
import Svg, { Path, Circle, Line, Rect, Defs, Pattern, G, LinearGradient, RadialGradient, Stop, Ellipse, Text as SvgText } from 'react-native-svg'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../../constants/theme'
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

// ══════════════════════════════════════════════════════════════════════════════
// Chart language v2 — one distinct shape per metric (ported from the approved
// design-gallery Artifact). Every fill uses a per-metric sticker hue; the
// pregnancy violet only appears as a hairline accent. Diffuse-only shapes.
// ══════════════════════════════════════════════════════════════════════════════

const CW = DEFAULT_CHART_W
// alpha helper for #rrggbb → rgba
function withA(hexc: string, a: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexc)) return hexc
  const n = parseInt(hexc.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}
// small label row under a chart
function LabelRow({ labels, activeIndex }: { labels: string[]; activeIndex?: number | null }) {
  const { colors, font } = useTheme()
  if (labels.length === 0) return null
  return (
    <View style={[styles.labelRow, { width: CW, alignSelf: 'center', marginTop: 4 }]}>
      {labels.map((l, i) => (
        <Text key={i} numberOfLines={1} style={[styles.barLabel, { color: i === activeIndex ? colors.text : colors.textMuted, fontFamily: i === activeIndex ? font.bodySemiBold : font.body }]}>{l}</Text>
      ))}
    </View>
  )
}

// ─── SipColumns ──── hydration: filled level columns w/ ghost outline + meniscus
interface SipProps { data: number[]; target: number; color: string; accent?: string; max?: number; labels?: string[]; longLabels?: string[]; height?: number; unit?: string }
export function SipColumns({ data, target, color, accent, max, labels = [], longLabels, height = 150, unit }: SipProps) {
  const { colors } = useTheme()
  const dt = useDiffuseTheme()
  const [sel, setSel] = useState<number | null>(null)
  if (data.length === 0) return <EmptyChart height={height} />
  const M = max ?? Math.max(...data, target) * 1.15
  const n = data.length, padx = 4, slot = (CW - padx * 2) / n
  const bw = Math.min(30, Math.max(10, slot * 0.55)), r = bw / 2
  const top = 8, bot = height - 18, ih = bot - top
  const tips = longLabels ?? labels
  const acc = accent ?? '#8F5FC6'
  const cardBg = dt.colors.surface
  return (
    <View style={{ width: '100%' }}>
      <View style={{ width: CW, height, alignSelf: 'center' }}>
        <Svg width={CW} height={height}>
          <Defs>
            <LinearGradient id="sipG" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={1} />
              <Stop offset="1" stopColor={color} stopOpacity={0.72} />
            </LinearGradient>
          </Defs>
          {data.map((v, i) => {
            const cx = padx + slot * (i + 0.5), x = cx - bw / 2
            const fh = Math.max(bw, (Math.min(v, M) / M) * ih)
            const met = v >= target
            return (
              <G key={i}>
                <Rect x={x} y={top} width={bw} height={ih} rx={r} ry={r} fill="none" stroke={dt.colors.line} strokeWidth={1.3} />
                <Rect x={x} y={bot - fh} width={bw} height={fh} rx={r} ry={r} fill="url(#sipG)" opacity={i === sel ? 1 : 0.94} />
                <Circle cx={cx} cy={bot - fh + 6} r={2.3} fill={cardBg} />
                {met ? <Circle cx={cx} cy={bot + 9} r={2.6} fill="none" stroke={acc} strokeWidth={1.5} /> : null}
              </G>
            )
          })}
          {(() => { const ty = bot - (target / M) * ih; return (
            <Line x1={padx} x2={CW - padx} y1={ty} y2={ty} stroke={dt.colors.hairline} strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
          )})()}
        </Svg>
        {data.map((_, i) => { const cx = padx + slot * (i + 0.5); return (
          <Pressable key={i} onPress={() => setSel(s => s === i ? null : i)} hitSlop={4} style={{ position: 'absolute', left: cx - slot / 2, top: 0, width: slot, height }} />
        )})}
        {sel !== null ? <BarTooltip chartW={CW} cx={padx + slot * (sel + 0.5)} top={Math.max(2, bot - (Math.min(data[sel], M) / M) * ih - 38)} value={`${formatBarValue(data[sel])}${unit ? ` ${unit}` : ''}`} label={tips[sel]} /> : null}
      </View>
      <LabelRow labels={labels} activeIndex={sel} />
    </View>
  )
}

// ─── PetalBurst ──── movement: rounded petals radiating from a center blob
interface PetalProps { data: number[]; color: string; color2?: string; centerLabel?: string; height?: number }
export function PetalBurst({ data, color, color2, centerLabel, height = 170 }: PetalProps) {
  const dt = useDiffuseTheme()
  if (data.length === 0) return <EmptyChart height={height} />
  const w = CW, h = height, cx = w / 2, cy = h * 0.52, inner = 13, n = data.length
  const max = Math.max(...data, 1)
  const petals = data.map((v, i) => {
    const ang = (-Math.PI / 2) + (i / n) * Math.PI * 2
    const len = inner + (v / max) * (Math.min(w, h * 1.8) * 0.28)
    return { ang, len, warm: i % 3 === 0 }
  })
  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={w} height={h}>
        <Circle cx={cx} cy={cy} r={inner + 4} fill={withA(color, 0.26)} />
        {petals.map((p, i) => {
          const pw = 9, x0 = cx + Math.cos(p.ang) * inner, y0 = cy + Math.sin(p.ang) * inner
          const x1 = cx + Math.cos(p.ang) * p.len, y1 = cy + Math.sin(p.ang) * p.len
          const stroke = p.warm && color2 ? color2 : color
          return <Line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={stroke} strokeWidth={pw} strokeLinecap="round" opacity={0.9} />
        })}
        <Circle cx={cx} cy={cy} r={inner} fill={dt.colors.surface} />
        {centerLabel ? <SvgText x={cx} y={cy + 5} fontSize={15} fontWeight="800" fill={color} textAnchor="middle" fontFamily={diffuseFont.display}>{centerLabel}</SvgText> : null}
      </Svg>
    </View>
  )
}

// ─── StackedLozenges ──── symptoms: horizontal rounded lozenges, hue per row
export interface LozengeDatum { label: string; value: number; color: string }
export function StackedLozenges({ data, height = 190 }: { data: LozengeDatum[]; height?: number }) {
  const { colors, font } = useTheme()
  if (data.length === 0) return <EmptyChart height={height} />
  const max = Math.max(...data.map(d => d.value), 1)
  const n = data.length, gap = 8, bh = (height - gap * (n - 1)) / n
  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={CW} height={height}>
        {data.map((d, i) => {
          const y = i * (bh + gap), bw = Math.max(bh, (d.value / max) * (CW - 2))
          return (
            <G key={d.label}>
              <Rect x={0} y={y} width={bw} height={bh} rx={bh / 2} ry={bh / 2} fill={withA(d.color, 0.9)} />
              <SvgText x={14} y={y + bh / 2 + 4} fontSize={12} fontWeight="700" fill={colors.text} fontFamily={font.bodySemiBold}>{d.label}</SvgText>
              <SvgText x={Math.max(bw - 10, 42)} y={y + bh / 2 + 4} fontSize={13} fontWeight="700" fill={bw > 64 ? '#1A1916' : colors.textMuted} textAnchor="end" fontFamily={font.bodySemiBold}>{String(d.value)}</SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

// ─── BeadedThread ──── kicks: wavy thread + beads sized by count, latest accented
interface BeadProps {
  data: number[]; color: string; accent?: string; labels?: string[]; height?: number
  /** print each value above its bead (0 hidden) so the chart is readable at rest. */
  showValues?: boolean
}
export function BeadedThread({ data, color, accent, labels = [], height = 150, showValues = false }: BeadProps) {
  const dt = useDiffuseTheme()
  if (data.length === 0) return <EmptyChart height={height} />
  const w = CW, h = height, pad = 16, cy = h / 2, n = data.length, max = Math.max(...data, 1)
  const wave = (t: number) => cy + Math.sin(t * Math.PI * 3) * 10
  let d = ''
  for (let i = 0; i <= 100; i++) { const x = pad + (i / 100) * (w - pad * 2), y = wave(i / 100); d += (i ? 'L' : 'M') + x + ',' + y }
  const acc = accent ?? '#8F5FC6'
  return (
    <View style={{ width: CW, alignSelf: 'center' }}>
      <Svg width={w} height={h}>
        <Path d={d} stroke={dt.colors.line} strokeWidth={2} fill="none" />
        {data.map((v, i) => {
          const x = pad + i * (w - pad * 2) / (n - 1), y = wave(i / (n - 1)), r = 4 + (v / max) * 7, last = i === n - 1
          return (
            <G key={i}>
              {last ? <Circle cx={x} cy={y} r={r + 3.5} fill="none" stroke={acc} strokeWidth={1.6} /> : null}
              <Circle cx={x} cy={y} r={r} fill={last ? color : withA(color, 0.55)} />
              {showValues && v > 0 ? (
                <SvgText
                  x={x}
                  y={y - r - 6}
                  fontSize={11}
                  fontWeight="700"
                  fill={last ? acc : dt.colors.ink2}
                  textAnchor="middle"
                  fontFamily={diffuseFont.monoBold}
                >
                  {String(v)}
                </SvgText>
              ) : null}
            </G>
          )
        })}
      </Svg>
      <LabelRow labels={labels} />
    </View>
  )
}

// ─── CrescentBars ──── sleep: rounded bars with a moon-notch on each cap
interface CrescentProps { data: number[]; color: string; max?: number; labels?: string[]; height?: number }
export function CrescentBars({ data, color, max, labels = [], height = 150 }: CrescentProps) {
  const dt = useDiffuseTheme()
  if (data.length === 0) return <EmptyChart height={height} />
  const M = max ?? Math.max(...data) * 1.1
  const n = data.length, padx = 6, slot = (CW - padx * 2) / n
  const bw = Math.min(18, slot * 0.55), r = bw / 2, bot = height - 6, ih = height - 16
  return (
    <View style={{ width: CW, alignSelf: 'center' }}>
      <Svg width={CW} height={height}>
        {data.map((v, i) => {
          const cx = padx + slot * (i + 0.5), x = cx - bw / 2, bh = Math.max(bw, (v / M) * ih), y = bot - bh, last = i === n - 1
          return (
            <G key={i}>
              <Rect x={x} y={y} width={bw} height={bh} rx={r} ry={r} fill={last ? color : withA(color, 0.5)} />
              <Circle cx={cx + bw * 0.22} cy={y + bw * 0.42} r={r * 0.6} fill={dt.colors.surface} />
            </G>
          )
        })}
      </Svg>
      <LabelRow labels={labels} />
    </View>
  )
}

// ─── ConcentricArcs ──── wellbeing: radial spokes, one hue per pillar.
// Five spokes radiate from a shared centre at fixed, evenly-spaced angles; each
// spoke's length encodes its 0–10 score over a faint full-length "10" track.
// Because every spoke sits on its own angle, nothing ever overlaps — unlike the
// old nested half-rings, where a short outer arc crossed a long inner one.
// (Name kept for the existing call site; the visual is a spoke burst.)
export interface ArcDatum { value: number; color: string; label?: string } // value 0..10
export function ConcentricArcs({ data, centerLabel, height = 236 }: { data: ArcDatum[]; centerLabel?: string; height?: number }) {
  const { colors } = useTheme()
  const dt = useDiffuseTheme()
  if (data.length === 0) return <EmptyChart height={height} />
  const n = data.length
  const w = CW, h = height
  const cx = w / 2, cy = h / 2
  // Leave room at the rim for the value chips that sit just past each tip.
  const rimPad = 30
  const maxLen = Math.min(cx, cy) - rimPad
  const hub = 16 // spokes start just outside the centre hub
  const sw = 12  // spoke thickness (round caps)

  const angleFor = (i: number) => (-Math.PI / 2) + (i / n) * Math.PI * 2
  const pointAt = (ang: number, r: number) => ({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r })

  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={w} height={h}>
        {/* Ghost "max" tracks first, then filled spokes on top. */}
        {data.map((d, i) => {
          const ang = angleFor(i)
          const a = pointAt(ang, hub)
          const b = pointAt(ang, maxLen)
          return (
            <Line key={`track-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={dt.colors.line} strokeWidth={sw} strokeLinecap="round" />
          )
        })}
        {data.map((d, i) => {
          const ang = angleFor(i)
          const frac = Math.max(0.04, Math.min(1, d.value / 10))
          const a = pointAt(ang, hub)
          const b = pointAt(ang, hub + (maxLen - hub) * frac)
          return (
            <Line key={`spoke-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={d.color} strokeWidth={sw} strokeLinecap="round" />
          )
        })}
        {/* Value chip at each spoke tip. */}
        {data.map((d, i) => {
          const ang = angleFor(i)
          const tip = pointAt(ang, maxLen + 12)
          // Nudge anchor by quadrant so chips never clip the SVG edge.
          const cosA = Math.cos(ang)
          const anchor = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle'
          return (
            <SvgText
              key={`val-${i}`}
              x={tip.x}
              y={tip.y + 4}
              fontSize={11}
              fill={dt.colors.ink}
              textAnchor={anchor}
              fontFamily={diffuseFont.mono}
            >
              {d.value.toFixed(1)}
            </SvgText>
          )
        })}
        {/* Centre hub + optional overall label. */}
        <Circle cx={cx} cy={cy} r={hub} fill={dt.colors.surface} stroke={dt.colors.line} strokeWidth={1} />
        {centerLabel ? <SvgText x={cx} y={cy + 6} fontSize={15} fontWeight="800" fill={colors.text} textAnchor="middle" fontFamily={diffuseFont.display}>{centerLabel}</SvgText> : null}
      </Svg>
    </View>
  )
}

// ─── TieredLozenges ──── weight-by-week: labeled rows, fill = value in range
export interface TierRow { label: string; value: number; display: string }
export function TieredLozenges({ rows, min, max, color, height = 150 }: { rows: TierRow[]; min: number; max: number; color: string; height?: number }) {
  const { colors, font } = useTheme()
  const dt = useDiffuseTheme()
  if (rows.length === 0) return <EmptyChart height={height} />
  const n = rows.length, gap = 6, bh = (height - gap * (n - 1)) / n, track = CW * 0.78, x0 = CW * 0.14
  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={CW} height={height}>
        {rows.map((rw, i) => {
          const y = i * (bh + gap), val = Math.max(0, Math.min(1, (rw.value - min) / Math.max(0.01, max - min)))
          const bw = Math.max(bh, val * track), last = i === n - 1
          return (
            // Key by index — labels can repeat (e.g. two weight logs in the same
            // pregnancy week both render as "W20"), and duplicate keys crash render.
            <G key={`${rw.label}-${i}`}>
              <SvgText x={0} y={y + bh / 2 + 3} fontSize={9} fill={colors.textMuted} fontFamily={diffuseFont.mono}>{rw.label}</SvgText>
              <Rect x={x0} y={y} width={track} height={bh} rx={bh / 2} ry={bh / 2} fill={dt.colors.surfaceRaised} />
              <Rect x={x0} y={y} width={bw} height={bh} rx={bh / 2} ry={bh / 2} fill={last ? color : withA(color, 0.7)} />
              <SvgText x={CW} y={y + bh / 2 + 4} fontSize={11} fontWeight="700" fill={colors.text} textAnchor="end" fontFamily={font.bodySemiBold}>{rw.display}</SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

// ─── SplitMeters ──── when-you-sip / when-active: labeled soft meters
export interface MeterRow { label: string; frac: number; color: string }
export function SplitMeters({ rows, height }: { rows: MeterRow[]; height?: number }) {
  const { colors, font } = useTheme()
  const dt = useDiffuseTheme()
  const n = rows.length, gap = 12, bh = 16, H = height ?? n * (bh + gap)
  const track = CW * 0.6, x0 = CW * 0.34
  return (
    <View style={{ width: CW, alignSelf: 'center', height: H }}>
      <Svg width={CW} height={H}>
        {rows.map((rw, i) => {
          const y = i * (bh + gap) + 2
          return (
            <G key={rw.label}>
              <SvgText x={0} y={y + bh / 2 + 4} fontSize={12} fill={colors.text} fontFamily={font.bodyMedium}>{rw.label}</SvgText>
              <Rect x={x0} y={y} width={track} height={bh} rx={bh / 2} ry={bh / 2} fill={dt.colors.surfaceRaised} />
              <Rect x={x0} y={y} width={Math.max(bh, track * Math.max(0, Math.min(1, rw.frac)))} height={bh} rx={bh / 2} ry={bh / 2} fill={rw.color} />
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

// ─── CheckpointPills ──── birth readiness: fill pills, done = green ✓
export interface CheckRow { label: string; done: number } // 0..1
export function CheckpointPills({ rows, color, doneColor, height = 170 }: { rows: CheckRow[]; color: string; doneColor: string; height?: number }) {
  const { colors, font } = useTheme()
  const dt = useDiffuseTheme()
  if (rows.length === 0) return <EmptyChart height={height} />
  const n = rows.length, gap = 8, bh = (height - gap * (n - 1)) / n
  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={CW} height={height}>
        {rows.map((rw, i) => {
          const y = i * (bh + gap), done = rw.done, full = done >= 1
          return (
            <G key={rw.label}>
              <Rect x={0} y={y} width={CW} height={bh} rx={bh / 2} ry={bh / 2} fill={dt.colors.surfaceRaised} />
              {done > 0 ? <Rect x={0} y={y} width={Math.max(bh, CW * done)} height={bh} rx={bh / 2} ry={bh / 2} fill={full ? doneColor : withA(color, 0.9)} /> : null}
              <SvgText x={12} y={y + bh / 2 + 4} fontSize={12} fontWeight="700" fill={full ? '#1A1916' : colors.textMuted} fontFamily={font.bodySemiBold}>{(full ? '✓ ' : '') + rw.label}</SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

// ─── NutrientMatrix ──── nutrition: dot grid, hue per nutrient row
export function NutrientMatrix({ matrix, colors: hues, labels = [], height = 130 }: { matrix: boolean[][]; colors: string[]; labels?: string[]; height?: number }) {
  const dt = useDiffuseTheme()
  if (matrix.length === 0) return <EmptyChart height={height} />
  const rowsN = matrix.length, colsN = matrix[0]?.length ?? 0
  if (colsN === 0) return <EmptyChart height={height} />
  const gx = (CW - 8) / colsN, gy = (height - 8) / rowsN
  return (
    <View style={{ width: CW, alignSelf: 'center' }}>
      <Svg width={CW} height={height}>
        {matrix.map((row, r) => row.map((on, c) => {
          const cx = 6 + gx * (c + 0.5), cy = 6 + gy * (r + 0.5)
          return <Circle key={`${r}-${c}`} cx={cx} cy={cy} r={on ? 7 : 4} fill={on ? (hues[r] ?? '#9DC3E8') : dt.colors.line} />
        }))}
      </Svg>
      <LabelRow labels={labels} />
    </View>
  )
}

// ─── HalftoneRidge ──── activity timeline: rainbow dot-density silhouette
export function HalftoneRidge({ data, stops, labels, height = 190 }: { data: number[]; stops: string[]; labels?: [string, string, string]; height?: number }) {
  const { colors } = useTheme()
  if (data.length === 0) return <EmptyChart height={height} />
  const w = CW, h = height, step = 7, base = h - 6
  const max = Math.max(...data, 1)
  // sample the ridge from data (interpolated)
  const ridgeAt = (x: number) => {
    const t = x / w, fi = t * (data.length - 1), i = Math.floor(fi), f = fi - i
    const v = (data[i] ?? 0) * (1 - f) + (data[Math.min(i + 1, data.length - 1)] ?? 0) * f
    return base - (h * 0.6) * (v / max)
  }
  const lerp = (a: string, b: string, t: number) => {
    const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16)
    const r = Math.round(((A >> 16) * (1 - t)) + ((B >> 16) * t))
    const g = Math.round((((A >> 8) & 255) * (1 - t)) + (((B >> 8) & 255) * t))
    const bl = Math.round(((A & 255) * (1 - t)) + ((B & 255) * t))
    return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`
  }
  const dots: { x: number; y: number; r: number; c: string; o: number }[] = []
  for (let x = 4; x < w; x += step) {
    const top = ridgeAt(x)
    for (let y = base; y > top; y -= step) {
      const prog = x / w, seg = prog * (stops.length - 1), si = Math.floor(seg), sf = seg - si
      const c = lerp(stops[si] ?? stops[0], stops[Math.min(si + 1, stops.length - 1)], sf)
      const dens = (base - y) / Math.max(1, base - top)
      dots.push({ x, y, r: 1.1 + dens * 1.7, c, o: 0.35 + dens * 0.5 })
    }
  }
  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={w} height={h}>
        {dots.map((d, i) => <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={withA(d.c, d.o)} />)}
        {[0.33, 0.66].map((f, i) => <Line key={i} x1={w * f} x2={w * f} y1={12} y2={h * 0.4} stroke={colors.text} strokeWidth={1} />)}
        {labels ? (
          <>
            <SvgText x={w * 0.16} y={20} fontSize={9} fill={colors.textMuted} textAnchor="middle" fontFamily={diffuseFont.mono}>{labels[0]}</SvgText>
            <SvgText x={w * 0.5} y={20} fontSize={9} fill={colors.textMuted} textAnchor="middle" fontFamily={diffuseFont.mono}>{labels[1]}</SvgText>
            <SvgText x={w * 0.84} y={20} fontSize={9} fill={colors.textMuted} textAnchor="middle" fontFamily={diffuseFont.mono}>{labels[2]}</SvgText>
          </>
        ) : null}
      </Svg>
    </View>
  )
}

// ─── AxesGlow ──── wellbeing profile: labeled axes + glowing connector thread
export interface AxisRow { label: string; frac: number; watch?: boolean }
export function AxesGlow({ rows, color, accent, height = 190 }: { rows: AxisRow[]; color: string; accent?: string; height?: number }) {
  const { colors, font } = useTheme()
  const dt = useDiffuseTheme()
  if (rows.length === 0) return <EmptyChart height={height} />
  const w = CW, h = height, lx = 58, rx = w - 20, n = rows.length, gap = (h - 24) / n
  const acc = accent ?? '#8F5FC6'
  const pts = rows.map((r, i) => ({ x: lx + (rx - lx) * Math.max(0, Math.min(1, r.frac)), y: 12 + gap * (i + 0.5), watch: r.watch }))
  let thread = ''
  pts.forEach((p, i) => { thread += (i ? 'L' : 'M') + p.x + ',' + p.y })
  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={w} height={h}>
        {rows.map((r, i) => { const y = 12 + gap * (i + 0.5); return (
          <G key={r.label}>
            <Line x1={lx} x2={rx} y1={y} y2={y} stroke={dt.colors.line} strokeWidth={1} />
            <SvgText x={0} y={y + 3} fontSize={8.5} fontWeight="700" fill={colors.text} fontFamily={diffuseFont.mono}>{r.label}</SvgText>
          </G>
        )})}
        {/* glow underlay then bright thread */}
        <Path d={thread} stroke={withA(color, 0.28)} strokeWidth={12} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Path d={thread} stroke={withA(color, 0.6)} strokeWidth={5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <G key={i}>
            {p.watch ? <Circle cx={p.x} cy={p.y} r={12} fill={withA(acc, 0.3)} /> : null}
            <Circle cx={p.x} cy={p.y} r={6 + rows[i].frac * 3} fill={p.watch ? acc : colors.text} />
          </G>
        ))}
      </Svg>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// KIDS VOCABULARY — distinct from the pregnancy shapes above. Playful, block/
// bubble-based. Used only by KidsAnalytics detail sheets.
// ═══════════════════════════════════════════════════════════════════════════

// ─── BrickColumns ──── kids daily series (meals/sleep/sessions per day).
// Each day is a column of rounded "toy bricks" stacked bottom-up, one brick per
// whole unit (a fractional remainder draws a short half-brick). The latest /
// highlighted day paints in the deeper accent; an empty day shows a small dot.
export function BrickColumns({
  data, labels, color, accent, highlightIndex, maxBricks = 6, height = 150,
}: {
  data: number[]
  labels?: string[]
  color: string          // resting brick hue (soft)
  accent: string         // highlighted-day hue (deeper)
  highlightIndex?: number // which day is "today" (defaults to last)
  maxBricks?: number     // cap the visible stack; overflow compresses
  height?: number
}) {
  if (data.length === 0) return <EmptyChart height={height} />
  const { colors } = useTheme()
  const dt = useDiffuseTheme()
  const w = CW, n = data.length
  const labelH = labels ? 20 : 0
  const plotH = height - labelH
  const colGap = 10
  const colW = Math.min(38, (w - colGap * (n - 1)) / n)
  const slotW = (w - colGap * (n - 1)) / n
  const max = Math.max(...data, 1)
  // Brick unit: scale so the tallest column ~fills the plot, but never exceed
  // maxBricks bricks (bigger values just make each brick represent more).
  const unit = Math.max(1, Math.ceil(max / maxBricks))
  const brickH = 15, brickGap = 2
  const hi = highlightIndex ?? n - 1

  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={w} height={height}>
        {data.map((v, i) => {
          const cx = i * (slotW + 0) + slotW / 2
          const x = cx - colW / 2
          const isHi = i === hi && v > 0
          // Base hue is a #rrggbb (accent or the resting colour); derive both the
          // brick fill and the fainter frac-brick fill FROM THE HEX so withA()
          // gets a valid input. Passing an already-rgba string to withA() makes
          // it fall through to black — the earlier charcoal-brick bug.
          const baseHue = isHi ? accent : color
          const fill = isHi ? accent : withA(color, 0.85)
          if (v <= 0) {
            return <Circle key={i} cx={cx} cy={plotH - 6} r={3} fill={withA(colors.textMuted, 0.5)} />
          }
          const whole = Math.floor(v / unit)
          const frac = (v - whole * unit) / unit
          const bricks: React.ReactNode[] = []
          let by = plotH - brickH
          for (let b = 0; b < whole; b++) {
            bricks.push(<Rect key={`b${b}`} x={x} y={by} width={colW} height={brickH} rx={6} fill={fill} />)
            by -= brickH + brickGap
          }
          if (frac > 0.15) {
            const fh = Math.max(6, brickH * frac)
            bricks.push(<Rect key="frac" x={x} y={by + (brickH - fh)} width={colW} height={fh} rx={5} fill={withA(baseHue, 0.5)} />)
          }
          return <G key={i}>{bricks}</G>
        })}
        {labels ? labels.map((l, i) => {
          const cx = i * (slotW + 0) + slotW / 2
          const isHi = i === hi
          return (
            <SvgText key={i} x={cx} y={height - 6} fontSize={10} textAnchor="middle"
              fill={isHi ? accent : dt.colors.ink3} fontFamily={diffuseFont.mono}>{l}</SvgText>
          )
        }) : null}
      </Svg>
    </View>
  )
}

// ─── DotCountRows ──── kids distribution (sleep-quality / eat-quality).
// Each category is a row: name (serif) · a run of filled dots proportional to
// its share · the % (mono). Distinct from pregnancy's flat StackedLozenges.
export interface DotRow { label: string; pct: number; color: string }
export function DotCountRows({ rows, height }: { rows: DotRow[]; height?: number }) {
  const dt = useDiffuseTheme()
  const total = 10 // dots represent tenths of the whole
  const rowH = 34
  const h = height ?? rows.length * rowH + 4
  if (rows.length === 0) return <EmptyChart height={h} />
  const dotR = 4.5, dotGap = 14, dotsX = 116
  return (
    <View style={{ width: CW, alignSelf: 'center' }}>
      <Svg width={CW} height={h}>
        {rows.map((r, i) => {
          const y = i * rowH + rowH / 2
          const filled = Math.max(1, Math.round((r.pct / 100) * total))
          const dots: React.ReactNode[] = []
          for (let d = 0; d < total; d++) {
            const on = d < filled
            dots.push(
              <Circle key={d} cx={dotsX + d * dotGap} cy={y} r={dotR}
                fill={on ? r.color : withA(r.color, 0.18)} />,
            )
          }
          return (
            <G key={r.label}>
              <SvgText x={0} y={y + 4} fontSize={13} fill={dt.colors.ink} fontFamily={diffuseFont.display}>{r.label}</SvgText>
              {dots}
              <SvgText x={CW} y={y + 4} fontSize={12} textAnchor="end" fill={dt.colors.ink3} fontFamily={diffuseFont.mono}>{`${Math.round(r.pct)}%`}</SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

// ─── MilestoneTrail ──── kids growth over time (weight / height).
// Bubbles sized by value sit on a soft connecting thread; the latest reading is
// ringed. A continuous, gentle "connect-the-dots" line — distinct from
// pregnancy's GlowAreaLine while still reading as a trend.
export function MilestoneTrail({
  data, labels, color, accent, height = 150,
}: {
  data: number[]
  labels?: string[]
  color: string
  accent: string
  height?: number
}) {
  const clean = data.filter((v) => Number.isFinite(v))
  if (clean.length < 2) return <EmptyChart height={height} />
  const dt = useDiffuseTheme()
  const w = CW, padX = 22, labelH = labels ? 20 : 0
  const plotH = height - labelH
  const top = 22, bottom = plotH - 14
  const min = Math.min(...clean), max = Math.max(...clean)
  const range = Math.max(0.001, max - min)
  const n = data.length
  const xAt = (i: number) => padX + (i * (w - padX * 2)) / (n - 1)
  const yAt = (v: number) => bottom - ((v - min) / range) * (bottom - top)
  let thread = ''
  data.forEach((v, i) => { thread += (i ? 'L' : 'M') + xAt(i).toFixed(1) + ',' + yAt(v).toFixed(1) })
  const lastI = n - 1

  return (
    <View style={{ width: CW, alignSelf: 'center', height }}>
      <Svg width={w} height={height}>
        <Path d={thread} stroke={withA(color, 0.5)} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((v, i) => {
          const isLast = i === lastI
          const r = isLast ? 12 : 9
          return (
            <G key={i}>
              {isLast ? <Circle cx={xAt(i)} cy={yAt(v)} r={r + 5} fill="none" stroke={withA(accent, 0.4)} strokeWidth={1.5} /> : null}
              <Circle cx={xAt(i)} cy={yAt(v)} r={r} fill={isLast ? accent : withA(color, 0.9)} />
              <SvgText x={xAt(i)} y={yAt(v) + (isLast ? 4 : 3.5)} fontSize={isLast ? 11 : 9} textAnchor="middle"
                fill={isLast ? '#FFFFFF' : dt.colors.ink} fontFamily={diffuseFont.mono}>
                {v % 1 === 0 ? String(v) : v.toFixed(1)}
              </SvgText>
            </G>
          )
        })}
        {labels ? labels.map((l, i) => (
          <SvgText key={i} x={xAt(i)} y={height - 6} fontSize={9} textAnchor="middle" fill={dt.colors.ink3} fontFamily={diffuseFont.mono}>{l}</SvgText>
        )) : null}
      </Svg>
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
