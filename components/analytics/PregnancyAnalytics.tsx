/**
 * PregnancyAnalytics — 2026 cream-paper redesign with tappable stat cards
 *
 * Layout:
 *   1. Title "Pregnancy, week over week." + PeriodSelector
 *   2. BigChartCard — weight gain hero (tap → Weight detail modal)
 *   3. 2×2 grid — Kicks/Day · Symptoms · Sleep · Wellbeing (all tappable)
 *   4. Mini charts section — Mood trend, Hydration, Top symptoms
 *
 * All data from `pregnancy_logs` table via hooks in `lib/analyticsData.ts`.
 * Detail modals render per-metric breakdowns with the full dataset.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Modal, Pressable, Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle as SvgCircle, Line as SvgLine, Text as SvgText } from 'react-native-svg'
import { X } from 'lucide-react-native'

import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import {
  usePregnancyWeightHistory,
  usePregnancyKickSessions,
  usePregnancySymptomFrequency,
  usePregnancySleepHistory,
  usePregnancyWellbeingScore,
  usePregnancyMoodTrend,
  usePregnancyHydrationHistory,
} from '../../lib/analyticsData'

import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { AnalyticsTitle } from './shared/AnalyticsTitle'
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { BigChartCard } from './shared/BigChartCard'
import { MiniStatTile } from './shared/MiniStatTile'
import { MiniLineChart, MiniBarChart } from './shared/MiniCharts'
import { Display, Body, MonoCaps } from '../ui/Typography'
import {
  Heart, Moon, Leaf, Drop, Bolt, Sparkle, Flower,
} from '../ui/Stickers'
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'

const SCREEN_H = Dimensions.get('window').height

// ─── Metric types ──────────────────────────────────────────────────────────

type MetricKey = 'weight' | 'kicks' | 'symptoms' | 'sleep' | 'wellbeing'

// ─── Main Screen ───────────────────────────────────────────────────────────

export function PregnancyAnalytics() {
  const { colors, stickers } = useTheme()
  const insets = useSafeAreaInsets()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const [period, setPeriod] = useState<Period>('month')
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [openMetric, setOpenMetric] = useState<MetricKey | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  const uid = userId ?? ''

  // Real data hooks
  const { data: weightHistory = [] } = usePregnancyWeightHistory(uid, 20)
  const { data: kickSessions = [] } = usePregnancyKickSessions(uid, 14)
  const { data: symptomFreq = [] } = usePregnancySymptomFrequency(uid)
  const { data: sleepHistory = [] } = usePregnancySleepHistory(uid, 4)
  const { data: wellbeing } = usePregnancyWellbeingScore(uid)
  const { data: moodTrend = [] } = usePregnancyMoodTrend(uid, 4)
  const { data: hydrationHistory = [] } = usePregnancyHydrationHistory(uid, 7)

  // ─── Derived values ──────────────────────────────────────────────────────

  const weights = weightHistory.map((e) => e.weight).filter((w) => w > 0)
  const latestWeight = weights.length ? weights[weights.length - 1] : null
  const firstWeight = weights.length ? weights[0] : null
  const weeklyGain =
    firstWeight && latestWeight && weights.length > 1
      ? (latestWeight - firstWeight) / Math.max(1, weights.length - 1)
      : null

  const weightValue = latestWeight ? latestWeight.toFixed(1) : '—'
  const weightUnit = weeklyGain !== null
    ? `kg · ${weeklyGain >= 0 ? '+' : ''}${weeklyGain.toFixed(1)} / wk`
    : 'kg'

  const avgKicks = kickSessions.length > 0
    ? Math.round(kickSessions.reduce((a, b) => a + b.kicks, 0) / kickSessions.length)
    : 0

  const symptomCount = symptomFreq.reduce((a, b) => a + b.count, 0)
  const topSymptom = symptomFreq[0]

  const sleepAvg = wellbeing
    ? wellbeing.sleep.toFixed(1) + 'h'
    : sleepHistory.length > 0
    ? (sleepHistory.reduce((a, b) => a + b.hours, 0) / sleepHistory.length).toFixed(1) + 'h'
    : '—'

  const hydrationData = hydrationHistory.map((h) => h.glasses)

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader hide />

        <AnalyticsTitle primary="Pregnancy," italic="week over week." />

        <PeriodSelector value={period} onChange={setPeriod} showCustom={false} />

        {/* Hero: Weight gain — tap to expand */}
        <BigChartCard
          label={`WEIGHT GAIN · WEEK ${weekNumber}`}
          value={weightValue}
          unit={weightUnit}
          blobColor={stickers.lilacSoft}
          onPress={() => setOpenMetric('weight')}
        >
          <MiniLineChart data={weights} color={stickers.lilac} />
        </BigChartCard>

        {/* 2×2 tappable stat grid */}
        <View style={styles.grid}>
          <View style={styles.row}>
            <MiniStatTile
              label="KICKS / DAY"
              value={avgKicks ? String(avgKicks) : '—'}
              sticker={<Heart size={28} fill={stickers.pink} />}
              tint={stickers.pinkSoft}
              onPress={() => setOpenMetric('kicks')}
            />
            <MiniStatTile
              label="SYMPTOMS"
              value={symptomCount > 0 ? `${symptomCount} logged` : 'None'}
              sticker={<Bolt size={28} fill={stickers.yellow} />}
              tint={stickers.yellowSoft}
              onPress={() => setOpenMetric('symptoms')}
            />
          </View>
          <View style={styles.row}>
            <MiniStatTile
              label="SLEEP"
              value={sleepAvg}
              sticker={<Moon size={28} fill={stickers.lilac} />}
              tint={stickers.lilacSoft}
              onPress={() => setOpenMetric('sleep')}
            />
            <MiniStatTile
              label="WELLBEING"
              value={wellbeing ? `${wellbeing.overall}%` : '—'}
              sticker={<Leaf size={28} fill={stickers.green} />}
              tint={stickers.greenSoft}
              onPress={() => setOpenMetric('wellbeing')}
            />
          </View>
        </View>

        {/* Mood trend — past 4 weeks */}
        {moodTrend.length > 0 && (
          <Section title="Mood Trend" subtitle={`Past 4 weeks — ${moodTrend.length} logged`}>
            <MoodTrendStrip data={moodTrend} stickers={stickers} colors={colors} />
          </Section>
        )}

        {/* Hydration — past 7 days */}
        {hydrationData.some((v) => v > 0) && (
          <Section title="Hydration" subtitle="Glasses per day · target 8">
            <MiniBarChart
              data={hydrationData.length > 0 ? hydrationData : [0]}
              labels={hydrationHistory.map((h) => shortDay(h.date))}
              color={stickers.blue}
            />
          </Section>
        )}

        {/* Top symptoms list */}
        {symptomFreq.length > 0 && (
          <Section title="Top Symptoms" subtitle={`${symptomFreq.length} unique this period`}>
            <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {symptomFreq.map((s, i) => (
                <View
                  key={s.symptom}
                  style={[
                    styles.listRow,
                    i < symptomFreq.length - 1 && { borderBottomColor: colors.borderLight, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={[styles.rank, { backgroundColor: stickers.yellowSoft, borderColor: colors.border }]}>
                    <Text style={[styles.rankText, { color: colors.text }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.listLabel, { color: colors.text }]}>{s.symptom}</Text>
                  <View style={[styles.countChip, { backgroundColor: stickers.yellowSoft, borderColor: colors.border }]}>
                    <Text style={[styles.countText, { color: colors.text }]}>×{s.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}
      </ScrollView>

      {/* Detail modals */}
      <MetricDetailModal
        metric={openMetric}
        onClose={() => setOpenMetric(null)}
        weightHistory={weightHistory}
        kickSessions={kickSessions}
        symptomFreq={symptomFreq}
        sleepHistory={sleepHistory}
        wellbeing={wellbeing ?? null}
        weekNumber={weekNumber}
      />
    </View>
  )
}

// ─── Section wrapper ───────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const { colors } = useTheme()
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <Display size={20} color={colors.text} style={{ marginBottom: 2 }}>
        {title}
      </Display>
      {subtitle && (
        <Body size={12} color={colors.textMuted} style={{ marginBottom: 10 }}>
          {subtitle}
        </Body>
      )}
      {children}
    </View>
  )
}

// ─── Mood strip ────────────────────────────────────────────────────────────

function MoodTrendStrip({
  data,
  stickers,
  colors,
}: {
  data: { log_date: string; value: string | null }[]
  stickers: ReturnType<typeof useTheme>['stickers']
  colors: ReturnType<typeof useTheme>['colors']
}) {
  // Last 12 entries, most recent right
  const entries = data.slice(-12)
  return (
    <View style={[styles.moodStripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.moodStripRow}>
        {entries.map((e, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            <MoodFace
              size={28}
              variant={moodFaceVariant(e.value ?? undefined)}
              fill={moodFaceFill(e.value ?? undefined)}
            />
            <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: 'DMSans_500Medium' }}>
              {shortDay(e.log_date)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Detail modal ──────────────────────────────────────────────────────────

interface DetailProps {
  metric: MetricKey | null
  onClose: () => void
  weightHistory: { date: string; weight: number }[]
  kickSessions: { date: string; kicks: number }[]
  symptomFreq: { symptom: string; count: number }[]
  sleepHistory: { date: string; hours: number }[]
  wellbeing: {
    sleep: number; mood: number; nutrition: number; exercise: number; hydration: number;
    overall: number
  } | null
  weekNumber: number
}

function MetricDetailModal(props: DetailProps) {
  const { metric, onClose } = props
  const { colors, stickers, font } = useTheme()
  const insets = useSafeAreaInsets()

  if (!metric) return null

  const config = getMetricConfig(metric, stickers)
  const sheetH = SCREEN_H * 0.85

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.modalSheet,
            { height: sheetH, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
          ]}
        >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={[
                  styles.modalChip,
                  { backgroundColor: config.tint, borderColor: colors.border },
                ]}
              >
                {config.sticker}
              </View>
              <View style={{ flex: 1 }}>
                <Display size={22} color={colors.text}>{config.title}</Display>
                <Body size={12} color={colors.textMuted}>{config.subtitle}</Body>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.modalClose, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <X size={16} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
          >
            {metric === 'weight' && <WeightDetail {...props} />}
            {metric === 'kicks' && <KicksDetail {...props} />}
            {metric === 'symptoms' && <SymptomsDetail {...props} />}
            {metric === 'sleep' && <SleepDetail {...props} />}
            {metric === 'wellbeing' && <WellbeingDetail {...props} />}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function getMetricConfig(metric: MetricKey, stickers: ReturnType<typeof useTheme>['stickers']) {
  switch (metric) {
    case 'weight':
      return { title: 'Weight Gain', subtitle: 'Week-over-week change', sticker: <Sparkle size={26} fill={stickers.lilac} />, tint: stickers.lilacSoft }
    case 'kicks':
      return { title: 'Baby Kicks', subtitle: 'Counts per session', sticker: <Heart size={26} fill={stickers.pink} />, tint: stickers.pinkSoft }
    case 'symptoms':
      return { title: 'Symptoms', subtitle: 'Frequency & breakdown', sticker: <Bolt size={26} fill={stickers.yellow} />, tint: stickers.yellowSoft }
    case 'sleep':
      return { title: 'Sleep', subtitle: 'Hours per night, past 4 weeks', sticker: <Moon size={26} fill={stickers.lilac} />, tint: stickers.lilacSoft }
    case 'wellbeing':
      return { title: 'Wellbeing', subtitle: 'Five-pillar score', sticker: <Leaf size={26} fill={stickers.green} />, tint: stickers.greenSoft }
  }
}

// ─── Metric detail bodies ──────────────────────────────────────────────────

function WeightDetail({ weightHistory, weekNumber }: DetailProps) {
  const { colors, stickers } = useTheme()
  const weights = weightHistory.map((e) => e.weight).filter((w) => w > 0)
  const firstW = weights[0]
  const lastW = weights[weights.length - 1]
  const totalGain = firstW && lastW ? lastW - firstW : null
  const avgWeekly = totalGain !== null && weights.length > 1 ? totalGain / (weights.length - 1) : null

  return (
    <>
      <StatRow
        items={[
          { label: 'Latest', value: lastW ? `${lastW.toFixed(1)} kg` : '—' },
          { label: 'Total gain', value: totalGain !== null ? `${totalGain >= 0 ? '+' : ''}${totalGain.toFixed(1)} kg` : '—' },
          { label: 'Per week', value: avgWeekly !== null ? `${avgWeekly >= 0 ? '+' : ''}${avgWeekly.toFixed(2)} kg` : '—' },
        ]}
      />

      <CardWrap title="Weight over time">
        {weights.length >= 2 ? (
          <MiniLineChart data={weights} color={stickers.lilac} height={180} />
        ) : (
          <Body size={13} color={colors.textMuted}>Log weight for at least 2 weeks to see trend.</Body>
        )}
      </CardWrap>

      <CardWrap title={`Healthy range · Week ${weekNumber}`}>
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          Typical gain in the second trimester is 0.3–0.5 kg per week. Trimester 3 often slows to 0.2–0.4 kg per week. Your numbers are a reference — your provider is the final say.
        </Body>
      </CardWrap>
    </>
  )
}

function KicksDetail({ kickSessions }: DetailProps) {
  const { colors, stickers } = useTheme()
  const avg = kickSessions.length > 0
    ? Math.round(kickSessions.reduce((a, b) => a + b.kicks, 0) / kickSessions.length)
    : 0
  const max = kickSessions.length > 0 ? Math.max(...kickSessions.map((k) => k.kicks)) : 0
  const kickValues = kickSessions.map((k) => k.kicks)
  const kickLabels = kickSessions.map((k) => shortDay(k.date))

  return (
    <>
      <StatRow
        items={[
          { label: 'Avg / session', value: avg ? String(avg) : '—' },
          { label: 'Peak', value: max ? String(max) : '—' },
          { label: 'Sessions', value: String(kickSessions.length) },
        ]}
      />

      <CardWrap title="Recent kick counts">
        {kickSessions.length > 0 ? (
          <MiniBarChart data={kickValues} labels={kickLabels} color={stickers.pink} />
        ) : (
          <Body size={13} color={colors.textMuted}>No kick sessions yet — log one from the home screen.</Body>
        )}
      </CardWrap>

      <CardWrap title="When to call your provider">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          From week 28, aim for 10 kicks in under 2 hours. Less than that warrants a call to your OB. Babies are most active after meals and in the evening.
        </Body>
      </CardWrap>
    </>
  )
}

function SymptomsDetail({ symptomFreq }: DetailProps) {
  const { colors, stickers } = useTheme()
  const total = symptomFreq.reduce((a, b) => a + b.count, 0)

  return (
    <>
      <StatRow
        items={[
          { label: 'Total logged', value: String(total) },
          { label: 'Unique', value: String(symptomFreq.length) },
          { label: 'Most common', value: symptomFreq[0]?.symptom ?? '—' },
        ]}
      />

      <CardWrap title="Breakdown">
        {symptomFreq.length > 0 ? (
          <View style={{ gap: 8 }}>
            {symptomFreq.map((s) => {
              const pct = Math.round((s.count / Math.max(total, 1)) * 100)
              return (
                <View key={s.symptom}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>{s.symptom}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{s.count} · {pct}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: stickers.yellowSoft, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: stickers.yellow, borderRadius: 3 }} />
                  </View>
                </View>
              )
            })}
          </View>
        ) : (
          <Body size={13} color={colors.textMuted}>No symptoms logged yet.</Body>
        )}
      </CardWrap>
    </>
  )
}

function SleepDetail({ sleepHistory }: DetailProps) {
  const { colors, stickers } = useTheme()
  const hours = sleepHistory.map((s) => s.hours)
  const labels = sleepHistory.map((s) => shortDay(s.date))
  const avg = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0
  const best = hours.length > 0 ? Math.max(...hours) : 0
  const worst = hours.length > 0 ? Math.min(...hours) : 0

  return (
    <>
      <StatRow
        items={[
          { label: 'Average', value: avg ? `${avg.toFixed(1)}h` : '—' },
          { label: 'Best', value: best ? `${best.toFixed(1)}h` : '—' },
          { label: 'Worst', value: worst ? `${worst.toFixed(1)}h` : '—' },
        ]}
      />

      <CardWrap title="Sleep hours per night">
        {hours.length > 0 ? (
          <MiniBarChart data={hours} labels={labels} color={stickers.lilac} />
        ) : (
          <Body size={13} color={colors.textMuted}>Log sleep from the pregnancy calendar to track.</Body>
        )}
      </CardWrap>

      <CardWrap title="Gentle target">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          Aim for 7–9 hours a night. In the third trimester, waking to pee and back aches often disrupt sleep — short afternoon naps count toward your total.
        </Body>
      </CardWrap>
    </>
  )
}

function WellbeingDetail({ wellbeing }: DetailProps) {
  const { colors, stickers } = useTheme()
  if (!wellbeing) {
    return <Body size={13} color={colors.textMuted}>Not enough data to compute wellbeing yet. Keep logging.</Body>
  }

  const pillars: { key: keyof typeof wellbeing; label: string; color: string }[] = [
    { key: 'sleep', label: 'Sleep', color: stickers.lilac },
    { key: 'mood', label: 'Mood', color: stickers.pink },
    { key: 'nutrition', label: 'Nutrition', color: stickers.green },
    { key: 'exercise', label: 'Exercise', color: stickers.coral },
    { key: 'hydration', label: 'Hydration', color: stickers.blue },
  ]

  return (
    <>
      <View style={[styles.wellbeingHero, { backgroundColor: stickers.greenSoft, borderColor: colors.border }]}>
        <Display size={48} color={colors.text}>{wellbeing.overall}%</Display>
        <Body size={12} color={colors.textMuted}>Overall — last 7 days</Body>
      </View>

      <CardWrap title="Five pillars">
        <View style={{ gap: 12 }}>
          {pillars.map((p) => {
            const v = wellbeing[p.key] as number
            const pct = Math.round((v / 10) * 100)
            return (
              <View key={p.key}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>{p.label}</Text>
                  <Text style={{ color: p.color, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>{v.toFixed(1)} / 10</Text>
                </View>
                <View style={{ height: 7, borderRadius: 4, backgroundColor: p.color + '22', overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: '100%', backgroundColor: p.color, borderRadius: 4 }} />
                </View>
              </View>
            )
          })}
        </View>
      </CardWrap>

      <CardWrap title="How it's computed">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          Each pillar scores 0–10 from your last 7 days of logs. Sleep maps hours against a 9h target. Mood counts positive entries. Nutrition, exercise and hydration each weight logs-per-day against healthy pregnancy targets. Overall = average × 10.
        </Body>
      </CardWrap>
    </>
  )
}

// ─── Reusable sub-components ───────────────────────────────────────────────

function StatRow({ items }: { items: { label: string; value: string }[] }) {
  const { colors, font } = useTheme()
  return (
    <View style={styles.statRow}>
      {items.map((it, i) => (
        <View
          key={it.label}
          style={[
            styles.statCell,
            { backgroundColor: colors.surface, borderColor: colors.border },
            i < items.length - 1 && { marginRight: 8 },
          ]}
        >
          <Text style={{ fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.textMuted, fontFamily: font.bodySemiBold }}>
            {it.label}
          </Text>
          <Text style={{ fontSize: 22, color: colors.text, fontFamily: font.display, marginTop: 2 }}>
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

function CardWrap({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, font } = useTheme()
  return (
    <View style={[styles.cardWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textMuted, fontFamily: font.bodySemiBold, marginBottom: 10 }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function shortDay(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)
  } catch {
    return ''
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 0 },
  grid: {
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  listCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  rank: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontFamily: 'Fraunces_600SemiBold',
  },
  listLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'capitalize',
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
  },
  moodStripCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
  moodStripRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalChip: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardWrap: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },

  wellbeingHero: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
  },
})
