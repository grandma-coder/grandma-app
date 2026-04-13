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

import { useState, useEffect, useCallback } from 'react'
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
  X,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { LineChart, BarChart, BubbleGrid } from '../charts/SvgCharts'
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

const SCREEN_W = Dimensions.get('window').width

// ─── Pillar Config ─────────────────────────────────────────────────────────

const PILLAR_CONFIG = {
  nutrition: { label: 'Nutrition', color: '#A2FF86', icon: Utensils },
  sleep:     { label: 'Sleep',     color: '#B983FF', icon: Moon },
  mood:      { label: 'Mood',      color: '#FF8AD8', icon: Smile },
  health:    { label: 'Health',    color: '#4D96FF', icon: Heart },
  growth:    { label: 'Growth',    color: '#F59E0B', icon: TrendingUp },
} as const

type PillarKey = keyof typeof PILLAR_CONFIG
const PILLAR_ORDER: PillarKey[] = ['nutrition', 'sleep', 'mood', 'health', 'growth']

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
    `Overall wellness score: ${scores.overall.toFixed(1)}/10`,
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
  const [expandedPillar, setExpandedPillar] = useState<PillarKey | null>(null)
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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
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
          {children.map((c) => (
            <ChildChip
              key={c.id}
              label={c.name}
              active={selectedChildId === c.id}
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
            <WellnessScoreArc scores={analytics.scores} onInfoPress={() => setShowScoreInfo(true)} />

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
              <Text style={[styles.pillarSectionTitle, { color: colors.text }]}>WELLNESS BREAKDOWN</Text>
              {PILLAR_ORDER.map((key) => (
                <View key={key}>
                  <PillarRow
                    pillarKey={key}
                    score={analytics.scores[key]}
                    expanded={expandedPillar === key}
                    onToggle={() => setExpandedPillar(expandedPillar === key ? null : key)}
                  />
                  {expandedPillar === key && (
                    <PillarDetail
                      pillarKey={key}
                      analytics={analytics}
                      chartW={chartW}
                      onFullScreen={setFullScreen}
                      childName={childName}
                      ageMonths={ageMonths}
                    />
                  )}
                </View>
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
  }

  const WEIGHTS: Record<PillarKey, string> = {
    nutrition: '30%', sleep: '25%', mood: '20%', health: '15%', growth: '10%',
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: radius.xl, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Wellness Score Guide</Text>
            <Pressable onPress={onClose} hitSlop={8} style={[styles.modalClose, { backgroundColor: colors.surfaceRaised }]}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {scores && (
              <View style={[styles.scoreHighlight, { backgroundColor: colors.primaryTint, borderRadius: radius.xl, borderColor: colors.primary + '30' }]}>
                <Text style={[styles.scoreHighlightNum, { color: scoreColor(scores.overall) }]}>
                  {scores.overall.toFixed(1)}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scoreHighlightLabel, { color: colors.text }]}>{childName}'s overall wellness</Text>
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

function WellnessScoreArc({ scores, onInfoPress }: { scores: WellnessScores; onInfoPress: () => void }) {
  const { colors } = useTheme()
  const size = SCREEN_W - 32
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 40

  const startAngle = 150
  const totalSweep = 240
  const gapDeg = 4
  const segmentSweep = (totalSweep - gapDeg * 5) / 5
  const strokeW = 16
  const bgStrokeW = 12

  function arcPath(startDeg: number, sweepDeg: number, radius: number): string {
    const s = (startDeg * Math.PI) / 180
    const e = ((startDeg + sweepDeg) * Math.PI) / 180
    const x1 = cx + radius * Math.cos(s)
    const y1 = cy + radius * Math.sin(s)
    const x2 = cx + radius * Math.cos(e)
    const y2 = cy + radius * Math.sin(e)
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }

  function iconPos(segIndex: number) {
    const mid = startAngle + segIndex * (segmentSweep + gapDeg) + segmentSweep / 2
    const rad = (mid * Math.PI) / 180
    const iconR = r + 26
    return { x: cx + iconR * Math.cos(rad), y: cy + iconR * Math.sin(rad) }
  }

  const hasAnyData = PILLAR_ORDER.some((k) => scores[k].hasData)
  const overall = hasAnyData ? scores.overall : 0
  const overallC = hasAnyData ? scoreColor(overall) : colors.textMuted

  return (
    <View style={styles.arcContainer}>
      <Svg width={size} height={size * 0.75} viewBox={`0 ${size * 0.08} ${size} ${size * 0.75}`}>
        <Defs>
          {PILLAR_ORDER.map((key) => (
            <LinearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={PILLAR_CONFIG[key].color} stopOpacity="1" />
              <Stop offset="1" stopColor={PILLAR_CONFIG[key].color} stopOpacity="0.6" />
            </LinearGradient>
          ))}
        </Defs>

        {PILLAR_ORDER.map((key, i) => {
          const segStart = startAngle + i * (segmentSweep + gapDeg)
          return (
            <Path key={`bg-${key}`} d={arcPath(segStart, segmentSweep, r)} stroke={PILLAR_CONFIG[key].color + '20'} strokeWidth={bgStrokeW} fill="none" strokeLinecap="round" />
          )
        })}

        {PILLAR_ORDER.map((key, i) => {
          const score = scores[key]
          if (!score.hasData) return null
          const segStart = startAngle + i * (segmentSweep + gapDeg)
          const fillSweep = (score.value / 10) * segmentSweep
          if (fillSweep < 1) return null
          return (
            <Path key={`fill-${key}`} d={arcPath(segStart, fillSweep, r)} stroke={`url(#grad-${key})`} strokeWidth={strokeW} fill="none" strokeLinecap="round" />
          )
        })}

        {PILLAR_ORDER.map((key, i) => {
          const pos = iconPos(i)
          const color = scores[key].hasData ? PILLAR_CONFIG[key].color : colors.textMuted
          return (
            <G key={`icon-bg-${key}`}>
              <Circle cx={pos.x} cy={pos.y} r={14} fill={color + '15'} stroke={color + '30'} strokeWidth={1} />
            </G>
          )
        })}

        <SvgText x={cx} y={cy - 8} textAnchor="middle" fill={overallC} fontSize={48} fontWeight="900">
          {hasAnyData ? overall.toFixed(1) : '—'}
        </SvgText>
        <SvgText x={cx} y={cy + 22} textAnchor="middle" fill={colors.textSecondary} fontSize={13} fontWeight="600">
          wellness score
        </SvgText>
      </Svg>

      {/* Icon overlays */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        {PILLAR_ORDER.map((key, i) => {
          const pos = iconPos(i)
          const Icon = PILLAR_CONFIG[key].icon
          const color = scores[key].hasData ? PILLAR_CONFIG[key].color : colors.textMuted
          return (
            <View key={`overlay-${key}`} style={{ position: 'absolute', left: pos.x - 9, top: pos.y - 9 + (-size * 0.08) }}>
              <Icon size={18} color={color} strokeWidth={2} />
            </View>
          )
        })}
      </View>

      {/* Legend with individual scores */}
      <View style={styles.arcLegend}>
        {PILLAR_ORDER.map((key) => {
          const score = scores[key]
          return (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: PILLAR_CONFIG[key].color }]} />
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>
                {PILLAR_CONFIG[key].label}{score.hasData ? ` ${score.value.toFixed(0)}` : ''}
              </Text>
            </View>
          )
        })}
      </View>

      <Pressable onPress={onInfoPress} style={styles.arcInfoHint} hitSlop={12}>
        <Info size={12} color={colors.textMuted} strokeWidth={2} />
        <Text style={[styles.arcInfoText, { color: colors.textMuted }]}>Tap ℹ for score guide</Text>
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

  // Build primary message from real data
  const parts: string[] = []
  if (lowest && scores[lowest].value < 6) {
    if (lowest === 'sleep' && analytics.sleep.hasData) {
      const target = getAgeSleepTarget(ageMonths)
      parts.push(`${childName}'s sleep needs attention — averaging ${analytics.sleep.avgHours.toFixed(1)}h vs ${target}h target.`)
    } else if (lowest === 'nutrition' && analytics.nutrition.hasData) {
      const total = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
      const good = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
      const pct = total > 0 ? Math.round((good / total) * 100) : 0
      parts.push(`${childName}'s nutrition score is ${scores.nutrition.value.toFixed(1)}/10 — ${pct}% of meals eaten well.`)
    } else {
      parts.push(`${childName}'s ${PILLAR_CONFIG[lowest].label.toLowerCase()} needs attention at ${scores[lowest].value.toFixed(1)}/10.`)
    }
  } else if (highest && scores[highest].value >= 8) {
    if (highest === 'sleep' && analytics.sleep.hasData) {
      parts.push(`${childName}'s sleep is excellent — ${analytics.sleep.avgHours.toFixed(1)}h avg, great consistency!`)
    } else {
      parts.push(`${childName}'s ${PILLAR_CONFIG[highest].label.toLowerCase()} is excellent at ${scores[highest].value.toFixed(1)}/10 this week!`)
    }
  } else {
    parts.push(`${childName}'s overall wellness is ${scores.overall >= 7 ? 'on track' : 'developing'} at ${scores.overall.toFixed(1)}/10.`)
  }

  // Secondary trend
  if (scores.nutrition.trend !== 0 && scores.nutrition.hasData) {
    const dir = scores.nutrition.trend > 0 ? 'improving' : 'declining'
    parts.push(`Nutrition ${dir} ${Math.abs(scores.nutrition.trend)}% this week.`)
  } else if (scores.sleep.trend !== 0 && scores.sleep.hasData) {
    const dir = scores.sleep.trend > 0 ? 'improving' : 'declining'
    parts.push(`Sleep ${dir} ${Math.abs(scores.sleep.trend)}% this week.`)
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
            padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
          },
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: SKIP_COLOR + '15', alignItems: 'center', justifyContent: 'center' }}>
          <SkipForward size={18} color={SKIP_COLOR} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Routine Compliance</Text>
          <View style={{ height: 6, borderRadius: 3, marginTop: 6, overflow: 'hidden', backgroundColor: SKIP_COLOR + '15' }}>
            <View style={{ width: `${adherenceRate}%`, height: '100%', backgroundColor: adherenceRate >= 70 ? '#A2FF86' : adherenceRate >= 40 ? SKIP_COLOR : '#FF7070', borderRadius: 3 }} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {data.hasData
            ? <><Text style={{ color: SKIP_COLOR, fontSize: 18, fontWeight: '800' }}>{data.totalSkips}</Text><Text style={{ color: colors.textMuted, fontSize: 11 }}>skips</Text></>
            : <Text style={{ color: colors.textMuted, fontSize: 12 }}>No skips</Text>
          }
        </View>
        {expanded ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
      </Pressable>

      {expanded && (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: SKIP_COLOR + '20', marginTop: 2, padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: adherenceRate >= 70 ? '#A2FF86' : SKIP_COLOR, fontSize: 24, fontWeight: '800' }}>{adherenceRate}%</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>adherence this week</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: SKIP_COLOR, fontSize: 24, fontWeight: '800' }}>{data.totalSkips}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>total skips (7d)</Text>
            </View>
          </View>

          {data.hasData && (
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>SKIPS PER DAY</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 48 }}>
                {data.weeklySkips.map((count, i) => {
                  const maxV = Math.max(...data.weeklySkips, 1)
                  const barH = count > 0 ? Math.max((count / maxV) * 40, 8) : 4
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <View style={{ width: '100%', height: barH, backgroundColor: count > 0 ? SKIP_COLOR + 'CC' : colors.border, borderRadius: 3 }} />
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>{data.weekLabels[i]}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          )}

          {data.mostSkipped.length > 0 && (
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>MOST SKIPPED</Text>
              <View style={{ gap: 6 }}>
                {data.mostSkipped.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MinusCircle size={14} color={SKIP_COLOR} strokeWidth={2} />
                    <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{item.name}</Text>
                    <View style={{ backgroundColor: SKIP_COLOR + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: SKIP_COLOR, fontSize: 12, fontWeight: '700' }}>{item.count}×</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          {!data.hasData && <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>No skipped routines this week</Text>}
        </View>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR ROW — score bar with trend + takeaway
// ═══════════════════════════════════════════════════════════════════════════════

function PillarRow({ pillarKey, score, expanded, onToggle }: {
  pillarKey: PillarKey; score: PillarScore; expanded: boolean; onToggle: () => void
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
      onPress={onToggle}
      style={({ pressed }) => [
        styles.pillarRow,
        { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: expanded ? config.color + '30' : colors.border },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.pillarIcon, { backgroundColor: config.color + '15' }]}>
        <Icon size={18} color={config.color} strokeWidth={2} />
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

      {expanded
        ? <ChevronUp size={18} color={colors.textMuted} />
        : <ChevronRight size={18} color={colors.textMuted} />}
    </Pressable>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR DETAIL — expanded charts with day detail strip
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  switch (pillarKey) {
    case 'nutrition':
      return analytics.nutrition.hasData ? (
        <View style={styles.detailBody}>
          <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
            Tracks meal frequency and eating quality. "Ate well" means the full meal was eaten; "a little" means partial; "didn't eat" means refused.
          </Text>
          <ChartCard title="Weekly Eat Quality" onExpand={() => onFullScreen('eat_quality')}>
            <StackedBarChart good={analytics.nutrition.eatQuality.good} little={analytics.nutrition.eatQuality.little} none={analytics.nutrition.eatQuality.none} labels={analytics.nutrition.weekLabels} width={chartW} />
          </ChartCard>
          <ChartCard title="Meals per Day" onExpand={() => onFullScreen('meal_freq')}>
            <BarChart data={analytics.nutrition.mealFrequency} labels={analytics.nutrition.weekLabels} color={PILLAR_CONFIG.nutrition.color} width={chartW} />
          </ChartCard>
          <DayDetailStrip
            labels={analytics.nutrition.weekLabels}
            values={analytics.nutrition.mealFrequency}
            unit="meals"
            color={PILLAR_CONFIG.nutrition.color}
            selected={selectedDay}
            onSelect={setSelectedDay}
            getDetail={(i) => {
              const g = analytics.nutrition.eatQuality.good[i] ?? 0
              const l = analytics.nutrition.eatQuality.little[i] ?? 0
              const n = analytics.nutrition.eatQuality.none[i] ?? 0
              const total = analytics.nutrition.mealFrequency[i] ?? 0
              return total === 0
                ? 'No meals logged'
                : `${total} meal${total !== 1 ? 's' : ''} — ${g} ate well, ${l} a little, ${n} didn't eat`
            }}
          />
          {analytics.nutrition.topFoods.length > 0 && (
            <ChartCard title="Most Logged Foods" onExpand={() => onFullScreen('top_foods')}>
              <BubbleGrid items={analytics.nutrition.topFoods.map((f, i) => ({
                label: f.label, value: f.count,
                color: [PILLAR_CONFIG.nutrition.color, PILLAR_CONFIG.health.color, PILLAR_CONFIG.mood.color, PILLAR_CONFIG.sleep.color, PILLAR_CONFIG.growth.color, '#FF6B35'][i % 6],
              }))} />
            </ChartCard>
          )}
        </View>
      ) : <EmptyDetail pillar="nutrition" />

    case 'sleep':
      return analytics.sleep.hasData ? (
        <View style={styles.detailBody}>
          <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
            Target for {getAgeLabel(ageMonths)}: {getAgeSleepTarget(ageMonths)}h/day including naps. Tap a day below to see that day's total.
          </Text>
          <ChartCard title="Daily Sleep Hours" onExpand={() => onFullScreen('sleep_weekly')}>
            <BarChart data={analytics.sleep.dailyHours} labels={analytics.sleep.weekLabels} color={PILLAR_CONFIG.sleep.color} width={chartW} />
          </ChartCard>
          <DayDetailStrip
            labels={analytics.sleep.weekLabels}
            values={analytics.sleep.dailyHours}
            unit="h"
            color={PILLAR_CONFIG.sleep.color}
            selected={selectedDay}
            onSelect={setSelectedDay}
            getDetail={(i) => {
              const h = analytics.sleep.dailyHours[i] ?? 0
              const target = getAgeSleepTarget(ageMonths)
              if (h === 0) return 'No sleep logged'
              const status = h >= target ? 'on target ✓' : h >= target * 0.85 ? 'near target' : 'below target'
              return `${h.toFixed(1)}h sleep — ${status} (target ${target}h)`
            }}
          />
          <ChartCard title="Sleep Quality Breakdown" onExpand={() => onFullScreen('sleep_quality')}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </ChartCard>
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Avg sleep" value={`${analytics.sleep.avgHours.toFixed(1)}h`} color={PILLAR_CONFIG.sleep.color} />
            <StatPill label="Quality" value={getBestQuality(analytics.sleep.qualityCounts)} color={brand.success} />
            <StatPill label="Target" value={`${getAgeSleepTarget(ageMonths)}h`} color={colors.textMuted} />
          </View>
        </View>
      ) : <EmptyDetail pillar="sleep" />

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
          <DayDetailStrip
            labels={analytics.mood.weekLabels}
            values={analytics.mood.weekLabels.map((_, i) =>
              Object.values(analytics.mood.dailyCounts).reduce((sum, arr) => sum + (arr[i] ?? 0), 0)
            )}
            unit="logs"
            color={PILLAR_CONFIG.mood.color}
            selected={selectedDay}
            onSelect={setSelectedDay}
            getDetail={(i) => {
              const dayMoods = Object.entries(analytics.mood.dailyCounts)
                .filter(([, arr]) => arr[i] > 0)
                .map(([mood, arr]) => `${arr[i]} ${mood}`)
              return dayMoods.length === 0 ? 'No mood logged' : dayMoods.join(', ')
            }}
          />
        </View>
      ) : <EmptyDetail pillar="mood" />

    case 'health':
      return (
        <View style={styles.detailBody}>
          <Text style={[styles.detailExplain, { color: colors.textSecondary }]}>
            Health score combines vaccine completion (60%) and health event frequency (40%). Fewer incidents + more vaccines = higher score.
          </Text>
          {analytics.health.hasData && analytics.health.recentEvents.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Recent Events</Text>
              {analytics.health.recentEvents.map((e, i) => (
                <View key={i} style={styles.eventRow}>
                  <View style={[styles.eventDot, { backgroundColor: getEventColor(e.type) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventLabel, { color: colors.text }]} numberOfLines={1}>{e.label}</Text>
                    <Text style={[styles.eventDate, { color: colors.textMuted }]}>{e.date} — {e.type}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {analytics.health.hasData && (
            <ChartCard title="Health Events (weekly)" onExpand={() => onFullScreen('health_freq')}>
              <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={chartW} />
            </ChartCard>
          )}
          <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <View style={styles.row}>
              <Syringe size={18} color={PILLAR_CONFIG.health.color} strokeWidth={2} />
              <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 0 }]}>Vaccine Tracker</Text>
            </View>
            <Text style={[styles.detailExplain, { color: colors.textSecondary, marginBottom: 10 }]}>
              {analytics.health.vaccines.filter((v) => v.done).length}/{analytics.health.vaccines.length} vaccines logged as completed.
            </Text>
            <View style={styles.vaccineGrid}>
              {analytics.health.vaccines.map((v, i) => (
                <View key={i} style={[styles.vaccineChip, {
                  backgroundColor: v.done ? brand.success + '15' : colors.surfaceRaised,
                  borderColor: v.done ? brand.success + '30' : colors.border,
                  borderRadius: radius.full,
                }]}>
                  {v.done && <Shield size={12} color={brand.success} strokeWidth={2.5} />}
                  <Text style={[styles.vaccineText, { color: v.done ? brand.success : colors.textMuted }]}>{v.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )

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

    default:
      return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAY DETAIL STRIP — tap a day to see per-day data for any bar chart
// ═══════════════════════════════════════════════════════════════════════════════

function DayDetailStrip({
  labels, values, unit, color, selected, onSelect, getDetail,
}: {
  labels: string[]
  values: number[]
  unit: string
  color: string
  selected: number | null
  onSelect: (i: number | null) => void
  getDetail: (i: number) => string
}) {
  const { colors, radius } = useTheme()

  return (
    <View style={styles.dayStrip}>
      <Text style={[styles.dayStripLabel, { color: colors.textMuted }]}>TAP A DAY TO EXPLORE</Text>
      <View style={styles.dayChips}>
        {labels.map((label, i) => {
          const active = selected === i
          const hasData = values[i] > 0
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(active ? null : i)}
              style={[
                styles.dayChip,
                {
                  backgroundColor: active ? color + '25' : colors.surfaceRaised,
                  borderColor: active ? color : colors.border,
                  borderRadius: radius.lg,
                },
              ]}
            >
              <Text style={[styles.dayChipLabel, { color: active ? color : colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.dayChipValue, { color: active ? color : hasData ? colors.text : colors.textMuted }]}>
                {hasData ? `${typeof values[i] === 'number' && !Number.isInteger(values[i]) ? values[i].toFixed(1) : values[i]}${unit}` : '—'}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {selected !== null && (
        <View style={[styles.dayDetail, { backgroundColor: color + '12', borderRadius: radius.lg, borderColor: color + '30' }]}>
          <Text style={[styles.dayDetailText, { color: colors.text }]}>
            <Text style={{ fontWeight: '800', color }}>{labels[selected]}: </Text>
            {getDetail(selected)}
          </Text>
        </View>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ChildChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[styles.childChip, {
        backgroundColor: active ? colors.primaryTint : colors.surface,
        borderColor: active ? colors.primary : colors.border,
        borderRadius: radius.full,
      }]}
    >
      <Text style={[styles.childChipText, { color: active ? colors.primary : colors.text }]}>{label}</Text>
    </Pressable>
  )
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
  }
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      <Icon size={20} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{messages[pillar]}</Text>
    </View>
  )
}

// ─── Chart Sub-components ─────────────────────────────────────────────────────

function StackedBarChart({ good, little, none, labels, width = 300, height = 140 }: {
  good: number[]; little: number[]; none: number[]; labels: string[]; width?: number; height?: number
}) {
  const { colors } = useTheme()
  const leftPad = 28, rightPad = 8, topPad = 16, bottomPad = 8
  const chartW = width - leftPad - rightPad
  const chartH = height - topPad - bottomPad
  const count = good.length
  const maxVal = Math.max(...good.map((g, i) => g + little[i] + none[i]), 1)
  const barW = Math.min(24, chartW / count - 8)

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="stackGood" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.success} stopOpacity="0.9" />
            <Stop offset="1" stopColor={brand.success} stopOpacity="0.6" />
          </LinearGradient>
          <LinearGradient id="stackLittle" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.accent} stopOpacity="0.9" />
            <Stop offset="1" stopColor={brand.accent} stopOpacity="0.6" />
          </LinearGradient>
          <LinearGradient id="stackNone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.error} stopOpacity="0.7" />
            <Stop offset="1" stopColor={brand.error} stopOpacity="0.4" />
          </LinearGradient>
        </Defs>
        {[0, 0.5, 1].map((pct, i) => {
          const y = topPad + chartH * (1 - pct)
          return <Rect key={i} x={leftPad} y={y} width={chartW} height={0.5} fill={colors.border} opacity={0.4} />
        })}
        {good.map((g, i) => {
          const x = leftPad + (i + 0.5) * (chartW / count) - barW / 2
          const baseY = topPad + chartH
          const gH = (g / maxVal) * chartH
          const lH = (little[i] / maxVal) * chartH
          const nH = (none[i] / maxVal) * chartH
          return (
            <G key={i}>
              {gH > 0 && <Rect x={x} y={baseY - gH} width={barW} height={gH} rx={3} fill="url(#stackGood)" />}
              {lH > 0 && <Rect x={x} y={baseY - gH - lH} width={barW} height={lH} rx={0} fill="url(#stackLittle)" />}
              {nH > 0 && <Rect x={x} y={baseY - gH - lH - nH} width={barW} height={nH} rx={3} fill="url(#stackNone)" />}
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
            <View key={dayIdx} style={{ width: colW, alignItems: 'center', gap: 4, paddingVertical: 8 }}>
              {dayMoods.length > 0 ? dayMoods.map((mood) => {
                const count = dailyCounts[mood][dayIdx]
                const color = MOOD_COLORS[mood] || colors.primary
                return Array.from({ length: Math.min(count, 3) }).map((_, dotIdx) => (
                  <View key={`${mood}-${dotIdx}`} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: color + '30', borderWidth: 1.5, borderColor: color + '50', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10 }}>{MOOD_EMOJI[mood]}</Text>
                  </View>
                ))
              }) : (
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }} />
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

function getBestQuality(counts: { great: number; good: number; restless: number; poor: number }): string {
  const total = counts.great + counts.good + counts.restless + counts.poor
  if (total === 0) return '—'
  return `${Math.round(((counts.great + counts.good) / total) * 100)}% good`
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  screenTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  screenSub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  infoBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Child selector
  childRow: { gap: 8, paddingVertical: 4 },
  childChip: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1 },
  childChipText: { fontSize: 14, fontWeight: '600' },

  // Arc
  arcContainer: { alignItems: 'center', marginTop: -8 },
  arcLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 4 },
  arcInfoHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingVertical: 4 },
  arcInfoText: { fontSize: 11, fontWeight: '500' },

  // Insight card
  insightCard: { padding: 16, gap: 12 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insightBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  insightBadgeText: { fontSize: 12, fontWeight: '700' },
  insightDate: { fontSize: 11, fontWeight: '500' },
  insightMessage: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  insightButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 20, alignSelf: 'flex-start' },
  insightButtonText: { fontSize: 14, fontWeight: '700' },

  // Tips
  tipsSection: { gap: 12 },
  tipsSectionHeader: { gap: 2 },
  tipsSectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  tipsSectionSub: { fontSize: 13, fontWeight: '500' },
  tipsScroll: { gap: 12, paddingRight: 16 },
  tipCard: { width: 200, padding: 16, gap: 10 },
  tipIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  tipBody: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  tipTapHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  tipTapText: { fontSize: 11, fontWeight: '600' },
  askButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4 },
  askButtonText: { fontSize: 15, fontWeight: '700' },

  // Pillar section
  pillarSection: { gap: 10 },
  pillarSectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pillarIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pillarInfo: { flex: 1, gap: 5 },
  pillarNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillarName: { fontSize: 15, fontWeight: '700' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendText: { fontSize: 11, fontWeight: '700' },
  pillarBarBg: { height: 6, width: '100%', overflow: 'hidden' },
  pillarBarFill: { height: '100%' },
  pillarTakeaway: { fontSize: 11, fontWeight: '500' },
  pillarScoreWrap: { flexDirection: 'row', alignItems: 'baseline', marginRight: 4 },
  pillarScoreValue: { fontSize: 18, fontWeight: '900' },
  pillarScoreOf: { fontSize: 11, fontWeight: '600' },

  // Detail body
  detailBody: { gap: 12, paddingTop: 4 },
  detailExplain: { fontSize: 12, fontWeight: '500', lineHeight: 17, paddingHorizontal: 4 },

  // Chart card
  card: { padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  chartBody: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Day detail strip
  dayStrip: { gap: 8, paddingVertical: 4 },
  dayStripLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 4 },
  dayChips: { flexDirection: 'row', gap: 6 },
  dayChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1 },
  dayChipLabel: { fontSize: 10, fontWeight: '600' },
  dayChipValue: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  dayDetail: { paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  dayDetailText: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  // Labels & Legend
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 10, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, fontWeight: '600' },

  // Events
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventLabel: { fontSize: 14, fontWeight: '600' },
  eventDate: { fontSize: 12, fontWeight: '500' },

  // Vaccines
  vaccineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  vaccineChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1 },
  vaccineText: { fontSize: 12, fontWeight: '600' },

  // Sleep quality bars
  qualityWrap: { width: '100%', gap: 8, paddingVertical: 4 },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qualityEmoji: { fontSize: 16, width: 24, textAlign: 'center' },
  qualityLabel: { fontSize: 12, fontWeight: '600', width: 56 },
  qualityBarBg: { flex: 1, height: 12, overflow: 'hidden' },
  qualityBarFill: { height: '100%' },
  qualityPct: { fontSize: 12, fontWeight: '800', width: 36, textAlign: 'right' },

  // Mood
  moodDistWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  moodEmoji: { fontSize: 16 },
  moodLabel: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  moodPct: { fontSize: 11, fontWeight: '600' },

  // Stat row
  statRow: { flexDirection: 'row', gap: 10, padding: 12 },
  statPill: { flex: 1, alignItems: 'center', padding: 14, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Loading / Error / Empty
  loadingWrap: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  loadingText: { fontSize: 13, fontWeight: '500' },
  errorCard: { padding: 16, alignItems: 'center', gap: 8 },
  errorText: { fontSize: 14, fontWeight: '700' },
  errorRetry: { fontSize: 13, fontWeight: '600' },
  emptyCard: { padding: 20, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
  emptyAll: { padding: 32, alignItems: 'center', gap: 12, marginTop: 12 },
  emptyAllTitle: { fontSize: 18, fontWeight: '800' },
  emptyAllSub: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '90%', marginHorizontal: 0 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Score info modal
  scoreHighlight: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, marginHorizontal: 20, marginBottom: 20, borderWidth: 1 },
  scoreHighlightNum: { fontSize: 40, fontWeight: '900' },
  scoreHighlightLabel: { fontSize: 15, fontWeight: '700' },
  scoreHighlightSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  infoSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginHorizontal: 20, marginBottom: 8 },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  bandDot: { width: 10, height: 10, borderRadius: 5 },
  bandLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  bandRange: { fontSize: 13, fontWeight: '500' },
  pillarInfoCard: { marginHorizontal: 20, padding: 14, gap: 8 },
  pillarInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillarInfoIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillarInfoName: { flex: 1, fontSize: 14, fontWeight: '700' },
  pillarInfoWeight: { fontSize: 12, fontWeight: '600' },
  pillarInfoScoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillarInfoScoreText: { fontSize: 13, fontWeight: '800' },
  pillarInfoBody: { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  ageBanner: { marginHorizontal: 20, marginBottom: 8, padding: 16, borderWidth: 1, gap: 6 },
  ageBannerTitle: { fontSize: 14, fontWeight: '800' },
  ageBannerBody: { fontSize: 13, fontWeight: '500', lineHeight: 19 },

  // Tip detail modal
  tipModalContent: { marginHorizontal: 20, marginBottom: 20, padding: 20, gap: 14 },
  tipModalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipModalIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tipModalTitle: { fontSize: 20, fontWeight: '900', lineHeight: 26 },
  tipModalSummary: { padding: 12 },
  tipModalSummaryText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  tipModalDetail: { fontSize: 14, fontWeight: '500', lineHeight: 21 },
  tipAskBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1, marginTop: 4 },
  tipAskBtnText: { fontSize: 15, fontWeight: '700' },
})
