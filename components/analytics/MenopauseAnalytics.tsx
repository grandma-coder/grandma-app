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
import { monthsSinceDate, type MenopauseStage } from '../../lib/menopauseStage'
import { useMenopauseStore } from '../../store/useMenopauseStore'

const CHART_W = Dimensions.get('window').width - 80 // screen − card margins − card padding
const MONTH_PIPS = 12

const STAGE_WORD: Record<MenopauseStage, string> = {
  peri: 'Perimenopause',
  meno: 'Menopause',
  post: 'Postmenopause',
}

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
  const palette = useMenoPalette()
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 100)

  const { data } = useMenopauseLogs()
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

  const stageWord = stage ? STAGE_WORD[stage] : 'Your patterns'
  const heroLine =
    months == null
      ? 'Tracking your symptoms over time'
      : `${months} ${months === 1 ? 'month' : 'months'} since your last period`

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
