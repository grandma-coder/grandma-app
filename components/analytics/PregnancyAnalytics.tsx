/**
 * PregnancyAnalytics — 2026 sticker-collage redesign (parity with KidsAnalytics)
 *
 * Pillars:
 *   wellbeing · weight · kicks · sleep · mood · symptoms · hydration ·
 *   nutrition · exercise · contractions (3rd tri) · birth readiness (3rd tri)
 *
 * Each pillar opens a rich PillarDetailModal with stat tiles, charts, and
 * trimester-aware tips. ScoreInfoModal explains how Wellbeing is computed.
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { ChevronRight, Info, X } from 'lucide-react-native'

import { useTheme } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { getCurrentWeekFromDueDate } from '../../lib/pregnancyData'
import {
  usePregnancyWeightHistory,
  usePregnancyKickSessions,
  usePregnancySymptomFrequency,
  usePregnancySleepHistory,
  usePregnancyWellbeingScore,
  usePregnancyMoodTrend,
  usePregnancyHydrationHistory,
  usePregnancyNutritionMatrix,
  usePregnancyExerciseHistory,
  usePregnancyContractions,
  usePregnancyKickTimeOfDay,
  usePregnancyBirthReadiness,
  usePregnancyWeightByWeek,
  type PregnancyWellbeingScore,
  type PregnancyExerciseEntry,
  type PregnancyContractionSession,
  type KickHourBucket,
  type BirthReadiness,
  type PregnancyWeightByWeek,
} from '../../lib/analyticsData'

import { AnalyticsHeader } from './shared/AnalyticsHeader'
import { AnalyticsTitle } from './shared/AnalyticsTitle'
import { PeriodSelector, type Period } from './shared/PeriodSelector'
import { BigChartCard } from './shared/BigChartCard'
import { MiniStatTile } from './shared/MiniStatTile'
import { MiniLineChart, MiniBarChart } from './shared/MiniCharts'
import { Display, Body } from '../ui/Typography'
import {
  Heart,
  Moon,
  Leaf,
  Drop,
  Bolt,
  Sparkle,
  Crown,
  Flower,
  ClockFace,
  Cross,
  Burst,
  Smiley,
  Blob,
} from '../ui/Stickers'
import { MoodFace } from '../stickers/RewardStickers'
import { moodFaceVariant, moodFaceFill } from '../../lib/moodFace'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

// ─── Pillar config ─────────────────────────────────────────────────────────

type PillarKey =
  | 'wellbeing'
  | 'weight'
  | 'kicks'
  | 'sleep'
  | 'mood'
  | 'symptoms'
  | 'hydration'
  | 'nutrition'
  | 'exercise'
  | 'contractions'
  | 'birth'

interface PillarMeta {
  label: string
  blurb: string
}

const PILLAR_META: Record<PillarKey, PillarMeta> = {
  wellbeing:    { label: 'Wellbeing',     blurb: 'Five-pillar score' },
  weight:       { label: 'Weight Gain',   blurb: 'Week-over-week change' },
  kicks:        { label: 'Baby Kicks',    blurb: 'Counts per session' },
  sleep:        { label: 'Sleep',         blurb: 'Hours per night' },
  mood:         { label: 'Mood',          blurb: 'How you feel each day' },
  symptoms:     { label: 'Symptoms',      blurb: 'Frequency & breakdown' },
  hydration:    { label: 'Hydration',     blurb: 'Glasses per day' },
  nutrition:    { label: 'Nutrition',     blurb: 'Daily nutrient checklist' },
  exercise:     { label: 'Movement',      blurb: 'Active minutes per day' },
  contractions: { label: 'Contractions',  blurb: 'Frequency & intervals' },
  birth:        { label: 'Birth Ready',   blurb: 'Plan, bag & paperwork' },
}

interface Palette { tint: string; chip: string; bar: string }

function pillarPalette(
  key: PillarKey,
  st: ReturnType<typeof useTheme>['stickers'],
): Palette {
  switch (key) {
    case 'wellbeing':    return { tint: st.greenSoft,  chip: st.green,  bar: st.green }
    case 'weight':       return { tint: st.lilacSoft,  chip: st.lilac,  bar: st.lilac }
    case 'kicks':        return { tint: st.pinkSoft,   chip: st.pink,   bar: st.pink }
    case 'sleep':        return { tint: st.lilacSoft,  chip: st.lilac,  bar: st.lilac }
    case 'mood':         return { tint: st.peachSoft,  chip: st.peach,  bar: st.peach }
    case 'symptoms':     return { tint: st.yellowSoft, chip: st.yellow, bar: st.yellow }
    case 'hydration':    return { tint: st.blueSoft,   chip: st.blue,   bar: st.blue }
    case 'nutrition':    return { tint: st.greenSoft,  chip: st.green,  bar: st.green }
    case 'exercise':     return { tint: st.peachSoft,  chip: st.coral,  bar: st.coral }
    case 'contractions': return { tint: st.peachSoft,  chip: st.coral,  bar: st.coral }
    case 'birth':        return { tint: st.blueSoft,   chip: st.blue,   bar: st.blue }
  }
}

function renderPillarSticker(key: PillarKey, color: string, size = 24) {
  switch (key) {
    case 'wellbeing':    return <Crown size={size} fill={color} />
    case 'weight':       return <Flower size={size} petal={color} />
    case 'kicks':        return <Heart size={size} fill={color} />
    case 'sleep':        return <Moon size={size} fill={color} />
    case 'mood':         return <Smiley size={size} fill={color} />
    case 'symptoms':     return <Bolt size={size} fill={color} />
    case 'hydration':    return <Drop size={size} fill={color} />
    case 'nutrition':    return <Leaf size={size} fill={color} />
    case 'exercise':     return <Burst size={size} fill={color} points={8} />
    case 'contractions': return <ClockFace size={size} fill={color} />
    case 'birth':        return <Cross size={size} fill={color} />
  }
}

// ─── Trimester / week helpers ──────────────────────────────────────────────

function trimesterFor(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1
  if (week <= 27) return 2
  return 3
}

function trimesterLabel(t: 1 | 2 | 3): string {
  return t === 1 ? 'First trimester' : t === 2 ? 'Second trimester' : 'Third trimester'
}

function daysToDue(due: string | null): number | null {
  if (!due) return null
  const d = new Date(due + 'T00:00:00')
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000)
}

function shortDay(isoDate: string): string {
  try {
    const d = new Date(isoDate + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)
  } catch {
    return ''
  }
}

// ─── Main screen ───────────────────────────────────────────────────────────

export function PregnancyAnalytics() {
  const { colors, stickers, font } = useTheme()
  const insets = useSafeAreaInsets()

  const storedWeek = usePregnancyStore((s) => s.weekNumber)
  const dueDate = usePregnancyStore((s) => s.dueDate)
  const weekNumber = dueDate ? getCurrentWeekFromDueDate(dueDate) : (storedWeek ?? 1)
  const trimester = trimesterFor(weekNumber)
  const dDays = daysToDue(dueDate)

  const [period, setPeriod] = useState<Period>('month')
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [openPillar, setOpenPillar] = useState<PillarKey | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  const uid = userId ?? ''

  // Hooks
  const { data: weightHistory = [] } = usePregnancyWeightHistory(uid, 30)
  const { data: weightByWeek = [] } = usePregnancyWeightByWeek(uid, dueDate)
  const { data: kickSessions = [] } = usePregnancyKickSessions(uid, 14)
  const { data: kickHours = [] } = usePregnancyKickTimeOfDay(uid, 30)
  const { data: symptomFreq = [] } = usePregnancySymptomFrequency(uid)
  const { data: sleepHistory = [] } = usePregnancySleepHistory(uid, 4)
  const { data: wellbeing } = usePregnancyWellbeingScore(uid)
  const { data: moodTrend = [] } = usePregnancyMoodTrend(uid, 4)
  const { data: hydrationHistory = [] } = usePregnancyHydrationHistory(uid, 7)
  const { data: nutritionMatrix } = usePregnancyNutritionMatrix(uid, 7)
  const { data: exerciseHistory = [] } = usePregnancyExerciseHistory(uid, 14)
  const { data: contractions = [] } = usePregnancyContractions(uid, 14)
  const { data: birthReady } = usePregnancyBirthReadiness(uid)

  // Quick takeaways
  const tk = useMemo(() => buildTakeaways({
    weightHistory, kickSessions, sleepHistory, moodTrend, symptomFreq,
    hydrationHistory, exerciseHistory, contractions, wellbeing, nutritionMatrix,
    birthReady, trimester,
  }), [weightHistory, kickSessions, sleepHistory, moodTrend, symptomFreq,
       hydrationHistory, exerciseHistory, contractions, wellbeing, nutritionMatrix,
       birthReady, trimester])

  // Derived display values for stat tiles
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
  const sleepHrsArr = sleepHistory.map((s) => s.hours)
  const sleepAvg = sleepHrsArr.length > 0
    ? (sleepHrsArr.reduce((a, b) => a + b, 0) / sleepHrsArr.length).toFixed(1) + 'h'
    : '—'
  const hydrationData = hydrationHistory.map((h) => h.glasses)

  // Extras shown only when relevant
  const showContractions = trimester === 3 || contractions.length > 0

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsHeader hide />

        <View style={styles.titleRow}>
          <AnalyticsTitle primary="Pregnancy," italic="week over week." />
          <Pressable
            onPress={() => setShowInfo(true)}
            hitSlop={10}
            style={[styles.infoBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityLabel="How analytics work"
          >
            <Info size={16} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Hero week card */}
        <Animated.View entering={FadeInDown.duration(280)}>
          <HeroWeekCard
            weekNumber={weekNumber}
            trimester={trimester}
            daysToDue={dDays}
          />
        </Animated.View>

        <PeriodSelector value={period} onChange={setPeriod} showCustom={false} />

        {/* Hero: Weight gain chart — tap to expand */}
        <BigChartCard
          label={`WEIGHT GAIN · WEEK ${weekNumber}`}
          value={weightValue}
          unit={weightUnit}
          blobColor={stickers.lilacSoft}
          onPress={() => setOpenPillar('weight')}
        >
          <MiniLineChart data={weights} color={stickers.lilac} />
        </BigChartCard>

        {/* 2×2 tappable stat grid */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <MiniStatTile
              label="KICKS / DAY"
              value={avgKicks ? String(avgKicks) : '—'}
              sticker={<Heart size={28} fill={stickers.pink} />}
              tint={stickers.pinkSoft}
              onPress={() => setOpenPillar('kicks')}
            />
            <MiniStatTile
              label="SYMPTOMS"
              value={symptomCount > 0 ? `${symptomCount} logged` : 'None'}
              sticker={<Bolt size={28} fill={stickers.yellow} />}
              tint={stickers.yellowSoft}
              onPress={() => setOpenPillar('symptoms')}
            />
          </View>
          <View style={styles.gridRow}>
            <MiniStatTile
              label="SLEEP"
              value={sleepAvg}
              sticker={<Moon size={28} fill={stickers.lilac} />}
              tint={stickers.lilacSoft}
              onPress={() => setOpenPillar('sleep')}
            />
            <MiniStatTile
              label="WELLBEING"
              value={wellbeing ? `${wellbeing.overall}%` : '—'}
              sticker={<Crown size={28} fill={stickers.green} />}
              tint={stickers.greenSoft}
              onPress={() => setOpenPillar('wellbeing')}
            />
          </View>
        </View>

        {/* Mood trend strip */}
        {moodTrend.length > 0 && (
          <Section
            title="Mood Trend"
            subtitle={`Past 4 weeks — ${moodTrend.length} logged`}
            onPress={() => setOpenPillar('mood')}
          >
            <MoodTrendStrip data={moodTrend} />
          </Section>
        )}

        {/* Hydration bars */}
        {hydrationData.some((v) => v > 0) && (
          <Section
            title="Hydration"
            subtitle="Glasses per day · target 8"
            onPress={() => setOpenPillar('hydration')}
          >
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.10)' }]}>
              <MiniBarChart
                data={hydrationData}
                labels={hydrationHistory.map((h) => shortDay(h.date))}
                color={stickers.blue}
              />
            </View>
          </Section>
        )}

        {/* Nutrition matrix mini */}
        {nutritionMatrix && (nutritionMatrix.iron.some(Boolean) || nutritionMatrix.folic.some(Boolean) || nutritionMatrix.protein.some(Boolean) || nutritionMatrix.calcium.some(Boolean)) && (
          <Section
            title="Nutrition"
            subtitle="4 nutrients × 7 days"
            onPress={() => setOpenPillar('nutrition')}
          >
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.10)' }]}>
              <NutritionMini matrix={nutritionMatrix} />
            </View>
          </Section>
        )}

        {/* Movement / exercise mini */}
        {exerciseHistory.some((e) => e.minutes > 0) && (
          <Section
            title="Movement"
            subtitle="Minutes per session · target 150 / week"
            onPress={() => setOpenPillar('exercise')}
          >
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.10)' }]}>
              <MiniBarChart
                data={exerciseHistory.map((e) => e.minutes)}
                labels={exerciseHistory.map((e) => shortDay(e.date))}
                color={stickers.coral}
              />
            </View>
          </Section>
        )}

        {/* Top symptoms list */}
        {symptomFreq.length > 0 && (
          <Section
            title="Top Symptoms"
            subtitle={`${symptomFreq.length} unique this period`}
            onPress={() => setOpenPillar('symptoms')}
          >
            <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.10)' }]}>
              {symptomFreq.map((s, i) => (
                <View
                  key={s.symptom}
                  style={[
                    styles.listRow,
                    i < symptomFreq.length - 1 && {
                      borderBottomColor: colors.borderLight,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.rank,
                      { backgroundColor: stickers.yellowSoft, borderColor: 'rgba(20,19,19,0.12)' },
                    ]}
                  >
                    <Text style={[styles.rankText, { color: colors.text }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.listLabel, { color: colors.text }]}>{s.symptom}</Text>
                  <View
                    style={[
                      styles.countChip,
                      { backgroundColor: stickers.yellowSoft, borderColor: 'rgba(20,19,19,0.12)' },
                    ]}
                  >
                    <Text style={[styles.countText, { color: colors.text }]}>×{s.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Labor & birth — grouped hero banners */}
        <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 20, color: colors.text, fontFamily: font.display, letterSpacing: -0.3 }}>
                Labor & birth
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: font.bodyMedium, marginTop: 2 }}>
                Track contractions and how ready you are
              </Text>
            </View>
          </View>

          {showContractions && (
            <HeroBanner
              pillarKey="contractions"
              label="CONTRACTIONS"
              title={tk.contractions.headline}
              subtitle={tk.contractions.takeaway ?? ''}
              badgeText={contractions.length > 0 ? `${contractions.length}` : '—'}
              badgeCaption="LOGS"
              onPress={() => setOpenPillar('contractions')}
            />
          )}

          <HeroBanner
            pillarKey="birth"
            label="BIRTH READINESS"
            title={tk.birth.headline}
            subtitle={tk.birth.takeaway ?? ''}
            badgeText={birthReady ? `${Math.round(birthReady.pct / 20)}` : '—'}
            badgeCaption="OF 5"
            onPress={() => setOpenPillar('birth')}
          />
        </View>
      </ScrollView>

      {/* Detail sheet */}
      <PillarDetailModal
        pillarKey={openPillar}
        onClose={() => setOpenPillar(null)}
        weekNumber={weekNumber}
        trimester={trimester}
        weightHistory={weightHistory}
        weightByWeek={weightByWeek}
        kickSessions={kickSessions}
        kickHours={kickHours}
        symptomFreq={symptomFreq}
        sleepHistory={sleepHistory}
        wellbeing={wellbeing ?? null}
        moodTrend={moodTrend}
        hydrationHistory={hydrationHistory}
        nutritionMatrix={nutritionMatrix ?? null}
        exerciseHistory={exerciseHistory}
        contractions={contractions}
        birthReady={birthReady ?? null}
      />

      {/* Score info sheet */}
      <ScoreInfoModal
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        wellbeing={wellbeing ?? null}
        weekNumber={weekNumber}
        trimester={trimester}
      />
    </View>
  )
}

