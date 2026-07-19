/**
 * CycleDetailSheets — tap-through detail for each CycleAnalytics stat tile.
 *
 * One exported `CycleDetailSheet` driven by a `type` prop; each type has its
 * own internal body component that calls the matching cycleAnalytics hook.
 */

import React, { createContext, useContext } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Dimensions } from 'react-native'
import Svg, { Rect, Line as SvgLine, Text as SvgText } from 'react-native-svg'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { LogSheet } from '../calendar/LogSheet'
import { DiffuseSheet, DiffuseMetricTile } from '../ui/diffuse/DiffusePrimitives'
import { Body, Display } from '../ui/Typography'
import { useCycleHistory, useRegularity, usePMSStats, useFertileWindow, useMoodStats, useBBTStats, useCervicalMucusStats, useIntercourseStats, type MoodId, type MucusType } from '../../lib/cycleAnalytics'
import { useUnitsStore } from '../../store/useUnitsStore'
import { cToDisplay, tempLabel } from '../../lib/units'
import { Burst, Flower } from '../ui/Stickers'
import { Character } from '../characters/Characters'
import { MiniBarChart, MiniLineChart, BeadedThread } from './shared/MiniCharts'
import { MoodBubbleCluster } from '../charts/SvgCharts'
import { useTranslation } from '../../lib/i18n'

export type CycleDetailType =
  | 'cycleLength'
  | 'regularity'
  | 'pms'
  | 'fertile'
  | 'mood'
  | 'bbt'
  | 'mucus'
  | 'intercourse'

// ─── PMS symptom → Character concept map ───────────────────────────────────
// `usePMSStats().topSymptoms[].name` is NOT a localized display label — it's
// the raw symptom id as stored in `cycle_logs.value` (see lib/cycleSymptoms.ts
// `SymptomId`, e.g. 'back-pain', 'tender-breasts', 'cravings'). There is no
// separate `.id` field on the topSymptoms entries, so we key this map on a
// normalized form of `.name` itself. Also covers the older CycleTracker.tsx
// id vocabulary (e.g. 'mood_swings', 'cm_eggwhite') in case that source ever
// feeds the same log rows, so the mapping is robust either way. Unknown
// values fall back to the original generic 'activity'/peach — never crash.
const SYMPTOM_CHARACTER_MAP: Record<string, { name: import('../characters/Characters').CharacterName; color: (s: ReturnType<typeof useTheme>['stickers']) => string }> = {
  // lib/cycleSymptoms.ts SymptomId vocabulary (the real, wired-up source)
  cramps: { name: 'period', color: (s) => s.coral },
  bloated: { name: 'activity', color: (s) => s.peach },
  headache: { name: 'brain', color: (s) => s.yellow },
  fatigue: { name: 'sleep', color: (s) => s.blue },
  nausea: { name: 'water', color: (s) => s.green },
  'back-pain': { name: 'heart', color: (s) => s.pink },
  'tender-breasts': { name: 'heart', color: (s) => s.pink },
  acne: { name: 'sparkle', color: (s) => s.coral },
  insomnia: { name: 'sleep', color: (s) => s.blue },
  cravings: { name: 'nutrition', color: (s) => s.peach },
  'low-mood': { name: 'mood', color: (s) => s.lilac },
  spotting: { name: 'period', color: (s) => s.coral },
  energetic: { name: 'sparkle', color: (s) => s.coral },
  restless: { name: 'activity', color: (s) => s.peach },
  // Older CycleTracker.tsx id vocabulary (defensive — kept in sync per spec)
  bloating: { name: 'activity', color: (s) => s.peach },
  mood_swings: { name: 'mood', color: (s) => s.lilac },
  breast_tenderness: { name: 'heart', color: (s) => s.pink },
  back_pain: { name: 'heart', color: (s) => s.pink },
  cm_eggwhite: { name: 'water', color: (s) => s.green },
  cm_creamy: { name: 'water', color: (s) => s.green },
  cm_sticky: { name: 'water', color: (s) => s.green },
  cm_dry: { name: 'water', color: (s) => s.green },
}

