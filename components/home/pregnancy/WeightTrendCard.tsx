/**
 * WeightTrendCard — rich pregnancy weight tracking card.
 *
 * Shows current weight, starting weight, total gained, weekly pace, IOM target
 * band (based on BMI if height + pre-preg weight are set, else default), and a
 * line chart with a dashed target overlay. Tappable → deep link to /insights.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react-native'
import Svg, {
  Circle, Line, Path, Rect, Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg'
import { useTheme, font, radius as themeRadius, useDiffuseTheme, getDiffuseAccent, diffuseFont } from '../../../constants/theme'
import { useIsDiffuse, DiffuseFieldSurface } from '../../ui/diffuse/DiffuseKit'
import { DiffuseSheet, DiffuseMetricTile } from '../../ui/diffuse/DiffusePrimitives'
import { useTranslation } from '../../../lib/i18n'
import { PaperCard } from '../../ui/PaperCard'
import { StickerButton } from '../../ui/StickerButton'
import { Display, MonoCaps, Body } from '../../ui/Typography'
import { LogSheet } from '../../calendar/LogSheet'
import { smoothPath } from '../../charts/SvgCharts'
import { supabase } from '../../../lib/supabase'

const SCREEN_W = Dimensions.get('window').width

// ─── IOM Pregnancy Weight Gain Guidelines (kg) ────────────────────────────────

interface TargetBand { low: number; high: number; label: string }

function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return weightKg / (m * m)
}

function getIOMTarget(preWeight: number | null, heightCm: number | null): TargetBand {
  if (!preWeight || !heightCm) return { low: 11.5, high: 16, label: 'Normal' }
  const b = bmi(preWeight, heightCm)
  if (b < 18.5) return { low: 12.5, high: 18, label: 'Underweight BMI' }
  if (b < 25) return { low: 11.5, high: 16, label: 'Normal BMI' }
  if (b < 30) return { low: 7, high: 11.5, label: 'Overweight BMI' }
  return { low: 5, high: 9, label: 'Obese BMI' }
}

// ─── Week-proportional expected gain curve ────────────────────────────────────

/** Expected weight gain (kg) by week based on IOM recommendations.
 *  First trimester: ~0.5-2 kg. Then linear to total target by week 40. */
function expectedGainAtWeek(week: number, band: TargetBand, side: 'low' | 'high'): number {
  const total = band[side]
  const t1End = Math.min(week, 13)
  const t1Gain = (t1End / 13) * (side === 'low' ? 0.5 : 2)
  if (week <= 13) return t1Gain
  const remaining = total - (side === 'low' ? 0.5 : 2)
  const weeksRemaining = 40 - 13
  return t1Gain + ((week - 13) / weeksRemaining) * remaining
}

// ─── Data Hook: weight + profile ──────────────────────────────────────────────

interface WeightEntry { date: string; weight: number }
interface Profile { prePregWeight: number | null; heightCm: number | null }

function useWeightCardData(userId: string | undefined) {
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [profile, setProfile] = useState<Profile>({ prePregWeight: null, heightCm: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let alive = true
    async function load() {
      const [weightRes, profileRes] = await Promise.all([
        supabase
          .from('pregnancy_logs')
          .select('log_date, value')
          .eq('user_id', userId)
          .eq('log_type', 'weight')
          .order('log_date', { ascending: true })
          .limit(40),
        supabase
          .from('profiles')
          .select('birth_preferences')
          .eq('id', userId)
          .single(),
      ])
      if (!alive) return
      type WeightRow = { log_date: string; value: string | null }
      const rows = ((weightRes.data ?? []) as WeightRow[])
        .map((r) => ({ date: r.log_date, weight: parseFloat(r.value ?? '0') }))
        .filter((r) => !isNaN(r.weight) && r.weight > 0)
      setEntries(rows)

      type BirthPrefs = { prePregnancyWeight?: string | number; height?: string | number }
      const bp = ((profileRes.data?.birth_preferences as BirthPrefs | undefined) ?? {}) as BirthPrefs
      const pre = bp.prePregnancyWeight ? parseFloat(String(bp.prePregnancyWeight)) : null
      const h = bp.height ? parseFloat(String(bp.height)) : null
      setProfile({
        prePregWeight: pre && !isNaN(pre) ? pre : null,
        heightCm: h && !isNaN(h) ? h : null,
      })
      setLoading(false)
    }
    load()
    return () => {
      alive = false
    }
  }, [userId])

  return { entries, profile, loading }
}

