# Pregnancy Overhaul — Plan 4: Analytics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 9-section single-scroll analytics (all mock data) with a 3-tab layout (Overview / Birth Prep / Wellbeing) wired to the 8 real Supabase query hooks from Plan 1.

**Architecture:** Full rewrite of `components/analytics/PregnancyAnalytics.tsx`. All mock data arrays are removed. Three render functions (`renderOverview`, `renderBirthPrep`, `renderWellbeing`) conditionally render based on `activeTab` state. Each uses the Plan 1 hooks from `lib/analyticsData.ts`. The existing `LineChart`, `BarChart`, `HeatmapGrid` from `SvgCharts.tsx` are reused.

**Tech Stack:** TypeScript · React Native · react-native-svg · Supabase · React Query v5

**Depends on:** Plan 1 (Foundation) — all 8 pregnancy query hooks must exist in `lib/analyticsData.ts`.

---

### File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/analytics/PregnancyAnalytics.tsx` | Rewrite | 3-tab layout, real data |

---

### Task 1: Overview Tab

**Files:**
- Modify: `components/analytics/PregnancyAnalytics.tsx` (full rewrite — start with this section)

- [ ] **Step 1: Replace the entire file with the new component header + Overview tab**

```tsx
/**
 * D2 — Pregnancy Analytics (v2)
 *
 * 3-tab layout:
 * 1. Overview    — progress arc + weight chart + mood trend + kicks + symptoms
 * 2. Birth Prep  — birth plan progress + hospital bag + classes checklist
 * 3. Wellbeing   — overall score + sleep + nutrition + hydration
 *
 * All charts use real data from pregnancy query hooks (Plan 1).
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
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg'
import { ChevronRight, TrendingUp } from 'lucide-react-native'
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

function ProgressArc({ week, progress }: { week: number; progress: number }) {
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
      <SvgText x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily="Satoshi-Variable">
        of 40 weeks
      </SvgText>
    </Svg>
  )
}

// ─── Wellbeing score circle ───────────────────────────────────────────────────

function ScoreCircle({ score, label }: { score: number; label: string }) {
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
        <SvgText x={cx} y={cy + 5} textAnchor="middle" fill="#FFFFFF" fontSize="18" fontWeight="900" fontFamily="CabinetGrotesk-Black">
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

function DimensionBar({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors } = useTheme()
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 13, fontFamily: 'Satoshi-Variable', color: color }}>{value}%</Text>
      </View>
      <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
        <View style={{ width: `${value}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
      </View>
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
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const chartW = SCREEN_W - 72

  // All data hooks
  const { data: weightHistory = [], isLoading: loadingWeight } = usePregnancyWeightHistory(userId, 12)
  const { data: moodTrend = [], isLoading: loadingMood } = usePregnancyMoodTrend(userId, 12)
  const { data: kickSessions = [], isLoading: loadingKicks } = usePregnancyKickSessions(userId, 14)
  const { data: symptomFreq = [], isLoading: loadingSymptoms } = usePregnancySymptomFrequency(userId)
  const { data: wellbeing, isLoading: loadingWellbeing } = usePregnancyWellbeingScore(userId)
  const { data: sleepHistory = [], isLoading: loadingSleep } = usePregnancySleepHistory(userId, 4)
  const { data: hydration = [], isLoading: loadingHydration } = usePregnancyHydrationHistory(userId, 7)
  const { data: nutritionMatrix, isLoading: loadingNutrition } = usePregnancyNutritionMatrix(userId, 14)

  // Derived chart data
  const weightValues = weightHistory.map((e: { weight_kg: number; date: string }) => e.weight_kg)
  const weightLabels = weightHistory.map((e: { weight_kg: number; date: string }) =>
    new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )

  // Mood: map mood notes to numeric value (excited=5, happy=4, okay=3, anxious=2, nauseous=1)
  const moodMap: Record<string, number> = { excited: 5, happy: 4, okay: 3, anxious: 2, nauseous: 1 }
  const moodValues = moodTrend.map((e: { notes: string | null }) =>
    moodMap[e.notes ?? ''] ?? 3
  )
  const moodLabels = moodTrend.map((e: { date: string }) =>
    new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )

  const kickValues = kickSessions.map((e: { count: number }) => e.count)
  const kickLabels = kickSessions.map((e: { date: string }) =>
    new Date(e.date).toLocaleDateString('en-US', { weekday: 'short' })
  )

  const symptomNames = symptomFreq.map((e: { symptom: string; count: number }) => e.symptom)
  const symptomCounts = symptomFreq.map((e: { symptom: string; count: number }) => e.count)

  const sleepValues = sleepHistory.map((e: { hours: number }) => e.hours)
  const sleepLabels = sleepHistory.map((e: { date: string }) =>
    new Date(e.date).toLocaleDateString('en-US', { weekday: 'short' })
  )

  const hydrationValues = hydration.map((e: { glasses: number }) => e.glasses)
  const hydrationLabels = hydration.map((e: { date: string }) =>
    new Date(e.date).toLocaleDateString('en-US', { weekday: 'short' })
  )

  // Prenatal classes state (local — no DB persistence for now)
  const [classesDone, setClassesDone] = useState<Record<string, boolean>>({})
  const CLASSES = ['Childbirth prep', 'Breastfeeding basics', 'Infant CPR', 'Hospital tour']

  const renderOverview = () => (
    <>
      {/* Progress arc */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.arcRow}>
          <ProgressArc week={weekNumber} progress={progress} />
          <View style={styles.arcInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Week {weekNumber} of 40</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {Math.round(progress * 100)}% of your journey
            </Text>
            <View style={styles.trimesterPills}>
              {[1, 2, 3].map((t) => (
                <View
                  key={t}
                  style={[
                    styles.trimesterPill,
                    {
                      backgroundColor:
                        t === trimester ? brand.pregnancy + '30' : 'rgba(255,255,255,0.06)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.trimesterPillText,
                      { color: t === trimester ? brand.pregnancy : colors.textMuted },
                    ]}
                  >
                    T{t} {t < trimester ? '✓' : t === trimester ? '●' : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Weight chart */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>⚖️ Weight tracking</Text>
          {weightValues.length > 0 && (
            <Text style={[styles.cardBadge, { color: brand.pregnancy }]}>
              {weightValues[weightValues.length - 1].toFixed(1)} kg
            </Text>
          )}
        </View>
        {loadingWeight ? (
          <ActivityIndicator color={brand.pregnancy} style={{ marginVertical: 24 }} />
        ) : weightValues.length < 2 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Log weight entries to see your trend
          </Text>
        ) : (
          <LineChart
            data={weightValues}
            labels={weightLabels}
            color={brand.pregnancy}
            width={chartW}
            height={160}
            unit=" kg"
          />
        )}
      </View>

      {/* Mood trend */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>😊 Mood trend</Text>
          <Text style={[styles.cardBadge, { color: '#FBBF24' }]}>12 weeks</Text>
        </View>
        {loadingMood ? (
          <ActivityIndicator color={brand.pregnancy} style={{ marginVertical: 24 }} />
        ) : moodValues.length < 2 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Log your mood daily to see a trend
          </Text>
        ) : (
          <LineChart
            data={moodValues}
            labels={moodLabels}
            color="#FBBF24"
            width={chartW}
            height={120}
            unit=""
          />
        )}
      </View>

      {/* Kick sessions — week 28+ only */}
      {showKicks && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>👶 Kick sessions</Text>
            <Text style={[styles.cardBadge, { color: '#A2FF86' }]}>Last 14</Text>
          </View>
          {loadingKicks ? (
            <ActivityIndicator color={brand.pregnancy} style={{ marginVertical: 24 }} />
          ) : kickValues.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No kick sessions logged yet
            </Text>
          ) : (
            <BarChart
              data={kickValues}
              labels={kickLabels}
              color="#A2FF86"
              width={chartW}
              height={120}
              unit=" kicks"
            />
          )}
        </View>
      )}

      {/* Symptom frequency */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>🤒 Top symptoms</Text>
        {loadingSymptoms ? (
          <ActivityIndicator color={brand.pregnancy} style={{ marginVertical: 24 }} />
        ) : symptomFreq.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No symptom data yet
          </Text>
        ) : (
          symptomFreq.map((s: { symptom: string; count: number }, i: number) => {
            const maxCount = symptomCounts[0] ?? 1
            const pct = Math.round((s.count / maxCount) * 100)
            return (
              <View key={s.symptom} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[styles.barLabel, { color: colors.text }]}>{s.symptom}</Text>
                  <Text style={[styles.barCount, { color: colors.textMuted }]}>×{s.count}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${pct}%`, backgroundColor: brand.pregnancy },
                    ]}
                  />
                </View>
              </View>
            )
          })
        )}
      </View>
    </>
  )

  const renderBirthPrep = () => (
    <>
      {/* Birth plan progress */}
      <Pressable
        onPress={() => router.push('/birth-plan')}
        style={[styles.card, { backgroundColor: colors.surface }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>📋 Birth plan</Text>
          <View style={styles.ctaRow}>
            <Text style={[styles.ctaText, { color: brand.pregnancy }]}>Review</Text>
            <ChevronRight size={14} color={brand.pregnancy} strokeWidth={2} />
          </View>
        </View>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Tap to review and complete your birth preferences
        </Text>
      </Pressable>

      {/* Hospital bag tracker — sourced from pregnancy_logs birth_prep/hospital_bag */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>🧳 Hospital bag</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Track items via Birth Prep tasks in the Calendar
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/agenda')}
          style={[styles.linkBtn, { borderColor: brand.pregnancy + '40' }]}
        >
          <Text style={[styles.linkBtnText, { color: brand.pregnancy }]}>
            Go to Calendar → Birth Prep
          </Text>
        </Pressable>
      </View>

      {/* Contraction timer history — week 28+ */}
      {showKicks ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>⏱️ Contraction history</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Log contractions in the Calendar to see stats here
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/agenda')}
            style={[styles.linkBtn, { borderColor: '#FBBF2440' }]}
          >
            <Text style={[styles.linkBtnText, { color: '#FBBF24' }]}>Go to Calendar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>⏱️ Contraction timer</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
            Available from week 28
          </Text>
        </View>
      )}

      {/* Prenatal classes checklist */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>🎓 Prenatal classes</Text>
        {CLASSES.map((cls) => (
          <Pressable
            key={cls}
            onPress={() => setClassesDone((prev) => ({ ...prev, [cls]: !prev[cls] }))}
            style={styles.checkRow}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: classesDone[cls] ? '#A2FF86' : 'transparent',
                  borderColor: classesDone[cls] ? '#A2FF86' : colors.border,
                },
              ]}
            >
              {classesDone[cls] && (
                <Text style={{ fontSize: 10, color: '#1A1030', fontWeight: '900' }}>✓</Text>
              )}
            </View>
            <Text
              style={[
                styles.checkLabel,
                {
                  color: classesDone[cls] ? colors.textMuted : colors.text,
                  textDecorationLine: classesDone[cls] ? 'line-through' : 'none',
                },
              ]}
            >
              {cls}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  )

  const renderWellbeing = () => (
    <>
      {/* Overall wellbeing score */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>✨ Overall wellbeing</Text>
        {loadingWellbeing ? (
          <ActivityIndicator color={brand.pregnancy} style={{ marginVertical: 24 }} />
        ) : !wellbeing ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Log routines to generate your score
          </Text>
        ) : (
          <>
            <View style={styles.scoreRow}>
              <ScoreCircle score={wellbeing.overall} label="Overall" />
              <View style={{ flex: 1, gap: 8, paddingLeft: 16 }}>
                <DimensionBar label="Sleep" value={wellbeing.sleep} color="#6AABF7" />
                <DimensionBar label="Mood" value={wellbeing.mood} color="#FBBF24" />
                <DimensionBar label="Nutrition" value={wellbeing.nutrition} color="#FF6B35" />
                <DimensionBar label="Exercise" value={wellbeing.exercise} color="#A2FF86" />
                <DimensionBar label="Hydration" value={wellbeing.hydration} color="#6AABF7" />
              </View>
            </View>
            {wellbeing.delta !== 0 && (
              <Text style={[styles.deltaText, { color: wellbeing.delta > 0 ? '#A2FF86' : '#FF6B35' }]}>
                {wellbeing.delta > 0 ? '↑' : '↓'} {Math.abs(wellbeing.delta)}% vs last week
              </Text>
            )}
          </>
        )}
      </View>

      {/* Sleep quality */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>😴 Sleep quality</Text>
        {loadingSleep ? (
          <ActivityIndicator color={brand.pregnancy} style={{ marginVertical: 24 }} />
        ) : sleepValues.length < 2 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Log sleep daily to track your quality
          </Text>
        ) : (
          <LineChart
            data={sleepValues}
            labels={sleepLabels}
            color="#6AABF7"
            width={chartW}
            height={120}
            unit="h"
          />
        )}
      </View>

      {/* Nutrition matrix */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>🥗 Nutrition coverage</Text>
        {loadingNutrition ? (
          <ActivityIndicator color={brand.pregnancy} style={{ marginVertical: 24 }} />
        ) : !nutritionMatrix || nutritionMatrix.days.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Log nutrition entries to track coverage
          </Text>
        ) : (
          <HeatmapGrid
            data={[
              nutritionMatrix.iron.map((v: boolean) => (v ? 1 : 0)),
              nutritionMatrix.folic.map((v: boolean) => (v ? 1 : 0)),
              nutritionMatrix.protein.map((v: boolean) => (v ? 1 : 0)),
              nutritionMatrix.calcium.map((v: boolean) => (v ? 1 : 0)),
            ]}
            rowLabels={['Iron', 'Folic', 'Protein', 'Calcium']}
            colLabels={nutritionMatrix.days.map((d: string) =>
              new Date(d).toLocaleDateString('en-US', { weekday: 'short' })
            )}
            width={chartW}
            height={140}
            activeColor="#FF6B35"
          />
        )}
      </View>

      {/* Hydration bars */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>💧 Hydration (last 7 days)</Text>
          <Text style={[styles.cardBadge, { color: '#6AABF7' }]}>Goal: 8</Text>
        </View>
        {loadingHydration ? (
          <ActivityIndicator color={brand.pregnancy} style={{ marginVertical: 24 }} />
        ) : hydrationValues.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Log water intake to see your hydration trend
          </Text>
        ) : (
          <BarChart
            data={hydrationValues}
            labels={hydrationLabels}
            color="#6AABF7"
            width={chartW}
            height={120}
            unit=" gl"
          />
        )}
      </View>
    </>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* 3-tab header */}
      <View style={[styles.tabBar, { paddingTop: insets.top + 8 }]}>
        {(['overview', 'birth_prep', 'wellbeing'] as AnalyticsTab[]).map((tab) => {
          const label = tab === 'overview' ? 'Overview' : tab === 'birth_prep' ? 'Birth Prep' : 'Wellbeing'
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabBtn,
                activeTab === tab && { borderBottomWidth: 2, borderBottomColor: brand.pregnancy },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab ? brand.pregnancy : colors.textMuted },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'birth_prep' && renderBirthPrep()}
        {activeTab === 'wellbeing' && renderWellbeing()}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabLabel: { fontSize: 12, fontFamily: 'Satoshi-Variable', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll: { padding: 16, gap: 0 },

  card: { borderRadius: 24, padding: 20, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontFamily: 'CabinetGrotesk-Black', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, fontFamily: 'Satoshi-Variable', lineHeight: 18 },
  cardBadge: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '700' },
  emptyText: { fontSize: 13, fontFamily: 'Satoshi-Variable', textAlign: 'center', paddingVertical: 12 },

  // Arc
  arcRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  arcInfo: { flex: 1 },
  trimesterPills: { flexDirection: 'row', gap: 6, marginTop: 8 },
  trimesterPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  trimesterPillText: { fontSize: 11, fontFamily: 'Satoshi-Variable', fontWeight: '700' },

  // Symptom bars
  barLabel: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600' },
  barCount: { fontSize: 12, fontFamily: 'Satoshi-Variable' },
  barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },

  // Birth prep
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600' },
  linkBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  linkBtnText: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  checkLabel: { fontSize: 15, fontFamily: 'Satoshi-Variable', fontWeight: '500' },

  // Wellbeing
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  deltaText: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600', marginTop: 8 },
})
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/igorcarvalhorodrigues/Projects/grandma-app
npx tsc --noEmit 2>&1 | head -40
```

**Common fix 1:** Hook return types from Plan 1 — the field names on returned objects depend on what was written in Plan 1. If there are type errors on `e.weight_kg`, `e.count`, `e.glasses`, etc., check the actual interfaces in `lib/analyticsData.ts`:
```bash
grep -A5 "PregnancyWeightEntry\|PregnancyKickSession\|PregnancySymptomFreq\|PregnancyWellbeingScore\|PregnancyNutritionMatrix" lib/analyticsData.ts | head -50
```
Update field names in `PregnancyAnalytics.tsx` to match what the types actually define.

**Common fix 2:** `HeatmapGrid` props — check the actual interface in `SvgCharts.tsx`:
```bash
grep -n "interface HeatmapGridProps\|HeatmapGrid" components/charts/SvgCharts.tsx | head -10
```
If `HeatmapGrid` doesn't have `activeColor` prop, remove it. If the prop names differ, update to match.

**Common fix 3:** `brand.pregnancy` — confirm it exists in `constants/theme.ts`:
```bash
grep -n "pregnancy" constants/theme.ts | head -5
```
If not found, replace `brand.pregnancy` with `'#B983FF'` throughout.

**Common fix 4:** `colors.background` — the theme might use `colors.bg` instead:
```bash
grep -n "background\b\|\.bg\b" constants/theme.ts | head -5
```
Use whichever key is correct.

- [ ] **Step 3: Commit**

```bash
git add components/analytics/PregnancyAnalytics.tsx
git commit -m "feat(pregnancy): analytics v2 — 3 tabs with real Supabase data"
```

---

## Notes for Implementor

**All 8 hooks from Plan 1 must exist before running this.** Run Plan 1 Tasks 7–8 first. If any hook is missing, `usePregnancyWeightHistory` etc. won't be importable and the tsc check will fail immediately.

**`HeatmapGrid` signature:** This component exists in `SvgCharts.tsx` but may not accept `activeColor`. Check its interface and remove or rename the prop if needed.

**`birth-plan.tsx` route:** The Birth Prep card links to `/birth-plan`. This route may not exist yet. If it doesn't, change `router.push('/birth-plan')` to `router.push('/(tabs)/vault')` as a temporary redirect.

**`wellbeing.delta`:** The `PregnancyWellbeingScore` interface from Plan 1 should have a `delta` field. If it doesn't, remove the delta display block.