function symptomToCharacter(rawName: string, stickers: ReturnType<typeof useTheme>['stickers']) {
  const key = rawName.trim().toLowerCase().replace(/\s+/g, '_')
  const dashKey = rawName.trim().toLowerCase().replace(/\s+/g, '-')
  const entry = SYMPTOM_CHARACTER_MAP[key] ?? SYMPTOM_CHARACTER_MAP[dashKey] ?? SYMPTOM_CHARACTER_MAP[rawName]
  if (entry) return { name: entry.name, color: entry.color(stickers) }
  return { name: 'activity' as const, color: stickers.peach }
}

interface Props {
  type: CycleDetailType | null
  accent?: string
  onClose: () => void
}

// ─── Live cycle-phase accent context ───────────────────────────────────────
// Presentational only — lets each detail body pick up the accent passed to
// CycleDetailSheet without prop-drilling through every body component.
const AccentContext = createContext<string | null>(null)

function usePhaseAccent(): string {
  const ctx = useContext(AccentContext)
  const dt = useDiffuseTheme()
  return ctx ?? getDiffuseAccent('pre-pregnancy', dt.isDark)
}

export function CycleDetailSheet({ type, accent, onClose }: Props) {
  const { t } = useTranslation()
  const diffuse = useIsDiffuse()
  const visible = type !== null

  const TITLES: Record<CycleDetailType, string> = {
    cycleLength: t('cycleDetail_titleCycleLength'),
    regularity: t('cycleDetail_titleRegularity'),
    pms: t('cycleDetail_titlePMS'),
    fertile: t('cycleDetail_titleFertile'),
    mood: t('cycleDetail_titleMood'),
    bbt: t('cycleDetail_titleBBT'),
    mucus: t('cycleDetail_titleMucus'),
    intercourse: t('cycleDetail_titleIntercourse'),
  }

  const CHIPS: Record<CycleDetailType, string> = {
    cycleLength: t('cycleDetail_chip_rhythm'),
    regularity: t('cycleDetail_chip_steadiness'),
    pms: t('cycleDetail_chip_symptoms'),
    fertile: t('cycleDetail_chip_window'),
    mood: t('cycleDetail_chip_feeling'),
    bbt: t('cycleDetail_chip_thermal'),
    mucus: t('cycleDetail_chip_signs'),
    intercourse: t('cycleDetail_chip_timing'),
  }

  const title = type ? TITLES[type] : ''

  const bodySwitch = (
    <>
      {type === 'cycleLength' && <CycleLengthDetail />}
      {type === 'regularity' && <RegularityDetail />}
      {type === 'pms' && <PMSDetail />}
      {type === 'fertile' && <FertileDetail />}
      {type === 'mood' && <MoodDetail />}
      {type === 'bbt' && <BBTDetail />}
      {type === 'mucus' && <MucusDetail />}
      {type === 'intercourse' && <IntercourseDetail />}
    </>
  )

  if (diffuse) {
    return (
      <DiffuseSheet visible={visible} title={title} chip={type ? CHIPS[type] : undefined} onClose={onClose}>
        <AccentContext.Provider value={accent ?? null}>
          {bodySwitch}
        </AccentContext.Provider>
      </DiffuseSheet>
    )
  }

  return (
    <LogSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: 540 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {bodySwitch}
      </ScrollView>
    </LogSheet>
  )
}

// ─── Placeholder bodies (filled in by later tasks) ────────────────────────

function CycleLengthDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const { data, isLoading, error } = useCycleHistory()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.avg === null || data.cycles.length === 0) {
    return <EmptyState copy="Log your first period to start tracking cycle length." />
  }

  const last12 = data.cycles
    .filter((c) => c.lengthDays !== null)
    .slice(-12)
  const values = last12.map((c) => c.lengthDays as number)
  const labels = last12.map((_, i) => `C${i + 1}`)

  const recentCycles = [...data.cycles].reverse().slice(0, 6)

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={40} color={diffuse ? dt.colors.ink : colors.text}>{data.avg}</Display>
        <Text style={[detailStyles.heroUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted, fontFamily: font.body }]}>{t('cycleAnalytics_daysAvg')}</Text>
      </View>

      <View style={detailStyles.minMaxRow}>
        <StatChip label={t('cycleDetail_statMin')} value={`${data.min}d`} tint={stickers.blueSoft} />
        <StatChip label={t('cycleDetail_statMax')} value={`${data.max}d`} tint={stickers.pinkSoft} />
        <StatChip label={t('cycleDetail_statCycles')} value={String(values.length)} tint={stickers.yellowSoft} />
      </View>

      <View>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_lastNCycles', { n: values.length })}
        </Text>
        {diffuse ? (
          <CycleLengthBars values={values} avg={data.avg} color={phaseAccent} />
        ) : (
          <MiniBarChart data={values} labels={labels} color={stickers.pink} />
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_history')}
        </Text>
        {recentCycles.map((c) => (
          <View
            key={c.startDate}
            style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.borderLight }]}
          >
            <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>
              {formatRange(c.startDate, c.endDate)}
            </Body>
            <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
              {c.lengthDays ? `${c.lengthDays}d` : '—'}
            </Body>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Cycle length bars (Diffuse-only, honest chart) ───────────────────────
// GlowAreaLine drew a dramatic smoothed peak/valley curve for what is
// actually a tight cycle-length range (e.g. 27–30 days) — visually
// exaggerating variation, showing no per-cycle values, no axis, and just
// repeating the surface hero chart. This renders one bar per recent cycle
// with the Y-axis zoomed to the actual data range (not 0-based), so a
// steady cycle reads as steady while small deviations stay visible, plus a
// dashed average baseline and a day-value label on every bar.
function CycleLengthBars({ values, avg, color }: { values: number[]; avg: number; color: string }) {
  const dt = useDiffuseTheme()

  if (values.length === 0) return null

  const W = Dimensions.get('window').width - 40 - 36 // screen − sheet margins − sheet padding (matches CycleLengthTrend)
  const H = 150
  const padX = 14
  const padTop = 22
  const padBottom = 24

  const floor = Math.min(...values, avg) - 2
  const ceil = Math.max(...values, avg) + 2
  const span = Math.max(1, ceil - floor)

  const slot = (W - padX * 2) / values.length
  const barWidth = Math.min(28, slot * 0.6)
  const chartBottom = H - padBottom
  const chartTop = padTop
  const yFor = (v: number) => chartTop + (1 - (v - floor) / span) * (chartBottom - chartTop)
  const avgY = yFor(avg)

  return (
    <View>
      <Svg width={W} height={H}>
        {/* dashed average baseline */}
        <SvgLine x1={padX} y1={avgY} x2={W - padX} y2={avgY} stroke={dt.colors.line} strokeWidth={1.5} strokeDasharray="3 4" />
        <SvgText x={W - padX} y={avgY - 6} fontSize={9} fontWeight="700" fill={dt.colors.ink3} textAnchor="end" fontFamily={diffuseFont.mono}>
          {`AVG ${avg}`}
        </SvgText>

        {/* one bar per cycle, zoomed to [floor, ceil] */}
        {values.map((v, i) => {
          const last = i === values.length - 1
          const cx = padX + slot * i + slot / 2
          const barY = yFor(v)
          const barH = Math.max(2, chartBottom - barY)
          return (
            <React.Fragment key={i}>
              <Rect
                x={cx - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barH}
                rx={8}
                fill={color}
                opacity={last ? 1 : 0.55}
              />
              <SvgText
                x={cx}
                y={barY - 8}
                fontSize={10}
                fontWeight="700"
                fill={last ? dt.colors.ink : dt.colors.ink2}
                textAnchor="middle"
                fontFamily={diffuseFont.monoBold}
              >
                {String(v)}
              </SvgText>
            </React.Fragment>
          )
        })}
      </Svg>
    </View>
  )
}

// ─── Shared detail helpers ────────────────────────────────────────────────

function StatChip({ label, value, tint }: { label: string; value: string; tint: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()

  if (diffuse) {
    return <DiffuseMetricTile value={value} label={label} style={{ flex: 1 }} />
  }

  return (
    <View style={[detailStyles.statChip, { backgroundColor: tint, borderColor: colors.border }]}>
      <Text style={[detailStyles.statLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{label}</Text>
      <Text style={[detailStyles.statValue, { color: colors.text, fontFamily: font.display }]}>{value}</Text>
    </View>
  )
}

function formatRange(start: string, end: string | null): string {
  const s = formatShort(start)
  if (!end) return `${s} – now`
  return `${s} – ${formatShort(end)}`
}

function formatShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const detailStyles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  heroUnit: {
    fontSize: 14,
    paddingBottom: 6,
  },
  minMaxRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})

function RegularityDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const { data, isLoading, error } = useRegularity()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.percent === null) {
    return <EmptyState copy="We need at least 3 complete cycles to measure regularity." />
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={56} color={diffuse ? dt.colors.ink : colors.text}>{data.percent}%</Display>
        <Text style={[detailStyles.heroUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted, fontFamily: font.body }]}>{t('cycleDetail_regular')}</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_legend')}
        </Text>
        <View style={regStyles.legendRow}>
          <LegendDot color={stickers.green} text="≤ 2 days" />
          <LegendDot color={stickers.yellow} text="≤ 4 days" />
          <LegendDot color={stickers.coral} text="> 4 days" />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_perCycleDeviation')}
        </Text>
        {data.deviations.slice(-10).map((d) => {
          const dotColor =
            d.delta <= 2 ? stickers.green : d.delta <= 4 ? stickers.yellow : stickers.coral
          return (
            <View
              key={d.cycleIdx}
              style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.borderLight }]}
            >
              <View style={regStyles.rowLeft}>
                <View style={[regStyles.dot, { backgroundColor: dotColor }]} />
                <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{t('cycleDetail_cycleN', { n: d.cycleIdx })}</Body>
              </View>
              <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
                {`${d.lengthDays}d · ${d.delta === 0 ? t('cycleDetail_onAvg') : `±${d.delta}d`}`}
              </Body>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function LegendDot({ color, text }: { color: string; text: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={regStyles.legendItem}>
      <View style={[regStyles.dot, { backgroundColor: color }]} />
      <Text style={{ fontSize: diffuse ? 10 : 12, color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : font.body, letterSpacing: diffuse ? 0.6 : 0, textTransform: diffuse ? 'uppercase' : 'none' }}>{text}</Text>
    </View>
  )
}

const regStyles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
})

function PMSDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const { data, isLoading, error } = usePMSStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || (data.avgDays === null && data.topSymptoms.length === 0)) {
    return <EmptyState copy="Log symptoms on the Agenda tab to start tracking PMS trends." />
  }

  const maxCount = data.topSymptoms[0]?.count ?? 1

  return (
    <View style={{ gap: 18 }}>
      {data.avgDays !== null && (
        <View style={detailStyles.heroRow}>
          <Display size={40} color={diffuse ? dt.colors.ink : colors.text}>{data.avgDays}</Display>
          <Text style={[detailStyles.heroUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted, fontFamily: font.body }]}>
            {t('cycleDetail_daysOfSymptomsPerCycle')}
          </Text>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_topSymptoms')}
        </Text>
        {data.topSymptoms.length === 0 ? (
          <Body size={13} color={colors.textMuted}>{t('preg_analytics_no_symptoms')}</Body>
        ) : (
          data.topSymptoms.map((s) => {
            const pct = (s.count / maxCount) * 100
            const symptomGlyph = symptomToCharacter(s.name, stickers)
            return (
              <View key={s.name} style={pmsStyles.symptomRow}>
                <View style={pmsStyles.symptomLeft}>
                  {diffuse ? (
                    <Character name={symptomGlyph.name} size={24} color={symptomGlyph.color} />
                  ) : (
                    <View style={[pmsStyles.chip, { backgroundColor: stickers.peachSoft, borderColor: colors.border }]}>
                      <Burst size={20} fill={stickers.peach} points={8} wobble={0.2} />
                    </View>
                  )}
                  <Body size={14} color={diffuse ? dt.colors.ink : colors.text}>{s.name}</Body>
                </View>
                <View style={pmsStyles.symptomRight}>
                  <View style={[pmsStyles.bar, { width: `${pct}%`, backgroundColor: diffuse ? phaseAccent : stickers.peachSoft }]} />
                  <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>{s.count}</Body>
                </View>
              </View>
            )
          })
        )}
      </View>
    </View>
  )
}