// ─── Mini Chart with Target Band ──────────────────────────────────────────────

interface MiniChartProps {
  points: Array<{ x: number; y: number; date: string }>
  lowBand?: number
  highBand?: number
  color: string
  mutedColor: string
  width: number
  height: number
  /** Diffuse overrides — hairline axes / mono labels / paper-token dot strokes. */
  axisColor?: string
  labelColor?: string
  dotStroke?: string
  bubbleTextColor?: string
  mono?: boolean
}

function WeightChart({
  points, lowBand, highBand, color, mutedColor, width, height,
  axisColor, labelColor, dotStroke, bubbleTextColor, mono,
}: MiniChartProps) {
  const { t } = useTranslation()
  if (points.length < 2) return null

  // Axis lines/gridlines, axis-label ink, dot-ring stroke, in-chart numeric font.
  const axisCol = axisColor ?? mutedColor
  const labelCol = labelColor ?? mutedColor
  const dotStrokeCol = dotStroke ?? '#FFFEF8'
  const bubbleTextCol = bubbleTextColor ?? '#FFFEF8'
  const numFont = mono ? diffuseFont.mono : undefined

  const leftPad = 36
  const rightPad = 12
  const topPad = 20
  const bottomPad = 22
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad

  const values = points.map((p) => p.y)
  const allValues = [
    ...values,
    ...(lowBand !== undefined ? [lowBand] : []),
    ...(highBand !== undefined ? [highBand] : []),
  ]
  const minV = Math.min(...allValues) - 0.5
  const maxV = Math.max(...allValues) + 0.5
  const range = maxV - minV || 1

  const toY = (v: number) => topPad + chartH - ((v - minV) / range) * chartH

  const plotted = points.map((p, i) => ({
    x: leftPad + (i / (points.length - 1)) * chartW,
    y: toY(p.y),
    v: p.y,
    date: p.date,
  }))

  const curvePath = smoothPath(plotted)
  const areaPath = curvePath + ` L ${plotted[plotted.length - 1].x} ${topPad + chartH} L ${plotted[0].x} ${topPad + chartH} Z`

  const lastPoint = plotted[plotted.length - 1]
  const firstPoint = plotted[0]

  // Y-axis ticks at low/high/min/max
  const yTicks: Array<{ v: number; label: string; emphasize?: boolean }> = []
  if (lowBand !== undefined) yTicks.push({ v: lowBand, label: `${lowBand.toFixed(0)}`, emphasize: true })
  if (highBand !== undefined) yTicks.push({ v: highBand, label: `${highBand.toFixed(0)}`, emphasize: true })
  yTicks.push({ v: minV + 0.5, label: `${(minV + 0.5).toFixed(0)}` })
  yTicks.push({ v: maxV - 0.5, label: `${(maxV - 0.5).toFixed(0)}` })

  // X-axis labels — first, middle, last
  const labelIndices = points.length <= 3
    ? points.map((_, i) => i)
    : [0, Math.floor(points.length / 2), points.length - 1]

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.28" />
          <Stop offset="1" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
        <LinearGradient id="targetBand" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={mutedColor} stopOpacity="0.10" />
          <Stop offset="1" stopColor={mutedColor} stopOpacity="0.10" />
        </LinearGradient>
      </Defs>

      {/* Target band rect */}
      {lowBand !== undefined && highBand !== undefined && (
        <Rect
          x={leftPad}
          y={toY(highBand)}
          width={chartW}
          height={toY(lowBand) - toY(highBand)}
          fill="url(#targetBand)"
          rx={4}
        />
      )}

      {/* Band edges */}
      {lowBand !== undefined && (
        <Line
          x1={leftPad} x2={leftPad + chartW}
          y1={toY(lowBand)} y2={toY(lowBand)}
          stroke={axisCol} strokeWidth={1} strokeDasharray="3,4" opacity={0.55}
        />
      )}
      {highBand !== undefined && (
        <Line
          x1={leftPad} x2={leftPad + chartW}
          y1={toY(highBand)} y2={toY(highBand)}
          stroke={axisCol} strokeWidth={1} strokeDasharray="3,4" opacity={0.55}
        />
      )}

      {/* Y labels */}
      {yTicks.map((t, i) => (
        <SvgText
          key={i}
          x={leftPad - 8}
          y={toY(t.v) + 3}
          fill={labelCol}
          fontSize={9}
          fontFamily={numFont}
          fontWeight={t.emphasize ? '700' : '500'}
          textAnchor="end"
          opacity={t.emphasize ? 0.9 : 0.5}
        >
          {t.label}
        </SvgText>
      ))}

      {/* Area fill */}
      <Path d={areaPath} fill="url(#weightArea)" />

      {/* Smooth line */}
      <Path
        d={curvePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Start + current dots */}
      <Circle cx={firstPoint.x} cy={firstPoint.y} r={4} fill={mutedColor} stroke={dotStrokeCol} strokeWidth={2} opacity={0.7} />
      <Circle cx={lastPoint.x} cy={lastPoint.y} r={5.5} fill={color} stroke={dotStrokeCol} strokeWidth={2.5} />

      {/* Current value bubble */}
      <Rect x={lastPoint.x - 22} y={lastPoint.y - 22} width={44} height={16} rx={4} fill={color} opacity={0.95} />
      <SvgText x={lastPoint.x} y={lastPoint.y - 10} fill={bubbleTextCol} fontSize={10} fontFamily={numFont} fontWeight="800" textAnchor="middle">
        {`${lastPoint.v.toFixed(1)}${t('preg_form_weight_kgLabel')}`}
      </SvgText>

      {/* X labels */}
      {labelIndices.map((idx, i) => {
        const p = plotted[idx]
        const txt = new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <SvgText
            key={i}
            x={p.x}
            y={height - 6}
            fill={labelCol}
            fontSize={9}
            fontFamily={numFont}
            fontWeight="500"
            textAnchor={i === 0 ? 'start' : i === labelIndices.length - 1 ? 'end' : 'middle'}
            opacity={0.7}
          >
            {txt}
          </SvgText>
        )
      })}
    </Svg>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailProps {
  visible: boolean
  onClose: () => void
  current: number | null
  start: number | null
  gained: number | null
  pace: number | null
  band: TargetBand
  expectedLow: number | null
  expectedHigh: number | null
  status: 'below' | 'on_track' | 'above' | 'no_data'
  statusColor: string
  statusText: string
  entries: WeightEntry[]
  weekNumber: number
  bandLow: number
  bandHigh: number
  chartWidth: number
}