// ─── Section wrapper (tappable) ────────────────────────────────────────────

function Section({
  title, subtitle, onPress, children,
}: {
  title: string
  subtitle?: string
  onPress?: () => void
  children: React.ReactNode
}) {
  const { colors, font } = useTheme()
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [{ opacity: pressed && onPress ? 0.7 : 1 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, color: colors.text, fontFamily: font.display, letterSpacing: -0.3 }}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ fontSize: 12, color: colors.textMuted, fontFamily: font.bodyMedium, marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {onPress ? <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} /> : null}
        </View>
      </Pressable>
      {children}
    </View>
  )
}

// ─── Mood strip ────────────────────────────────────────────────────────────

function MoodTrendStrip({ data }: { data: { log_date: string; value: string | null }[] }) {
  const { colors, font } = useTheme()
  const entries = data.slice(-12)
  return (
    <View style={[styles.moodStripCard, { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.10)' }]}>
      <View style={styles.moodStripRow}>
        {entries.map((e, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 4 }}>
            <MoodFace
              size={28}
              variant={moodFaceVariant(e.value ?? undefined)}
              fill={moodFaceFill(e.value ?? undefined)}
            />
            <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: font.bodyMedium }}>
              {shortDay(e.log_date)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Nutrition mini grid (4 nutrients × 7 days) ────────────────────────────

function NutritionMini({
  matrix,
}: {
  matrix: { iron: boolean[]; folic: boolean[]; protein: boolean[]; calcium: boolean[]; dates: string[] }
}) {
  const { colors, stickers, font } = useTheme()
  const rows = [
    { label: 'Iron',    arr: matrix.iron,    color: stickers.coral },
    { label: 'Folic',   arr: matrix.folic,   color: stickers.green },
    { label: 'Protein', arr: matrix.protein, color: stickers.peach },
    { label: 'Calcium', arr: matrix.calcium, color: stickers.blue },
  ]
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontFamily: font.bodyMedium }}>{r.label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              {r.arr.filter(Boolean).length}/{r.arr.length}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {r.arr.map((hit, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 14,
                  borderRadius: 4,
                  backgroundColor: hit ? r.color : stickers.greenSoft,
                  opacity: hit ? 1 : 0.35,
                }}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Hero week card ────────────────────────────────────────────────────────

function HeroWeekCard({
  weekNumber, trimester, daysToDue,
}: { weekNumber: number; trimester: 1 | 2 | 3; daysToDue: number | null }) {
  const { colors, stickers, font } = useTheme()
  const palette = pillarPalette('weight', stickers)
  const dDaysText = daysToDue === null
    ? '—'
    : daysToDue > 0
    ? `${daysToDue} day${daysToDue === 1 ? '' : 's'} to go`
    : daysToDue === 0
    ? 'Due today'
    : `${Math.abs(daysToDue)} day${daysToDue === -1 ? '' : 's'} past due`

  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: palette.tint, borderColor: 'rgba(20,19,19,0.12)' },
      ]}
    >
      <View style={[styles.heroChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {renderPillarSticker('weight', palette.chip, 26)}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.heroLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {trimesterLabel(trimester).toUpperCase()}
        </Text>
        <Text style={[styles.heroValue, { color: colors.text, fontFamily: font.display }]}>
          Week {weekNumber}
        </Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
          {dDaysText}
        </Text>
      </View>
      <View style={styles.heroBadge}>
        <View style={[styles.heroBadgeInner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heroBadgeNum, { color: colors.text, fontFamily: font.display }]}>
            {trimester}
          </Text>
          <Text style={[styles.heroBadgeT, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            TRI
          </Text>
        </View>
      </View>
    </View>
  )
}

// ─── Hero banner (reused for Contractions + Birth Ready) ───────────────────

function HeroBanner({
  pillarKey, label, title, subtitle, badgeText, badgeCaption, onPress,
}: {
  pillarKey: PillarKey
  label: string
  title: string
  subtitle: string
  badgeText: string
  badgeCaption: string
  onPress: () => void
}) {
  const { colors, stickers, font } = useTheme()
  const palette = pillarPalette(pillarKey, stickers)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.hero,
        {
          marginHorizontal: 0,
          marginTop: 0,
          marginBottom: 0,
          backgroundColor: palette.tint,
          borderColor: 'rgba(20,19,19,0.12)',
        },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.heroChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {renderPillarSticker(pillarKey, palette.chip, 26)}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.heroLabel, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
          {label}
        </Text>
        <Text style={[styles.heroValue, { color: colors.text, fontFamily: font.display }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.heroSub, { color: colors.textSecondary, fontFamily: font.bodyMedium }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.heroBadge}>
        <View style={[styles.heroBadgeInner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heroBadgeNum, { color: colors.text, fontFamily: font.display }]}>
            {badgeText}
          </Text>
          <Text style={[styles.heroBadgeT, { color: colors.textMuted, fontFamily: font.bodySemiBold }]}>
            {badgeCaption}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

// ─── Pillar row ────────────────────────────────────────────────────────────

function PillarRow({
  pillarKey, takeaway, onPress,
}: { pillarKey: PillarKey; takeaway: Takeaway; onPress: () => void }) {
  const { colors, stickers, font } = useTheme()
  const meta = PILLAR_META[pillarKey]
  const palette = pillarPalette(pillarKey, stickers)
  const pct = takeaway.pct ?? 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pillarPaper,
        {
          backgroundColor: colors.surface,
          borderColor: 'rgba(20,19,19,0.12)',
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.pillarHead}>
        <View style={[styles.pillarChip, { backgroundColor: palette.tint, borderColor: 'rgba(20,19,19,0.12)' }]}>
          {renderPillarSticker(pillarKey, palette.chip, 24)}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.pillarTitleRow}>
            <Text style={[styles.pillarName, { color: colors.text, fontFamily: font.display }]}>
              {meta.label}
            </Text>
            {takeaway.trend ? (
              <View style={[styles.trendChip, { backgroundColor: palette.tint }]}>
                <Text style={[styles.trendText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                  {takeaway.trend}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.pillarBlurb, { color: colors.textMuted, fontFamily: font.bodyMedium }]}>
            {meta.blurb}
          </Text>
        </View>
        <View style={styles.pillarValueWrap}>
          <Text style={[styles.pillarValue, { color: colors.text, fontFamily: font.display }]}>
            {takeaway.headline}
          </Text>
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.pillarBarBg, { backgroundColor: palette.tint }]}>
        <View
          style={[
            styles.pillarBarFill,
            { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: palette.bar },
          ]}
        />
      </View>

      {takeaway.takeaway ? (
        <Text style={[styles.pillarTakeaway, { color: colors.textSecondary, fontFamily: font.bodyMedium }]}>
          {takeaway.takeaway}
        </Text>
      ) : null}
    </Pressable>
  )
}

// ─── Detail modal ──────────────────────────────────────────────────────────

interface DetailProps {
  pillarKey: PillarKey | null
  onClose: () => void
  weekNumber: number
  trimester: 1 | 2 | 3
  weightHistory: { date: string; weight: number }[]
  weightByWeek: PregnancyWeightByWeek[]
  kickSessions: { date: string; kicks: number }[]
  kickHours: KickHourBucket[]
  symptomFreq: { symptom: string; count: number }[]
  sleepHistory: { date: string; hours: number }[]
  wellbeing: PregnancyWellbeingScore | null
  moodTrend: { log_date: string; value: string | null }[]
  hydrationHistory: { date: string; glasses: number }[]
  nutritionMatrix: {
    dates: string[]; iron: boolean[]; folic: boolean[]; protein: boolean[]; calcium: boolean[]
  } | null
  exerciseHistory: PregnancyExerciseEntry[]
  contractions: PregnancyContractionSession[]
  birthReady: BirthReadiness | null
}

function PillarDetailModal(props: DetailProps) {
  const { pillarKey, onClose } = props
  const { colors, stickers, font } = useTheme()
  const insets = useSafeAreaInsets()

  if (!pillarKey) return null
  const meta = PILLAR_META[pillarKey]
  const palette = pillarPalette(pillarKey, stickers)
  const sheetH = SCREEN_H * 0.87

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            { height: sheetH, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
          ]}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Header — tinted band with offset blob */}
          <View
            style={[
              styles.modalHeaderBand,
              { backgroundColor: palette.tint, borderBottomColor: 'rgba(20,19,19,0.10)' },
            ]}
          >
            <View pointerEvents="none" style={styles.modalHeaderBlob}>
              <Blob size={120} fill={palette.chip} variant={1} stroke={colors.text} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 999,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: 'rgba(20,19,19,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {renderPillarSticker(pillarKey, palette.chip, 26)}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: font.display,
                    fontSize: 26,
                    letterSpacing: -0.5,
                    lineHeight: 30,
                  }}
                >
                  {meta.label}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 13,
                    fontFamily: font.bodyMedium,
                    marginTop: 2,
                  }}
                >
                  {meta.blurb}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.modalClose,
                {
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: 'rgba(20,19,19,0.12)',
                },
              ]}
            >
              <X size={14} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: insets.bottom + 24,
              gap: 16,
            }}
          >
            <Animated.View entering={FadeInDown.duration(220)}>
              <DetailDispatcher {...props} pillarKey={pillarKey} accentColor={palette.chip} accentTint={palette.tint} />
            </Animated.View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function DetailDispatcher(props: DetailProps & { pillarKey: PillarKey; accentColor?: string; accentTint?: string }) {
  switch (props.pillarKey) {
    case 'wellbeing':    return <WellbeingDetail {...props} />
    case 'weight':       return <WeightDetail {...props} />
    case 'kicks':        return <KicksDetail {...props} />
    case 'sleep':        return <SleepDetail {...props} />
    case 'mood':         return <MoodDetail {...props} />
    case 'symptoms':     return <SymptomsDetail {...props} />
    case 'hydration':    return <HydrationDetail {...props} />
    case 'nutrition':    return <NutritionDetail {...props} />
    case 'exercise':     return <ExerciseDetail {...props} />
    case 'contractions': return <ContractionsDetail {...props} />
    case 'birth':        return <BirthDetail {...props} />
  }
}

