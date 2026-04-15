/**
 * Kids Analytics Screen — Premium wellness dashboard
 *
 * Improvements:
 *  1. Per-child only (no "All Kids" aggregation)
 *  2. Header with child name, age, and score-info (ℹ) button
 *  3. ScoreInfoModal: explains each pillar with age benchmarks
 *  4. GrandmaInsightCard: real data-driven message + full context to chat
 *  5. HealthTipsSection: age-aware, data-specific tips + TipDetailModal on tap
 *  6. PillarRow: trend arrows + score takeaway text
 *  7. Growth: shows single measurement card (not just line chart)
 *  8. DayDetailStrip: tap a day chip below any bar chart for per-day breakdown
 *  9. Ask Grandma passes full analytics context automatically
 */

import React, { useState, useEffect, useCallback } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  AppState,
  Modal,
} from 'react-native'
import { router } from 'expo-router'
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text as SvgText,
} from 'react-native-svg'
import {
  MessageCircle,
  ChevronRight,
  ChevronUp,
  Utensils,
  Moon,
  Smile,
  Heart,
  TrendingUp,
  Shield,
  Syringe,
  RefreshCw,
  FileQuestion,
  Sparkles,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  MinusCircle,
  SkipForward,
  Zap,
  X,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { LineChart, BarChart, BubbleGrid, smoothPath } from '../charts/SvgCharts'
import { FullScreenChart } from '../charts/FullScreenChart'
import {
  useKidsAnalytics,
  type AnalyticsData,
  type SleepData,
  type PillarScore,
  type WellnessScores,
  type RoutineComplianceData,
} from '../../lib/analyticsData'
import { supabase } from '../../lib/supabase'
import { runWellnessNotifications } from '../../lib/notificationEngine'
import { ChildPill, CHILD_COLORS, formatChildAge as sharedFormatChildAge } from '../ui/ChildPills'

const SCREEN_W = Dimensions.get('window').width
const SCREEN_H = Dimensions.get('window').height

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ─── Wellness Arc — module-level geometry (SCREEN_W is constant) ───────────
const ARC_SIZE    = SCREEN_W - 32
const ARC_OUTER_R = ARC_SIZE / 2 - 20
const ARC_INNER_R = 44
const ARC_GAP     = (ARC_OUTER_R - ARC_INNER_R) / 5
const ARC_RADII   = Array.from({ length: 6 }, (_, i) => ARC_OUTER_R - i * ARC_GAP)
const STROKE_TRACK = 13
const STROKE_FILL  = 15

// ─── Pillar Config ─────────────────────────────────────────────────────────

const PILLAR_CONFIG = {
  nutrition: { label: 'Nutrition', color: '#A2FF86', icon: Utensils },
  sleep:     { label: 'Sleep',     color: '#B983FF', icon: Moon },
  mood:      { label: 'Mood',      color: '#FF8AD8', icon: Smile },
  health:    { label: 'Health',    color: '#4D96FF', icon: Heart },
  growth:    { label: 'Growth',    color: '#F59E0B', icon: TrendingUp },
  activity:  { label: 'Activity',  color: '#FF6B35', icon: Zap },
} as const

type PillarKey = keyof typeof PILLAR_CONFIG
const PILLAR_ORDER: PillarKey[] = ['nutrition', 'sleep', 'mood', 'health', 'growth', 'activity']

function formatChildAge(bd: string): string {
  if (!bd) return ''
  return sharedFormatChildAge(bd)
}

const MOOD_COLORS: Record<string, string> = {
  happy: '#FBBF24', calm: '#6AABF7', energetic: '#6EC96E',
  fussy: '#FFB347', cranky: '#FF7070',
}
const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', calm: '😌', energetic: '⚡', fussy: '😣', cranky: '😤',
}

// ─── Age Helpers ───────────────────────────────────────────────────────────

function getAgeMonths(birthDate: string): number {
  const bd = new Date(birthDate)
  const now = new Date()
  return Math.max(0, (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth()))
}

function getAgeLabel(ageMonths: number): string {
  if (ageMonths < 12) return `${ageMonths}mo`
  const y = Math.floor(ageMonths / 12)
  const m = ageMonths % 12
  return m > 0 ? `${y}y ${m}mo` : `${y}y`
}

function getAgeSleepTarget(ageMonths: number): number {
  if (ageMonths < 4) return 15
  if (ageMonths < 12) return 13
  if (ageMonths < 36) return 12
  return 10.5
}

function scoreColor(v: number): string {
  if (v >= 8.5) return '#A2FF86'
  if (v >= 7) return '#6AABF7'
  if (v >= 5) return '#FBBF24'
  if (v >= 3) return '#FF8C42'
  return '#FF7070'
}

function rankColor(i: number): string {
  if (i === 0) return '#FBBF24' // gold
  if (i === 1) return '#6AABF7' // silver-blue
  if (i === 2) return '#A2FF86' // green
  return '#FFFFFF66'            // muted white
}

// ─── Tip Data Interface ────────────────────────────────────────────────────

interface TipData {
  title: string
  body: string
  detail: string
  color: string
  icon: any
}

// ─── Health Tips (data-driven, age-aware) ─────────────────────────────────

function getHealthTips(
  scores: WellnessScores,
  analytics: AnalyticsData,
  ageMonths: number,
  childName: string,
): TipData[] {
  const tips: TipData[] = []

  // ── Sleep
  if (scores.sleep.hasData) {
    const target = getAgeSleepTarget(ageMonths)
    const avg = analytics.sleep.avgHours
    const totalQ = analytics.sleep.qualityCounts
    const goodPct = (() => {
      const total = totalQ.great + totalQ.good + totalQ.restless + totalQ.poor
      return total > 0 ? Math.round(((totalQ.great + totalQ.good) / total) * 100) : 0
    })()
    if (avg > 0 && avg < target * 0.85) {
      tips.push({
        title: 'Sleep Below Target',
        body: `${childName} avg ${avg.toFixed(1)}h/night — target is ${target}h for their age.`,
        detail: `At ${ageMonths} months, children need ~${target}h sleep/day. ${childName} is averaging ${avg.toFixed(1)}h. ${goodPct}% of sessions are good quality. Try an earlier bedtime, dim lights 30 min before sleep, and a consistent wind-down routine to reach the target.`,
        color: PILLAR_CONFIG.sleep.color,
        icon: Moon,
      })
    } else if (avg > 0) {
      tips.push({
        title: 'Sleep Goal Met ✓',
        body: `${childName} avg ${avg.toFixed(1)}h — on track! ${goodPct}% good-quality sessions.`,
        detail: `Great sleep pattern for ${ageMonths} months! ${avg.toFixed(1)}h average meets the ${target}h target. ${goodPct}% of sleep sessions are rated good or great. Quality sleep strengthens memory, immunity, and emotional regulation.`,
        color: PILLAR_CONFIG.sleep.color,
        icon: Moon,
      })
    }
  } else {
    tips.push({
      title: 'Start Logging Sleep',
      body: `Track sleep to see if ${childName} meets the ${getAgeSleepTarget(ageMonths)}h daily target.`,
      detail: `For ${ageMonths < 4 ? 'newborns' : ageMonths < 12 ? 'infants' : ageMonths < 36 ? 'toddlers' : 'children'} at ${ageMonths} months, the recommended sleep is ${getAgeSleepTarget(ageMonths)}h per day including naps. Log each sleep session in Calendar → Sleep.`,
      color: PILLAR_CONFIG.sleep.color,
      icon: Moon,
    })
  }

  // ── Nutrition
  if (scores.nutrition.hasData) {
    const totalMeals = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
    const daysLogged = analytics.nutrition.mealFrequency.filter((m) => m > 0).length
    const avgMeals = daysLogged > 0 ? (totalMeals / daysLogged).toFixed(1) : '0'
    const goodTotal = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
    const goodPct = totalMeals > 0 ? Math.round((goodTotal / totalMeals) * 100) : 0
    if (scores.nutrition.value < 7) {
      tips.push({
        title: 'Improve Meal Quality',
        body: `${goodPct}% of meals eaten well, ${avgMeals} meals/day. Try 1-2 new foods this week.`,
        detail: `${childName} averages ${avgMeals} meals/day with ${goodPct}% rated "ate well." Introduce new foods alongside familiar ones — it typically takes 10-15 exposures before a child accepts something new. Consistent mealtimes and positive food environments help too.`,
        color: PILLAR_CONFIG.nutrition.color,
        icon: Utensils,
      })
    } else {
      tips.push({
        title: 'Great Nutrition Week!',
        body: `${goodPct}% meals eaten well, ${avgMeals}/day avg — excellent consistency!`,
        detail: `${childName} is eating well this week with ${goodPct}% of meals rated "ate well" across ${avgMeals} meals per day. Continue offering variety across all food groups. This consistency supports healthy growth and development.`,
        color: PILLAR_CONFIG.nutrition.color,
        icon: Utensils,
      })
    }
  }

  // ── Mood
  if (scores.mood.hasData) {
    const cranky = analytics.mood.dominantMoods.find((m) => m.mood === 'cranky')?.count ?? 0
    const fussy = analytics.mood.dominantMoods.find((m) => m.mood === 'fussy')?.count ?? 0
    const totalMoods = analytics.mood.dominantMoods.reduce((a, m) => a + m.count, 0)
    const negPct = totalMoods > 0 ? Math.round(((cranky + fussy) / totalMoods) * 100) : 0
    const topMood = analytics.mood.dominantMoods[0]?.mood ?? 'calm'
    if (negPct > 30) {
      tips.push({
        title: 'Mood Needs Attention',
        body: `${negPct}% cranky/fussy episodes this week. Check sleep & routine.`,
        detail: `Higher irritability at ${ageMonths} months can signal teething (common 6–24 months), growth spurts, disrupted sleep, or routine changes. Try extra comfort, check that sleep targets are being met, and monitor for other symptoms like drooling or temperature.`,
        color: PILLAR_CONFIG.mood.color,
        icon: Smile,
      })
    } else {
      tips.push({
        title: 'Positive Mood Week',
        body: `Dominant mood: ${topMood}. ${negPct}% negative episodes — great emotional health!`,
        detail: `${childName}'s emotional wellbeing looks great this week. The dominant mood is "${topMood}" with only ${negPct}% negative episodes. Consistent routines, responsive caregiving, and adequate sleep all contribute to positive mood patterns.`,
        color: PILLAR_CONFIG.mood.color,
        icon: Smile,
      })
    }
  }

  // ── Activity
  const activityTarget = ageMonths < 12 ? '20–30 min tummy time' : '60 min active play'
  tips.push({
    title: 'Daily Activity Goal',
    body: `Target: ${activityTarget} daily for ${getAgeLabel(ageMonths)}.`,
    detail: ageMonths < 12
      ? 'Tummy time builds neck, shoulder, and core strength essential for rolling, sitting, and crawling. Start with 2–3 min sessions and work up to 20–30 min spread across the day. Get on the floor with your baby to make it fun.'
      : 'Physical activity supports gross motor skills, better sleep, healthy weight, and improved mood. Outdoor play adds vitamin D, fresh air, and sensory stimulation. Even 3 × 20-minute sessions count toward the daily target.',
    color: '#FF6B35',
    icon: TrendingUp,
  })

  // ── Growth tracking nudge
  if (!scores.growth.hasData) {
    tips.push({
      title: 'Log Growth Data',
      body: `Record ${childName}'s weight & height to track development.`,
      detail: 'Regular growth tracking helps detect early nutritional issues or developmental concerns. Log measurements after each pediatrician visit in Calendar → Growth. Weight, height, and head circumference data become more meaningful over time.',
      color: PILLAR_CONFIG.growth.color,
      icon: TrendingUp,
    })
  }

  // ── Diaper
  if (analytics.diaper.hasData) {
    const { totalCount, typeCounts } = analytics.diaper
    const avgPerDay = (totalCount / 7).toFixed(1)
    const poopPct = totalCount > 0 ? Math.round((typeCounts.poop + typeCounts.mixed) / totalCount * 100) : 0
    if (ageMonths < 6 && totalCount / 7 < 6) {
      tips.push({
        title: 'Low Diaper Count',
        body: `${avgPerDay} diapers/day — newborns typically need 8-12. Check hydration.`,
        detail: `${childName} is averaging ${avgPerDay} diapers per day this week. Newborns under 6 months typically have 8-12 wet/dirty diapers daily. Fewer than 6 wet diapers may indicate insufficient feeding. Track diapers in Calendar → Diaper and consult your pediatrician if concerned.`,
        color: brand.secondary,
        icon: Heart,
      })
    } else if (analytics.diaper.colorCounts['green'] && analytics.diaper.colorCounts['green'] > 3) {
      tips.push({
        title: 'Green Stools Noticed',
        body: `${analytics.diaper.colorCounts['green']} green diapers this week — worth monitoring.`,
        detail: `Green stools can be normal (especially with dietary changes or iron supplements), but persistent green poop may indicate foremilk/hindmilk imbalance in breastfed babies, or food sensitivities. If accompanied by fussiness or other symptoms, consult your pediatrician.`,
        color: brand.secondary,
        icon: Heart,
      })
    }
  } else if (ageMonths < 24) {
    tips.push({
      title: 'Track Diapers',
      body: `Log ${childName}'s diaper changes to monitor hydration and digestion.`,
      detail: 'Diaper tracking helps you spot dehydration, dietary reactions, and digestive patterns. For newborns, adequate wet diapers (6+/day) confirm sufficient feeding. Log each change in Calendar → Diaper.',
      color: brand.secondary,
      icon: Heart,
    })
  }

  return tips.slice(0, 4)
}

