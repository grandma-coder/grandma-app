/**
 * WeightTrendCard — rich pregnancy weight tracking card.
 *
 * Shows current weight, starting weight, total gained, weekly pace, IOM target
 * band (based on BMI if height + pre-preg weight are set, else default), and a
 * line chart with a dashed target overlay. Tappable → deep link to /insights.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Dimensions, Modal, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, TrendingUp, TrendingDown, Minus, X } from 'lucide-react-native'
import Svg, {
  Circle, Line, Path, Rect, Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg'
import { useTheme } from '../../../constants/theme'
import { PaperCard } from '../../ui/PaperCard'
import { Display, MonoCaps, Body } from '../../ui/Typography'
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
      const rows = (weightRes.data ?? [])
        .map((r: any) => ({ date: r.log_date as string, weight: parseFloat(r.value ?? '0') }))
        .filter((r) => !isNaN(r.weight) && r.weight > 0)
      setEntries(rows)

      const bp = (profileRes.data?.birth_preferences as any) ?? {}
      const pre = bp.prePregnancyWeight ? parseFloat(bp.prePregnancyWeight) : null
      const h = bp.height ? parseFloat(bp.height) : null
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
}

function WeightChart({ points, lowBand, highBand, color, mutedColor, width, height }: MiniChartProps) {
  if (points.length < 2) return null

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
          stroke={mutedColor} strokeWidth={1} strokeDasharray="3,4" opacity={0.55}
        />
      )}
      {highBand !== undefined && (
        <Line
          x1={leftPad} x2={leftPad + chartW}
          y1={toY(highBand)} y2={toY(highBand)}
          stroke={mutedColor} strokeWidth={1} strokeDasharray="3,4" opacity={0.55}
        />
      )}

      {/* Y labels */}
      {yTicks.map((t, i) => (
        <SvgText
          key={i}
          x={leftPad - 8}
          y={toY(t.v) + 3}
          fill={t.emphasize ? mutedColor : mutedColor}
          fontSize={9}
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
      <Circle cx={firstPoint.x} cy={firstPoint.y} r={4} fill={mutedColor} stroke="#FFFEF8" strokeWidth={2} opacity={0.7} />
      <Circle cx={lastPoint.x} cy={lastPoint.y} r={5.5} fill={color} stroke="#FFFEF8" strokeWidth={2.5} />

      {/* Current value bubble */}
      <Rect x={lastPoint.x - 22} y={lastPoint.y - 22} width={44} height={16} rx={4} fill={color} opacity={0.95} />
      <SvgText x={lastPoint.x} y={lastPoint.y - 10} fill="#FFFEF8" fontSize={10} fontWeight="800" textAnchor="middle">
        {lastPoint.v.toFixed(1)}kg
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
            fill={mutedColor}
            fontSize={9}
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
}

function WeightDetailModal(props: DetailProps) {
  const {
    visible, onClose, current, start, gained, pace,
    band, expectedLow, expectedHigh, statusText, statusColor,
    entries, weekNumber,
  } = props
  const { colors, stickers } = useTheme()

  const recent = [...entries].reverse().slice(0, 8)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.detailSheet, { backgroundColor: colors.bgWarm }]}>
          <View style={styles.detailHandle} />
          <Pressable onPress={onClose} style={styles.detailClose}>
            <X size={18} color={colors.textMuted} strokeWidth={2} />
          </Pressable>

          <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View style={styles.detailHeader}>
              <MonoCaps size={10} color={colors.textMuted}>WEIGHT TREND · WEEK {weekNumber}</MonoCaps>
              <Display size={40} color={colors.text} style={{ marginTop: 4 }}>
                {current !== null ? `${current.toFixed(1)} kg` : '—'}
              </Display>
              <Body size={13} color={statusColor} style={{ marginTop: 2, fontFamily: 'DMSans_600SemiBold' }}>
                {statusText}
              </Body>
            </View>

            {/* Stat grid */}
            <View style={styles.statGrid}>
              <PaperCard tint={stickers.lilacSoft} radius={16} padding={12} style={styles.statCell}>
                <MonoCaps size={9} color={colors.textMuted}>STARTING</MonoCaps>
                <Display size={20} color={colors.text} style={{ marginTop: 2 }}>
                  {start !== null ? `${start.toFixed(1)}` : '—'}
                </Display>
                <Body size={10} color={colors.textMuted}>kg pre-preg</Body>
              </PaperCard>

              <PaperCard tint={stickers.greenSoft} radius={16} padding={12} style={styles.statCell}>
                <MonoCaps size={9} color={colors.textMuted}>GAINED</MonoCaps>
                <Display size={20} color={colors.text} style={{ marginTop: 2 }}>
                  {gained !== null ? `${gained >= 0 ? '+' : ''}${gained.toFixed(1)}` : '—'}
                </Display>
                <Body size={10} color={colors.textMuted}>kg total</Body>
              </PaperCard>

              <PaperCard tint={stickers.yellowSoft} radius={16} padding={12} style={styles.statCell}>
                <MonoCaps size={9} color={colors.textMuted}>PACE</MonoCaps>
                <Display size={20} color={colors.text} style={{ marginTop: 2 }}>
                  {pace !== null ? `${pace >= 0 ? '+' : ''}${pace.toFixed(1)}` : '—'}
                </Display>
                <Body size={10} color={colors.textMuted}>kg/wk recent</Body>
              </PaperCard>
            </View>

            {/* Target band */}
            <PaperCard radius={16} padding={16} style={{ marginHorizontal: 20, marginBottom: 16 }}>
              <MonoCaps size={10} color={colors.textMuted}>IOM TARGET · {band.label}</MonoCaps>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <Display size={22} color={colors.text}>{band.low}–{band.high}</Display>
                <Body size={12} color={colors.textMuted}>kg total gain</Body>
              </View>
              {expectedLow !== null && expectedHigh !== null && (
                <Body size={12} color={colors.textMuted} style={{ marginTop: 8, lineHeight: 16 }}>
                  By week {weekNumber}, you're expected to gain <Text style={{ color: colors.text, fontFamily: 'DMSans_600SemiBold' }}>{expectedLow.toFixed(1)}–{expectedHigh.toFixed(1)} kg</Text>. Hit a range, not a number — everybody's trajectory differs.
                </Body>
              )}
            </PaperCard>

            {/* Recent entries */}
            {recent.length > 0 && (
              <PaperCard radius={16} padding={16} style={{ marginHorizontal: 20, marginBottom: 16 }}>
                <MonoCaps size={10} color={colors.textMuted} style={{ marginBottom: 10 }}>RECENT ENTRIES</MonoCaps>
                {recent.map((e, i) => {
                  const prev = i < recent.length - 1 ? recent[i + 1] : null
                  const delta = prev ? e.weight - prev.weight : 0
                  return (
                    <View key={i} style={[styles.recentRow, { borderBottomColor: colors.borderLight }]}>
                      <Body size={13} color={colors.textMuted}>
                        {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Body>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Body size={13} color={colors.text} style={{ fontFamily: 'DMSans_600SemiBold' }}>
                          {e.weight.toFixed(1)} kg
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
              </PaperCard>
            )}

            {/* CTA */}
            <Pressable
              onPress={() => { onClose(); router.push('/insights') }}
              style={[styles.detailCta, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}
            >
              <Text style={[styles.detailCtaText, { color: statusColor }]}>Open full insights →</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main Card ────────────────────────────────────────────────────────────────

interface Props {
  userId: string | undefined
  weekNumber: number
}

export function WeightTrendCard({ userId, weekNumber }: Props) {
  const { colors, stickers } = useTheme()
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
  let statusText = 'Log your weight to see trend'
  let statusColor = colors.textMuted
  if (derived.gained !== null) {
    if (derived.gained < expectedLow - 0.5) {
      status = 'below'
      statusText = `Below target — expected ${expectedLow.toFixed(1)}–${expectedHigh.toFixed(1)} kg by week ${weekNumber}`
      statusColor = stickers.peach
    } else if (derived.gained > expectedHigh + 0.5) {
      status = 'above'
      statusText = `Above target — expected ${expectedLow.toFixed(1)}–${expectedHigh.toFixed(1)} kg by week ${weekNumber}`
      statusColor = stickers.coral
    } else {
      status = 'on_track'
      statusText = `On track — ${derived.gained.toFixed(1)} kg of ${expectedLow.toFixed(1)}–${expectedHigh.toFixed(1)} kg`
      statusColor = stickers.green
    }
  }

  if (loading && entries.length === 0) return null

  const empty = derived.current === null

  return (
    <>
      <Pressable onPress={() => setDetailVisible(true)}>
        <PaperCard radius={24} padding={18} style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <MonoCaps size={10} color={colors.textMuted}>WEIGHT TREND · WEEK {weekNumber}</MonoCaps>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <Display size={28} color={colors.text}>
                  {empty ? '—' : derived.current!.toFixed(1)}
                </Display>
                <Body size={13} color={colors.textMuted} style={{ fontFamily: 'DMSans_500Medium' }}>kg</Body>
              </View>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '1A', borderColor: statusColor + '55' }]}>
              {status === 'on_track' && <TrendingUp size={12} color={statusColor} strokeWidth={2.5} />}
              {status === 'above' && <TrendingUp size={12} color={statusColor} strokeWidth={2.5} />}
              {status === 'below' && <TrendingDown size={12} color={statusColor} strokeWidth={2.5} />}
              {status === 'no_data' && <Minus size={12} color={statusColor} strokeWidth={2.5} />}
              <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
                {status === 'on_track' ? 'On track' : status === 'above' ? 'Above' : status === 'below' ? 'Below' : 'No data'}
              </Text>
            </View>
          </View>

          {/* Stat strip */}
          <View style={styles.statStrip}>
            <View style={styles.statCellInline}>
              <MonoCaps size={9} color={colors.textMuted}>START</MonoCaps>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {derived.start !== null ? `${derived.start.toFixed(1)} kg` : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCellInline}>
              <MonoCaps size={9} color={colors.textMuted}>GAINED</MonoCaps>
              <Text style={[
                styles.statValue,
                { color: derived.gained === null ? colors.text : derived.gained >= 0 ? stickers.green : stickers.coral },
              ]}>
                {derived.gained !== null ? `${derived.gained >= 0 ? '+' : ''}${derived.gained.toFixed(1)} kg` : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statCellInline}>
              <MonoCaps size={9} color={colors.textMuted}>PACE</MonoCaps>
              <Text style={[styles.statValue, { color: colors.text }]}>
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
                color={stickers.lilac}
                mutedColor={colors.textMuted}
                width={SCREEN_W - 76}
                height={120}
              />
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Body size={12} color={colors.textMuted} align="center">
                Log weight twice to see your trend + target band
              </Body>
            </View>
          )}

          {/* Footer CTA */}
          <View style={styles.footerRow}>
            <Body size={12} color={colors.textMuted}>
              Target: {band.low}–{band.high} kg total · {band.label}
            </Body>
            <View style={styles.detailsLink}>
              <Body size={13} color={stickers.lilac} style={{ fontFamily: 'DMSans_600SemiBold' }}>Details</Body>
              <ChevronRight size={14} color={stickers.lilac} strokeWidth={2.5} />
            </View>
          </View>
        </PaperCard>
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
  statusText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold' },

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
  statValue: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },

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
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,19,19,0.55)' },
  detailSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    maxHeight: '85%',
  },
  detailHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(245,237,220,0.2)', alignSelf: 'center', marginBottom: 16 },
  detailClose: { position: 'absolute', top: 12, right: 20, padding: 8, zIndex: 10 },
  detailHeader: { paddingHorizontal: 24, marginBottom: 20 },

  statGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCell: { flex: 1 },

  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  detailCta: {
    marginHorizontal: 20,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  detailCtaText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
})
