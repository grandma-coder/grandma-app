/**
 * MenopauseAnalytics — deterministic, client-side read of the menopause logs.
 * NO LLM — every number here is computed from `menopause_logs` via the pure
 * helpers in `lib/menopauseAnalytics.ts` (U5). Mirrors CycleAnalytics'
 * composition (hero · big chart card · stat-tile grid · trend · empty state).
 *
 *   1. Hero — stage word + warm "months since last period" line.
 *   2. Months-since-last-period timeline (peri only) — from the store.
 *   3. Vasomotor headline — hot flashes + night sweats per day (BarChart).
 *   4. Top symptoms — count + avg severity as an ember stat-tile grid.
 *   5. Sleep & mood trend — per-day severity over time (LineChart).
 *   6. Empty state when there are no logs.
 *
 * DESIGN — "recolored Diffuse for E1": both variants read from the shared
 * `useMenoPalette()` (ember mode color, tokens only, no re-derivation). The
 * current cream shapes are recolored under Diffuse via the same palette rather
 * than swapped for bespoke Diffuse primitives. Semantic icons are Character
 * blobs (never Lucide). Charts reuse the shared `SvgCharts` exports.
 */

import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMenoPalette, STICKER_SHADOW, type MenoPalette } from '../menopause/menoPalette'
import { useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { Character, type CharacterName } from '../characters/Characters'
import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { BarChart, LineChart } from '../charts/SvgCharts'
import {
  useMenopauseLogs,
  computeSymptomStats,
  computeVasomotorFrequency,
  type MenopauseLogRow,
} from '../../lib/menopauseAnalytics'
import { menopauseSymptomLabel, type MenopauseSymptomId } from '../../lib/menopauseSymptoms'
import { symptomBlob } from '../menopause/menopauseIcons'
import { menoSticker } from '../menopause/MenopauseLogSheet'
import { SiteSticker, type SiteStickerName } from '../stickers/SiteSticker'
import { useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import { TRIGGER_LABEL_KEY, countMenopauseTriggers } from '../../lib/menopauseTriggers'
import { monthsSinceDate } from '../../lib/menopauseStage'
import { useMenopauseStore } from '../../store/useMenopauseStore'
import { InsightsDisclaimer } from './shared/InsightsDisclaimer'
import { ReportEntryRow } from '../../lib/reports/ReportEntryRow'
import { buildMenopauseNote } from '../../lib/grandmaNotes/menopause'
import { GrandmaNote, GrandmaNotesTitle, NotesDetailsEyebrow } from '../notes/GrandmaNote'
import { SkeletonChartSection, SkeletonHeadline, SkeletonStatRows } from './shared/AnalyticsSkeleton'

const CHART_W = Dimensions.get('window').width - 80 // screen − card margins − card padding
const MONTH_PIPS = 12


/** 'YYYY-MM-DD' → 'M/D' short axis label. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}

/** Per-day mean severity for one log type, ordered by date. */
function severitySeries(rows: MenopauseLogRow[], type: string): { data: number[]; labels: string[] } {
  const byDay = new Map<string, { sum: number; n: number }>()
  for (const r of rows) {
    if (r.type !== type || r.severity == null) continue
    const cur = byDay.get(r.date) ?? { sum: 0, n: 0 }
    cur.sum += r.severity
    cur.n += 1
    byDay.set(r.date, cur)
  }
  const dates = [...byDay.keys()].sort((a, b) => a.localeCompare(b))
  return {
    data: dates.map((date) => {
      const v = byDay.get(date)!
      return v.sum / v.n
    }),
    labels: dates.map(shortDate),
  }
}

export function MenopauseAnalytics() {
  const { t } = useTranslation()
  const palette = useMenoPalette()
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 100)

  const { data, isLoading: logsLoading } = useMenopauseLogs()
  const rows = useMemo<MenopauseLogRow[]>(() => data ?? [], [data])

  const hydrated = useMenopauseStore((s) => s.hydrated)
  const storeStage = useMenopauseStore((s) => s.stage)
  const storeLastPeriodDate = useMenopauseStore((s) => s.lastPeriodDate)
  // Gate BOTH store fields on hydration — reading lastPeriodDate before the
  // AsyncStorage rehydrate lands would flash a wrong "months since" value.
  const stage = hydrated ? storeStage : null
  const lastPeriodDate = hydrated ? storeLastPeriodDate : null

  const vaso = useMemo(() => computeVasomotorFrequency(rows), [rows])
  const symptomStats = useMemo(() => computeSymptomStats(rows), [rows])
  const sleepSeries = useMemo(() => severitySeries(rows, 'sleep'), [rows])
  const moodSeries = useMemo(() => severitySeries(rows, 'low_mood'), [rows])

  const hasData = rows.length > 0
  const vasoTotal = vaso.reduce((a, d) => a + d.count, 0)
  const months = monthsSinceDate(lastPeriodDate, new Date())

  const stageWord = stage ? t(`report_meno_stage_${stage}` as const) : t('meno_an_your_patterns')
  const heroLine =
    months == null
      ? t('meno_an_hero_none')
      : t(months === 1 ? 'meno_an_hero_one' : 'meno_an_hero_other', { n: months })

  // Light: Grandma's weekly note — pure rules over the logs already loaded here.
  const notesLetter = useMemo(() => (palette.diffuse ? null : buildMenopauseNote({
    rows,
    monthsSincePeriod: stage === 'post' ? null : months,
    stickerFor: menoSticker,
  }, t)), [palette.diffuse, rows, stage, months, t])

  // ── Site look (light): card-less sections, sticker rows, thin bars with true values ──
  if (!palette.diffuse) {
    const lastVaso = vaso.slice(-14)
    const vasoAvg = vaso.length ? vasoTotal / vaso.length : 0
    const topTriggers = countMenopauseTriggers(rows).counts.slice(0, 3)
    return (
      <View style={[styles.root, { backgroundColor: palette.bg }]}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
          <AnalyticsHeader hide />
          {/* Grandma's weekly note opens the tab. Months come from the persisted
              store, so the note ghosts until it rehydrates and the logs land. */}
          <GrandmaNotesTitle />
          <GrandmaNote letter={notesLetter} loading={logsLoading || !hydrated} />
          <NotesDetailsEyebrow />
          {stage === 'peri' && <SiteMonths months={months} palette={palette} />}
          {logsLoading ? (
            // First load of the logs: ghost chart + symptom rows, not the empty state.
            <View style={{ marginHorizontal: 24, marginTop: 18, gap: 28 }}>
              <SkeletonChartSection bars={10} height={90} />
              <SkeletonStatRows count={4} />
            </View>
          ) : !hasData ? (
            <SiteEmpty />
          ) : (
            <>
              <SiteSection eyebrow={t('meno_an_vaso_title')}>
                <View style={siteStyles.bigRow}>
                  <SiteSticker name="flame" size={40} />
                  <SiteBigNumber value={String(vasoTotal)} unit={t(vasoTotal === 1 ? 'meno_an_events_one' : 'meno_an_events_other')} />
                </View>
                {vaso.length >= 1 ? (
                  <>
                    <SiteNote>{t('menoAnalytics_vasoAverageNote', { avg: vasoAvg.toFixed(1), count: lastVaso.length })}</SiteNote>
                    <SiteBars values={lastVaso.map((d) => d.count)} labels={lastVaso.map((d) => shortDate(d.date))} tone={palette.accentSoft} capped />
                    {topTriggers.length > 0 && (
                      <SiteNote>{t('meno_trigger_most_noted', { list: topTriggers.map((x) => `${t(TRIGGER_LABEL_KEY[x.id])} (${x.count})`).join(', ') })}</SiteNote>
                    )}
                  </>
                ) : (
                  <SiteNote>{t('meno_an_vaso_empty')}</SiteNote>
                )}
              </SiteSection>

              {symptomStats.length > 0 && (
                <SiteSection eyebrow={t('meno_an_top_title')}>
                  <SiteNote>{t('menoAnalytics_symptomsBarNote')}</SiteNote>
                  {symptomStats.slice(0, 6).map((s, i) => (
                    <SiteSymptomRow
                      key={s.id}
                      first={i === 0}
                      sticker={menoSticker(s.id)}
                      label={menopauseSymptomLabel(s.id as MenopauseSymptomId)}
                      count={s.count}
                      max={symptomStats[0].count}
                      sub={s.avgSeverity > 0 ? t('meno_an_avg', { avg: s.avgSeverity.toFixed(1) }) : t(s.count === 1 ? 'meno_an_time_one' : 'meno_an_time_other')}
                      tone={palette.accentSoft}
                    />
                  ))}
                </SiteSection>
              )}

              <SiteSection eyebrow={t('meno_an_sleepmood_title')}>
                <SiteNote>{t('menoAnalytics_severityNote')}</SiteNote>
                <SiteTrend sticker="zz" title={t('gn_meno_sym_sleep')} series={sleepSeries} tone={palette.accentSoft} />
                <View style={{ height: 14 }} />
                <SiteTrend sticker="face1" title={t('gn_meno_sym_low_mood')} series={moodSeries} tone={palette.accentSoft} />
              </SiteSection>
            </>
          )}
          {/* Report for the doctor — last row of the details. */}
          <ReportEntryRow behavior="menopause" style={{ marginHorizontal: 24 }} />
          <InsightsDisclaimer />
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader hide />

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Text
              style={[
                styles.heroKicker,
                { color: palette.textMuted, fontFamily: palette.fontBodySemiBold },
              ]}
            >
              YOUR MENOPAUSE
            </Text>
            <View pointerEvents="none">
              <Character name="temperature" size={30} color={palette.accent} />
            </View>
          </View>
          <Text
            style={[styles.heroWord, { color: palette.text, fontFamily: palette.fontDisplay }]}
            numberOfLines={1}
          >
            {stageWord}
          </Text>
          <Text
            style={[styles.heroLine, { color: palette.textSecondary, fontFamily: palette.fontBody }]}
          >
            {heroLine}
          </Text>
        </View>

        {/* ── Months-since-last-period timeline (peri only) ────────────── */}
        {stage === 'peri' && <MonthsTimeline months={months} palette={palette} />}

        {!hasData ? (
          <EmptyState palette={palette} />
        ) : (
          <>
            {/* ── Vasomotor headline ─────────────────────────────────── */}
            <MenoCard
              palette={palette}
              blob="temperature"
              label="HOT FLASHES & NIGHT SWEATS"
              value={String(vasoTotal)}
              unit={vasoTotal === 1 ? 'event logged' : 'events logged'}
            >
              {vaso.length >= 1 ? (
                <BarChart
                  data={vaso.map((d) => d.count)}
                  labels={vaso.map((d) => shortDate(d.date))}
                  color={palette.accent}
                  width={CHART_W}
                  height={180}
                />
              ) : (
                <FallbackLine palette={palette} text="Log a hot flash or night sweat to see your rhythm." />
              )}
            </MenoCard>

            {/* ── Top symptoms ───────────────────────────────────────── */}
            {symptomStats.length > 0 && (
              <View style={styles.section}>
                <Text
                  style={[styles.sectionTitle, { color: palette.text, fontFamily: palette.fontDisplay }]}
                >
                  Top symptoms
                </Text>
                <View style={styles.grid}>
                  {symptomStats.slice(0, 6).map((s) => (
                    <StatTile
                      key={s.id}
                      palette={palette}
                      blob={symptomBlob(s.id)}
                      label={menopauseSymptomLabel(s.id as MenopauseSymptomId)}
                      value={String(s.count)}
                      sub={s.avgSeverity > 0 ? `avg ${s.avgSeverity.toFixed(1)}/5` : `${s.count === 1 ? 'time' : 'times'}`}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ── Sleep & mood trend ─────────────────────────────────── */}
            <MenoCard palette={palette} blob="sleep" label="SLEEP & MOOD SEVERITY">
              <TrendRow
                palette={palette}
                title="Sleep trouble"
                series={sleepSeries}
                color={palette.accent}
              />
              <View style={{ height: 18 }} />
              <TrendRow
                palette={palette}
                title="Low mood"
                series={moodSeries}
                color={palette.accent}
              />
            </MenoCard>
          </>
        )}
        <InsightsDisclaimer />
      </ScrollView>
    </View>
  )
}

/* ── Building blocks ────────────────────────────────────────────────────── */

/** Paper/Diffuse card: mono-caps label + optional hero number + a Character
 *  blob decoration + chart slot. Recolored per variant via `palette`. */
function MenoCard({
  palette, blob, label, value, unit, children,
}: {
  palette: MenoPalette
  blob: CharacterName
  label: string
  value?: string
  unit?: string
  children: React.ReactNode
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: palette.radius.lg,
        },
        !palette.diffuse && { ...STICKER_SHADOW, shadowColor: palette.text },
      ]}
    >
      <View style={styles.cardBlob} pointerEvents="none">
        <Character name={blob} size={54} color={palette.accent} />
      </View>
      <Text style={[styles.cardLabel, { color: palette.textMuted, fontFamily: palette.fontBodySemiBold }]}>
        {label}
      </Text>
      {value !== undefined && (
        <View style={styles.valueRow}>
          <Text style={[styles.cardValue, { color: palette.text, fontFamily: palette.fontDisplay }]}>
            {value}
          </Text>
          {unit ? (
            <Text style={[styles.cardUnit, { color: palette.textMuted, fontFamily: palette.fontBody }]}>
              {unit}
            </Text>
          ) : null}
        </View>
      )}
      <View style={styles.chartSlot}>{children}</View>
    </View>
  )
}

/** Half-width ember stat tile: Character blob chip + count + avg-severity sub. */
function StatTile({
  palette, blob, label, value, sub,
}: {
  palette: MenoPalette
  blob: CharacterName
  label: string
  value: string
  sub: string
}) {
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: palette.accentSoft,
          borderColor: palette.border,
          borderRadius: palette.radius.full,
        },
        !palette.diffuse && { ...STICKER_SHADOW, shadowColor: palette.text },
      ]}
    >
      <View
        style={[
          styles.tileChip,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Character name={blob} size={22} color={palette.accent} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.tileValue, { color: palette.text, fontFamily: palette.fontDisplay }]}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text
          style={[styles.tileLabel, { color: palette.text, fontFamily: palette.fontBodyMedium }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[styles.tileSub, { color: palette.textMuted, fontFamily: palette.fontBody }]}
          numberOfLines={1}
        >
          {sub}
        </Text>
      </View>
    </View>
  )
}