// ─── Detail bodies ─────────────────────────────────────────────────────────

function WellbeingDetail({ wellbeing, weekNumber, trimester, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()

  if (!wellbeing) {
    return (
      <PaperCard>
        <Body size={13} color={colors.textMuted}>
          Not enough recent logs to compute wellbeing yet. Keep logging sleep, mood, water,
          nutrition, and movement and a score will appear here.
        </Body>
      </PaperCard>
    )
  }

  const pillars: { key: keyof PregnancyWellbeingScore; label: string; color: string; tint: string }[] = [
    { key: 'sleep',     label: 'Sleep',     color: stickers.lilac,  tint: stickers.lilacSoft },
    { key: 'mood',      label: 'Mood',      color: stickers.pink,   tint: stickers.pinkSoft },
    { key: 'nutrition', label: 'Nutrition', color: stickers.green,  tint: stickers.greenSoft },
    { key: 'exercise',  label: 'Movement',  color: stickers.coral,  tint: stickers.peachSoft },
    { key: 'hydration', label: 'Hydration', color: stickers.blue,   tint: stickers.blueSoft },
  ]

  const weakest = [...pillars].sort((a, b) => (wellbeing[a.key] as number) - (wellbeing[b.key] as number))[0]
  const strongest = [...pillars].sort((a, b) => (wellbeing[b.key] as number) - (wellbeing[a.key] as number))[0]

  return (
    <>
      <View style={[styles.scoreHero, { backgroundColor: stickers.greenSoft, borderColor: 'rgba(20,19,19,0.12)' }]}>
        <Text style={{ color: colors.text, fontSize: 56, fontFamily: font.display, letterSpacing: -1 }}>
          {wellbeing.overall}%
        </Text>
        <Body size={13} color={colors.textSecondary}>Overall · last 7 days</Body>
      </View>

      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Strongest', value: strongest.label },
          { label: 'Watch', value: weakest.label },
          { label: 'Trimester', value: String(trimester) },
        ]}
      />

      <PaperCard title="Five pillars">
        <View style={{ gap: 12 }}>
          {pillars.map((p) => {
            const v = wellbeing[p.key] as number
            const pct = Math.round((v / 10) * 100)
            return (
              <View key={p.key}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontFamily: font.bodyMedium }}>{p.label}</Text>
                  <Text style={{ color: p.color, fontSize: 13, fontFamily: font.bodySemiBold }}>
                    {v.toFixed(1)} / 10
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: p.tint, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: '100%', backgroundColor: p.color, borderRadius: 999 }} />
                </View>
              </View>
            )
          })}
        </View>
      </PaperCard>

      <PaperCard title="How it's computed">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          Each pillar scores 0–10 from your last 7 days of logs.{' '}
          <Body size={13} color={colors.text}>Sleep</Body> maps hours against a 9h target.{' '}
          <Body size={13} color={colors.text}>Mood</Body> counts positive entries.{' '}
          <Body size={13} color={colors.text}>Nutrition, movement and hydration</Body> each weight
          logs-per-day against healthy pregnancy targets. Overall = average × 10.
        </Body>
      </PaperCard>

      <TrimesterTip trimester={trimester} kind="wellbeing" weekNumber={weekNumber} />
    </>
  )
}