function WeightDetailModal(props: DetailProps) {
  const {
    visible, onClose, current, start, gained, pace,
    band, expectedLow, expectedHigh, statusText, statusColor,
    entries, weekNumber, bandLow, bandHigh, chartWidth,
  } = props
  const { colors, font, stickers, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const ink = colors.text
  const paperBorderStrong = isDark ? colors.border : 'rgba(20,19,19,0.18)'

  const recent = [...entries].reverse().slice(0, 8)
  const chartPoints = entries.slice(-12).map((e, i) => ({ x: i, y: e.weight, date: e.date }))

  // ── Diffuse render path ──
  if (diffuse) {
    const dAccent = getDiffuseAccent('preg', dt.isDark)
    const dStatusColor =
      props.status === 'above' ? dt.colors.warning
      : props.status === 'below' ? dt.colors.warning
      : props.status === 'on_track' ? dt.colors.success
      : dt.colors.ink3
    return (
      <DiffuseSheet
        visible={visible}
        title={t('preg_weight_sheetTitle')}
        onClose={onClose}
        chip={`WEEK ${weekNumber}`}
      >
        <View style={{ gap: 14 }}>
          {/* Hero */}
          <View>
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 44, letterSpacing: -0.5, color: dt.colors.ink }}>
              {current !== null ? `${current.toFixed(1)} kg` : '—'}
            </Text>
            <Text style={{ marginTop: 2, fontFamily: diffuseFont.mono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: dStatusColor }}>
              {statusText}
            </Text>
          </View>

          {/* Stat grid — hairline metric tiles */}
          <View style={styles.statGrid}>
            <DiffuseMetricTile
              value={start !== null ? `${start.toFixed(1)}` : '—'}
              label={t('preg_weight_labelStarting')}
            />
            <DiffuseMetricTile
              value={gained !== null ? `${gained >= 0 ? '+' : ''}${gained.toFixed(1)}` : '—'}
              label={t('preg_weight_labelGained')}
            />
            <DiffuseMetricTile
              value={pace !== null ? `${pace >= 0 ? '+' : ''}${pace.toFixed(1)}` : '—'}
              label={t('preg_weight_labelPace')}
            />
          </View>

          {/* Trend chart — accent series, hairline axes, mono labels */}
          <View style={[styles.chartCardDiffuse, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: dt.colors.ink3 }}>
                {t('preg_weight_trendHeader', { count: chartPoints.length })}
              </Text>
              <View style={[styles.legendDot, { backgroundColor: dAccent, borderColor: dt.colors.line2, borderWidth: 1 }]} />
            </View>
            {chartPoints.length >= 2 ? (
              <View style={{ marginTop: 12, alignItems: 'center' }}>
                <WeightChart
                  points={chartPoints}
                  lowBand={bandLow}
                  highBand={bandHigh}
                  color={dAccent}
                  mutedColor={dt.colors.ink3}
                  axisColor={dt.colors.line}
                  labelColor={dt.colors.ink3}
                  dotStroke={dt.colors.surface}
                  bubbleTextColor={dt.colors.bg}
                  mono
                  width={chartWidth}
                  height={180}
                />
              </View>
            ) : (
              <Text style={{ marginTop: 12, fontFamily: diffuseFont.italic, fontSize: 13, color: dt.colors.ink3 }}>
                {t('preg_weight_emptyHelp')}
              </Text>
            )}
          </View>

          {/* IOM target band */}
          <View style={[styles.stickerBlockDiffuse, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: dt.colors.ink3 }}>
              {t('preg_weight_iomTargetFull', { label: band.label.toUpperCase() })}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <Text style={{ fontFamily: diffuseFont.display, fontSize: 26, letterSpacing: -0.5, color: dt.colors.ink }}>{`${band.low}–${band.high}`}</Text>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: dt.colors.ink3 }}>{t('preg_weight_iomBandLabel')}</Text>
            </View>
            {expectedLow !== null && expectedHigh !== null && (
              <Text style={{ marginTop: 10, lineHeight: 20, fontFamily: diffuseFont.body, fontSize: 13, color: dt.colors.ink2 }}>
                {t('preg_weight_byWeekExpect', { week: weekNumber })}{' '}
                <Text style={{ color: dt.colors.ink, fontFamily: diffuseFont.bodySemiBold }}>
                  {`${expectedLow.toFixed(1)}–${expectedHigh.toFixed(1)} ${t('preg_form_weight_kgLabel')}`}
                </Text>
                {t('preg_weight_hitARange')}
              </Text>
            )}
          </View>

          {/* Recent entries */}
          {recent.length > 0 && (
            <View style={[styles.stickerBlockDiffuse, { backgroundColor: dt.colors.surface, borderColor: dt.colors.line }]}>
              <Text style={{ marginBottom: 6, fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: dt.colors.ink3 }}>{t('preg_weight_recentEntries')}</Text>
              {recent.map((e, i) => {
                const prev = i < recent.length - 1 ? recent[i + 1] : null
                const delta = prev ? e.weight - prev.weight : 0
                return (
                  <View key={i} style={[styles.recentRow, { borderBottomColor: dt.colors.line }]}>
                    <Text style={{ fontFamily: diffuseFont.mono, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', color: dt.colors.ink3 }}>
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 13, color: dt.colors.ink }}>
                        {`${e.weight.toFixed(1)} ${t('preg_form_weight_kgLabel')}`}
                      </Text>
                      {prev && (
                        <Text style={{ fontFamily: diffuseFont.mono, fontSize: 11, color: delta > 0 ? dt.colors.success : delta < 0 ? dt.colors.warning : dt.colors.ink3 }}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* CTA — containerless hairline action */}
          <Pressable
            onPress={() => { onClose(); router.push('/insights') }}
            style={({ pressed }) => [styles.diffuseCta, { borderTopColor: dt.colors.line2, opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: dt.colors.ink }}>{t('preg_weight_openInsights')}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 16, color: dt.colors.ink3 }}>→</Text>
          </Pressable>
        </View>
      </DiffuseSheet>
    )
  }

  return (
    <LogSheet
      visible={visible}
      title={t('preg_weight_sheetTitle')}
      onClose={onClose}
      chip={`Week ${weekNumber}`}
      chipColor={stickers.lilac}
    >
      <View style={{ gap: 14 }}>
        {/* Hero */}
        <View>
          <Display size={44} color={ink}>
            {current !== null ? `${current.toFixed(1)} kg` : '—'}
          </Display>
          <Body size={13} color={statusColor} style={{ marginTop: 2, fontFamily: font.bodySemiBold }}>
            {statusText}
          </Body>
        </View>

        {/* Stat grid — sticker-tinted tiles with ink border */}
        <View style={styles.statGrid}>
          <View style={[styles.statTile, { backgroundColor: stickers.lilacSoft, borderColor: ink }]}>
            <MonoCaps size={9} color={colors.textMuted}>{t('preg_weight_labelStarting')}</MonoCaps>
            <Display size={22} color={ink} style={{ marginTop: 4 }}>
              {start !== null ? `${start.toFixed(1)}` : '—'}
            </Display>
            <Body size={11} color={colors.textMuted} style={{ fontFamily: font.italic }}>{t('preg_weight_kgPrePreg')}</Body>
          </View>

          <View style={[styles.statTile, { backgroundColor: stickers.greenSoft, borderColor: ink }]}>
            <MonoCaps size={9} color={colors.textMuted}>{t('preg_weight_labelGained')}</MonoCaps>
            <Display size={22} color={ink} style={{ marginTop: 4 }}>
              {gained !== null ? `${gained >= 0 ? '+' : ''}${gained.toFixed(1)}` : '—'}
            </Display>
            <Body size={11} color={colors.textMuted} style={{ fontFamily: font.italic }}>{t('preg_weight_kgTotal')}</Body>
          </View>

          <View style={[styles.statTile, { backgroundColor: stickers.yellowSoft, borderColor: ink }]}>
            <MonoCaps size={9} color={colors.textMuted}>{t('preg_weight_labelPace')}</MonoCaps>
            <Display size={22} color={ink} style={{ marginTop: 4 }}>
              {pace !== null ? `${pace >= 0 ? '+' : ''}${pace.toFixed(1)}` : '—'}
            </Display>
            <Body size={11} color={colors.textMuted} style={{ fontFamily: font.italic }}>{t('preg_weight_kgPerWeek')}</Body>
          </View>
        </View>

        {/* Trend chart with target band */}
        <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: paperBorderStrong }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <MonoCaps size={10} color={colors.textMuted}>{t('preg_weight_trendHeader', { count: chartPoints.length })}</MonoCaps>
            <View style={[styles.legendDot, { backgroundColor: stickers.lilac, borderColor: ink }]} />
          </View>
          {chartPoints.length >= 2 ? (
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <WeightChart
                points={chartPoints}
                lowBand={bandLow}
                highBand={bandHigh}
                color={stickers.lilac}
                mutedColor={colors.textMuted}
                width={chartWidth}
                height={180}
              />
            </View>
          ) : (
            <Body size={12} color={colors.textMuted} style={{ marginTop: 12, fontFamily: font.italic }}>
              {t('preg_weight_emptyHelp')}
            </Body>
          )}
        </View>

        {/* IOM target band */}
        <View style={[styles.stickerBlock, { backgroundColor: colors.surface, borderColor: paperBorderStrong }]}>
          <MonoCaps size={10} color={colors.textMuted}>{t('preg_weight_iomTargetFull', { label: band.label.toUpperCase() })}</MonoCaps>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <Display size={26} color={ink}>{`${band.low}–${band.high}`}</Display>
            <Body size={12} color={colors.textMuted} style={{ fontFamily: font.italic }}>{t('preg_weight_iomBandLabel')}</Body>
          </View>
          {expectedLow !== null && expectedHigh !== null && (
            <Body size={13} color={colors.textSecondary} style={{ marginTop: 10, lineHeight: 18 }}>
              {t('preg_weight_byWeekExpect', { week: weekNumber })}{' '}
              <Text style={{ color: ink, fontFamily: font.bodySemiBold }}>
                {`${expectedLow.toFixed(1)}–${expectedHigh.toFixed(1)} ${t('preg_form_weight_kgLabel')}`}
              </Text>
              {t('preg_weight_hitARange')}
            </Body>
          )}
        </View>

        {/* Recent entries */}
        {recent.length > 0 && (
          <View style={[styles.stickerBlock, { backgroundColor: colors.surface, borderColor: paperBorderStrong }]}>
            <MonoCaps size={10} color={colors.textMuted} style={{ marginBottom: 6 }}>{t('preg_weight_recentEntries')}</MonoCaps>
            {recent.map((e, i) => {
              const prev = i < recent.length - 1 ? recent[i + 1] : null
              const delta = prev ? e.weight - prev.weight : 0
              return (
                <View key={i} style={[styles.recentRow, { borderBottomColor: colors.borderLight }]}>
                  <Body size={13} color={colors.textMuted}>
                    {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Body>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Body size={13} color={ink} style={{ fontFamily: font.bodySemiBold }}>
                      {`${e.weight.toFixed(1)} ${t('preg_form_weight_kgLabel')}`}
                    </Body>
                    {prev && (
                      <Body size={11} color={delta > 0 ? stickers.green : delta < 0 ? stickers.coral : colors.textMuted}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </Body>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* CTA — sticker button with ink shadow so it 'sits' on the cream paper */}
        <StickerButton
          label={t('preg_weight_openInsights')}
          color={stickers.lilac}
          colorSoft={stickers.lilacSoft}
          colorDark={ink}
          onPress={() => { onClose(); router.push('/insights') }}
          height={56}
          fontSize={16}
          style={{ marginTop: 6 }}
        />
      </View>
    </LogSheet>
  )
}

// ─── Main Card ────────────────────────────────────────────────────────────────

interface Props {
  userId: string | undefined
  weekNumber: number
}

export function WeightTrendCard({ userId, weekNumber }: Props) {
  const { colors, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const dAccent = getDiffuseAccent('preg', dt.isDark)
  const { t } = useTranslation()
  const [detailVisible, setDetailVisible] = useState(false)
  const { entries, profile, loading } = useWeightCardData(userId)

  const derived = useMemo(() => {
    if (entries.length === 0) {
      return {
        current: null as number | null,
        start: profile.prePregWeight,
        gained: null as number | null,
        pace: null as number | null,
        chartPoints: [] as Array<{ x: number; y: number; date: string }>,
      }
    }
    const current = entries[entries.length - 1].weight
    const start = profile.prePregWeight ?? entries[0].weight
    const gained = current - start

    // Pace: avg weekly delta across last 14 days
    const now = new Date()
    const recent = entries.filter((e) => {
      const diff = (now.getTime() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24)
      return diff <= 14
    })
    let pace: number | null = null
    if (recent.length >= 2) {
      const first = recent[0]
      const last = recent[recent.length - 1]
      const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)
      if (days > 0) pace = ((last.weight - first.weight) / days) * 7
    }

    const chartPoints = entries.slice(-8).map((e, i) => ({ x: i, y: e.weight, date: e.date }))

    return { current, start, gained, pace, chartPoints }
  }, [entries, profile.prePregWeight])

  const band = getIOMTarget(profile.prePregWeight, profile.heightCm)
  const expectedLow = expectedGainAtWeek(weekNumber, band, 'low')
  const expectedHigh = expectedGainAtWeek(weekNumber, band, 'high')

  // Band low/high in absolute weight for the chart overlay
  const startForBand = derived.start ?? (entries[0]?.weight ?? 0)
  const bandLow = startForBand + expectedLow
  const bandHigh = startForBand + expectedHigh

  // Status
  let status: 'below' | 'on_track' | 'above' | 'no_data' = 'no_data'
  let statusText = t('preg_weight_statusEmpty')
  let statusColor = colors.textMuted
  if (derived.gained !== null) {
    if (derived.gained < expectedLow - 0.5) {
      status = 'below'
      statusText = t('preg_weight_statusBelow', {
        low: expectedLow.toFixed(1),
        high: expectedHigh.toFixed(1),
        week: weekNumber,
      })
      statusColor = stickers.peach
    } else if (derived.gained > expectedHigh + 0.5) {
      status = 'above'
      statusText = t('preg_weight_statusAbove', {
        low: expectedLow.toFixed(1),
        high: expectedHigh.toFixed(1),
        week: weekNumber,
      })
      statusColor = stickers.coral
    } else {
      status = 'on_track'
      statusText = t('preg_weight_statusOnTrack', {
        gain: derived.gained.toFixed(1),
        low: expectedLow.toFixed(1),
        high: expectedHigh.toFixed(1),
      })
      statusColor = stickers.green
    }
  }

  if (loading && entries.length === 0) return null

  const empty = derived.current === null

  // ── Variant-resolved tokens for the main card ──
  const cardInk = diffuse ? dt.colors.ink : colors.text
  const cardMuted = diffuse ? dt.colors.ink3 : colors.textMuted
  const monoFont = diffuse ? diffuseFont.mono : font.bodySemiBold
  const seriesColor = diffuse ? dAccent : stickers.lilac
  const dispStatusColor = diffuse
    ? (status === 'on_track' ? dt.colors.success : status === 'no_data' ? dt.colors.ink3 : dt.colors.warning)
    : statusColor
  const gainedColor = derived.gained === null
    ? cardInk
    : diffuse
      ? (derived.gained >= 0 ? dt.colors.success : dt.colors.warning)
      : (derived.gained >= 0 ? stickers.green : stickers.coral)

  const cardInner = (
    <>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              {diffuse
                ? <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: cardMuted }}>{t('preg_weight_trendWeekLabel', { week: weekNumber })}</Text>
                : <MonoCaps size={10} color={colors.textMuted}>{t('preg_weight_trendWeekLabel', { week: weekNumber })}</MonoCaps>}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                {diffuse
                  ? <Text style={{ fontFamily: diffuseFont.display, fontSize: 28, letterSpacing: -0.5, color: cardInk }}>{empty ? '—' : derived.current!.toFixed(1)}</Text>
                  : <Display size={28} color={colors.text}>{empty ? '—' : derived.current!.toFixed(1)}</Display>}
                <Text style={{ fontFamily: diffuse ? diffuseFont.mono : font.bodyMedium, fontSize: diffuse ? 11 : 13, letterSpacing: diffuse ? 0.6 : 0, textTransform: diffuse ? 'uppercase' : 'none', color: cardMuted }}>{t('preg_form_weight_kgLabel')}</Text>
              </View>
            </View>
            <View style={[styles.statusPill, diffuse
              ? { backgroundColor: 'transparent', borderColor: dt.colors.line2 }
              : { backgroundColor: statusColor + '1A', borderColor: statusColor + '55' }]}>
              {status === 'on_track' && <TrendingUp size={12} color={dispStatusColor} strokeWidth={2.5} />}
              {status === 'above' && <TrendingUp size={12} color={dispStatusColor} strokeWidth={2.5} />}
              {status === 'below' && <TrendingDown size={12} color={dispStatusColor} strokeWidth={2.5} />}
              {status === 'no_data' && <Minus size={12} color={dispStatusColor} strokeWidth={2.5} />}
              <Text style={[styles.statusText, diffuse ? { color: dispStatusColor, fontFamily: diffuseFont.mono, letterSpacing: 0.6, textTransform: 'uppercase', fontSize: 10 } : { color: statusColor }]} numberOfLines={1}>
                {status === 'on_track' ? 'On track' : status === 'above' ? 'Above' : status === 'below' ? 'Below' : 'No data'}
              </Text>
            </View>
          </View>

          {/* Stat strip */}
          <View style={[styles.statStrip, diffuse ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line } : null]}>
            <View style={styles.statCellInline}>
              {diffuse
                ? <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: cardMuted }}>{t('preg_weight_labelStart')}</Text>
                : <MonoCaps size={9} color={colors.textMuted}>{t('preg_weight_labelStart')}</MonoCaps>}
              <Text style={[styles.statValue, { color: cardInk, fontFamily: monoFont }]}>
                {derived.start !== null ? `${derived.start.toFixed(1)} kg` : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: diffuse ? dt.colors.line : colors.border }]} />
            <View style={styles.statCellInline}>
              {diffuse
                ? <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: cardMuted }}>{t('preg_weight_labelGained')}</Text>
                : <MonoCaps size={9} color={colors.textMuted}>{t('preg_weight_labelGained')}</MonoCaps>}
              <Text style={[styles.statValue, { color: gainedColor, fontFamily: monoFont }]}>
                {derived.gained !== null ? `${derived.gained >= 0 ? '+' : ''}${derived.gained.toFixed(1)} kg` : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: diffuse ? dt.colors.line : colors.border }]} />
            <View style={styles.statCellInline}>
              {diffuse
                ? <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: cardMuted }}>{t('preg_weight_labelPace')}</Text>
                : <MonoCaps size={9} color={colors.textMuted}>{t('preg_weight_labelPace')}</MonoCaps>}
              <Text style={[styles.statValue, { color: cardInk, fontFamily: monoFont }]}>
                {derived.pace !== null ? `${derived.pace >= 0 ? '+' : ''}${derived.pace.toFixed(1)}/wk` : '—'}
              </Text>
            </View>
          </View>

          {/* Chart */}
          {derived.chartPoints.length >= 2 ? (
            <View style={{ marginTop: 10, alignItems: 'center' }}>
              <WeightChart
                points={derived.chartPoints}
                lowBand={bandLow}
                highBand={bandHigh}
                color={seriesColor}
                mutedColor={cardMuted}
                axisColor={diffuse ? dt.colors.line : undefined}
                labelColor={diffuse ? dt.colors.ink3 : undefined}
                dotStroke={diffuse ? dt.colors.surface : undefined}
                bubbleTextColor={diffuse ? dt.colors.bg : undefined}
                mono={diffuse}
                width={SCREEN_W - 76}
                height={120}
              />
            </View>
          ) : (
            <View style={[styles.emptyChart, diffuse ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line } : null]}>
              {diffuse
                ? <Text style={{ textAlign: 'center', fontFamily: diffuseFont.italic, fontSize: 13, color: cardMuted }}>{t('preg_weight_chartEmpty')}</Text>
                : <Body size={12} color={colors.textMuted} align="center">{t('preg_weight_chartEmpty')}</Body>}
            </View>
          )}

          {/* Footer CTA */}
          <View style={styles.footerRow}>
            {diffuse
              ? <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: cardMuted }}>{t('preg_weight_targetFooter', { low: band.low, high: band.high, label: band.label })}</Text>
              : <Body size={12} color={colors.textMuted}>{t('preg_weight_targetFooter', { low: band.low, high: band.high, label: band.label })}</Body>}
            <View style={styles.detailsLink}>
              {diffuse
                ? <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: dAccent }}>{t('preg_weight_details')}</Text>
                : <Body size={13} color={stickers.lilac} style={{ fontFamily: font.bodySemiBold }}>{t('preg_weight_details')}</Body>}
              <ChevronRight size={14} color={diffuse ? dAccent : stickers.lilac} strokeWidth={2.5} />
            </View>
          </View>
    </>
  )

  return (
    <>
      <Pressable onPress={() => setDetailVisible(true)}>
        {diffuse ? (
          <DiffuseFieldSurface
            mode="preg"
            isDark={dt.isDark}
            intensity={0.45}
            radius={themeRadius.lg}
            style={{ padding: 18, borderWidth: 1, borderColor: dt.colors.line, overflow: 'hidden' }}
          >
            {cardInner}
          </DiffuseFieldSurface>
        ) : (
          <PaperCard radius={24} padding={18} style={styles.card}>
            {cardInner}
          </PaperCard>
        )}
      </Pressable>

      <WeightDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        current={derived.current}
        start={derived.start}
        gained={derived.gained}
        pace={derived.pace}
        band={band}
        expectedLow={expectedLow}
        expectedHigh={expectedHigh}
        status={status}
        statusColor={statusColor}
        statusText={statusText}
        entries={entries}
        weekNumber={weekNumber}
        bandLow={bandLow}
        bandHigh={bandHigh}
        chartWidth={SCREEN_W - 88}
      />
    </>
  )
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontFamily: font.bodySemiBold },

  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(20,19,19,0.03)',
  },
  statCellInline: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 24 },
  statValue: { fontSize: 13, fontFamily: font.bodySemiBold },

  emptyChart: {
    marginTop: 16,
    marginBottom: 4,
    paddingVertical: 24,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(20,19,19,0.03)',
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  // Detail sheet
  statGrid: { flexDirection: 'row', gap: 10 },
  statCell: { flex: 1 },
  statTile: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  chartCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  chartCardDiffuse: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  stickerBlock: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
    shadowColor: '#141313',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  stickerBlockDiffuse: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  diffuseCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 4,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
})