/** One labeled line inside the trend card — a LineChart, or a soft fallback. */
function TrendRow({
  palette, title, series, color,
}: {
  palette: MenoPalette
  title: string
  series: { data: number[]; labels: string[] }
  color: string
}) {
  return (
    <View>
      <Text style={[styles.trendTitle, { color: palette.textSecondary, fontFamily: palette.fontBodySemiBold }]}>
        {title}
      </Text>
      {series.data.length >= 2 ? (
        <LineChart
          data={series.data}
          labels={series.labels}
          color={color}
          width={CHART_W}
          height={150}
          unit="/5"
        />
      ) : (
        <FallbackLine palette={palette} text="Not enough logged yet to chart a trend." />
      )}
    </View>
  )
}

/** Months-since-last-period pip timeline (perimenopause). */
function MonthsTimeline({ months, palette }: { months: number | null; palette: MenoPalette }) {
  const filled = months == null ? 0 : Math.min(months, MONTH_PIPS)
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: palette.radius.lg,
          marginTop: 16,
        },
        !palette.diffuse && { ...STICKER_SHADOW, shadowColor: palette.text },
      ]}
    >
      <View style={styles.cardBlob} pointerEvents="none">
        <Character name="calendar" size={54} color={palette.accent} />
      </View>
      <Text style={[styles.cardLabel, { color: palette.textMuted, fontFamily: palette.fontBodySemiBold }]}>
        SINCE YOUR LAST PERIOD
      </Text>
      <View style={styles.valueRow}>
        <Text style={[styles.cardValue, { color: palette.text, fontFamily: palette.fontDisplay }]}>
          {months == null ? '—' : String(months)}
        </Text>
        <Text style={[styles.cardUnit, { color: palette.textMuted, fontFamily: palette.fontBody }]}>
          {months == null ? 'log your last period' : months === 1 ? 'month' : 'months'}
        </Text>
      </View>
      <View style={styles.pipRow}>
        {Array.from({ length: MONTH_PIPS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              {
                backgroundColor: i < filled ? palette.accent : palette.accentSoft,
                borderColor: palette.border,
              },
            ]}
          />
        ))}
      </View>
      {months != null && months >= MONTH_PIPS && (
        <Text style={[styles.pipNote, { color: palette.textMuted, fontFamily: palette.fontBody }]}>
          Many people consider 12 months a natural milestone — it's a conversation to have with your clinician, not a diagnosis here.
        </Text>
      )}
    </View>
  )
}