const pmsStyles = StyleSheet.create({
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  symptomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  symptomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 120,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    height: 8,
    borderRadius: 4,
    flex: 1,
    maxWidth: 80,
  },
})

function FertileDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const { data, isLoading, error } = useFertileWindow()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || !data.current) {
    return <EmptyState copy="Log your last period to see your fertile window predictions." />
  }

  const daysLeft = data.current.daysLeft
  const daysLeftText = daysLeft === 1
    ? t('cycleDetail_oneDayLeft')
    : t('cycleDetail_nDaysLeft', { n: daysLeft })

  return (
    <View style={{ gap: 18 }}>
      <View style={[fertStyles.currentCard, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.line } : { backgroundColor: stickers.pinkSoft, borderColor: colors.border }]}>
        {diffuse ? (
          <Character name="ovulation" size={40} color={stickers.pink} />
        ) : (
          <View style={[fertStyles.currentChip, { backgroundColor: colors.surface }]}>
            <Flower size={40} petal={stickers.pink} center={stickers.yellow} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {t('cycleDetail_thisCycle')}
          </Text>
          <Display size={22} color={diffuse ? dt.colors.ink : colors.text}>
            {`${formatShort(data.current.start)} – ${formatShort(data.current.end)}`}
          </Display>
          <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
            {daysLeft > 0 ? daysLeftText : t('cycleDetail_windowClosed')}
          </Body>
        </View>
      </View>

      {data.history.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {t('cycleDetail_pastWindows')}
          </Text>
          {data.history.map((w) => (
            <View
              key={w.cycleIdx}
              style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.borderLight }]}
            >
              <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{t('cycleDetail_cycleN', { n: w.cycleIdx })}</Body>
              <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
                {`${formatShort(w.start)} – ${formatShort(w.end)}`}
              </Body>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const fertStyles = StyleSheet.create({
  currentCard: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  currentChip: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

const MOOD_LABELS: Record<MoodId, string> = {
  great: 'Great',
  energetic: 'Energetic',
  good: 'Good',
  okay: 'Okay',
  low: 'Low',
}

function MoodDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const { data, isLoading, error } = useMoodStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.avgScore === null) {
    return <EmptyState copy="Log your mood on the Agenda tab to see mood trends." />
  }

  const maxCount = Math.max(1, ...data.distribution.map((d) => d.count))

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={40} color={diffuse ? dt.colors.ink : colors.text}>{data.avgScore}</Display>
        <Text style={[detailStyles.heroUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted, fontFamily: font.body }]}>{t('cycleDetail_fiveAvg')}</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_distribution')}
        </Text>
        {diffuse ? (
          // Standardized mood viz — the same blob-cluster (labeled circles + %)
          // used by Pregnancy + Kids mood sheets, via the shared MoodBubbleCluster.
          <MoodBubbleCluster items={data.distribution} />
        ) : (
          data.distribution.map((row) => {
            const pct = (row.count / maxCount) * 100
            return (
              <View key={row.mood} style={moodStyles.row}>
                <Body size={13} color={colors.text} style={{ width: 80 }}>
                  {MOOD_LABELS[row.mood]}
                </Body>
                <View style={[moodStyles.barTrack, { backgroundColor: colors.borderLight }]}>
                  <View style={[moodStyles.barFill, { width: `${pct}%`, backgroundColor: stickers.pink }]} />
                </View>
                <Body size={13} color={colors.textSecondary} style={{ width: 30, textAlign: 'right' }}>
                  {row.count}
                </Body>
              </View>
            )
          })
        )}
      </View>

      {data.recent.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {t('cycleDetail_lastNEntries', { n: data.recent.length })}
          </Text>
          {data.recent.map((r, i) => (
            <View
              key={`${r.date}-${i}`}
              style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.borderLight }]}
            >
              <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{formatShort(r.date)}</Body>
              <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>{MOOD_LABELS[r.mood]}</Body>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const moodStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
})

// ─── BBT (thermal shift) ───────────────────────────────────────────────────

function BBTDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const { data, isLoading, error } = useBBTStats()
  // BBT stored canonical °C; convert for display (B4).
  const tempUnit = useUnitsStore((s) => s.tempUnit)
  const tempU = (c: number) => cToDisplay(c, tempUnit)
  const degLabel = tempLabel(tempUnit)

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.series.length < 2) {
    return <EmptyState copy={t('cycleDetail_bbtEmpty')} />
  }

  const temps = data.series.map((s) => tempU(s.temp))
  const labels = data.series.map((s) => `${s.cycleDay}`)
  const latest = data.series[data.series.length - 1].temp

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.heroRow}>
        <Display size={40} color={diffuse ? dt.colors.ink : colors.text}>{tempU(latest).toFixed(1)}{degLabel}</Display>
        <Text style={[detailStyles.heroUnit, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 } : { color: colors.textMuted, fontFamily: font.body }]}>
          {t('cycleDetail_bbtLatest')}
        </Text>
      </View>

      <View style={detailStyles.minMaxRow}>
        <StatChip
          label={t('cycleDetail_bbtShift')}
          value={data.shiftDay ? t('cycleAnalytics_dayNumber', { currentDay: data.shiftDay }) : '—'}
          tint={stickers.pinkSoft}
        />
        <StatChip label={t('cycleDetail_bbtCoverline')} value={data.coverline ? `${tempU(data.coverline).toFixed(1)}${degLabel}` : '—'} tint={stickers.blueSoft} />
        <StatChip label={t('cycleDetail_bbtReadings')} value={String(data.series.length)} tint={stickers.yellowSoft} />
      </View>

      <View>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_bbtThisCycle')}
        </Text>
        {diffuse ? (
          <BeadedThread data={temps} color={phaseAccent} accent={phaseAccent} labels={labels} showValues />
        ) : (
          <MiniLineChart data={temps} labels={labels} color={stickers.pink} unit={degLabel} />
        )}
      </View>

      <Body size={12} color={diffuse ? dt.colors.ink3 : colors.textMuted}>
        {data.shiftDay ? t('cycleDetail_bbtShiftHint') : t('cycleDetail_bbtNoShiftHint')}
      </Body>
    </View>
  )
}