function WeightDetail({ weightHistory, weightByWeek, weekNumber, trimester, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const weights = weightHistory.map((e) => e.weight).filter((w) => w > 0)
  const firstW = weights[0]
  const lastW = weights[weights.length - 1]
  const totalGain = firstW && lastW ? lastW - firstW : null
  const avgWeekly = totalGain !== null && weights.length > 1 ? totalGain / (weights.length - 1) : null

  const targetPerWeek = trimester === 1 ? 0.2 : trimester === 2 ? 0.4 : 0.3
  const onTrack = avgWeekly !== null && Math.abs(avgWeekly - targetPerWeek) <= 0.25

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Latest', value: lastW ? `${lastW.toFixed(1)} kg` : '—' },
          { label: 'Total gain', value: totalGain !== null ? `${totalGain >= 0 ? '+' : ''}${totalGain.toFixed(1)} kg` : '—' },
          { label: 'Per week', value: avgWeekly !== null ? `${avgWeekly >= 0 ? '+' : ''}${avgWeekly.toFixed(2)}` : '—' },
        ]}
      />

      <PaperCard title="Weight over time">
        {weights.length >= 2 ? (
          <MiniLineChart data={weights} color={stickers.lilac} height={180} />
        ) : (
          <Body size={13} color={colors.textMuted}>
            Log weight at least twice to see a trend line.
          </Body>
        )}
      </PaperCard>

      {weightByWeek.length >= 2 ? (
        <PaperCard title="By pregnancy week">
          <View style={{ gap: 8 }}>
            {weightByWeek.slice(-8).map((w) => (
              <View key={w.week + '-' + w.weight} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: font.bodyMedium }}>
                  Week {w.week}
                </Text>
                <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodySemiBold }}>
                  {w.weight.toFixed(1)} kg
                </Text>
              </View>
            ))}
          </View>
        </PaperCard>
      ) : null}

      <PaperCard title={`Healthy range · Week ${weekNumber}`}>
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          {trimester === 1
            ? 'In the first trimester, gaining 0.5–2 kg total is typical — many people lose a little from nausea.'
            : trimester === 2
            ? 'Trimester 2 averages 0.3–0.5 kg per week. Steady gain reflects the placenta and baby growing.'
            : 'Trimester 3 often slows to 0.2–0.4 kg per week. Sudden jumps can signal swelling — flag it to your OB.'}
        </Body>
        {onTrack ? (
          <Pill color={stickers.green} tint={stickers.greenSoft} label="On track" />
        ) : avgWeekly !== null ? (
          <Pill
            color={stickers.yellow}
            tint={stickers.yellowSoft}
            label={avgWeekly > targetPerWeek ? 'Above target' : 'Below target'}
          />
        ) : null}
      </PaperCard>
    </>
  )
}