/** Empty state — mirrors CycleAnalytics' "no data yet" handling. */
function EmptyState({ palette }: { palette: MenoPalette }) {
  return (
    <View
      style={[
        styles.card,
        styles.empty,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderRadius: palette.radius.lg,
        },
        !palette.diffuse && { ...STICKER_SHADOW, shadowColor: palette.text },
      ]}
    >
      <Character name="chart" size={64} color={palette.accent} />
      <Text style={[styles.emptyTitle, { color: palette.text, fontFamily: palette.fontDisplay }]}>
        No patterns yet
      </Text>
      <Text style={[styles.emptyBody, { color: palette.textMuted, fontFamily: palette.fontBody }]}>
        Log a few symptoms and your hot-flash rhythm, top symptoms, and sleep &amp; mood trends will show up here.
      </Text>
    </View>
  )
}

/** Soft placeholder line used when a chart has too few points. */
function FallbackLine({ palette, text }: { palette: MenoPalette; text: string }) {
  return (
    <View style={styles.fallback}>
      <Text style={[styles.fallbackText, { color: palette.textMuted, fontFamily: palette.fontBody }]}>
        {text}
      </Text>
    </View>
  )
}

/* ── Site look (light) building blocks ─────────────────────────────────── */

const SITE_MONO = 'SpaceMono_400Regular'