// ─── Cervical mucus ─────────────────────────────────────────────────────────

const MUCUS_LABELS: Record<MucusType, string> = {
  dry: 'Dry', sticky: 'Sticky', creamy: 'Creamy', watery: 'Watery', eggwhite: 'Egg-white',
}

function MucusDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const { data, isLoading, error } = useCervicalMucusStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.series.length === 0) {
    return <EmptyState copy={t('cycleDetail_mucusEmpty')} />
  }

  const fertileHue = diffuse ? phaseAccent : stickers.pink

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.minMaxRow}>
        <StatChip label={t('cycleDetail_mucusFertileDays')} value={String(data.fertileDays)} tint={stickers.pinkSoft} />
        <StatChip label={t('cycleDetail_mucusPeak')} value={data.peakDay ? t('cycleAnalytics_dayNumber', { currentDay: data.peakDay }) : '—'} tint={stickers.greenSoft} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_mucusThisCycle')}
        </Text>
        {data.series.map((s, i) => {
          const fertile = s.type === 'eggwhite' || s.type === 'watery'
          return (
            <View key={`${s.date}-${i}`} style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.borderLight }]}>
              <View style={mucusStyles.left}>
                <View style={[mucusStyles.dot, { backgroundColor: fertile ? fertileHue : (diffuse ? dt.colors.line2 : stickers.blueSoft) }]} />
                <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{t('cycleAnalytics_dayNumber', { currentDay: s.cycleDay })}</Body>
              </View>
              <Body size={13} color={fertile ? fertileHue : (diffuse ? dt.colors.ink3 : colors.textSecondary)}>
                {MUCUS_LABELS[s.type]}
              </Body>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const mucusStyles = StyleSheet.create({
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
})

// ─── Intercourse (TTC timing) ───────────────────────────────────────────────

function IntercourseDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const phaseAccent = usePhaseAccent()
  const { t } = useTranslation()
  const { data, isLoading, error } = useIntercourseStats()

  if (isLoading) return <Loading />
  if (error) return <ErrorState />
  if (!data || data.thisCycleCount === 0) {
    return <EmptyState copy={t('cycleDetail_intercourseEmpty')} />
  }

  return (
    <View style={{ gap: 18 }}>
      <View style={detailStyles.minMaxRow}>
        <StatChip label={t('cycleDetail_intercourseThisCycle')} value={String(data.thisCycleCount)} tint={stickers.pinkSoft} />
        <StatChip label={t('cycleDetail_intercourseFertile')} value={String(data.inFertileWindow)} tint={stickers.greenSoft} />
      </View>

      <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
        {data.inFertileWindow > 0
          ? t('cycleDetail_intercourseInWindowHint', { n: data.inFertileWindow })
          : t('cycleDetail_intercourseNoWindowHint')}
      </Body>

      <View style={{ gap: 6 }}>
        <Text style={[detailStyles.sectionLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {t('cycleDetail_recent')}
        </Text>
        {data.recent.map((r, i) => (
          <View key={`${r.date}-${i}`} style={[detailStyles.historyRow, { borderColor: diffuse ? dt.colors.line : colors.borderLight }]}>
            <View style={mucusStyles.left}>
              <View style={[mucusStyles.dot, { backgroundColor: r.inFertile ? (diffuse ? phaseAccent : stickers.pink) : (diffuse ? dt.colors.line2 : stickers.blueSoft) }]} />
              <Body size={13} color={diffuse ? dt.colors.ink : colors.text}>{formatShort(r.date)}</Body>
            </View>
            <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary}>
              {r.inFertile ? t('cycleDetail_intercourseFertileTag') : (r.protectedSex ? t('cycleDetail_intercourseProtected') : t('cycleDetail_intercourseUnprotected'))}
            </Body>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Shared UI helpers ────────────────────────────────────────────────────

function Loading() {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={diffuse ? dt.colors.ink3 : colors.primary} />
    </View>
  )
}

export function EmptyState({ copy }: { copy: string }) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={diffuse ? dt.colors.ink3 : colors.textMuted} align="center">{copy}</Body>
    </View>
  )
}

export function ErrorState() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={styles.center}>
      <Body size={14} color={diffuse ? dt.colors.ink3 : colors.textMuted} align="center">
        {t('common_couldntLoad')}
      </Body>
    </View>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 8,
    gap: 16,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