function KicksDetail({ kickSessions, kickHours, weekNumber, trimester, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const avg = kickSessions.length > 0
    ? Math.round(kickSessions.reduce((a, b) => a + b.kicks, 0) / kickSessions.length)
    : 0
  const max = kickSessions.length > 0 ? Math.max(...kickSessions.map((k) => k.kicks)) : 0
  const kickValues = kickSessions.map((k) => k.kicks)
  const kickLabels = kickSessions.map((k) => shortDay(k.date))
  const meets10in2h = kickSessions.filter((k) => k.kicks >= 10).length
  const compliancePct = kickSessions.length > 0
    ? Math.round((meets10in2h / kickSessions.length) * 100)
    : 0

  // Time-of-day buckets: 4 quadrants
  const morning = kickHours.slice(6, 12).reduce((a, b) => a + b.count, 0)
  const afternoon = kickHours.slice(12, 18).reduce((a, b) => a + b.count, 0)
  const evening = kickHours.slice(18, 24).reduce((a, b) => a + b.count, 0)
  const night = (kickHours.slice(0, 6).reduce((a, b) => a + b.count, 0))
  const todBuckets = [
    { label: 'Morning', value: morning },
    { label: 'Afternoon', value: afternoon },
    { label: 'Evening', value: evening },
    { label: 'Night', value: night },
  ]
  const totalTod = todBuckets.reduce((a, b) => a + b.value, 0)
  const peak = totalTod > 0 ? todBuckets.sort((a, b) => b.value - a.value)[0] : null

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Avg / session', value: avg ? String(avg) : '—' },
          { label: 'Peak', value: max ? String(max) : '—' },
          { label: 'Sessions', value: String(kickSessions.length) },
        ]}
      />

      <PaperCard title="Recent kick counts">
        {kickSessions.length > 0 ? (
          <MiniBarChart data={kickValues} labels={kickLabels} color={stickers.pink} />
        ) : (
          <Body size={13} color={colors.textMuted}>
            No kick sessions yet — log one from the home screen during quiet time.
          </Body>
        )}
      </PaperCard>

      {weekNumber >= 24 ? (
        <PaperCard title="10-in-2-hours rule">
          <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
            From week 28, aim for 10 distinct movements in under 2 hours. Less than that warrants a
            call to your OB.
          </Body>
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodyMedium }}>
                Sessions meeting target
              </Text>
              <Text style={{ color: stickers.pink, fontSize: 13, fontFamily: font.bodySemiBold }}>
                {meets10in2h} / {kickSessions.length} ({compliancePct}%)
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: stickers.pinkSoft, overflow: 'hidden' }}>
              <View style={{ width: `${compliancePct}%`, height: '100%', backgroundColor: stickers.pink, borderRadius: 999 }} />
            </View>
          </View>
        </PaperCard>
      ) : null}

      {totalTod > 0 ? (
        <PaperCard title="When baby's most active">
          <View style={{ gap: 8 }}>
            {todBuckets.map((b) => {
              const pct = totalTod ? Math.round((b.value / totalTod) * 100) : 0
              return (
                <View key={b.label}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodyMedium }}>{b.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{b.value} · {pct}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: stickers.pinkSoft, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: stickers.pink, borderRadius: 3 }} />
                  </View>
                </View>
              )
            })}
          </View>
          {peak ? (
            <Pill color={stickers.pink} tint={stickers.pinkSoft} label={`Most active: ${peak.label}`} />
          ) : null}
        </PaperCard>
      ) : null}

      <TrimesterTip trimester={trimester} kind="kicks" weekNumber={weekNumber} />
    </>
  )
}

function SleepDetail({ sleepHistory, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const hours = sleepHistory.map((s) => s.hours)
  const labels = sleepHistory.map((s) => shortDay(s.date))
  const avg = hours.length > 0 ? hours.reduce((a, b) => a + b, 0) / hours.length : 0
  const best = hours.length > 0 ? Math.max(...hours) : 0
  const worst = hours.length > 0 ? Math.min(...hours) : 0
  const debt = hours.length > 0 ? Math.max(0, hours.length * 8 - hours.reduce((a, b) => a + b, 0)) : 0

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Average', value: avg ? `${avg.toFixed(1)}h` : '—' },
          { label: 'Best', value: best ? `${best.toFixed(1)}h` : '—' },
          { label: 'Worst', value: worst ? `${worst.toFixed(1)}h` : '—' },
        ]}
      />

      <PaperCard title="Sleep hours per night">
        {hours.length > 0 ? (
          <MiniBarChart data={hours} labels={labels} color={stickers.lilac} />
        ) : (
          <Body size={13} color={colors.textMuted}>
            Log sleep from the pregnancy calendar to track hours each night.
          </Body>
        )}
      </PaperCard>

      {hours.length > 0 ? (
        <PaperCard title="Sleep debt">
          <Text style={{ color: colors.text, fontSize: 24, fontFamily: font.display }}>
            {debt.toFixed(1)}h
          </Text>
          <Body size={13} color={colors.textSecondary}>
            vs an 8-hour target across the last {hours.length} nights you logged.
          </Body>
        </PaperCard>
      ) : null}

      <TrimesterTip trimester={trimester} kind="sleep" weekNumber={weekNumber} />
    </>
  )
}

function MoodDetail({ moodTrend, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const positive = ['happy', 'radiant', 'energetic', 'okay']
  const totals: Record<string, number> = {}
  for (const m of moodTrend) {
    const v = m.value ?? 'unknown'
    totals[v] = (totals[v] ?? 0) + 1
  }
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const positiveCount = moodTrend.filter((m) => positive.includes(m.value ?? '')).length
  const positivePct = moodTrend.length > 0 ? Math.round((positiveCount / moodTrend.length) * 100) : 0

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Logged', value: String(moodTrend.length) },
          { label: 'Positive', value: `${positivePct}%` },
          { label: 'Most common', value: sorted[0]?.[0] ?? '—' },
        ]}
      />

      <PaperCard title="Recent moods">
        {moodTrend.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {moodTrend.slice(-14).map((m, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4, width: 36 }}>
                <MoodFace
                  size={28}
                  variant={moodFaceVariant(m.value ?? undefined)}
                  fill={moodFaceFill(m.value ?? undefined)}
                />
                <Text style={{ fontSize: 9, color: colors.textMuted, fontFamily: font.bodyMedium }}>
                  {shortDay(m.log_date)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Body size={13} color={colors.textMuted}>No moods logged yet.</Body>
        )}
      </PaperCard>

      {sorted.length > 0 ? (
        <PaperCard title="Distribution">
          <View style={{ gap: 8 }}>
            {sorted.map(([mood, n]) => {
              const pct = Math.round((n / moodTrend.length) * 100)
              const color = positive.includes(mood) ? stickers.green : stickers.peach
              const tint = positive.includes(mood) ? stickers.greenSoft : stickers.peachSoft
              return (
                <View key={mood}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodyMedium, textTransform: 'capitalize' }}>
                      {mood}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{n} · {pct}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: tint, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
                  </View>
                </View>
              )
            })}
          </View>
        </PaperCard>
      ) : null}

      <TrimesterTip trimester={trimester} kind="mood" weekNumber={weekNumber} />
    </>
  )
}

function SymptomsDetail({ symptomFreq, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const total = symptomFreq.reduce((a, b) => a + b.count, 0)

  // Severe symptoms warranting OB call
  const severe = ['severe headache', 'vision changes', 'bleeding', 'severe swelling', 'fever', 'no kicks']
  const severeHits = symptomFreq.filter((s) => severe.includes(s.symptom.toLowerCase()))

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Total logged', value: String(total) },
          { label: 'Unique', value: String(symptomFreq.length) },
          { label: 'Most common', value: symptomFreq[0]?.symptom ?? '—' },
        ]}
      />

      <PaperCard title="Breakdown">
        {symptomFreq.length > 0 ? (
          <View style={{ gap: 8 }}>
            {symptomFreq.map((s) => {
              const pct = Math.round((s.count / Math.max(total, 1)) * 100)
              return (
                <View key={s.symptom}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodyMedium, textTransform: 'capitalize' }}>
                      {s.symptom}
                    </Text>
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
      </PaperCard>

      {severeHits.length > 0 ? (
        <PaperCard title="Worth a call">
          <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
            You've logged{' '}
            <Body size={13} color={colors.text}>{severeHits.map((s) => s.symptom).join(', ')}</Body>
            . These can be normal but warrant a call to your provider — especially if persistent or severe.
          </Body>
        </PaperCard>
      ) : null}

      <TrimesterTip trimester={trimester} kind="symptoms" weekNumber={weekNumber} />
    </>
  )
}

function HydrationDetail({ hydrationHistory, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const data = hydrationHistory.map((h) => h.glasses)
  const labels = hydrationHistory.map((h) => shortDay(h.date))
  const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0
  const daysHittingTarget = data.filter((g) => g >= 8).length

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Avg / day', value: avg ? avg.toFixed(1) : '—' },
          { label: 'Target', value: '8 glasses' },
          { label: 'On target', value: `${daysHittingTarget}/${data.length}` },
        ]}
      />

      <PaperCard title="Glasses per day">
        {data.length > 0 ? (
          <MiniBarChart data={data} labels={labels} color={stickers.blue} />
        ) : (
          <Body size={13} color={colors.textMuted}>
            Log water from your pregnancy calendar to see your hydration each day.
          </Body>
        )}
      </PaperCard>

      <PaperCard title="Why hydration matters">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          {trimester === 1
            ? 'Water helps with morning sickness — sip slowly and keep a bottle by the bed.'
            : trimester === 2
            ? 'Blood volume rises ~50%. 2.3L (about 8 glasses) supports that and keeps swelling down.'
            : '3rd trimester: dehydration can trigger early contractions. Aim for pale-yellow urine and watch for dizziness.'}
        </Body>
      </PaperCard>
    </>
  )
}