function SiteEyebrow({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{ fontFamily: SITE_MONO, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.textMuted }}>
      {children}
    </Text>
  )
}

function SiteNote({ children }: { children: string }) {
  const { colors, font } = useTheme()
  return <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 6 }}>{children}</Text>
}

function SiteSection({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={[siteStyles.section, { borderTopColor: colors.border }]}>
      <SiteEyebrow>{eyebrow}</SiteEyebrow>
      {children}
    </View>
  )
}

function SiteBigNumber({ value, unit }: { value: string; unit?: string }) {
  const { colors, font } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexShrink: 1 }}>
      <Text style={{ fontFamily: font.displayBold, fontSize: 44, lineHeight: 48, color: colors.text }}>{value}</Text>
      {unit ? <Text style={{ fontFamily: font.body, fontSize: 14, color: colors.textSecondary, paddingBottom: 6, flexShrink: 1 }}>{unit}</Text> : null}
    </View>
  )
}

function SiteHero({ stageWord, heroLine }: { stageWord: string; heroLine: string }) {
  const { t } = useTranslation()
  const { colors, font } = useTheme()
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <SiteEyebrow>{t('meno_an_eyebrow')}</SiteEyebrow>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.display, fontSize: 30, lineHeight: 36, letterSpacing: 0.3, textTransform: 'uppercase', color: colors.text, marginTop: 4 }}>
          {stageWord}
        </Text>
        <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 21, color: colors.textSecondary, marginTop: 4 }}>{heroLine}</Text>
      </View>
      <SiteSticker name="thermo" size={52} />
    </View>
  )
}

