/**
 * CycleDetailSheets — tap-through detail for each CycleAnalytics stat tile.
 *
 * One exported `CycleDetailSheet` driven by a `type` prop; each type has its
 * own internal body component that calls the matching cycleAnalytics hook.
 */

import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native'
import { useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { LogSheet } from '../calendar/LogSheet'
import { Body, Display } from '../ui/Typography'
import { useCycleHistory, useRegularity, usePMSStats, useFertileWindow, useMoodStats, type MoodId } from '../../lib/cycleAnalytics'
import { Burst, Flower } from '../ui/Stickers'
import { Sparkles as SparklesLine, Flower2 as FlowerLine } from 'lucide-react-native'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import { MiniBarChart } from './shared/MiniCharts'
import { useTranslation } from '../../lib/i18n'

export type CycleDetailType =
  | 'cycleLength'
  | 'regularity'
  | 'pms'
  | 'fertile'
  | 'mood'

interface Props {
  type: CycleDetailType | null
  onClose: () => void
}

export function CycleDetailSheet({ type, onClose }: Props) {
  const { t } = useTranslation()
  const visible = type !== null

  const TITLES: Record<CycleDetailType, string> = {
    cycleLength: t('cycleDetail_titleCycleLength'),
    regularity: t('cycleDetail_titleRegularity'),
    pms: t('cycleDetail_titlePMS'),
    fertile: t('cycleDetail_titleFertile'),
    mood: t('cycleDetail_titleMood'),
  }

  const title = type ? TITLES[type] : ''

  return (
    <LogSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView
        style={{ maxHeight: 540 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {type === 'cycleLength' && <CycleLengthDetail />}
        {type === 'regularity' && <RegularityDetail />}
        {type === 'pms' && <PMSDetail />}
        {type === 'fertile' && <FertileDetail />}
        {type === 'mood' && <MoodDetail />}
      </ScrollView>
    </LogSheet>
  )
}

// ─── Placeholder bodies (filled in by later tasks) ────────────────────────

function CycleLengthDetail() {
  const { colors, stickers, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
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
        <MiniBarChart data={values} labels={labels} color={diffuse ? getDiffuseAccent('pre-pregnancy', dt.isDark) : stickers.pink} />
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

// ─── Shared detail helpers ────────────────────────────────────────────────

function StatChip({ label, value, tint }: { label: string; value: string; tint: string }) {
  const { colors, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  return (
    <View style={[detailStyles.statChip, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.line } : { backgroundColor: tint, borderColor: colors.border }]}>
      <Text style={[detailStyles.statLabel, diffuse ? { color: dt.colors.ink3, fontFamily: diffuseFont.mono } : { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>{label}</Text>
      <Text style={[detailStyles.statValue, { color: diffuse ? dt.colors.ink : colors.text, fontFamily: diffuse ? diffuseFont.display : font.display }]}>{value}</Text>
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
            return (
              <View key={s.name} style={pmsStyles.symptomRow}>
                <View style={pmsStyles.symptomLeft}>
                  {diffuse ? (
                    <DiffuseBloomIcon color={stickers.peach} size={32}>
                      <SparklesLine size={16} color={dt.colors.ink3} strokeWidth={1.6} />
                    </DiffuseBloomIcon>
                  ) : (
                    <View style={[pmsStyles.chip, { backgroundColor: stickers.peachSoft, borderColor: colors.border }]}>
                      <Burst size={20} fill={stickers.peach} points={8} wobble={0.2} />
                    </View>
                  )}
                  <Body size={14} color={diffuse ? dt.colors.ink : colors.text}>{s.name}</Body>
                </View>
                <View style={pmsStyles.symptomRight}>
                  <View style={[pmsStyles.bar, { width: `${pct}%`, backgroundColor: diffuse ? getDiffuseAccent('pre-pregnancy', dt.isDark) : stickers.peachSoft }]} />
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
          <DiffuseBloomIcon color={stickers.pink} size={48}>
            <FlowerLine size={24} color={dt.colors.ink3} strokeWidth={1.6} />
          </DiffuseBloomIcon>
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
        {data.distribution.map((row) => {
          const pct = (row.count / maxCount) * 100
          return (
            <View key={row.mood} style={moodStyles.row}>
              <Body size={13} color={diffuse ? dt.colors.ink : colors.text} style={{ width: 80 }}>
                {MOOD_LABELS[row.mood]}
              </Body>
              <View style={moodStyles.barTrack}>
                <View style={[moodStyles.barFill, { width: `${pct}%`, backgroundColor: diffuse ? getDiffuseAccent('pre-pregnancy', dt.isDark) : stickers.pink }]} />
              </View>
              <Body size={13} color={diffuse ? dt.colors.ink3 : colors.textSecondary} style={{ width: 30, textAlign: 'right' }}>
                {row.count}
              </Body>
            </View>
          )
        })}
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
    backgroundColor: 'transparent',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
})

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
