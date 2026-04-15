/**
 * D2 — Pregnancy Analytics (v2)
 *
 * 3-tab layout:
 * 1. Overview    — progress arc + weight chart + mood trend + kicks + symptoms
 * 2. Birth Prep  — birth plan progress + hospital bag + classes checklist
 * 3. Wellbeing   — overall score + sleep + nutrition + hydration
 *
 * All charts use real data from pregnancy query hooks.
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import Svg, {
  Circle as SvgCircle,
  Text as SvgText,
} from 'react-native-svg'
import { ChevronRight } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { supabase } from '../../lib/supabase'
import {
  usePregnancyWeightHistory,
  usePregnancyMoodTrend,
  usePregnancyKickSessions,
  usePregnancySymptomFrequency,
  usePregnancyWellbeingScore,
  usePregnancySleepHistory,
  usePregnancyHydrationHistory,
  usePregnancyNutritionMatrix,
} from '../../lib/analyticsData'
import { LineChart, BarChart, HeatmapGrid } from '../charts/SvgCharts'

const SCREEN_W = Dimensions.get('window').width

type AnalyticsTab = 'overview' | 'birth_prep' | 'wellbeing'

// ─── Progress Arc ─────────────────────────────────────────────────────────────

interface ProgressArcProps {
  week: number
  progress: number
}

function ProgressArc({ week, progress }: ProgressArcProps) {
  const size = 140
  const cx = size / 2
  const cy = size / 2
  const r = 56
  const strokeW = 10
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - progress)

  return (
    <Svg width={size} height={size}>
      <SvgCircle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW} fill="none" />
      <SvgCircle
        cx={cx} cy={cy} r={r}
        stroke={brand.pregnancy}
        strokeWidth={strokeW}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${cx},${cy}`}
      />
      <SvgText
        x={cx} y={cy - 8}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="22"
        fontWeight="900"
        fontFamily="CabinetGrotesk-Black"
      >
        {week}
      </SvgText>
      <SvgText
        x={cx} y={cy + 12}
        textAnchor="middle"
        fill="rgba(255,255,255,0.55)"
        fontSize="11"
        fontFamily="Satoshi-Variable"
      >
        of 40 weeks
      </SvgText>
    </Svg>
  )
}

// ─── Wellbeing score circle ───────────────────────────────────────────────────

interface ScoreCircleProps {
  score: number
  label: string
}

function ScoreCircle({ score, label }: ScoreCircleProps) {
  const size = 100
  const cx = size / 2
  const cy = size / 2
  const r = 40
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - score / 100)
  const color = score >= 70 ? '#A2FF86' : score >= 40 ? '#FBBF24' : '#FF6B35'

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <SvgCircle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={8} fill="none" />
        <SvgCircle
          cx={cx} cy={cy} r={r}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx},${cy}`}
        />
        <SvgText
          x={cx} y={cy + 5}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="18"
          fontWeight="900"
          fontFamily="CabinetGrotesk-Black"
        >
          {score}
        </SvgText>
      </Svg>
      <Text style={{ fontSize: 12, fontFamily: 'Satoshi-Variable', color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
        {label}
      </Text>
    </View>
  )
}

// ─── Dimension bar ────────────────────────────────────────────────────────────

interface DimensionBarProps {
  label: string
  value: number
  color: string
}

function DimensionBar({ label, value, color }: DimensionBarProps) {
  const { colors } = useTheme()
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Variable', color }}>{value}%</Text>
      </View>
      <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
        <View style={{ width: `${Math.min(value, 100)}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string
  children: React.ReactNode
}

function SectionCard({ title, children }: SectionCardProps) {
  const { colors } = useTheme()
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  )
}

// ─── Checklist Item ───────────────────────────────────────────────────────────

interface ChecklistItemProps {
  label: string
  done: boolean
  color: string
}

function ChecklistItem({ label, done, color }: ChecklistItemProps) {
  const { colors } = useTheme()
  return (
    <View style={styles.checklistRow}>
      <View style={[styles.checkDot, { backgroundColor: done ? color : 'transparent', borderColor: done ? color : colors.border }]} />
      <Text style={[styles.checkLabel, { color: done ? colors.text : colors.textSecondary, textDecorationLine: done ? 'line-through' : 'none' }]}>
        {label}
      </Text>
    </View>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  message: string
}

function EmptyState({ message }: EmptyStateProps) {
  const { colors } = useTheme()
  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{message}</Text>
    </View>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PregnancyAnalytics() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const trimester = weekNumber <= 13 ? 1 : weekNumber <= 26 ? 2 : 3
  const progress = weekNumber / 40
  const showKicks = weekNumber >= 28

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id)
    })
  }, [])

  const chartW = SCREEN_W - 72

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: weightHistory = [], isLoading: loadingWeight } = usePregnancyWeightHistory(userId ?? '', 12)
  const { data: moodRaw = [], isLoading: loadingMood } = usePregnancyMoodTrend(userId ?? '', 12)
  const { data: kickSessions = [], isLoading: loadingKicks } = usePregnancyKickSessions(userId ?? '', 14)
  const { data: symptomFreq = [], isLoading: loadingSymptoms } = usePregnancySymptomFrequency(userId ?? '')
  const { data: wellbeing, isLoading: loadingWellbeing } = usePregnancyWellbeingScore(userId ?? '')
  const { data: sleepHistory = [], isLoading: loadingSleep } = usePregnancySleepHistory(userId ?? '', 4)
  const { data: hydration = [], isLoading: loadingHydration } = usePregnancyHydrationHistory(userId ?? '', 7)
  const { data: nutritionMatrix, isLoading: loadingNutrition } = usePregnancyNutritionMatrix(userId ?? '', 14)

  // ── Derived chart data ──────────────────────────────────────────────────────

  // Weight chart — use e.weight (not e.weight_kg), e.date for labels
  const weightValues = weightHistory.map((e) => e.weight)
  const weightLabels = weightHistory.map((e) => {
    const d = new Date(e.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  // Mood trend — use e.value (not e.notes), e.log_date (not e.date)
  const moodMap: Record<string, number> = { excited: 5, happy: 4, okay: 3, anxious: 2, nauseous: 1 }
  const moodValues = moodRaw.map((e) => {
    const key = (e.value ?? '').toLowerCase()
    return moodMap[key] ?? 3
  })
  const moodLabels = moodRaw.map((e) => {
    const d = new Date(e.log_date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  // Kick sessions — use e.kicks (not e.count), e.date is correct
  const kickValues = kickSessions.map((e) => e.kicks)
  const kickLabels = kickSessions.map((e) => {
    const d = new Date(e.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  // Sleep history
  const sleepValues = sleepHistory.map((e) => e.hours)
  const sleepLabels = sleepHistory.map((e) => {
    const d = new Date(e.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  // Hydration history
  const hydrationValues = hydration.map((e) => e.glasses)
  const hydrationLabels = hydration.map((e) => {
    const d = new Date(e.date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })

  // Nutrition heatmap — use nutritionMatrix.dates (not nutritionMatrix.days)
  // HeatmapGrid expects data: number[][], rowLabels, colLabels, color
  const nutritionHeatRows: number[][] = nutritionMatrix ? [
    nutritionMatrix.iron.map((v) => (v ? 1 : 0)),
    nutritionMatrix.folic.map((v) => (v ? 1 : 0)),
    nutritionMatrix.protein.map((v) => (v ? 1 : 0)),
    nutritionMatrix.calcium.map((v) => (v ? 1 : 0)),
  ] : []
  const nutritionColLabels = nutritionMatrix
    ? nutritionMatrix.dates.map((d) => {
        const date = new Date(d)
        return `${date.getDate()}`
      })
    : []
  const nutritionRowLabels = ['Iron', 'Folic', 'Protein', 'Calcium']

  // Wellbeing: overall is already 0-100 (hook returns Math.round(avg * 10))
  // sleep/mood/nutrition/exercise/hydration are 0-10 — multiply by 10 for display
  const wellbeingOverall = wellbeing ? wellbeing.overall : 0
  const wellbeingSleep = wellbeing ? Math.round(wellbeing.sleep * 10) : 0
  const wellbeingMood = wellbeing ? Math.round(wellbeing.mood * 10) : 0
  const wellbeingNutrition = wellbeing ? Math.round(wellbeing.nutrition * 10) : 0
  const wellbeingHydration = wellbeing ? Math.round(wellbeing.hydration * 10) : 0
  const wellbeingExercise = wellbeing ? Math.round(wellbeing.exercise * 10) : 0
  const wellbeingDelta = wellbeing ? Math.abs(wellbeing.delta * 10) : 0
  const wellbeingTrend = wellbeing && wellbeing.delta >= 0 ? '↑' : '↓'

  // Trimester color — brand.trimester doesn't exist in theme, use direct hex values
  const trimesterColor =
    trimester === 1 ? '#A2FF86' :
    trimester === 2 ? brand.pregnancy :
    '#FBBF24'

  // Birth prep checklist (static — represents common tasks)
  const birthPlanItems = [
    { label: 'Birth preferences documented', done: weekNumber >= 32 },
    { label: 'Hospital/birth center chosen', done: weekNumber >= 28 },
    { label: 'Birth partner briefed', done: weekNumber >= 30 },
    { label: 'Pain management options reviewed', done: weekNumber >= 34 },
    { label: 'Cord blood decision made', done: weekNumber >= 36 },
  ]
  const birthPlanDone = birthPlanItems.filter((i) => i.done).length

  const hospitalBagItems = [
    { label: 'ID & insurance card', done: weekNumber >= 36 },
    { label: 'Birth plan printout', done: weekNumber >= 37 },
    { label: 'Comfortable clothes & toiletries', done: weekNumber >= 37 },
    { label: 'Newborn outfit & blanket', done: weekNumber >= 38 },
    { label: 'Car seat installed', done: weekNumber >= 38 },
    { label: 'Snacks & entertainment', done: weekNumber >= 38 },
  ]
  const bagDone = hospitalBagItems.filter((i) => i.done).length

  const classItems = [
    { label: 'Childbirth education class', done: weekNumber >= 28 },
    { label: 'Breastfeeding class', done: weekNumber >= 30 },
    { label: 'Infant CPR course', done: weekNumber >= 32 },
    { label: 'Newborn care basics', done: weekNumber >= 33 },
  ]
  const classesDone = classItems.filter((i) => i.done).length

  // Tab definitions
  const tabs: { key: AnalyticsTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'birth_prep', label: 'Birth Prep' },
    { key: 'wellbeing', label: 'Wellbeing' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.key ? brand.pregnancy : colors.textMuted },
            ]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && (
              <View style={[styles.tabUnderline, { backgroundColor: brand.pregnancy }]} />
            )}
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Overview Tab ─────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Progress header */}
            <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.headerRow}>
                <ProgressArc week={weekNumber} progress={progress} />
                <View style={styles.headerMeta}>
                  <Text style={[styles.trimesterBadge, { color: trimesterColor, borderColor: trimesterColor + '44', backgroundColor: trimesterColor + '18' }]}>
                    T{trimester} · Week {weekNumber}
                  </Text>
                  <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {Math.round(progress * 100)}% complete
                  </Text>
                  <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                    {40 - weekNumber} weeks remaining
                  </Text>
                  <Pressable
                    style={[styles.cta, { backgroundColor: brand.pregnancy + '20', borderColor: brand.pregnancy + '40' }]}
                    onPress={() => router.push('/(tabs)/agenda')}
                  >
                    <Text style={[styles.ctaText, { color: brand.pregnancy }]}>Log today</Text>
                    <ChevronRight size={14} color={brand.pregnancy} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Weight history */}
            <SectionCard title="Weight Gain">
              {loadingWeight ? (
                <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
              ) : weightValues.length < 2 ? (
                <EmptyState message="No weight logs yet. Start logging in the agenda." />
              ) : (
                <LineChart
                  data={weightValues}
                  labels={weightLabels}
                  color={brand.pregnancy}
                  width={chartW}
                  height={160}
                  showAverage
                  unit=" kg"
                />
              )}
            </SectionCard>

            {/* Mood trend */}
            <SectionCard title="Mood Trend">
              {loadingMood ? (
                <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
              ) : moodValues.length < 2 ? (
                <EmptyState message="No mood logs yet. Track daily in the agenda." />
              ) : (
                <>
                  <LineChart
                    data={moodValues}
                    labels={moodLabels}
                    color={brand.pregnancy}
                    width={chartW}
                    height={140}
                  />
                  <View style={styles.moodLegend}>
                    {Object.entries(moodMap).map(([label, val]) => (
                      <View key={label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: brand.pregnancy, opacity: val / 5 }]} />
                        <Text style={[styles.legendText, { color: colors.textMuted }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </SectionCard>

            {/* Kick counter (T3 only) */}
            {showKicks && (
              <SectionCard title="Kick Sessions">
                {loadingKicks ? (
                  <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
                ) : kickValues.length === 0 ? (
                  <EmptyState message="No kick sessions logged yet. Start counting kicks from the agenda." />
                ) : (
                  <BarChart
                    data={kickValues}
                    labels={kickLabels}
                    color="#A2FF86"
                    width={chartW}
                    height={150}
                    showValues
                  />
                )}
              </SectionCard>
            )}

            {/* Symptom frequency */}
            <SectionCard title="Top Symptoms">
              {loadingSymptoms ? (
                <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
              ) : symptomFreq.length === 0 ? (
                <EmptyState message="No symptoms logged yet." />
              ) : (
                <View style={styles.symptomList}>
                  {symptomFreq.map((s, i) => (
                    <View key={s.symptom} style={styles.symptomRow}>
                      <View style={styles.symptomRank}>
                        <Text style={[styles.symptomRankText, { color: brand.pregnancy }]}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.symptomName, { color: colors.text }]}>{s.symptom}</Text>
                      <View style={styles.symptomBar}>
                        <View style={[styles.symptomFill, {
                          width: `${Math.min((s.count / (symptomFreq[0]?.count ?? 1)) * 100, 100)}%`,
                          backgroundColor: brand.pregnancy,
                        }]} />
                      </View>
                      <Text style={[styles.symptomCount, { color: colors.textMuted }]}>{s.count}x</Text>
                    </View>
                  ))}
                </View>
              )}
            </SectionCard>
          </>
        )}

        {/* ── Birth Prep Tab ───────────────────────────────────────── */}
        {activeTab === 'birth_prep' && (
          <>
            {/* Progress summary */}
            <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Birth Prep Progress</Text>
              <View style={styles.prepSummaryRow}>
                <View style={styles.prepStat}>
                  <Text style={[styles.prepStatNum, { color: brand.pregnancy }]}>{birthPlanDone}/{birthPlanItems.length}</Text>
                  <Text style={[styles.prepStatLabel, { color: colors.textMuted }]}>Birth Plan</Text>
                </View>
                <View style={styles.prepDivider} />
                <View style={styles.prepStat}>
                  <Text style={[styles.prepStatNum, { color: brand.pregnancy }]}>{bagDone}/{hospitalBagItems.length}</Text>
                  <Text style={[styles.prepStatLabel, { color: colors.textMuted }]}>Hospital Bag</Text>
                </View>
                <View style={styles.prepDivider} />
                <View style={styles.prepStat}>
                  <Text style={[styles.prepStatNum, { color: brand.pregnancy }]}>{classesDone}/{classItems.length}</Text>
                  <Text style={[styles.prepStatLabel, { color: colors.textMuted }]}>Classes</Text>
                </View>
              </View>
              <Pressable
                style={[styles.cta, { backgroundColor: brand.pregnancy + '20', borderColor: brand.pregnancy + '40', marginTop: 12 }]}
                onPress={() => router.push('/(tabs)/vault')}
              >
                <Text style={[styles.ctaText, { color: brand.pregnancy }]}>Open Vault</Text>
                <ChevronRight size={14} color={brand.pregnancy} />
              </Pressable>
            </View>

            {/* Birth plan checklist */}
            <SectionCard title="Birth Plan">
              {birthPlanItems.map((item, i) => (
                <ChecklistItem key={i} label={item.label} done={item.done} color={brand.pregnancy} />
              ))}
              <Text style={[styles.checklistNote, { color: colors.textMuted }]}>
                Items auto-check based on your current week.
              </Text>
            </SectionCard>

            {/* Hospital bag */}
            <SectionCard title="Hospital Bag">
              {hospitalBagItems.map((item, i) => (
                <ChecklistItem key={i} label={item.label} done={item.done} color="#FBBF24" />
              ))}
            </SectionCard>

            {/* Classes */}
            <SectionCard title="Prenatal Classes">
              {classItems.map((item, i) => (
                <ChecklistItem key={i} label={item.label} done={item.done} color="#A2FF86" />
              ))}
            </SectionCard>
          </>
        )}

        {/* ── Wellbeing Tab ────────────────────────────────────────── */}
        {activeTab === 'wellbeing' && (
          <>
            {/* Overall score */}
            <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {loadingWellbeing ? (
                <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
              ) : (
                <View style={styles.wellbeingHeader}>
                  <ScoreCircle score={wellbeingOverall} label="Overall" />
                  <View style={styles.wellbeingHeaderMeta}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Wellbeing Score</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Based on last 7 days</Text>
                    {wellbeing && (
                      <Text style={[styles.trendBadge, {
                        color: wellbeing.delta >= 0 ? '#A2FF86' : '#FF6B35',
                        backgroundColor: (wellbeing.delta >= 0 ? '#A2FF86' : '#FF6B35') + '18',
                      }]}>
                        {wellbeingTrend} {wellbeingDelta.toFixed(0)} pts vs last week
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Dimension breakdown */}
            <SectionCard title="Dimensions">
              {loadingWellbeing ? (
                <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
              ) : !wellbeing ? (
                <EmptyState message="Log your wellbeing daily in the agenda to see scores." />
              ) : (
                <>
                  <DimensionBar label="Sleep" value={wellbeingSleep} color={brand.pregnancy} />
                  <DimensionBar label="Mood" value={wellbeingMood} color={brand.pregnancy} />
                  <DimensionBar label="Nutrition" value={wellbeingNutrition} color="#A2FF86" />
                  <DimensionBar label="Hydration" value={wellbeingHydration} color="#6AABF7" />
                  <DimensionBar label="Exercise" value={wellbeingExercise} color="#FBBF24" />
                </>
              )}
            </SectionCard>

            {/* Sleep history */}
            <SectionCard title="Sleep History">
              {loadingSleep ? (
                <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
              ) : sleepValues.length < 2 ? (
                <EmptyState message="No sleep logs found in the last 4 weeks." />
              ) : (
                <LineChart
                  data={sleepValues}
                  labels={sleepLabels}
                  color={brand.pregnancy}
                  width={chartW}
                  height={150}
                  showAverage
                  unit="h"
                />
              )}
            </SectionCard>

            {/* Hydration history */}
            <SectionCard title="Daily Hydration">
              {loadingHydration ? (
                <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
              ) : hydrationValues.length === 0 ? (
                <EmptyState message="No hydration logs found this week." />
              ) : (
                <BarChart
                  data={hydrationValues}
                  labels={hydrationLabels}
                  color="#6AABF7"
                  width={chartW}
                  height={150}
                  showValues
                />
              )}
            </SectionCard>

            {/* Nutrition matrix */}
            <SectionCard title="Nutrient Tracking">
              {loadingNutrition ? (
                <ActivityIndicator color={brand.pregnancy} style={styles.loader} />
              ) : !nutritionMatrix || nutritionMatrix.dates.length === 0 ? (
                <EmptyState message="No nutrition logs found. Track nutrients in the agenda." />
              ) : (
                <HeatmapGrid
                  data={nutritionHeatRows}
                  rowLabels={nutritionRowLabels}
                  colLabels={nutritionColLabels}
                  color={brand.pregnancy}
                />
              )}
            </SectionCard>
          </>
        )}

      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  headerCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerMeta: {
    flex: 1,
    gap: 4,
  },
  trimesterBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'CabinetGrotesk-Black',
    fontWeight: '900',
  },
  headerSub: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'CabinetGrotesk-Black',
    fontWeight: '900',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  loader: {
    marginVertical: 24,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    textAlign: 'center',
    lineHeight: 18,
  },
  moodLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
  },
  symptomList: {
    gap: 10,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  symptomRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(185,131,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomRankText: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
  },
  symptomName: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '600',
    flex: 1,
  },
  symptomBar: {
    width: 60,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  symptomFill: {
    height: 5,
    borderRadius: 3,
  },
  symptomCount: {
    fontSize: 12,
    fontFamily: 'Satoshi-Variable',
    width: 28,
    textAlign: 'right',
  },
  prepSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prepStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  prepStatNum: {
    fontSize: 22,
    fontFamily: 'CabinetGrotesk-Black',
    fontWeight: '900',
  },
  prepStatLabel: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '600',
  },
  prepDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  checkLabel: {
    fontSize: 13,
    fontFamily: 'Satoshi-Variable',
    flex: 1,
  },
  checklistNote: {
    fontSize: 11,
    fontFamily: 'Satoshi-Variable',
    marginTop: 8,
    lineHeight: 16,
  },
  wellbeingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  wellbeingHeaderMeta: {
    flex: 1,
    gap: 4,
  },
  trendBadge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontFamily: 'Satoshi-Variable',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
})