function NutritionDetail({ nutritionMatrix, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  if (!nutritionMatrix) {
    return (
      <PaperCard>
        <Body size={13} color={colors.textMuted}>
          Loading your nutrition data…
        </Body>
      </PaperCard>
    )
  }
  const { iron, folic, protein, calcium, dates } = nutritionMatrix
  const nutrients = [
    { key: 'iron',    label: 'Iron',    arr: iron,    color: stickers.coral },
    { key: 'folic',   label: 'Folic',   arr: folic,   color: stickers.green },
    { key: 'protein', label: 'Protein', arr: protein, color: stickers.peach },
    { key: 'calcium', label: 'Calcium', arr: calcium, color: stickers.blue },
  ]

  return (
    <>
      <StatTilesRow
        items={nutrients.slice(0, 3).map((n) => {
          const hits = n.arr.filter(Boolean).length
          return { label: n.label, value: `${hits}/${n.arr.length}` }
        })}
      />

      <PaperCard title="Daily nutrient checklist">
        <View style={{ gap: 12 }}>
          {nutrients.map((n) => (
            <View key={n.key}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodyMedium }}>{n.label}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {n.arr.filter(Boolean).length}/{n.arr.length} days
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {n.arr.map((hit, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: hit ? n.color : stickers.greenSoft,
                      opacity: hit ? 1 : 0.4,
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                {dates.map((d, i) => (
                  <Text
                    key={i}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      color: colors.textMuted,
                      fontSize: 9,
                      fontFamily: font.bodyMedium,
                    }}
                  >
                    {shortDay(d)}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      </PaperCard>

      <PaperCard title="Trimester focus">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          {trimester === 1
            ? 'Folic acid is the headline — 400–600 mcg/day reduces neural tube risk. If nausea blocks meals, small bland snacks count.'
            : trimester === 2
            ? 'Iron rises in importance as blood volume grows. Pair iron-rich foods with vitamin C for absorption.'
            : 'Protein and calcium peak now — baby is laying down bone and muscle. Aim for ~75g protein and ~1000mg calcium daily.'}
        </Body>
      </PaperCard>
    </>
  )
}

function ExerciseDetail({ exerciseHistory, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const minutes = exerciseHistory.map((e) => e.minutes).filter((n) => n > 0)
  const labels = exerciseHistory.map((e) => shortDay(e.date))
  const total = minutes.reduce((a, b) => a + b, 0)
  const avg = minutes.length > 0 ? Math.round(total / minutes.length) : 0
  const activeDays = minutes.length

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Active days', value: String(activeDays) },
          { label: 'Total min', value: String(total) },
          { label: 'Avg / session', value: avg ? `${avg}m` : '—' },
        ]}
      />

      <PaperCard title="Minutes per session">
        {minutes.length > 0 ? (
          <MiniBarChart data={minutes} labels={labels} color={stickers.coral} />
        ) : (
          <Body size={13} color={colors.textMuted}>
            Log a walk or prenatal yoga session to start your movement trend.
          </Body>
        )}
      </PaperCard>

      <PaperCard title="Safe movement target">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          ACOG recommends 150 minutes of moderate movement per week (≈30 min × 5 days).{' '}
          {trimester === 1
            ? 'Energy can dip — short walks count.'
            : trimester === 2
            ? 'You may feel best now — swimming, prenatal yoga and walking are gold.'
            : 'Listen to your body. Pelvic-floor work and breath-led movement help prepare for labor.'}
        </Body>
      </PaperCard>
    </>
  )
}

function ContractionsDetail({ contractions, trimester, weekNumber, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  const totalToday = contractions.length > 0 ? contractions[contractions.length - 1].count : 0
  const interval = contractions.length > 0 ? contractions[contractions.length - 1].avgIntervalMin : null
  const sessions = contractions.length

  return (
    <>
      <StatTilesRow
        tint={accentTint}
        color={accentColor}
        items={[
          { label: 'Sessions', value: String(sessions) },
          { label: 'Last count', value: totalToday ? String(totalToday) : '—' },
          { label: 'Avg interval', value: interval ? `${Math.round(interval)} min` : '—' },
        ]}
      />

      <PaperCard title="Recent contractions">
        {sessions > 0 ? (
          <View style={{ gap: 8 }}>
            {contractions.slice(-7).reverse().map((c) => (
              <View key={c.date} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: font.bodyMedium }}>
                  {c.date}
                </Text>
                <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodySemiBold }}>
                  {c.count}× · {c.avgIntervalMin ? `${Math.round(c.avgIntervalMin)} min apart` : 'no interval'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Body size={13} color={colors.textMuted}>
            No contractions logged yet — use the timer in your pregnancy calendar when you feel one.
          </Body>
        )}
      </PaperCard>

      <PaperCard title="When to call your provider">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          The classic <Body size={13} color={colors.text}>5-1-1 rule</Body>: contractions 5 minutes apart,
          lasting 1 minute, for 1 hour. Earlier than 37 weeks, call sooner — even mild but regular
          contractions may signal preterm labor.
        </Body>
      </PaperCard>
    </>
  )
}

function BirthDetail({ birthReady, weekNumber, trimester, accentColor, accentTint }: DetailProps & { accentColor?: string; accentTint?: string }) {
  const { colors, stickers, font } = useTheme()
  if (!birthReady) {
    return (
      <PaperCard>
        <Body size={13} color={colors.textMuted}>Loading birth-readiness data…</Body>
      </PaperCard>
    )
  }
  const buckets = [
    {
      label: 'Birth plan items',
      value: birthReady.birthPlanCount,
      target: 5,
      color: stickers.lilac,
      tint: stickers.lilacSoft,
    },
    {
      label: 'Hospital bag prep',
      value: birthReady.nestingCount + birthReady.hospitalDocs,
      target: 8,
      color: stickers.coral,
      tint: stickers.peachSoft,
    },
    {
      label: 'Insurance docs',
      value: birthReady.insuranceDocs,
      target: 2,
      color: stickers.yellow,
      tint: stickers.yellowSoft,
    },
    {
      label: 'Exam records',
      value: birthReady.examDocs,
      target: 4,
      color: stickers.green,
      tint: stickers.greenSoft,
    },
    {
      label: 'Emergency card',
      value: birthReady.emergencyCardComplete ? 1 : 0,
      target: 1,
      color: stickers.pink,
      tint: stickers.pinkSoft,
    },
  ]

  return (
    <>
      <View style={[styles.scoreHero, { backgroundColor: stickers.blueSoft, borderColor: 'rgba(20,19,19,0.12)' }]}>
        <Text style={{ color: colors.text, fontSize: 56, fontFamily: font.display, letterSpacing: -1 }}>
          {birthReady.pct}%
        </Text>
        <Body size={13} color={colors.textSecondary}>Birth readiness · 5 buckets</Body>
      </View>

      <PaperCard title="What's ready">
        <View style={{ gap: 12 }}>
          {buckets.map((b) => {
            const pct = Math.min(100, Math.round((b.value / b.target) * 100))
            return (
              <View key={b.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: font.bodyMedium }}>
                    {b.label}
                  </Text>
                  <Text style={{ color: b.color, fontSize: 13, fontFamily: font.bodySemiBold }}>
                    {b.value} / {b.target}
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: b.tint, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: b.color,
                      borderRadius: 999,
                    }}
                  />
                </View>
              </View>
            )
          })}
        </View>
      </PaperCard>

      <PaperCard title="Suggested next step">
        <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
          {birthReady.pct >= 80
            ? 'You\'re in great shape. Confirm car-seat installation and put a printed birth plan in the bag.'
            : birthReady.pct >= 50
            ? trimester === 3
              ? 'Pack the hospital bag now if you haven\'t — many people deliver 1–2 weeks before the due date.'
              : 'Build the birth plan now while there\'s time. Add hospital docs to the vault as you collect them.'
            : 'Start with the emergency card — blood type, allergies, and a primary contact. It takes 2 minutes.'}
        </Body>
      </PaperCard>
    </>
  )
}

// ─── Score info modal ──────────────────────────────────────────────────────

function ScoreInfoModal({
  visible, onClose, wellbeing, weekNumber, trimester,
}: {
  visible: boolean
  onClose: () => void
  wellbeing: PregnancyWellbeingScore | null
  weekNumber: number
  trimester: 1 | 2 | 3
}) {
  const { colors, stickers, font } = useTheme()
  const insets = useSafeAreaInsets()

  const PILLAR_EXPLAIN: { key: keyof PregnancyWellbeingScore; label: string; body: string; color: string }[] = [
    { key: 'sleep',     label: 'Sleep',     color: stickers.lilac, body: 'Hours / 9 × 10. Naps count toward total in 3rd trimester.' },
    { key: 'mood',      label: 'Mood',      color: stickers.pink,  body: 'Share of positive entries (happy / radiant / energetic / okay).' },
    { key: 'nutrition', label: 'Nutrition', color: stickers.green, body: 'Days with at least one nutrition log / 7. Variety adds bonus.' },
    { key: 'exercise',  label: 'Movement',  color: stickers.coral, body: 'Days with movement / 7 (×2 because the target is moderate).' },
    { key: 'hydration', label: 'Hydration', color: stickers.blue,  body: 'Avg glasses / 8 × 10, capped at 10.' },
  ]

  const SCORE_BANDS = [
    { range: '85 – 100', label: 'Thriving',         color: stickers.green },
    { range: '70 – 84',  label: 'Good',             color: stickers.blue },
    { range: '50 – 69',  label: 'Fair',             color: stickers.yellow },
    { range: '30 – 49',  label: 'Needs care',       color: stickers.peach },
    { range: '0 – 29',   label: 'Reach for support', color: stickers.coral },
  ]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            { height: SCREEN_H * 0.85, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
          ]}
        >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View style={[styles.modalHeader, { paddingBottom: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 44, height: 44, borderRadius: 999,
                  backgroundColor: stickers.greenSoft,
                  borderWidth: 1, borderColor: 'rgba(20,19,19,0.12)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Sparkle size={22} fill={stickers.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontFamily: font.display, fontSize: 24, letterSpacing: -0.4 }}>
                  Wellbeing score guide
                </Text>
                <Text style={{ color: stickers.green, fontSize: 13, fontFamily: font.bodyMedium, marginTop: 2 }}>
                  Week {weekNumber} · {trimesterLabel(trimester).toLowerCase()}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[
                styles.modalClose,
                { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <X size={14} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: insets.bottom + 24,
              gap: 16,
            }}
          >
            {wellbeing && (
              <View style={[styles.scoreHero, { backgroundColor: stickers.greenSoft, borderColor: 'rgba(20,19,19,0.12)' }]}>
                <Text style={{ color: colors.text, fontSize: 48, fontFamily: font.display }}>
                  {wellbeing.overall}%
                </Text>
                <Body size={13} color={colors.textSecondary}>Your score · last 7 days</Body>
              </View>
            )}

            <PaperCard title="Score scale">
              <View style={{ gap: 10 }}>
                {SCORE_BANDS.map((b) => (
                  <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: b.color }} />
                    <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontFamily: font.bodyMedium }}>
                      {b.label}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>{b.range}</Text>
                  </View>
                ))}
              </View>
            </PaperCard>

            <PaperCard title="How each pillar is scored">
              <View style={{ gap: 14 }}>
                {PILLAR_EXPLAIN.map((p) => (
                  <View key={p.key}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: p.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
                      </View>
                      <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontFamily: font.bodySemiBold }}>
                        {p.label}
                      </Text>
                      {wellbeing && (
                        <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: p.color + '22' }}>
                          <Text style={{ color: p.color, fontSize: 12, fontFamily: font.bodySemiBold }}>
                            {(wellbeing[p.key] as number).toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Body size={13} color={colors.textSecondary}>{p.body}</Body>
                  </View>
                ))}
              </View>
            </PaperCard>

            <View style={[styles.scoreBanner, { backgroundColor: stickers.lilacSoft, borderColor: 'rgba(20,19,19,0.12)' }]}>
              <Text style={{ color: colors.text, fontSize: 15, fontFamily: font.bodySemiBold, marginBottom: 4 }}>
                {trimesterLabel(trimester)}
              </Text>
              <Body size={13} color={colors.textSecondary}>
                {trimester === 1
                  ? 'Many people log fewer entries early — it\'s ok if your score is rough now. Folic acid + sleep are the priorities.'
                  : trimester === 2
                  ? 'The honeymoon trimester — energy up, nausea down. Movement and balanced meals matter most here.'
                  : 'Pack the bag, plan support, and protect sleep. Steady wins now beat heroic stretches.'}
              </Body>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Reusable bits ─────────────────────────────────────────────────────────