// ─── Grandma Context Builder ───────────────────────────────────────────────

function buildGrandmaContext(
  scores: WellnessScores,
  analytics: AnalyticsData,
  childName: string,
  ageMonths: number,
): string {
  const lines: string[] = [
    `Analytics for ${childName} (${getAgeLabel(ageMonths)}) — this week:`,
    `Overall thriving score: ${scores.overall.toFixed(1)}/10`,
  ]

  if (scores.sleep.hasData) {
    const target = getAgeSleepTarget(ageMonths)
    lines.push(`Sleep: ${scores.sleep.value.toFixed(1)}/10 — avg ${analytics.sleep.avgHours.toFixed(1)}h/night (target ${target}h)`)
  }
  if (scores.nutrition.hasData) {
    const totalMeals = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
    const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
    const pct = totalMeals > 0 ? Math.round((good / totalMeals) * 100) : 0
    lines.push(`Nutrition: ${scores.nutrition.value.toFixed(1)}/10 — ${pct}% meals eaten well`)
  }
  if (scores.mood.hasData) {
    const top = analytics.mood.dominantMoods[0]
    lines.push(`Mood: ${scores.mood.value.toFixed(1)}/10 — dominant: ${top?.mood ?? 'no data'}`)
  }
  if (scores.health.hasData) {
    lines.push(`Health: ${scores.health.value.toFixed(1)}/10`)
  }
  if (scores.growth.hasData) {
    const w = analytics.growth.weights.at(-1)
    const h = analytics.growth.heights.at(-1)
    if (w) lines.push(`Latest weight: ${w.value}kg`)
    if (h) lines.push(`Latest height: ${h.value}cm`)
  }
  if (analytics.diaper.hasData) {
    const { totalCount, typeCounts } = analytics.diaper
    lines.push(`Diapers: ${totalCount} this week (${typeCounts.pee} pee, ${typeCounts.poop} poop, ${typeCounts.mixed} mixed) — avg ${(totalCount / 7).toFixed(1)}/day`)
  }

  const lowest = PILLAR_ORDER.reduce<PillarKey | null>((min, key) => {
    if (!scores[key].hasData) return min
    if (!min || scores[key].value < scores[min].value) return key
    return min
  }, null)
  if (lowest && scores[lowest].value < 7) {
    lines.push(`Main concern: ${PILLAR_CONFIG[lowest].label} at ${scores[lowest].value.toFixed(1)}/10`)
  }

  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function KidsAnalytics() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const [selectedChildId, setSelectedChildId] = useState<string>(() => children[0]?.id ?? '')
  const [selectedPillar, setSelectedPillar] = useState<PillarKey | null>(null)
  const [fullScreen, setFullScreen] = useState<string | null>(null)
  const [showScoreInfo, setShowScoreInfo] = useState(false)
  const [selectedTip, setSelectedTip] = useState<TipData | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Default to first child when children load
  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id)
      setActiveChild(children[0])
    }
  }, [children, selectedChildId, setActiveChild])

  const { data: analytics, isLoading, error, refetch } = useKidsAnalytics(selectedChildId)

  const selectedChild = children.find((c) => c.id === selectedChildId) ?? children[0] ?? null
  const ageMonths = selectedChild?.birthDate ? getAgeMonths(selectedChild.birthDate) : 12
  const childName = selectedChild?.name ?? 'your child'
  const chartW = SCREEN_W - 72

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  // Realtime updates
  useEffect(() => {
    if (!selectedChildId) return
    const channel = supabase
      .channel('analytics-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'child_logs' }, (payload: any) => {
        if (payload.new?.child_id === selectedChildId || payload.old?.child_id === selectedChildId) {
          refetch()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedChildId, refetch])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refetch() })
    return () => sub.remove()
  }, [refetch])

  // Wellness notifications
  useEffect(() => {
    if (!analytics?.scores || !selectedChild) return
    runWellnessNotifications(analytics.scores, selectedChild.id, selectedChild.name).catch(() => {})
  }, [analytics?.scores, selectedChild])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── HEADER ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Analytics</Text>
            <Text style={[styles.screenSub, { color: colors.textSecondary }]}>
              {childName} · {getAgeLabel(ageMonths)}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowScoreInfo(true)}
            hitSlop={10}
            style={({ pressed }) => [
              styles.infoBtn,
              { backgroundColor: colors.primaryTint, borderRadius: radius.full, borderColor: colors.primary + '30' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Info size={18} color={colors.primary} strokeWidth={2} />
          </Pressable>
        </View>

        {/* ── 1. CHILD SELECTOR ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childRow}>
          {children.map((c, idx) => (
            <ChildChip
              key={c.id}
              label={c.name}
              age={formatChildAge(c.birthDate)}
              active={selectedChildId === c.id}
              color={CHILD_COLORS[idx % CHILD_COLORS.length]}
              onPress={() => { setSelectedChildId(c.id); setActiveChild(c) }}
            />
          ))}
        </ScrollView>

        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading analytics…</Text>
          </View>
        )}

        {error && !isLoading && (
          <Pressable onPress={() => refetch()} style={[styles.errorCard, { backgroundColor: brand.error + '15', borderRadius: radius.xl }]}>
            <Text style={[styles.errorText, { color: brand.error }]}>Failed to load data</Text>
            <View style={styles.row}>
              <RefreshCw size={14} color={brand.error} />
              <Text style={[styles.errorRetry, { color: brand.error }]}>Tap to retry</Text>
            </View>
          </Pressable>
        )}

        {analytics && (
          <>
            {/* ── 2. WELLNESS SCORE ARC ── */}
            <WellnessScoreArc
              scores={analytics.scores}
              onInfoPress={() => setShowScoreInfo(true)}
              childId={selectedChild?.id ?? ''}
            />

            {/* ── 3. GRANDMA AI INSIGHT ── */}
            <GrandmaInsightCard
              scores={analytics.scores}
              analytics={analytics}
              childName={childName}
              ageMonths={ageMonths}
            />

            {/* ── 4. HEALTH TIPS ── */}
            <HealthTipsSection
              tips={getHealthTips(analytics.scores, analytics, ageMonths, childName)}
              scores={analytics.scores}
              analytics={analytics}
              childName={childName}
              ageMonths={ageMonths}
              onTipPress={setSelectedTip}
            />

            {/* ── 5. PILLAR BREAKDOWN ── */}
            <View style={styles.pillarSection}>
              <Text style={[styles.pillarSectionTitle, { color: colors.text }]}>THRIVING BREAKDOWN</Text>
              {PILLAR_ORDER.map((key) => (
                <PillarRow
                  key={key}
                  pillarKey={key}
                  score={analytics.scores[key]}
                  onPress={() => setSelectedPillar(key)}
                />
              ))}
              <RoutineComplianceSection data={analytics.routineCompliance} />
            </View>
          </>
        )}

        {analytics && analytics.totalLogs === 0 && !isLoading && (
          <View style={[styles.emptyAll, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <FileQuestion size={32} color={colors.textMuted} />
            <Text style={[styles.emptyAllTitle, { color: colors.text }]}>No data yet</Text>
            <Text style={[styles.emptyAllSub, { color: colors.textMuted }]}>
              Start logging meals, sleep, mood, and activities from the Calendar tab.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Full-screen chart modals ── */}
      {analytics && (
        <>
          <FullScreenChart visible={fullScreen === 'eat_quality'} title="Weekly Eat Quality" onClose={() => setFullScreen(null)}>
            <StackedBarChart good={analytics.nutrition.eatQuality.good} little={analytics.nutrition.eatQuality.little} none={analytics.nutrition.eatQuality.none} labels={analytics.nutrition.weekLabels} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'meal_freq'} title="Meals per Day" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.nutrition.mealFrequency} labels={analytics.nutrition.weekLabels} color={PILLAR_CONFIG.nutrition.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'top_foods'} title="Most Logged Foods" onClose={() => setFullScreen(null)}>
            <BubbleGrid items={analytics.nutrition.topFoods.map((f, i) => ({
              label: f.label, value: f.count,
              color: [PILLAR_CONFIG.nutrition.color, PILLAR_CONFIG.health.color, PILLAR_CONFIG.mood.color, PILLAR_CONFIG.sleep.color, PILLAR_CONFIG.growth.color, '#FF6B35'][i % 6],
            }))} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_weekly'} title="Daily Sleep Hours" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.sleep.dailyHours} labels={analytics.sleep.weekLabels} color={PILLAR_CONFIG.sleep.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_quality'} title="Sleep Quality" onClose={() => setFullScreen(null)}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'mood_dist'} title="Mood Distribution" onClose={() => setFullScreen(null)}>
            <MoodDistribution moods={analytics.mood.dominantMoods} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'mood_daily'} title="Daily Mood Tracking" onClose={() => setFullScreen(null)}>
            <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={SCREEN_W - 48} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'health_freq'} title="Health Events" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          {analytics.growth.weights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'weight'} title="Weight (kg)" onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.weights.map((w) => w.value)} labels={analytics.growth.weights.map((w) => { const d = new Date(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} unit="kg" showAverage />
            </FullScreenChart>
          )}
          {analytics.growth.heights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'height'} title="Height (cm)" onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.heights.map((h) => h.value)} labels={analytics.growth.heights.map((h) => { const d = new Date(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.growth.color} width={SCREEN_W - 48} height={220} unit="cm" showAverage />
            </FullScreenChart>
          )}
        </>
      )}

      {/* ── Pillar Detail Modal ── */}
      {analytics && (
        <PillarDetailModal
          visible={selectedPillar !== null}
          pillarKey={selectedPillar}
          analytics={analytics}
          chartW={chartW}
          childName={childName}
          ageMonths={ageMonths}
          onClose={() => setSelectedPillar(null)}
          onFullScreen={setFullScreen}
        />
      )}

      {/* ── Score Info Modal ── */}
      <ScoreInfoModal
        visible={showScoreInfo}
        scores={analytics?.scores ?? null}
        ageMonths={ageMonths}
        childName={childName}
        onClose={() => setShowScoreInfo(false)}
      />

      {/* ── Tip Detail Modal ── */}
      {selectedTip && (
        <TipDetailModal
          tip={selectedTip}
          childName={childName}
          analytics={analytics ?? null}
          scores={analytics?.scores ?? null}
          ageMonths={ageMonths}
          onClose={() => setSelectedTip(null)}
        />
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE INFO MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function ScoreInfoModal({
  visible, scores, ageMonths, childName, onClose,
}: {
  visible: boolean
  scores: WellnessScores | null
  ageMonths: number
  childName: string
  onClose: () => void
}) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const SCORE_BANDS = [
    { range: '8.5 – 10', label: 'Excellent', color: '#A2FF86' },
    { range: '7.0 – 8.4', label: 'Good',      color: '#6AABF7' },
    { range: '5.0 – 6.9', label: 'Fair',      color: '#FBBF24' },
    { range: '3.0 – 4.9', label: 'Needs Attention', color: '#FF8C42' },
    { range: '0 – 2.9',   label: 'Low',       color: '#FF7070' },
  ]

  const PILLAR_EXPLAIN: Record<PillarKey, string> = {
    nutrition: `Tracks meal frequency and quality (ate well / a little / didn't eat). ${ageMonths < 6 ? 'For infants under 6 months breast/bottle feeds count.' : ageMonths < 12 ? 'Mixed stage — milk + early solids both tracked.' : 'Variety, frequency, and eating quality all factor in.'}`,
    sleep: `Sleep duration and quality (great/good/restless/poor). Target for ${getAgeLabel(ageMonths)}: ${getAgeSleepTarget(ageMonths)}h/day. Consistency across the week adds a bonus.`,
    mood: `Weighted from logged moods: happy/calm/energetic raise the score; fussy/cranky lower it. The more days logged, the more accurate the score.`,
    health: `Combines vaccine completion and health event frequency. More vaccines done + fewer incidents (temperature, medicine) = higher score.`,
    growth: `Reflects how regularly weight and height are measured. Frequent tracking earns a higher score. Recent measurements get a recency bonus.`,
    activity: `Scored by active days per week (how many days had at least one logged session) plus a variety bonus for mixing different types. 7 active days = perfect score.`,
  }

  const WEIGHTS: Record<PillarKey, string> = {
    nutrition: '27%', sleep: '22%', mood: '18%', health: '13%', growth: '9%', activity: '11%',
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: radius.xl, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Thriving Score Guide</Text>
            <Pressable onPress={onClose} hitSlop={8} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: SCREEN_H * 0.62 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {scores && (
              <View style={[styles.scoreHighlight, { backgroundColor: colors.primaryTint, borderRadius: radius.xl, borderColor: colors.primary + '30' }]}>
                <Text style={[styles.scoreHighlightNum, { color: scoreColor(scores.overall) }]}>
                  {scores.overall.toFixed(1)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scoreHighlightLabel, { color: colors.text }]}>{childName}'s thriving score</Text>
                  <Text style={[styles.scoreHighlightSub, { color: colors.textSecondary }]}>Weighted average of 5 pillars</Text>
                </View>
              </View>
            )}

            <Text style={[styles.infoSectionLabel, { color: colors.textSecondary }]}>SCORE SCALE</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {SCORE_BANDS.map((b) => (
                <View key={b.label} style={styles.bandRow}>
                  <View style={[styles.bandDot, { backgroundColor: b.color }]} />
                  <Text style={[styles.bandLabel, { color: colors.text }]}>{b.label}</Text>
                  <Text style={[styles.bandRange, { color: colors.textMuted }]}>{b.range}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.infoSectionLabel, { color: colors.textSecondary }]}>HOW EACH PILLAR IS SCORED</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
              {PILLAR_ORDER.map((key) => {
                const config = PILLAR_CONFIG[key]
                const Icon = config.icon
                const score = scores?.[key]
                return (
                  <View key={key} style={[styles.pillarInfoCard, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
                    <View style={styles.pillarInfoHeader}>
                      <View style={[styles.pillarInfoIcon, { backgroundColor: config.color + '15' }]}>
                        <Icon size={16} color={config.color} strokeWidth={2} />
                      </View>
                      <Text style={[styles.pillarInfoName, { color: colors.text }]}>{config.label}</Text>
                      <Text style={[styles.pillarInfoWeight, { color: colors.textMuted }]}>{WEIGHTS[key]}</Text>
                      {score?.hasData && (
                        <View style={[styles.pillarInfoScoreBadge, { backgroundColor: config.color + '20' }]}>
                          <Text style={[styles.pillarInfoScoreText, { color: config.color }]}>{score.value.toFixed(1)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.pillarInfoBody, { color: colors.textSecondary }]}>{PILLAR_EXPLAIN[key]}</Text>
                  </View>
                )
              })}
            </View>

            <View style={[styles.ageBanner, { backgroundColor: brand.kids + '10', borderRadius: radius.xl, borderColor: brand.kids + '30' }]}>
              <Text style={[styles.ageBannerTitle, { color: brand.kids }]}>
                {childName} at {getAgeLabel(ageMonths)}
              </Text>
              <Text style={[styles.ageBannerBody, { color: colors.textSecondary }]}>
                {'Sleep target: ' + getAgeSleepTarget(ageMonths) + 'h/day\n' +
                  (ageMonths < 6 ? 'Nutrition: breast/formula only (8–12 feeds/day)' :
                    ageMonths < 12 ? 'Nutrition: introducing solids alongside milk' :
                      ageMonths < 24 ? 'Nutrition: 3 meals + snacks, ~1000 cal/day' :
                        'Nutrition: 3 meals + 2 snacks/day')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIP DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function TipDetailModal({
  tip, childName, analytics, scores, ageMonths, onClose,
}: {
  tip: TipData
  childName: string
  analytics: AnalyticsData | null
  scores: WellnessScores | null
  ageMonths: number
  onClose: () => void
}) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const Icon = tip.icon

  function handleAskGrandma() {
    const ctx = scores && analytics
      ? buildGrandmaContext(scores, analytics, childName, ageMonths) + `\n\nI have a specific question about: ${tip.title} — ${tip.body}`
      : `${tip.title}: ${tip.body}`
    onClose()
    setTimeout(() => router.push({ pathname: '/grandma-talk', params: { insightContext: ctx } } as any), 150)
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.tipModalContent, { backgroundColor: colors.surface, borderRadius: radius.xl, paddingBottom: insets.bottom + 20 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.tipModalHeaderRow}>
            <View style={[styles.tipModalIconWrap, { backgroundColor: tip.color + '20' }]}>
              <Icon size={22} color={tip.color} strokeWidth={2} />
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.tipModalTitle, { color: colors.text }]}>{tip.title}</Text>
          <View style={[styles.tipModalSummary, { backgroundColor: tip.color + '12', borderRadius: radius.lg }]}>
            <Text style={[styles.tipModalSummaryText, { color: tip.color }]}>{tip.body}</Text>
          </View>
          <Text style={[styles.tipModalDetail, { color: colors.textSecondary }]}>{tip.detail}</Text>

          <Pressable
            onPress={handleAskGrandma}
            style={({ pressed }) => [
              styles.tipAskBtn,
              { backgroundColor: colors.primaryTint, borderRadius: radius.full, borderColor: colors.primary + '30' },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Sparkles size={16} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.tipAskBtnText, { color: colors.primary }]}>Ask Grandma about this</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELLNESS SCORE ARC
// ═══════════════════════════════════════════════════════════════════════════════

function WellnessScoreArc({
  scores,
  onInfoPress,
  childId,
}: {
  scores: WellnessScores
  onInfoPress: () => void
  childId: string
}) {
  const { colors, radius } = useTheme()
  const [activePillar, setActivePillar] = useState<PillarKey | null>(null)

  const cx     = ARC_SIZE / 2
  const cy     = ARC_SIZE / 2

  // Six shared values — one per ring (React hooks rules: no hooks in loops/maps)
  const p0 = useSharedValue(0); const p1 = useSharedValue(0)
  const p2 = useSharedValue(0); const p3 = useSharedValue(0)
  const p4 = useSharedValue(0); const p5 = useSharedValue(0)
  const scoreOpacity = useSharedValue(0)

  const ap0 = useAnimatedProps(() => ({ strokeDashoffset: 2*Math.PI*ARC_RADII[0]*(1-p0.value) }))
  const ap1 = useAnimatedProps(() => ({ strokeDashoffset: 2*Math.PI*ARC_RADII[1]*(1-p1.value) }))
  const ap2 = useAnimatedProps(() => ({ strokeDashoffset: 2*Math.PI*ARC_RADII[2]*(1-p2.value) }))
  const ap3 = useAnimatedProps(() => ({ strokeDashoffset: 2*Math.PI*ARC_RADII[3]*(1-p3.value) }))
  const ap4 = useAnimatedProps(() => ({ strokeDashoffset: 2*Math.PI*ARC_RADII[4]*(1-p4.value) }))
  const ap5 = useAnimatedProps(() => ({ strokeDashoffset: 2*Math.PI*ARC_RADII[5]*(1-p5.value) }))
  const ringAnimatedProps = [ap0, ap1, ap2, ap3, ap4, ap5]

  const scoreAnimStyle = useAnimatedStyle(() => ({
    opacity: scoreOpacity.value,
    transform: [{ scale: 0.85 + 0.15 * scoreOpacity.value }],
  }))

  useEffect(() => {
    p0.value = 0; p1.value = 0; p2.value = 0
    p3.value = 0; p4.value = 0; p5.value = 0
    scoreOpacity.value = 0

    const targets = PILLAR_ORDER.map((key) => scores[key].hasData ? scores[key].value / 10 : 0)
    p0.value = withDelay(0,   withSpring(targets[0], { damping: 14, stiffness: 90, mass: 0.8 }))
    p1.value = withDelay(150, withSpring(targets[1], { damping: 14, stiffness: 90, mass: 0.8 }))
    p2.value = withDelay(300, withSpring(targets[2], { damping: 14, stiffness: 90, mass: 0.8 }))
    p3.value = withDelay(450, withSpring(targets[3], { damping: 14, stiffness: 90, mass: 0.8 }))
    p4.value = withDelay(600, withSpring(targets[4], { damping: 14, stiffness: 90, mass: 0.8 }))
    p5.value = withDelay(750, withSpring(targets[5], { damping: 14, stiffness: 90, mass: 0.8 }))
    scoreOpacity.value = withDelay(950, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }))
  }, [childId, scores.overall])

  const hasAnyData = PILLAR_ORDER.some((k) => scores[k].hasData)
  const overall    = hasAnyData ? scores.overall : 0
  const overallC   = hasAnyData ? scoreColor(overall) : colors.textMuted

  function getPillarExplanation(key: PillarKey): string {
    const score = scores[key]
    const pct   = score.hasData ? Math.round((score.value / 10) * 100) : 0
    const explanations: Record<PillarKey, string> = {
      nutrition: `${pct}% — tracks meal frequency, eating quality, and food variety this week`,
      sleep:     `${pct}% — measures avg sleep hours vs age target, quality, and consistency`,
      mood:      `${pct}% — based on daily mood logs (happy, calm, energetic, fussy, cranky)`,
      health:    `${pct}% — reflects vaccine completion and health event frequency`,
      growth:    `${pct}% — tracks weight & height measurement regularity`,
      activity:  `${pct}% — based on active days this week and variety of activities logged`,
    }
    return score.hasData
      ? explanations[key]
      : 'No data logged yet — start logging to see progress'
  }

  return (
    <View style={styles.arcContainer}>
      <View style={{ width: ARC_SIZE, height: ARC_SIZE }}>
        <Svg width={ARC_SIZE} height={ARC_SIZE}>
          {PILLAR_ORDER.map((key, i) => {
            const r     = ARC_RADII[i]
            const circ  = 2 * Math.PI * r
            const color = PILLAR_CONFIG[key].color
            const isActive = activePillar === key
            return (
              <React.Fragment key={key}>
                <Circle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={color + '1A'}
                  strokeWidth={STROKE_TRACK}
                />
                <AnimatedCircle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? STROKE_FILL + 4 : STROKE_FILL}
                  strokeDasharray={circ}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${cx} ${cy})`}
                  opacity={activePillar !== null && !isActive ? 0.35 : 1}
                  animatedProps={ringAnimatedProps[i]}
                />
              </React.Fragment>
            )
          })}
        </Svg>

        <Animated.View
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, scoreAnimStyle]}
          pointerEvents="none"
        >
          <Text style={{ fontSize: 46, fontWeight: '900', color: overallC, lineHeight: 50 }}>
            {hasAnyData ? overall.toFixed(1) : '—'}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 2 }}>
            thriving score
          </Text>
        </Animated.View>

        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {[...PILLAR_ORDER].reverse().map((key, revI) => {
            const i = PILLAR_ORDER.length - 1 - revI
            const r = ARC_RADII[i]
            return (
              <Pressable
                key={key}
                onPress={() => setActivePillar(activePillar === key ? null : key)}
                hitSlop={0}
                style={{
                  position: 'absolute',
                  left: cx - r,
                  top:  cy - r,
                  width:  r * 2,
                  height: r * 2,
                  borderRadius: r,
                }}
              />
            )
          })}
          {/* Deadzone: blocks touches in the centre (score text area) from hitting ring 5 */}
          <Pressable
            onPress={() => setActivePillar(null)}
            style={{
              position: 'absolute',
              left: cx - ARC_INNER_R,
              top:  cy - ARC_INNER_R,
              width:  ARC_INNER_R * 2,
              height: ARC_INNER_R * 2,
              borderRadius: ARC_INNER_R,
            }}
          />
        </View>
      </View>

      <View style={styles.arcLegend}>
        {PILLAR_ORDER.map((key) => {
          const score    = scores[key]
          const isActive = activePillar === key
          return (
            <Pressable
              key={key}
              onPress={() => setActivePillar(activePillar === key ? null : key)}
              style={[
                styles.legendItem,
                isActive && {
                  backgroundColor: PILLAR_CONFIG[key].color + '18',
                  borderRadius: radius.full,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                },
              ]}
            >
              <View style={[styles.legendDot, { backgroundColor: PILLAR_CONFIG[key].color }]} />
              <Text
                style={[
                  styles.legendLabel,
                  { color: isActive ? PILLAR_CONFIG[key].color : colors.textMuted,
                    fontWeight: isActive ? '800' : '600' },
                ]}
              >
                {PILLAR_CONFIG[key].label}
                {score.hasData ? ` ${score.value.toFixed(0)}` : ''}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {activePillar && (
        <Pressable
          onPress={() => setActivePillar(null)}
          style={[
            styles.arcTooltip,
            {
              backgroundColor: PILLAR_CONFIG[activePillar].color + '15',
              borderColor:     PILLAR_CONFIG[activePillar].color + '40',
              borderRadius: radius.xl,
            },
          ]}
        >
          <View style={styles.arcTooltipHeader}>
            <View style={[styles.arcTooltipIcon, { backgroundColor: PILLAR_CONFIG[activePillar].color + '25' }]}>
              {(() => {
                const Icon = PILLAR_CONFIG[activePillar].icon
                return <Icon size={16} color={PILLAR_CONFIG[activePillar].color} strokeWidth={2} />
              })()}
            </View>
            <Text style={[styles.arcTooltipTitle, { color: PILLAR_CONFIG[activePillar].color }]}>
              {PILLAR_CONFIG[activePillar].label}
              {' — '}
              {scores[activePillar].hasData
                ? `${scores[activePillar].value.toFixed(1)}/10`
                : 'No data'}
            </Text>
          </View>
          <Text style={[styles.arcTooltipBody, { color: colors.textSecondary }]}>
            {getPillarExplanation(activePillar)}
          </Text>
        </Pressable>
      )}

      <Pressable onPress={onInfoPress} style={styles.arcInfoHint} hitSlop={12}>
        <Info size={12} color={colors.textMuted} strokeWidth={2} />
        <Text style={[styles.arcInfoText, { color: colors.textMuted }]}>
          Tap ℹ for score guide
        </Text>
      </Pressable>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRANDMA AI INSIGHT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function GrandmaInsightCard({
  scores, analytics, childName, ageMonths,
}: {
  scores: WellnessScores
  analytics: AnalyticsData
  childName: string
  ageMonths: number
}) {
  const { colors, radius } = useTheme()

  const lowest = PILLAR_ORDER.reduce<PillarKey | null>((min, key) => {
    if (!scores[key].hasData) return min
    if (!min || scores[key].value < scores[min].value) return key
    return min
  }, null)

  const highest = PILLAR_ORDER.reduce<PillarKey | null>((max, key) => {
    if (!scores[key].hasData) return max
    if (!max || scores[key].value > scores[max].value) return key
    return max
  }, null)

  // Overall score line
  const overallLabel = scores.overall >= 8.5 ? 'excellent' : scores.overall >= 7 ? 'on track' : scores.overall >= 5 ? 'developing' : 'needs attention'
  const parts: string[] = [`${childName} is ${overallLabel} at ${scores.overall.toFixed(1)}/10 overall.`]

  // Highlight the lowest pillar with specific data
  if (lowest && scores[lowest].value < 7) {
    if (lowest === 'sleep' && analytics.sleep.hasData) {
      const target = getAgeSleepTarget(ageMonths)
      const deficit = (target - analytics.sleep.avgHours).toFixed(1)
      parts.push(`Sleep is the main focus — averaging ${analytics.sleep.avgHours.toFixed(1)}h vs ${target}h target (${deficit}h short).`)
    } else if (lowest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      parts.push(`Nutrition needs attention — ${pct}% of meals eaten well this week (score: ${scores.nutrition.value.toFixed(1)}/10).`)
    } else {
      parts.push(`${PILLAR_CONFIG[lowest].label} is the main area to work on at ${scores[lowest].value.toFixed(1)}/10.`)
    }
  }

  // Highlight the highest pillar
  if (highest && scores[highest].value >= 8 && highest !== lowest) {
    if (highest === 'sleep' && analytics.sleep.hasData) {
      parts.push(`Sleep is a strength — ${analytics.sleep.avgHours.toFixed(1)}h avg with great consistency!`)
    } else if (highest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      parts.push(`Nutrition is a strength — ${pct}% of meals eaten well (${scores.nutrition.value.toFixed(1)}/10).`)
    } else {
      parts.push(`${PILLAR_CONFIG[highest].label} is a strength at ${scores[highest].value.toFixed(1)}/10.`)
    }
  }

  // Trend note
  const trendPillar = PILLAR_ORDER.find((k) => scores[k].hasData && Math.abs(scores[k].trend) >= 10)
  if (trendPillar) {
    const dir = scores[trendPillar].trend > 0 ? 'improving' : 'declining'
    parts.push(`${PILLAR_CONFIG[trendPillar].label} ${dir} ${Math.abs(scores[trendPillar].trend)}% this week.`)
  }

  const message = parts.join(' ')

  function handleDiscuss() {
    const ctx = buildGrandmaContext(scores, analytics, childName, ageMonths)
    router.push({ pathname: '/grandma-talk', params: { insightContext: ctx } } as any)
  }

  return (
    <Pressable
      onPress={handleDiscuss}
      style={({ pressed }) => [
        styles.insightCard,
        { backgroundColor: colors.primaryTint, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.primary + '30' },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.insightHeader}>
        <View style={[styles.insightBadge, { backgroundColor: colors.primary + '20' }]}>
          <Sparkles size={14} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.insightBadgeText, { color: colors.primary }]}>Grandma insight</Text>
        </View>
        <Text style={[styles.insightDate, { color: colors.textMuted }]}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>

      <Text style={[styles.insightMessage, { color: colors.text }]}>{message}</Text>

      <View style={[styles.insightButton, { backgroundColor: colors.primary + '20', borderRadius: radius.full }]}>
        <Text style={[styles.insightButtonText, { color: colors.primary }]}>Let's discuss</Text>
        <MessageCircle size={14} color={colors.primary} strokeWidth={2} />
      </View>
    </Pressable>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH TIPS SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function HealthTipsSection({
  tips, scores, analytics, childName, ageMonths, onTipPress,
}: {
  tips: TipData[]
  scores: WellnessScores
  analytics: AnalyticsData
  childName: string
  ageMonths: number
  onTipPress: (tip: TipData) => void
}) {
  const { colors, radius } = useTheme()

  function handleAskGrandma() {
    const ctx = buildGrandmaContext(scores, analytics, childName, ageMonths)
    router.push({ pathname: '/grandma-talk', params: { insightContext: ctx } } as any)
  }

  return (
    <View style={styles.tipsSection}>
      <View style={styles.tipsSectionHeader}>
        <Text style={[styles.tipsSectionTitle, { color: colors.text }]}>HEALTH TIPS</Text>
        <Text style={[styles.tipsSectionSub, { color: colors.textMuted }]}>Personalized for {childName} today</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipsScroll}>
        {tips.map((tip, i) => {
          const Icon = tip.icon
          return (
            <Pressable
              key={i}
              onPress={() => onTipPress(tip)}
              style={({ pressed }) => [
                styles.tipCard,
                { backgroundColor: tip.color + '10', borderRadius: radius.xl, borderWidth: 1, borderColor: tip.color + '20' },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <View style={[styles.tipIconWrap, { backgroundColor: tip.color + '20' }]}>
                <Icon size={18} color={tip.color} strokeWidth={2} />
              </View>
              <Text style={[styles.tipTitle, { color: colors.text }]} numberOfLines={2}>{tip.title}</Text>
              <Text style={[styles.tipBody, { color: colors.textSecondary }]} numberOfLines={3}>{tip.body}</Text>
              <View style={styles.tipTapHint}>
                <ChevronRight size={11} color={tip.color} strokeWidth={2.5} />
                <Text style={[styles.tipTapText, { color: tip.color }]}>Tap for details</Text>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      <Pressable
        onPress={handleAskGrandma}
        style={({ pressed }) => [
          styles.askButton,
          { backgroundColor: colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Sparkles size={16} color={colors.primary} strokeWidth={2} />
        <Text style={[styles.askButtonText, { color: colors.text }]}>Ask Grandma with full context</Text>
      </Pressable>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTINE COMPLIANCE SECTION
// ═══════════════════════════════════════════════════════════════════════════════

function RoutineComplianceSection({ data }: { data: RoutineComplianceData }) {
  const { colors, radius } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const SKIP_COLOR = '#FF8C42'
  const adherenceRate = 100 - data.skipRate

  return (
    <View style={{ marginTop: 8 }}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [
          {
            backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1,
            borderColor: expanded ? SKIP_COLOR + '30' : colors.border,
            padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
          },
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: SKIP_COLOR + '15', alignItems: 'center', justifyContent: 'center' }}>
          <SkipForward size={20} color={SKIP_COLOR} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Routine Compliance</Text>
          <View style={{ height: 8, borderRadius: 4, marginTop: 8, overflow: 'hidden', backgroundColor: SKIP_COLOR + '15' }}>
            <View style={{ width: `${adherenceRate}%`, height: '100%', backgroundColor: adherenceRate >= 70 ? '#A2FF86' : adherenceRate >= 40 ? SKIP_COLOR : '#FF7070', borderRadius: 4 }} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {data.hasData
            ? <><Text style={{ color: SKIP_COLOR, fontSize: 22, fontWeight: '900' }}>{data.totalSkips}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>skips</Text></>
            : <Text style={{ color: colors.textMuted, fontSize: 13 }}>No skips</Text>
          }
        </View>
        {expanded ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronRight size={20} color={colors.textMuted} />}
      </Pressable>

      {expanded && (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: SKIP_COLOR + '20', marginTop: 2, padding: 20, gap: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: adherenceRate >= 70 ? '#A2FF86' : SKIP_COLOR, fontSize: 28, fontWeight: '900' }}>{adherenceRate}%</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500', marginTop: 4 }}>adherence this week</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: SKIP_COLOR, fontSize: 28, fontWeight: '900' }}>{data.totalSkips}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500', marginTop: 4 }}>total skips (7d)</Text>
            </View>
          </View>

          {data.hasData && (
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>SKIPS PER DAY</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 56 }}>
                {data.weeklySkips.map((count, i) => {
                  const maxV = Math.max(...data.weeklySkips, 1)
                  const barH = count > 0 ? Math.max((count / maxV) * 44, 10) : 4
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <View style={{ width: '80%', height: barH, backgroundColor: count > 0 ? SKIP_COLOR + 'CC' : colors.border, borderRadius: 4 }} />
                      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500' }}>{data.weekLabels[i]}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {data.mostSkipped.length > 0 && (
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>MOST SKIPPED</Text>
              <View style={{ gap: 10 }}>
                {data.mostSkipped.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MinusCircle size={16} color={SKIP_COLOR} strokeWidth={2} />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '500', flex: 1 }}>{item.name}</Text>
                    <View style={{ backgroundColor: SKIP_COLOR + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: SKIP_COLOR, fontSize: 14, fontWeight: '700' }}>{item.count}×</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          {!data.hasData && <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>No skipped routines this week</Text>}
        </View>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR ROW — score bar with trend + takeaway
// ═══════════════════════════════════════════════════════════════════════════════

function PillarRow({ pillarKey, score, onPress }: {
  pillarKey: PillarKey; score: PillarScore; onPress: () => void
}) {
  const { colors, radius } = useTheme()
  const config = PILLAR_CONFIG[pillarKey]
  const Icon = config.icon
  const pct = score.hasData ? (score.value / 10) * 100 : 0

  const TAKEAWAY: Record<string, string> = {
    excellent: 'Excellent — keep it up!',
    good: 'Good — small wins add up.',
    fair: 'Fair — room to improve.',
    'needs attention': 'Needs attention — check details.',
    low: 'Low — action needed.',
    'no data': 'No data logged yet.',
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pillarRow,
        { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.pillarIcon, { backgroundColor: config.color + '15' }]}>
        <Icon size={20} color={config.color} strokeWidth={2} />
      </View>

      <View style={styles.pillarInfo}>
        <View style={styles.pillarNameRow}>
          <Text style={[styles.pillarName, { color: colors.text }]}>{config.label}</Text>
          {score.hasData && score.trend !== 0 && (
            <View style={styles.trendBadge}>
              {score.trend > 0
                ? <ArrowUpRight size={12} color={brand.success} strokeWidth={2.5} />
                : <ArrowDownRight size={12} color={brand.error} strokeWidth={2.5} />
              }
              <Text style={[styles.trendText, { color: score.trend > 0 ? brand.success : brand.error }]}>
                {Math.abs(score.trend)}%
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.pillarBarBg, { backgroundColor: config.color + '15', borderRadius: radius.full }]}>
          <View style={[styles.pillarBarFill, { width: `${pct}%`, backgroundColor: config.color, borderRadius: radius.full }]} />
        </View>
        <Text style={[styles.pillarTakeaway, { color: colors.textMuted }]}>
          {TAKEAWAY[score.label] ?? score.label}
        </Text>
      </View>

      <View style={styles.pillarScoreWrap}>
        {score.hasData ? (
          <>
            <Text style={[styles.pillarScoreValue, { color: scoreColor(score.value) }]}>{score.value.toFixed(1)}</Text>
            <Text style={[styles.pillarScoreOf, { color: colors.textMuted }]}>/10</Text>
          </>
        ) : (
          <Text style={[styles.pillarScoreOf, { color: colors.textMuted }]}>—</Text>
        )}
      </View>

      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR DETAIL MODAL — slide-up bottom sheet
// ═══════════════════════════════════════════════════════════════════════════════

function PillarDetailModal({
  visible, pillarKey, analytics, chartW, childName, ageMonths, onClose, onFullScreen,
}: {
  visible: boolean
  pillarKey: PillarKey | null
  analytics: AnalyticsData
  chartW: number
  childName: string
  ageMonths: number
  onClose: () => void
  onFullScreen: (id: string) => void
}) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  if (!pillarKey) return null
  const config = PILLAR_CONFIG[pillarKey]
  const Icon = config.icon
  const score = analytics.scores[pillarKey]

  const sheetH = SCREEN_H * 0.87

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* Backdrop tap closes modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Sheet — fixed height so ScrollView flex:1 works */}
        <View style={[styles.modalSheet, { height: sheetH, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: config.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={config.color} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{config.label}</Text>
                {score.hasData && (
                  <Text style={{ color: scoreColor(score.value), fontSize: 14, fontWeight: '700' }}>
                    {score.value.toFixed(1)}/10 — {score.label}
                  </Text>
                )}
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Scrollable content — flex:1 fills the remaining sheet height */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
          >
            <PillarDetail
              pillarKey={pillarKey}
              analytics={analytics}
              chartW={chartW}
              onFullScreen={onFullScreen}
              childName={childName}
              ageMonths={ageMonths}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY SECTION — age-appropriate targets, no score yet
// ═══════════════════════════════════════════════════════════════════════════════

function ActivitySection({ ageMonths, childName }: { ageMonths: number; childName: string }) {
  const { colors, radius } = useTheme()
  const [showModal, setShowModal] = useState(false)
  const ACTIVITY_COLOR = '#FF6B35'

  const target = ageMonths < 12
    ? '20–30 min tummy time & floor play daily'
    : ageMonths < 36
    ? '180 min of light active play spread throughout the day'
    : '60 min of moderate-to-vigorous physical activity daily'

  const tip = ageMonths < 12
    ? 'At this age, tummy time builds neck, shoulder, and core strength — the foundation for crawling and walking.'
    : ageMonths < 36
    ? 'Unstructured active play (climbing, running, dancing) is best. Limit screen time to build movement habits early.'
    : 'Outdoor play, swimming, dancing, or active games all count. Limit sitting time to under 1 hour at a stretch.'

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.pillarRow,
          { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => setShowModal(true)}
      >
        <View style={[styles.pillarIcon, { backgroundColor: ACTIVITY_COLOR + '15' }]}>
          <Zap size={20} color={ACTIVITY_COLOR} strokeWidth={2} />
        </View>
        <View style={styles.pillarInfo}>
          <Text style={[styles.pillarName, { color: colors.text }]}>Activity</Text>
          <Text style={[styles.pillarTakeaway, { color: colors.textMuted }]} numberOfLines={2}>{target}</Text>
          <Text style={[{ fontSize: 11, fontWeight: '500', color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>{tip}</Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>

      <ActivityModal
        visible={showModal}
        ageMonths={ageMonths}
        childName={childName}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}

function ActivityModal({
  visible, ageMonths, childName, onClose,
}: {
  visible: boolean
  ageMonths: number
  childName: string
  onClose: () => void
}) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const ACTIVITY_COLOR = '#FF6B35'

  interface ActivityItem { rank: number; label: string; pct: number; emoji: string; tip: string }

  const activities: ActivityItem[] = ageMonths < 12
    ? [
        { rank: 1, label: 'Tummy time', pct: 35, emoji: '👶', tip: 'Builds neck, shoulder, and core strength for crawling' },
        { rank: 2, label: 'Floor play', pct: 30, emoji: '🧸', tip: 'Reaching, grasping, rolling — motor development' },
        { rank: 3, label: 'Movement & carrying', pct: 20, emoji: '🚶', tip: 'Supported sitting, bouncing, gentle movement' },
        { rank: 4, label: 'Rest & sleep', pct: 15, emoji: '😴', tip: 'Essential for brain development at this age' },
      ]
    : ageMonths < 36
    ? [
        { rank: 1, label: 'Active free play', pct: 40, emoji: '🏃', tip: 'Climbing, running, dancing — unstructured is best' },
        { rank: 2, label: 'Outdoor time', pct: 30, emoji: '🌳', tip: 'Fresh air, nature exploration, sensory play' },
        { rank: 3, label: 'Structured play', pct: 20, emoji: '🧩', tip: 'Puzzles, building, role-play — cognitive growth' },
        { rank: 4, label: 'Quiet rest', pct: 10, emoji: '📖', tip: 'Story time, calm activities between active sessions' },
      ]
    : [
        { rank: 1, label: 'Physical activity', pct: 40, emoji: '⚽', tip: 'Running, jumping, sports — at least 60 min/day' },
        { rank: 2, label: 'Outdoor play', pct: 25, emoji: '🌳', tip: 'Parks, nature, free exploration' },
        { rank: 3, label: 'Creative play', pct: 20, emoji: '🎨', tip: 'Art, building, imaginative games' },
        { rank: 4, label: 'Structured learning', pct: 15, emoji: '📚', tip: 'Reading, puzzles, educational activities' },
      ]

  const sheetH = SCREEN_H * 0.75

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.modalSheet, { height: sheetH, backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <View style={[styles.modalHeader, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: ACTIVITY_COLOR + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} color={ACTIVITY_COLOR} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Activity Guide</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
                  {childName} · recommended split
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 20, gap: 12 }}
          >
            {activities.map((item) => (
              <View
                key={item.rank}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{item.label}</Text>
                    <Text style={{ color: ACTIVITY_COLOR, fontSize: 18, fontWeight: '900' }}>{item.pct}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: ACTIVITY_COLOR + '15', overflow: 'hidden' }}>
                    <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: ACTIVITY_COLOR + 'CC', borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500' }}>{item.tip}</Text>
                </View>
              </View>
            ))}

            <View style={{ backgroundColor: ACTIVITY_COLOR + '10', borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: ACTIVITY_COLOR + '25' }}>
              <Text style={{ color: ACTIVITY_COLOR, fontSize: 13, fontWeight: '700' }}>
                {ageMonths < 12
                  ? '📋 Aim for 20–30 min tummy time daily, spread across sessions.'
                  : ageMonths < 36
                  ? '📋 WHO recommends 180 min of activity/day for toddlers, spread throughout.'
                  : '📋 WHO recommends 60 min of moderate-to-vigorous activity daily for children 3+.'}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR DETAIL — charts with day detail strip
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

function PillarDetail({ pillarKey, analytics, chartW, onFullScreen, childName, ageMonths }: {
  pillarKey: PillarKey
  analytics: AnalyticsData
  chartW: number
  onFullScreen: (id: string) => void
  childName: string
  ageMonths: number
}) {
  const { colors, radius } = useTheme()

  switch (pillarKey) {
    case 'nutrition': {
      const totalMeals = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const totalGood = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const totalLittle = analytics.nutrition.eatQuality.little.reduce((a, b) => a + b, 0)
      const totalNone = analytics.nutrition.eatQuality.none.reduce((a, b) => a + b, 0)
      const daysLogged = analytics.nutrition.mealFrequency.filter((m) => m > 0).length
      const avgMealsPerDay = daysLogged > 0 ? (totalMeals / daysLogged).toFixed(1) : '—'
      const pctGood = totalMeals > 0 ? Math.round((totalGood / totalMeals) * 100) : 0
      const pctLittle = totalMeals > 0 ? Math.round((totalLittle / totalMeals) * 100) : 0
      const pctNone = totalMeals > 0 ? Math.round((totalNone / totalMeals) * 100) : 0
      const variety = analytics.nutrition.topFoods.length
      const score = analytics.scores.nutrition

      return analytics.nutrition.hasData ? (
        <View style={styles.detailBody}>
          {/* Summary stats */}
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Ate well" value={`${pctGood}%`} color={brand.success} />
            <StatPill label="Avg meals/day" value={avgMealsPerDay} color={PILLAR_CONFIG.nutrition.color} />
            <StatPill label="Foods variety" value={`${variety}`} color={brand.secondary} />
          </View>

          {/* Explanation */}
          <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
            <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700' }]}>
              How this score works
            </Text>
            <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
              {`${pctGood}% of ${totalMeals} meals this week were eaten well. ${pctLittle > 0 ? `${pctLittle}% were eaten partially. ` : ''}${pctNone > 0 ? `${pctNone}% were refused. ` : ''}${daysLogged < 7 ? `Only ${daysLogged} of 7 days logged — consistent logging improves accuracy.` : 'Great logging consistency this week!'}`}
            </Text>
            {variety < 5 && (
              <Text style={[styles.detailExplain, { color: brand.accent }]}>
                {`${variety} unique food${variety !== 1 ? 's' : ''} logged. Aim for 5+ different foods/week to boost the variety bonus.`}
              </Text>
            )}
            {score.trend !== 0 && (
              <Text style={[styles.detailExplain, { color: score.trend > 0 ? brand.success : brand.error }]}>
                {`Nutrition ${score.trend > 0 ? '↑ improving' : '↓ declining'} ${Math.abs(score.trend)}% compared to the start of the week.`}
              </Text>
            )}
          </View>
          <ChartCard title="Weekly Eat Quality" onExpand={() => onFullScreen('eat_quality')}>
            <EatQualityBubbles
              good={analytics.nutrition.eatQuality.good}
              little={analytics.nutrition.eatQuality.little}
              none={analytics.nutrition.eatQuality.none}
            />
          </ChartCard>
          <ChartCard title="Meals per Day" onExpand={() => onFullScreen('meal_freq')}>
            <MealsLineChart
              data={analytics.nutrition.mealFrequency}
              labels={analytics.nutrition.weekLabels}
              width={chartW}
            />
          </ChartCard>
          {analytics.nutrition.topFoods.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Most Logged Foods</Text>
              <View style={{ gap: 0 }}>
                {analytics.nutrition.topFoods.map((food, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      paddingVertical: 12,
                      borderBottomWidth: i < analytics.nutrition.topFoods.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: rankColor(i) + '25', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: rankColor(i), fontSize: 12, fontWeight: '900' }}>#{i + 1}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{food.label}</Text>
                    <View style={{ backgroundColor: PILLAR_CONFIG.nutrition.color + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 }}>
                      <Text style={{ color: PILLAR_CONFIG.nutrition.color, fontSize: 14, fontWeight: '800' }}>×{food.count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      ) : <EmptyDetail pillar="nutrition" />
    }

    case 'sleep': {
      const target = getAgeSleepTarget(ageMonths)
      const avg = analytics.sleep.avgHours
      const deficit = target - avg
      const daysOnTarget = analytics.sleep.dailyHours.filter((h) => h > 0 && h >= target).length
      const daysLogged = analytics.sleep.dailyHours.filter((h) => h > 0).length
      const totalSessions = analytics.sleep.qualityCounts.great + analytics.sleep.qualityCounts.good + analytics.sleep.qualityCounts.restless + analytics.sleep.qualityCounts.poor
      const pctGoodSleep = totalSessions > 0
        ? Math.round(((analytics.sleep.qualityCounts.great + analytics.sleep.qualityCounts.good) / totalSessions) * 100)
        : 0
      const sleepScore = analytics.scores.sleep

      return analytics.sleep.hasData ? (
        <View style={styles.detailBody}>
          {/* Stats at top */}
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Avg/night" value={`${avg.toFixed(1)}h`} color={PILLAR_CONFIG.sleep.color} />
            <StatPill label="Quality" value={getBestQuality(analytics.sleep.qualityCounts)} color={brand.success} />
            <StatPill label="Target" value={`${target}h`} color={colors.textMuted} />
          </View>

          {/* Explanation */}
          <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
            <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700' }]}>
              How this score works
            </Text>
            <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
              {`${childName} averaged ${avg.toFixed(1)}h/night across ${daysLogged} logged days. The target for ${getAgeLabel(ageMonths)} is ${target}h including naps. `}
              {deficit > 0.5
                ? `That's a ${deficit.toFixed(1)}h nightly deficit — consistent early bedtimes and a wind-down routine can help close this gap.`
                : `${childName} is meeting the sleep target!`}
            </Text>
            {daysOnTarget > 0 && (
              <Text style={[styles.detailExplain, { color: brand.success }]}>
                {`${daysOnTarget} of ${daysLogged} logged nights hit the ${target}h target.`}
              </Text>
            )}
            {sleepScore.trend !== 0 && (
              <Text style={[styles.detailExplain, { color: sleepScore.trend > 0 ? brand.success : brand.error }]}>
                {`Sleep ${sleepScore.trend > 0 ? '↑ improving' : '↓ declining'} ${Math.abs(sleepScore.trend)}% vs the start of the week.`}
              </Text>
            )}
            {daysLogged < 5 && (
              <Text style={[styles.detailExplain, { color: brand.accent }]}>
                {`Only ${daysLogged} days logged — log sleep daily for a more accurate score.`}
              </Text>
            )}
          </View>

          {/* Highlighted bar chart */}
          <ChartCard title="Daily Sleep Hours" onExpand={() => onFullScreen('sleep_weekly')}>
            <HighlightBarChart
              data={analytics.sleep.dailyHours}
              labels={analytics.sleep.weekLabels}
              color={PILLAR_CONFIG.sleep.color}
              width={chartW}
            />
          </ChartCard>

          {/* Sleep quality breakdown */}
          <ChartCard title="Sleep Quality Breakdown" onExpand={() => onFullScreen('sleep_quality')}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </ChartCard>
        </View>
      ) : <EmptyDetail pillar="sleep" />
    }

    case 'mood':
      return analytics.mood.hasData ? (
        <View style={styles.detailBody}>
          <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
            Mood score weights: happy/calm = positive, energetic = neutral-positive, fussy/cranky = negative. More consistent logging improves accuracy.
          </Text>
          <ChartCard title="Mood Distribution This Week" onExpand={() => onFullScreen('mood_dist')}>
            <MoodDistribution moods={analytics.mood.dominantMoods} />
          </ChartCard>
          <ChartCard title="Daily Mood Tracking" onExpand={() => onFullScreen('mood_daily')}>
            <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={chartW} />
          </ChartCard>
        </View>
      ) : <EmptyDetail pillar="mood" />

    case 'health': {
      const doneVaccines = analytics.health.vaccines.filter((v) => v.done).length
      const totalVaccines = analytics.health.vaccines.length
      const vaccinePct = totalVaccines > 0 ? Math.round((doneVaccines / totalVaccines) * 100) : 0
      const totalEvents = analytics.health.weeklyFrequency.reduce((a, b) => a + b, 0)

      // Group events by type
      const eventsByType: Record<string, typeof analytics.health.recentEvents> = {}
      for (const e of analytics.health.recentEvents) {
        if (!eventsByType[e.type]) eventsByType[e.type] = []
        eventsByType[e.type].push(e)
      }

      return (
        <View style={styles.detailBody}>
          {/* Summary card */}
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Vaccines done" value={`${doneVaccines}/${totalVaccines}`} color={brand.success} />
            <StatPill label="Events this week" value={`${totalEvents}`} color={totalEvents === 0 ? brand.success : brand.accent} />
            <StatPill label="Completion" value={`${vaccinePct}%`} color={PILLAR_CONFIG.health.color} />
          </View>

          {/* Health score explanation */}
          <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
            <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700' }]}>How this score works</Text>
            <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
              {`Health score = vaccine completion (60%) + low health incidents (40%). ${doneVaccines}/${totalVaccines} vaccines logged. ${totalEvents === 0 ? 'No health events this week — great!' : `${totalEvents} health event${totalEvents !== 1 ? 's' : ''} logged this week.`}`}
            </Text>
          </View>

          {/* Recent events by type */}
          {analytics.health.hasData && analytics.health.recentEvents.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Recent Events</Text>
              {Object.entries(eventsByType).map(([type, events]) => (
                <View key={type} style={{ marginBottom: 12 }}>
                  <Text style={{ color: getEventColor(type), fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>
                    {getHealthEventLabel(type).toUpperCase()}
                  </Text>
                  {events.map((e, i) => (
                    <View
                      key={i}
                      style={[styles.eventRow, { borderBottomColor: i < events.length - 1 ? colors.border : 'transparent' }]}
                    >
                      <View style={[styles.eventDot, { backgroundColor: getEventColor(type) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.eventLabel, { color: colors.text }]} numberOfLines={1}>{e.label}</Text>
                        <Text style={[styles.eventDate, { color: colors.textMuted }]}>{e.date}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Weekly event frequency chart */}
          {analytics.health.hasData && (
            <ChartCard title="Health Events This Week" onExpand={() => onFullScreen('health_freq')}>
              <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={chartW} />
            </ChartCard>
          )}

          {/* Vaccine tracker */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={styles.row}>
              <Syringe size={20} color={PILLAR_CONFIG.health.color} strokeWidth={2} />
              <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 0 }]}>Vaccine Tracker</Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 6, borderRadius: 3, marginTop: 10, marginBottom: 14, overflow: 'hidden', backgroundColor: brand.success + '20' }}>
              <View style={{ width: `${vaccinePct}%`, height: '100%', backgroundColor: brand.success, borderRadius: 3 }} />
            </View>
            <Text style={[styles.detailExplain, { color: colors.textSecondary, marginBottom: 12 }]}>
              {`${doneVaccines}/${totalVaccines} logged as completed`}
            </Text>
            <View style={styles.vaccineGrid}>
              {analytics.health.vaccines.map((v, i) => (
                <View
                  key={i}
                  style={[styles.vaccineChip, {
                    backgroundColor: v.done ? brand.success + '15' : colors.surfaceRaised,
                    borderColor: v.done ? brand.success + '40' : colors.border,
                    borderRadius: radius.full,
                  }]}
                >
                  {v.done && <Shield size={14} color={brand.success} strokeWidth={2.5} />}
                  <Text style={[styles.vaccineText, { color: v.done ? brand.success : colors.textMuted }]}>{v.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )
    }

    case 'growth':
      if (!analytics.growth.hasData) return <EmptyDetail pillar="growth" />
      return (
        <View style={styles.detailBody}>
          <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
            Track {childName}'s weight and height over time. Log measurements after each pediatrician visit for the most accurate growth chart.
          </Text>

          {/* Latest measurements — always shown */}
          {(analytics.growth.weights.length >= 1 || analytics.growth.heights.length >= 1) && (
            <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              {analytics.growth.weights.length >= 1 && (
                <StatPill
                  label={`Weight (${new Date(analytics.growth.weights.at(-1)!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                  value={`${analytics.growth.weights.at(-1)!.value}kg`}
                  color={PILLAR_CONFIG.health.color}
                />
              )}
              {analytics.growth.heights.length >= 1 && (
                <StatPill
                  label={`Height (${new Date(analytics.growth.heights.at(-1)!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`}
                  value={`${analytics.growth.heights.at(-1)!.value}cm`}
                  color={PILLAR_CONFIG.growth.color}
                />
              )}
            </View>
          )}

          {/* Line charts when enough data */}
          {analytics.growth.weights.length >= 2 && (
            <ChartCard title="Weight over time (kg)" onExpand={() => onFullScreen('weight')}>
              <LineChart
                data={analytics.growth.weights.map((w) => w.value)}
                labels={analytics.growth.weights.map((w) => { const d = new Date(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })}
                color={PILLAR_CONFIG.health.color}
                width={chartW}
                unit="kg"
                showAverage
              />
            </ChartCard>
          )}
          {analytics.growth.heights.length >= 2 && (
            <ChartCard title="Height over time (cm)" onExpand={() => onFullScreen('height')}>
              <LineChart
                data={analytics.growth.heights.map((h) => h.value)}
                labels={analytics.growth.heights.map((h) => { const d = new Date(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })}
                color={PILLAR_CONFIG.growth.color}
                width={chartW}
                unit="cm"
                showAverage
              />
            </ChartCard>
          )}

          {analytics.growth.weights.length < 2 && analytics.growth.heights.length < 2 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl, alignItems: 'center', paddingVertical: 20 }]}>
              <TrendingUp size={24} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 8 }]}>
                Add at least 2 measurements to see a growth chart. Log more from Calendar → Growth.
              </Text>
            </View>
          )}
        </View>
      )

    case 'activity': {
      const act = analytics.activity
      const COLOR = PILLAR_CONFIG.activity.color
      const ageLabel = getAgeLabel(ageMonths)
      const weeklyTarget = ageMonths < 12
        ? '20–30 min tummy time & floor play daily'
        : ageMonths < 36
        ? '180 min of light active play daily'
        : '60 min of moderate-to-vigorous activity daily'

      const guideItems = ageMonths < 12
        ? [
            { emoji: '👶', label: 'Tummy time', pct: 35, tip: 'Builds neck, shoulder, and core strength for crawling' },
            { emoji: '🧸', label: 'Floor play',  pct: 30, tip: 'Reaching, grasping, rolling — motor development' },
            { emoji: '🚶', label: 'Movement & carrying', pct: 20, tip: 'Supported sitting, bouncing, gentle movement' },
            { emoji: '😴', label: 'Rest & sleep', pct: 15, tip: 'Essential for brain development at this age' },
          ]
        : ageMonths < 36
        ? [
            { emoji: '🏃', label: 'Active free play', pct: 40, tip: 'Climbing, running, dancing — unstructured is best' },
            { emoji: '🌳', label: 'Outdoor time',     pct: 30, tip: 'Fresh air, nature exploration, sensory play' },
            { emoji: '🧩', label: 'Structured play',  pct: 20, tip: 'Puzzles, building, role-play — cognitive growth' },
            { emoji: '📖', label: 'Quiet rest',        pct: 10, tip: 'Story time, calm activities between active sessions' },
          ]
        : [
            { emoji: '⚽', label: 'Physical activity',    pct: 40, tip: 'Running, jumping, sports — at least 60 min/day' },
            { emoji: '🌳', label: 'Outdoor play',         pct: 25, tip: 'Parks, nature, free exploration' },
            { emoji: '🎨', label: 'Creative play',        pct: 20, tip: 'Art, building, imaginative games' },
            { emoji: '📚', label: 'Structured learning',  pct: 15, tip: 'Reading, puzzles, educational activities' },
          ]

      return (
        <View style={styles.detailBody}>
          {/* Stats */}
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Active days" value={act.hasData ? `${act.activeDays}/7` : '—'} color={COLOR} />
            <StatPill label="Sessions" value={act.hasData ? `${act.totalSessions}` : '—'} color={brand.secondary} />
            <StatPill label="Types" value={act.hasData ? `${act.uniqueTypes.length}` : '—'} color={brand.accent} />
          </View>

          {/* Explanation */}
          <View style={[{ backgroundColor: colors.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 8 }]}>
            <Text style={[styles.detailExplain, { color: colors.text, fontWeight: '700' }]}>How this score works</Text>
            <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
              {act.hasData
                ? `${childName} was active on ${act.activeDays} of 7 days this week (${act.totalSessions} session${act.totalSessions !== 1 ? 's' : ''}, ${act.uniqueTypes.length} unique type${act.uniqueTypes.length !== 1 ? 's' : ''}). Score = active days × 1.3 + variety bonus.`
                : `No activity logs found this week. Log sessions from Calendar → Activity to track ${childName}'s movement.`}
            </Text>
            <Text style={[styles.detailExplain, { color: colors.textMuted }]}>
              {`Target for ${ageLabel}: ${weeklyTarget}`}
            </Text>
          </View>

          {/* Weekly sessions bar chart */}
          {act.hasData && (
            <ChartCard title="Activity Sessions This Week" onExpand={() => onFullScreen('activity_weekly')}>
              <HighlightBarChart
                data={act.dailySessions}
                labels={act.weekLabels}
                color={COLOR}
                width={chartW}
              />
            </ChartCard>
          )}

          {/* Age-appropriate guide */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Recommended Activity Split</Text>
            <View style={{ gap: 12, marginTop: 4 }}>
              {guideItems.map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{item.label}</Text>
                      <Text style={{ color: COLOR, fontSize: 15, fontWeight: '900' }}>{item.pct}%</Text>
                    </View>
                    <View style={{ height: 5, borderRadius: 3, backgroundColor: COLOR + '18', overflow: 'hidden' }}>
                      <View style={{ width: `${item.pct}%`, height: '100%', backgroundColor: COLOR + 'CC', borderRadius: 3 }} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '500' }}>{item.tip}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: COLOR + '10', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: COLOR + '25' }}>
              <Text style={{ color: COLOR, fontSize: 12, fontWeight: '700' }}>
                {ageMonths < 12
                  ? '📋 Aim for 20–30 min tummy time daily, spread across sessions.'
                  : ageMonths < 36
                  ? '📋 WHO recommends 180 min of activity/day for toddlers, spread throughout.'
                  : '📋 WHO recommends 60 min of moderate-to-vigorous activity daily for children 3+.'}
              </Text>
            </View>
          </View>
        </View>
      )
    }

    default:
      return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ChildChip({ label, age, active, color, onPress }: { label: string; age: string; active: boolean; color: string; onPress: () => void }) {
  return <ChildPill label={label} age={age} active={active} color={color} onPress={onPress} />
}

function ChartCard({ title, children, onExpand }: { title: string; children: React.ReactNode; onExpand: () => void }) {
  const { colors, radius } = useTheme()
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      <Pressable onPress={onExpand} style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
        <ChevronRight size={16} color={colors.textMuted} />
      </Pressable>
      <View style={styles.chartBody}>{children}</View>
    </View>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors, radius } = useTheme()
  return (
    <View style={[styles.statPill, { backgroundColor: color + '12', borderRadius: radius.xl }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  )
}

function EmptyDetail({ pillar }: { pillar: PillarKey }) {
  const { colors, radius } = useTheme()
  const config = PILLAR_CONFIG[pillar]
  const Icon = config.icon
  const messages: Record<PillarKey, string> = {
    nutrition: 'No meals logged yet this week. Log feeding from the calendar to see nutrition trends.',
    sleep: 'No sleep entries yet. Log sleep from the calendar to track patterns.',
    mood: "No mood entries yet. Track your child's mood daily to see patterns.",
    health: 'No health events logged. Record temperatures, vaccines, and doctor visits here.',
    growth: 'No growth data yet. Log weight and height measurements to track development.',
    activity: 'No activities logged yet this week. Log sessions from the calendar to track movement.',
  }
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      <Icon size={20} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{messages[pillar]}</Text>
    </View>
  )
}

// ─── Chart Sub-components ─────────────────────────────────────────────────────

function StackedBarChart({ good, little, none, labels, width = 300, height = 200 }: {
  good: number[]; little: number[]; none: number[]; labels: string[]; width?: number; height?: number
}) {
  const { colors } = useTheme()
  const leftPad = 40, rightPad = 16, topPad = 28, bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad
  const count = good.length
  const maxVal = Math.max(...good.map((g, i) => g + little[i] + none[i]), 1)
  const barW = Math.min(36, chartW / count - 10)
  const barR = Math.min(8, barW / 3)

  // Y-axis ticks
  const ticks = [0, Math.round(maxVal / 2), maxVal]

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="stackGood" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.success} stopOpacity="1" />
            <Stop offset="1" stopColor={brand.success} stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="stackLittle" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={brand.accent} stopOpacity="0.6" />
          </LinearGradient>
          <LinearGradient id="stackNone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.error} stopOpacity="0.85" />
            <Stop offset="1" stopColor={brand.error} stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        {/* Grid lines + Y labels */}
        {ticks.map((tick, i) => {
          const y = topPad + chartH - (tick / maxVal) * chartH
          return (
            <G key={`grid-${i}`}>
              <Line
                x1={leftPad} y1={y} x2={width - rightPad} y2={y}
                stroke={colors.border} strokeWidth={0.5} opacity={0.3}
                strokeDasharray={i === 0 ? undefined : '4,4'}
              />
              <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
                {tick}
              </SvgText>
            </G>
          )
        })}

        {/* Stacked bars */}
        {good.map((g, i) => {
          const x = leftPad + (i + 0.5) * (chartW / count) - barW / 2
          const baseY = topPad + chartH
          const gH = (g / maxVal) * chartH
          const lH = (little[i] / maxVal) * chartH
          const nH = (none[i] / maxVal) * chartH
          const totalH = gH + lH + nH

          // Build stacked segments with rounded top on topmost segment
          const topR = totalH > barR * 2 ? barR : Math.min(totalH / 2, barR)
          const topY = baseY - totalH

          return (
            <G key={i}>
              {/* Determine which is the topmost segment for rounded corners */}
              {(() => {
                const hasN = nH > 0, hasL = lH > 0, hasG = gH > 0
                const topSeg = hasN ? 'none' : hasL ? 'little' : 'good'
                const segments: { fill: string; y0: number; h: number }[] = []
                if (hasG) segments.push({ fill: 'url(#stackGood)', y0: baseY - gH, h: gH })
                if (hasL) segments.push({ fill: 'url(#stackLittle)', y0: baseY - gH - lH, h: lH })
                if (hasN) segments.push({ fill: 'url(#stackNone)', y0: topY, h: nH })

                return segments.map((seg, si) => {
                  const isTop = (seg.fill.includes('Good') && topSeg === 'good')
                    || (seg.fill.includes('Little') && topSeg === 'little')
                    || (seg.fill.includes('None') && topSeg === 'none')

                  if (isTop && seg.h > 2) {
                    const r = Math.min(topR, seg.h / 2)
                    return (
                      <Path key={si} d={`
                        M ${x} ${seg.y0 + seg.h}
                        L ${x} ${seg.y0 + r}
                        Q ${x} ${seg.y0}, ${x + r} ${seg.y0}
                        L ${x + barW - r} ${seg.y0}
                        Q ${x + barW} ${seg.y0}, ${x + barW} ${seg.y0 + r}
                        L ${x + barW} ${seg.y0 + seg.h}
                        Z
                      `} fill={seg.fill} />
                    )
                  }
                  return <Rect key={si} x={x} y={seg.y0} width={barW} height={Math.max(seg.h, 1)} fill={seg.fill} />
                })
              })()}
            </G>
          )
        })}
      </Svg>
      <View style={[styles.labelRow, { width, paddingLeft: leftPad, paddingRight: rightPad }]}>
        {labels.map((l, i) => <Text key={i} style={[styles.label, { color: colors.textMuted }]}>{l}</Text>)}
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={brand.success} label="Ate well" />
        <LegendDot color={brand.accent} label="A little" />
        <LegendDot color={brand.error} label="Didn't eat" />
      </View>
    </View>
  )
}

function EatQualityBubbles({
  good, little, none,
}: {
  good: number[]
  little: number[]
  none: number[]
}) {
  const { colors } = useTheme()
  const totalGood = good.reduce((a, b) => a + b, 0)
  const totalLittle = little.reduce((a, b) => a + b, 0)
  const totalNone = none.reduce((a, b) => a + b, 0)
  const total = totalGood + totalLittle + totalNone
  if (total === 0) return null

  const pctGood = Math.round((totalGood / total) * 100)
  const pctLittle = Math.round((totalLittle / total) * 100)
  const pctNone = 100 - pctGood - pctLittle

  const items = [
    { label: 'Ate well', pct: pctGood, color: brand.success },
    { label: 'A little', pct: pctLittle, color: brand.accent },
    { label: "Didn't eat", pct: pctNone, color: brand.error },
  ].filter((i) => i.pct > 0)

  const maxPct = Math.max(...items.map((i) => i.pct), 1)

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 20, paddingVertical: 16 }}>
      {items.map((item) => {
        const size = 56 + (item.pct / maxPct) * 52 // 56–108px
        return (
          <View key={item.label} style={{ alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: item.color + '20',
                borderWidth: 2, borderColor: item.color + '50',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: item.color, fontSize: size > 80 ? 20 : 16, fontWeight: '900' }}>
                {item.pct}%
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textAlign: 'center', maxWidth: size + 8 }}>
              {item.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function MealsLineChart({
  data, labels, width,
}: {
  data: number[]
  labels: string[]
  width: number
}) {
  const { colors } = useTheme()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const color = PILLAR_CONFIG.nutrition.color

  const leftPad = 32
  const rightPad = 16
  const topPad = 32
  const bottomPad = 8
  const svgH = 160
  const innerW = width - leftPad - rightPad
  const innerH = svgH - topPad - bottomPad

  const maxV = Math.max(...data, 1)
  const nonZeroData = data.some((v) => v > 0)

  const pts = data.map((v, i) => ({
    x: leftPad + (i / Math.max(data.length - 1, 1)) * innerW,
    y: topPad + innerH - (v / maxV) * innerH,
    v,
  }))

  const curvePath = nonZeroData ? smoothPath(pts) : ''
  const areaPath = nonZeroData
    ? curvePath + ` L ${pts[pts.length - 1].x} ${topPad + innerH} L ${pts[0].x} ${topPad + innerH} Z`
    : ''

  return (
    <View>
      <View>
        <Svg width={width} height={svgH}>
          <Defs>
            <LinearGradient id="mealsAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.18" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Area fill */}
          {nonZeroData && <Path d={areaPath} fill="url(#mealsAreaGrad)" />}

          {/* Smooth line */}
          {nonZeroData && (
            <Path d={curvePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Y-axis max label */}
          <SvgText x={leftPad - 6} y={topPad + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
            {maxV}
          </SvgText>
          <SvgText x={leftPad - 6} y={topPad + innerH + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
            0
          </SvgText>

          {/* Point circles */}
          {pts.map((p, i) => (
            <G key={i}>
              <Circle
                cx={p.x} cy={p.y} r={selectedDay === i ? 20 : 15}
                fill={selectedDay === i ? color + '30' : color + '15'}
                stroke={selectedDay === i ? color : color + '60'}
                strokeWidth={1.5}
              />
              {/* Fork & knife emoji via SvgText */}
              <SvgText x={p.x} y={p.y + 6} textAnchor="middle" fontSize={15}>
                🍽️
              </SvgText>
            </G>
          ))}
        </Svg>

        {/* Pressable overlay for each point */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          {pts.map((p, i) => (
            <Pressable
              key={i}
              onPress={() => setSelectedDay(selectedDay === i ? null : i)}
              style={{ position: 'absolute', left: p.x - 20, top: p.y - 20, width: 40, height: 40 }}
            />
          ))}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', paddingLeft: leftPad, paddingRight: rightPad, marginTop: 4 }}>
        {labels.map((label, i) => (
          <Text
            key={i}
            style={{
              flex: 1, textAlign: 'center', fontSize: 12, fontWeight: selectedDay === i ? '800' : '600',
              color: selectedDay === i ? color : colors.textMuted,
            }}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Tap tooltip */}
      {selectedDay !== null && (
        <View style={{ backgroundColor: color + '15', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: color + '30' }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
            <Text style={{ color, fontWeight: '800' }}>{labels[selectedDay]}: </Text>
            {data[selectedDay] === 0
              ? 'No meals logged'
              : `${data[selectedDay]} meal${data[selectedDay] !== 1 ? 's' : ''} logged`}
          </Text>
        </View>
      )}
    </View>
  )
}

function HighlightBarChart({
  data, labels, color, width = 300, height = 180,
}: {
  data: number[]
  labels: string[]
  color: string
  width?: number
  height?: number
}) {
  const { colors } = useTheme()
  if (data.length === 0) return null

  const leftPad = 40
  const rightPad = 16
  const topPad = 28
  const bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad

  const maxV = Math.max(...data, 0.1)
  const maxIdx = data.indexOf(maxV)
  const ticks = [0, Math.round(maxV / 2), Math.round(maxV)]
  const barW = Math.min(36, chartW / data.length - 10)
  const barR = Math.min(8, barW / 3)

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="hlBarHigh" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.55" />
          </LinearGradient>
          <LinearGradient id="hlBarLow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {ticks.map((tick, i) => {
          const y = topPad + chartH - (tick / maxV) * chartH
          return (
            <G key={i}>
              <Line x1={leftPad} y1={y} x2={width - rightPad} y2={y} stroke={colors.border} strokeWidth={0.5} opacity={0.3} strokeDasharray={i === 0 ? undefined : '4,4'} />
              <SvgText x={leftPad - 10} y={y + 4} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="end">
                {tick}
              </SvgText>
            </G>
          )
        })}

        {/* Bars */}
        {data.map((v, i) => {
          const rawH = v > 0 ? Math.max((v / maxV) * chartH, 4) : 4
          const x = leftPad + (i + 0.5) * (chartW / data.length) - barW / 2
          const y = topPad + chartH - rawH
          const isMax = i === maxIdx && v > 0
          const rTop = rawH > barR * 2 ? barR : Math.min(rawH / 2, barR)
          const barPath = `M ${x} ${y + rawH} L ${x} ${y + rTop} Q ${x} ${y}, ${x + rTop} ${y} L ${x + barW - rTop} ${y} Q ${x + barW} ${y}, ${x + barW} ${y + rTop} L ${x + barW} ${y + rawH} Z`

          return (
            <G key={i}>
              {isMax && (
                <Path d={barPath} fill={color} opacity={0.12} transform={`translate(0, 2) scale(1.05, 1)`} />
              )}
              <Path d={barPath} fill={isMax ? 'url(#hlBarHigh)' : 'url(#hlBarLow)'} />
              {isMax && v > 0 && (
                <>
                  <Rect x={x - 4} y={y - 22} width={barW + 8} height={18} rx={4} fill={color} opacity={0.15} />
                  <SvgText x={x + barW / 2} y={y - 9} fill={color} fontSize={12} fontWeight="900" textAnchor="middle">
                    {v % 1 === 0 ? v : v.toFixed(1)}h
                  </SvgText>
                </>
              )}
              {!isMax && v > 0 && (
                <SvgText x={x + barW / 2} y={y - 6} fill={colors.textMuted} fontSize={11} fontWeight="600" textAnchor="middle">
                  {v % 1 === 0 ? v : v.toFixed(1)}
                </SvgText>
              )}
            </G>
          )
        })}
      </Svg>

      {/* X labels */}
      <View style={[styles.labelRow, { width, paddingLeft: leftPad, paddingRight: rightPad }]}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.label, { color: i === maxIdx && data[i] > 0 ? color : colors.textMuted, fontWeight: i === maxIdx && data[i] > 0 ? '800' : '600' }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  )
}

function SleepQualityChart({ counts }: { counts: { great: number; good: number; restless: number; poor: number } }) {
  const { colors, radius } = useTheme()
  const total = counts.great + counts.good + counts.restless + counts.poor
  if (total === 0) return null
  const items = [
    { label: 'Great', count: counts.great, color: brand.success, emoji: '😴' },
    { label: 'Good', count: counts.good, color: PILLAR_CONFIG.health.color, emoji: '🙂' },
    { label: 'Restless', count: counts.restless, color: brand.accent, emoji: '😐' },
    { label: 'Poor', count: counts.poor, color: brand.error, emoji: '😣' },
  ]
  return (
    <View style={styles.qualityWrap}>
      {items.map((item, i) => {
        const pct = Math.round((item.count / total) * 100)
        if (item.count === 0) return null
        return (
          <View key={i} style={styles.qualityRow}>
            <Text style={styles.qualityEmoji}>{item.emoji}</Text>
            <Text style={[styles.qualityLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            <View style={[styles.qualityBarBg, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
              <View style={[styles.qualityBarFill, { width: `${pct}%`, backgroundColor: item.color, borderRadius: radius.full }]} />
            </View>
            <Text style={[styles.qualityPct, { color: item.color }]}>{pct}%</Text>
          </View>
        )
      })}
    </View>
  )
}

function MoodDistribution({ moods }: { moods: { mood: string; count: number }[] }) {
  const { colors, radius } = useTheme()
  const total = moods.reduce((a, m) => a + m.count, 0)
  return (
    <View style={styles.moodDistWrap}>
      {moods.map((m, i) => {
        const pct = Math.round((m.count / total) * 100)
        const color = MOOD_COLORS[m.mood] || colors.primary
        const emoji = MOOD_EMOJI[m.mood] || '🙂'
        return (
          <View key={i} style={[styles.moodChip, { backgroundColor: color + '15', borderColor: color + '30', borderRadius: radius.xl }]}>
            <Text style={styles.moodEmoji}>{emoji}</Text>
            <Text style={[styles.moodLabel, { color }]}>{m.mood}</Text>
            <Text style={[styles.moodPct, { color: colors.textSecondary }]}>{pct}%</Text>
          </View>
        )
      })}
    </View>
  )
}

function MoodDailyChart({ dailyCounts, labels, width }: { dailyCounts: Record<string, number[]>; labels: string[]; width: number }) {
  const { colors } = useTheme()
  const days = labels.length
  const moods = Object.keys(dailyCounts)
  const colW = width / days
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', width }}>
        {labels.map((label, dayIdx) => {
          const dayMoods = moods.filter((m) => dailyCounts[m][dayIdx] > 0)
          return (
            <View key={dayIdx} style={{ width: colW, alignItems: 'center', gap: 6, paddingVertical: 10 }}>
              {dayMoods.length > 0 ? dayMoods.map((mood) => {
                const count = dailyCounts[mood][dayIdx]
                const color = MOOD_COLORS[mood] || colors.primary
                return Array.from({ length: Math.min(count, 3) }).map((_, dotIdx) => (
                  <View key={`${mood}-${dotIdx}`} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color + '30', borderWidth: 1.5, borderColor: color + '50', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13 }}>{MOOD_EMOJI[mood]}</Text>
                  </View>
                ))
              }) : (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }} />
              )}
              <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'vaccine': return PILLAR_CONFIG.health.color
    case 'temperature': return brand.error
    case 'medicine': return brand.accent
    default: return brand.secondary
  }
}

function getHealthEventLabel(type: string): string {
  switch (type.toLowerCase()) {
    case 'temperature': return '🌡️ Temperature'
    case 'medicine': return '💊 Medicine'
    case 'vaccine': return '💉 Vaccine'
    case 'note': return '📝 Note'
    default: return type
  }
}

function getBestQuality(counts: { great: number; good: number; restless: number; poor: number }): string {
  const total = counts.great + counts.good + counts.restless + counts.poor
  if (total === 0) return '—'
  return `${Math.round(((counts.great + counts.good) / total) * 100)}% good`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 20 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  screenTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  screenSub: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  infoBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Child selector
  childRow: { gap: 10, paddingVertical: 4 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1 },
  childChipName: { fontSize: 15, fontWeight: '700' },
  childChipAge: { fontSize: 12, fontWeight: '500' },

  // Arc
  arcContainer: { alignItems: 'center', marginTop: 8 },
  arcLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 6 },
  arcTooltip: { marginTop: 10, padding: 16, borderWidth: 1, gap: 8, width: '100%' },
  arcTooltipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arcTooltipIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  arcTooltipTitle: { fontSize: 16, fontWeight: '800' },
  arcTooltipBody: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  arcInfoHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingVertical: 4 },
  arcInfoText: { fontSize: 12, fontWeight: '500' },

  // Insight card
  insightCard: { padding: 20, gap: 14 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insightBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  insightBadgeText: { fontSize: 13, fontWeight: '700' },
  insightDate: { fontSize: 12, fontWeight: '500' },
  insightMessage: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  insightButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, alignSelf: 'flex-start' },
  insightButtonText: { fontSize: 15, fontWeight: '700' },

  // Tips
  tipsSection: { gap: 14 },
  tipsSectionHeader: { gap: 4 },
  tipsSectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  tipsSectionSub: { fontSize: 14, fontWeight: '500' },
  tipsScroll: { gap: 12, paddingRight: 20 },
  tipCard: { width: 200, padding: 18, gap: 12 },
  tipIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  tipBody: { fontSize: 13, fontWeight: '500', lineHeight: 19 },
  tipTapHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tipTapText: { fontSize: 12, fontWeight: '600' },
  askButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 4 },
  askButtonText: { fontSize: 16, fontWeight: '700' },

  // Pillar section
  pillarSection: { gap: 12 },
  pillarSectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  pillarIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pillarInfo: { flex: 1, gap: 6 },
  pillarNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillarName: { fontSize: 16, fontWeight: '700' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendText: { fontSize: 12, fontWeight: '700' },
  pillarBarBg: { height: 8, width: '100%', overflow: 'hidden' },
  pillarBarFill: { height: '100%' },
  pillarTakeaway: { fontSize: 12, fontWeight: '500' },
  pillarScoreWrap: { flexDirection: 'row', alignItems: 'baseline', marginRight: 4 },
  pillarScoreValue: { fontSize: 22, fontWeight: '900' },
  pillarScoreOf: { fontSize: 12, fontWeight: '600' },

  // Detail body
  detailBody: { gap: 16, paddingTop: 8 },
  detailExplain: { fontSize: 13, fontWeight: '500', lineHeight: 19, paddingHorizontal: 4 },

  // Chart card
  card: { padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  chartBody: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },


  // Labels & Legend
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontWeight: '600' },

  // Events
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  eventDot: { width: 12, height: 12, borderRadius: 6 },
  eventLabel: { fontSize: 15, fontWeight: '600' },
  eventDate: { fontSize: 13, fontWeight: '500' },

  // Vaccines
  vaccineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  vaccineChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  vaccineText: { fontSize: 14, fontWeight: '600' },

  // Sleep quality bars
  qualityWrap: { width: '100%', gap: 12, paddingVertical: 6 },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qualityEmoji: { fontSize: 18, width: 28, textAlign: 'center' },
  qualityLabel: { fontSize: 14, fontWeight: '600', width: 64 },
  qualityBarBg: { flex: 1, height: 16, overflow: 'hidden' },
  qualityBarFill: { height: '100%' },
  qualityPct: { fontSize: 14, fontWeight: '800', width: 44, textAlign: 'right' },

  // Mood
  moodDistWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1 },
  moodEmoji: { fontSize: 18 },
  moodLabel: { fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  moodPct: { fontSize: 13, fontWeight: '600' },

  // Stat row
  statRow: { flexDirection: 'row', gap: 12, padding: 8 },
  statPill: { flex: 1, alignItems: 'center', padding: 16, gap: 6 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // Loading / Error / Empty
  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  errorCard: { padding: 20, alignItems: 'center', gap: 10 },
  errorText: { fontSize: 15, fontWeight: '700' },
  errorRetry: { fontSize: 14, fontWeight: '600' },
  emptyCard: { padding: 24, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  emptyAll: { padding: 40, alignItems: 'center', gap: 14, marginTop: 16 },
  emptyAllTitle: { fontSize: 20, fontWeight: '800' },
  emptyAllSub: { fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 22 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { marginHorizontal: 0 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Score info modal
  scoreHighlight: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, marginHorizontal: 20, marginBottom: 20, borderWidth: 1 },
  scoreHighlightNum: { fontSize: 44, fontWeight: '900' },
  scoreHighlightLabel: { fontSize: 16, fontWeight: '700' },
  scoreHighlightSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  infoSectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginHorizontal: 20, marginBottom: 10 },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  bandDot: { width: 12, height: 12, borderRadius: 6 },
  bandLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  bandRange: { fontSize: 14, fontWeight: '500' },
  pillarInfoCard: { marginHorizontal: 20, padding: 16, gap: 10 },
  pillarInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillarInfoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pillarInfoName: { flex: 1, fontSize: 15, fontWeight: '700' },
  pillarInfoWeight: { fontSize: 13, fontWeight: '600' },
  pillarInfoScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillarInfoScoreText: { fontSize: 14, fontWeight: '800' },
  pillarInfoBody: { fontSize: 13, fontWeight: '500', lineHeight: 19 },
  ageBanner: { marginHorizontal: 20, marginBottom: 10, padding: 18, borderWidth: 1, gap: 8 },
  ageBannerTitle: { fontSize: 15, fontWeight: '800' },
  ageBannerBody: { fontSize: 14, fontWeight: '500', lineHeight: 21 },

  // Tip detail modal
  tipModalContent: { marginHorizontal: 20, marginBottom: 20, padding: 24, gap: 16 },
  tipModalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipModalIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tipModalTitle: { fontSize: 22, fontWeight: '900', lineHeight: 28 },
  tipModalSummary: { padding: 14 },
  tipModalSummaryText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  tipModalDetail: { fontSize: 15, fontWeight: '500', lineHeight: 23 },
  tipAskBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, marginTop: 4 },
  tipAskBtnText: { fontSize: 16, fontWeight: '700' },
})