/** Months since last period: one big number + 12 thin ink-outlined segments. */
function SiteMonths({ months, palette }: { months: number | null; palette: MenoPalette }) {
  const { t } = useTranslation()
  const { colors, font } = useTheme()
  const filled = months == null ? 0 : Math.min(months, MONTH_PIPS)
  return (
    <SiteSection eyebrow={t('meno_an_since_title')}>
      <View style={siteStyles.bigRow}>
        <SiteSticker name="cal" size={40} />
        <SiteBigNumber value={months == null ? '—' : String(months)} unit={months == null ? t('meno_an_log_last') : t(months === 1 ? 'meno_an_month_one' : 'meno_an_month_other')} />
      </View>
      <View style={siteStyles.pipRow}>
        {Array.from({ length: MONTH_PIPS }, (_, i) => (
          <View key={i} style={[siteStyles.pip, { borderColor: i < filled ? colors.text : colors.border, backgroundColor: i < filled ? palette.accentSoft : 'transparent' }]} />
        ))}
      </View>
      {months != null && months >= MONTH_PIPS ? (
        <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 10 }}>
          {t('meno_an_milestone')}
        </Text>
      ) : null}
    </SiteSection>
  )
}

/** Thin vertical bars: soft tone + ink outline, the real value printed above each bar.
 *  `capped` clips the bar height of absurd outliers (value label still shows the truth). */