function PaperCard({
  title, children, accent, withBlob,
}: {
  title?: string
  children: React.ReactNode
  accent?: string
  withBlob?: boolean
}) {
  const { colors, font, stickers } = useTheme()
  const blobColor = accent ?? stickers.lilac
  return (
    <View
      style={[
        styles.paperCard,
        { backgroundColor: colors.surface, borderColor: 'rgba(20,19,19,0.10)' },
      ]}
    >
      {withBlob ? (
        <View pointerEvents="none" style={styles.paperCardBlob}>
          <Blob size={72} fill={blobColor} variant={2} stroke={colors.text} />
        </View>
      ) : null}
      {title ? (
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: accent ?? colors.textMuted,
            fontFamily: font.bodySemiBold,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

function StatTilesRow({
  items, tint, color,
}: {
  items: { label: string; value: string }[]
  tint?: string
  color?: string
}) {
  const { colors, font } = useTheme()
  const bg = tint ?? colors.surface
  const valueColor = color ?? colors.text
  return (
    <View style={styles.statTilesRow}>
      {items.map((it, i) => (
        <View
          key={it.label + i}
          style={[
            styles.statTile,
            { backgroundColor: bg, borderColor: 'rgba(20,19,19,0.12)' },
          ]}
        >
          <Text
            style={{
              fontSize: 9,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: colors.textMuted,
              fontFamily: font.bodySemiBold,
            }}
          >
            {it.label}
          </Text>
          <Text
            style={{
              fontSize: 22,
              color: valueColor,
              fontFamily: font.display,
              marginTop: 4,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

function Pill({ color, tint, label }: { color: string; tint: string; label: string }) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: tint,
        borderWidth: 1,
        borderColor: 'rgba(20,19,19,0.12)',
      }}
    >
      <Text style={{ color, fontSize: 12, fontFamily: 'DMSans_600SemiBold' }}>{label}</Text>
    </View>
  )
}

function TrimesterTip({
  trimester, kind, weekNumber,
}: { trimester: 1 | 2 | 3; kind: PillarKey; weekNumber: number }) {
  const { colors, stickers } = useTheme()
  const tip = trimesterCopy(kind, trimester, weekNumber)
  if (!tip) return null
  return (
    <PaperCard title={`Trimester ${trimester} note`}>
      <Body size={13} color={colors.textSecondary} style={{ lineHeight: 20 }}>
        {tip}
      </Body>
    </PaperCard>
  )
}

function trimesterCopy(kind: PillarKey, t: 1 | 2 | 3, week: number): string | null {
  if (kind === 'kicks') {
    if (week < 18) return 'Most people first feel quickening between week 16–22. Earlier is normal in second pregnancies.'
    if (week < 28) return 'Movements are getting stronger — patterns aren\'t reliable yet. Don\'t panic if a day feels quiet.'
    return 'Track at the same time daily — usually after a meal in the evening when baby is most active.'
  }
  if (kind === 'sleep') {
    if (t === 1) return 'Fatigue peaks early. A 20-minute nap counts. Avoid lying flat right after meals to ease reflux.'
    if (t === 2) return 'Sleep often improves now. Side-sleeping (left preferred) supports placental blood flow.'
    return 'Use a body pillow. Empty the bladder right before bed, keep water nearby for the inevitable wake-ups.'
  }
  if (kind === 'mood') {
    if (t === 1) return 'Hormones spike fast. Mood swings now don\'t predict postpartum mood — just ride it.'
    if (t === 2) return 'Energy returning. If anxiety persists or joy feels flat for 2+ weeks, mention it at your next visit.'
    return 'Anticipatory anxiety is normal. A short walk + 10 min of breathwork shifts more than you\'d think.'
  }
  if (kind === 'symptoms') {
    if (t === 1) return 'Nausea, breast tenderness, fatigue and headaches dominate. Most ease by week 12–14.'
    if (t === 2) return 'New: round-ligament pinch, mild swelling, leg cramps. Sharp persistent pain warrants a call.'
    return 'Heartburn, swelling, hip pain and Braxton Hicks pick up. Sudden severe headache or vision change → call now.'
  }
  if (kind === 'wellbeing') {
    if (t === 1) return 'Goal: any logging at all. The score is rough early — focus on folic acid, water, and sleep.'
    if (t === 2) return 'Best window to build habits. Movement and varied meals lift the score fastest right now.'
    return 'Protect sleep aggressively. Lower the movement target if needed; rest is part of the work.'
  }
  return null
}

// ─── Takeaway computation ──────────────────────────────────────────────────

interface Takeaway {
  headline: string
  takeaway?: string
  pct?: number
  trend?: string
}

function buildTakeaways(args: {
  weightHistory: { date: string; weight: number }[]
  kickSessions: { date: string; kicks: number }[]
  sleepHistory: { date: string; hours: number }[]
  moodTrend: { log_date: string; value: string | null }[]
  symptomFreq: { symptom: string; count: number }[]
  hydrationHistory: { date: string; glasses: number }[]
  exerciseHistory: PregnancyExerciseEntry[]
  contractions: PregnancyContractionSession[]
  wellbeing: PregnancyWellbeingScore | null | undefined
  nutritionMatrix: { iron: boolean[]; folic: boolean[]; protein: boolean[]; calcium: boolean[]; dates: string[] } | null | undefined
  birthReady: BirthReadiness | null | undefined
  trimester: 1 | 2 | 3
}): Record<PillarKey, Takeaway> {
  const {
    weightHistory, kickSessions, sleepHistory, moodTrend, symptomFreq,
    hydrationHistory, exerciseHistory, contractions, wellbeing, nutritionMatrix, birthReady,
  } = args

  // Weight
  const weights = weightHistory.map((e) => e.weight).filter((w) => w > 0)
  const lastW = weights[weights.length - 1]
  const firstW = weights[0]
  const weeklyGain = firstW && lastW && weights.length > 1 ? (lastW - firstW) / (weights.length - 1) : null

  // Kicks
  const avgKicks = kickSessions.length > 0
    ? Math.round(kickSessions.reduce((a, b) => a + b.kicks, 0) / kickSessions.length)
    : 0

  // Sleep
  const sleepHrs = sleepHistory.map((s) => s.hours)
  const avgSleep = sleepHrs.length > 0 ? sleepHrs.reduce((a, b) => a + b, 0) / sleepHrs.length : 0

  // Mood
  const positive = ['happy', 'radiant', 'energetic', 'okay']
  const positivePct = moodTrend.length > 0
    ? Math.round((moodTrend.filter((m) => positive.includes(m.value ?? '')).length / moodTrend.length) * 100)
    : 0

  // Symptoms
  const symptomTotal = symptomFreq.reduce((a, b) => a + b.count, 0)

  // Hydration
  const hydAvg = hydrationHistory.length > 0
    ? hydrationHistory.reduce((a, b) => a + b.glasses, 0) / hydrationHistory.length
    : 0

  // Nutrition: % of nutrient-days hit across 4 nutrients
  const nutHit = nutritionMatrix
    ? [
        ...nutritionMatrix.iron, ...nutritionMatrix.folic,
        ...nutritionMatrix.protein, ...nutritionMatrix.calcium,
      ]
    : []
  const nutPct = nutHit.length > 0
    ? Math.round((nutHit.filter(Boolean).length / nutHit.length) * 100)
    : 0

  // Exercise: active days / 7 (target)
  const exMinutes = exerciseHistory.reduce((a, b) => a + b.minutes, 0)
  const exDays = exerciseHistory.filter((e) => e.minutes > 0).length

  return {
    wellbeing: wellbeing
      ? {
          headline: `${wellbeing.overall}%`,
          pct: wellbeing.overall,
          takeaway: wellbeing.overall >= 70 ? 'You\'re doing well — keep it steady.' : wellbeing.overall >= 40 ? 'Mixed signals — protect sleep first.' : 'Reach for help. Small wins compound fast.',
        }
      : { headline: '—', takeaway: 'Log a few days to see your wellbeing.' },
    weight: {
      headline: lastW ? `${lastW.toFixed(1)} kg` : '—',
      takeaway: weeklyGain !== null
        ? `${weeklyGain >= 0 ? '+' : ''}${weeklyGain.toFixed(2)} kg/wk on average`
        : 'Log weight weekly to track trend.',
      pct: weights.length > 0 ? Math.min(100, weights.length * 10) : 0,
      trend: weeklyGain !== null
        ? weeklyGain > 0 ? '↑' : weeklyGain < 0 ? '↓' : '→'
        : undefined,
    },
    kicks: {
      headline: avgKicks ? String(avgKicks) : '—',
      takeaway: avgKicks > 0 ? `${kickSessions.length} sessions in 2 weeks` : 'Log a kick session in a quiet moment.',
      pct: kickSessions.length > 0 ? Math.min(100, (kickSessions.length / 14) * 100) : 0,
    },
    sleep: {
      headline: avgSleep ? `${avgSleep.toFixed(1)}h` : '—',
      takeaway: avgSleep >= 7 ? 'Hitting the 7–9h window.' : avgSleep > 0 ? 'Below 7h — try an afternoon rest.' : 'Log a few nights to see your sleep.',
      pct: avgSleep ? Math.min(100, (avgSleep / 9) * 100) : 0,
    },
    mood: {
      headline: moodTrend.length ? `${positivePct}%` : '—',
      takeaway: moodTrend.length > 0 ? `${moodTrend.length} mood entries` : 'Tag a mood today to start the trend.',
      pct: positivePct,
    },
    symptoms: {
      headline: symptomTotal ? `${symptomTotal}` : 'None',
      takeaway: symptomFreq[0] ? `Most common: ${symptomFreq[0].symptom}` : 'Quiet week — log if any pop up.',
      pct: symptomFreq.length > 0 ? Math.min(100, symptomFreq.length * 20) : 0,
    },
    hydration: {
      headline: hydAvg ? `${hydAvg.toFixed(1)}` : '—',
      takeaway: hydAvg >= 8 ? 'Hitting the 8 glasses target.' : hydAvg > 0 ? 'Aim for 8 glasses — sip early.' : 'Tap water in the calendar to log.',
      pct: hydAvg ? Math.min(100, (hydAvg / 8) * 100) : 0,
    },
    nutrition: {
      headline: `${nutPct}%`,
      takeaway: nutPct >= 70 ? 'Strong nutrient coverage.' : nutPct > 0 ? 'Add iron + folic on missed days.' : 'Tag nutrients in your meal logs.',
      pct: nutPct,
    },
    exercise: {
      headline: exDays > 0 ? `${exDays} day${exDays === 1 ? '' : 's'}` : '—',
      takeaway: exMinutes >= 150 ? 'Hit the 150 min/week guideline.' : exMinutes > 0 ? `${exMinutes} min so far this fortnight.` : 'A 20 min walk counts.',
      pct: Math.min(100, (exMinutes / 150) * 100),
    },
    contractions: {
      headline: contractions.length ? `${contractions[contractions.length - 1].count}` : '—',
      takeaway: contractions.length > 0 ? `${contractions.length} session${contractions.length === 1 ? '' : 's'} logged` : 'Time them with the calendar contraction tool.',
      pct: contractions.length > 0 ? Math.min(100, contractions.length * 20) : 0,
    },
    birth: birthReady
      ? {
          headline: `${birthReady.pct}%`,
          takeaway: birthReady.pct >= 80 ? 'You\'re in great shape.' : birthReady.pct >= 40 ? 'Halfway there — keep stacking.' : 'Start with the emergency card.',
          pct: birthReady.pct,
        }
      : { headline: '—', takeaway: 'Loading your readiness…' },
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 0 },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
  },
  infoBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  // Hero week card
  hero: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    padding: 18,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroChip: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10,
    letterSpacing: 1.6,
  },
  heroValue: {
    fontSize: 28,
    letterSpacing: -0.6,
    lineHeight: 32,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    marginTop: 2,
  },
  heroBadge: {
    alignItems: 'center',
  },
  heroBadgeInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeNum: {
    fontSize: 24,
    lineHeight: 26,
  },
  heroBadgeT: {
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: -2,
  },

  // Pillar grid
  pillarStack: {
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 12,
  },
  pillarPaper: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  pillarHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pillarChip: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillarName: {
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  pillarBlurb: {
    fontSize: 12,
    marginTop: 2,
  },
  pillarValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillarValue: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  pillarBarBg: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pillarBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  pillarTakeaway: {
    fontSize: 12,
  },
  trendChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  trendText: {
    fontSize: 11,
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
  },
  modalHeaderBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  modalHeaderBlob: {
    position: 'absolute',
    right: -20,
    bottom: -28,
    opacity: 0.45,
  },
  paperCardBlob: {
    position: 'absolute',
    right: -14,
    top: -14,
    opacity: 0.5,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Detail bits
  scoreHero: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 4,
  },
  scoreBanner: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  paperCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  statTilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  // Mixed-layout helpers
  grid: {
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
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
})