function SiteBars({ values, labels, tone, capped = false, fixedMax }: { values: number[]; labels: string[]; tone: string; capped?: boolean; fixedMax?: number }) {
  const { colors, font } = useTheme()
  const H = 84
  const max = Math.max(...values, 1)
  let scaleMax = fixedMax ?? max
  if (capped && !fixedMax) {
    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)] || 1
    scaleMax = Math.min(max, Math.max(median * 3, 4))
  }
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H + 18, gap: 4 }}>
        {values.map((v, i) => {
          const clipped = v > scaleMax
          const h = Math.max(4, Math.round((Math.min(v, scaleMax) / scaleMax) * H))
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 10, color: colors.text, marginBottom: 2 }}>{fmt(v)}{clipped ? '+' : ''}</Text>
              <View style={{ width: 12, height: h, borderRadius: 6, borderWidth: 1.5, borderColor: colors.text, backgroundColor: tone }} />
            </View>
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {labels.map((l, i) => (
          <Text key={i} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flex: 1, textAlign: 'center', fontFamily: SITE_MONO, fontSize: 8, color: colors.textMuted }}>{l}</Text>
        ))}
      </View>
    </View>
  )
}

function SiteTrend({ sticker, title, series, tone }: { sticker: SiteStickerName; title: string; series: { data: number[]; labels: string[] }; tone: string }) {
  const { t } = useTranslation()
  const { colors, font } = useTheme()
  // Days without a log arrive as 0 — they aren't a severity, so drop them; with fewer than
  // 3 real entries a chart says nothing, so show the quiet note instead.
  const kept = series.data.map((v, i) => ({ v, l: series.labels[i] ?? '' })).filter((p) => p.v > 0).slice(-14)
  const data = kept.length >= 3 ? kept.map((p) => p.v) : []
  const labels = kept.map((p) => p.l)
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SiteSticker name={sticker} size={32} />
        <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: colors.text }}>{title}</Text>
      </View>
      {data.length >= 1 ? (
        <SiteBars values={data} labels={labels} tone={tone} fixedMax={5} />
      ) : (
        <SiteNote>{t('menoAnalytics_notLoggedYet')}</SiteNote>
      )}
    </View>
  )
}

function SiteSymptomRow({ first, sticker, label, count, max, sub, tone }: { first: boolean; sticker: SiteStickerName; label: string; count: number; max: number; sub: string; tone: string }) {
  const { colors, font } = useTheme()
  return (
    <View style={[siteStyles.symRow, !first && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <SiteSticker name={sticker} size={36} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 15, color: colors.text }}>{label}</Text>
          <Text style={{ fontFamily: font.displayBold, fontSize: 18, color: colors.text }}>{count}</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: colors.text, overflow: 'hidden', backgroundColor: colors.surface }}>
          <View style={{ width: `${Math.max(6, Math.round((count / Math.max(max, 1)) * 100))}%`, height: '100%', backgroundColor: tone }} />
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: colors.textSecondary }}>{sub}</Text>
      </View>
    </View>
  )
}

function SiteEmpty() {
  const { t } = useTranslation()
  const { colors, font } = useTheme()
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 36, gap: 8 }}>
      <SiteSticker name="bars" size={64} />
      <Text style={{ fontFamily: font.display, fontSize: 22, letterSpacing: 0.3, textTransform: 'uppercase', color: colors.text, marginTop: 6 }}>{t('meno_an_empty_title')}</Text>
      <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, textAlign: 'center', color: colors.textSecondary }}>
        {t('meno_an_empty_body')}
      </Text>
    </View>
  )
}

const siteStyles = StyleSheet.create({
  section: { marginHorizontal: 24, marginTop: 18, paddingTop: 18, borderTopWidth: 1 },
  bigRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  pipRow: { flexDirection: 'row', gap: 4, marginTop: 14 },
  pip: { flex: 1, height: 8, borderRadius: 4, borderWidth: 1.5 },
  symRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
})

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 0 },

  hero: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroKicker: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroWord: {
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  heroLine: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },

  card: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBlob: {
    position: 'absolute',
    top: 10,
    right: 12,
    opacity: 0.55,
  },
  cardLabel: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
    gap: 6,
  },
  cardValue: {
    fontSize: 38,
    lineHeight: 40,
  },
  cardUnit: {
    fontSize: 14,
    paddingBottom: 6,
  },
  chartSlot: {
    marginTop: 14,
  },

  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  tile: {
    width: '47%',
    flexGrow: 1,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 74,
  },
  tileChip: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tileValue: {
    fontSize: 19,
    lineHeight: 23,
  },
  tileLabel: {
    fontSize: 12,
    lineHeight: 15,
    marginTop: 1,
  },
  tileSub: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },

  trendTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  pipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },
  pip: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pipNote: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 28,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  fallback: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
})
