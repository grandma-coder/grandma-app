/**
 * Kids Analytics Screen — Premium wellness dashboard
 *
 * Layout:
 *  1. Child selector chips
 *  2. Wellness Score Arc (central visualization)
 *  3. Grandma AI insight card
 *  4. Health Tips carousel
 *  5. Pillar breakdown list (expandable to detailed charts)
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
} from 'react-native'
import { router } from 'expo-router'
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text as SvgText,
} from 'react-native-svg'
import {
  MessageCircle,
  Zap,
  ChevronRight,
  ChevronDown,
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
  Minus,
  Info,
  MinusCircle,
  SkipForward,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { LineChart, BarChart, HeatmapGrid, BubbleGrid } from '../charts/SvgCharts'
import { FullScreenChart } from '../charts/FullScreenChart'
import {
  useKidsAnalytics,
  type AnalyticsData,
  type NutritionData,
  type SleepData,
  type MoodData,
  type HealthData,
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
  happy: '#FBBF24',
  calm: '#6AABF7',
  energetic: '#6EC96E',
  fussy: '#FFB347',
  cranky: '#FF7070',
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  energetic: '⚡',
  fussy: '😣',
  cranky: '😤',
}

// ─── Health Tips Data ──────────────────────────────────────────────────────

function getHealthTips(scores: WellnessScores, analytics: AnalyticsData): { title: string; body: string; color: string; icon: typeof Lightbulb }[] {
  const tips: { title: string; body: string; color: string; icon: typeof Lightbulb }[] = []

  if (scores.nutrition.hasData && scores.nutrition.value < 7) {
    tips.push({
      title: 'Improve Meal Variety',
      body: 'Try introducing 1-2 new foods this week. Variety improves nutrient intake and builds healthier eating habits.',
      color: PILLAR_CONFIG.nutrition.color,
      icon: Lightbulb,
    })
  }

  if (scores.sleep.hasData && scores.sleep.value < 7) {
    tips.push({
      title: 'Better Sleep Routine',
      body: 'Consistent bedtime helps sleep quality. Try dimming lights 30 minutes before bed and reducing screen time.',
      color: PILLAR_CONFIG.sleep.color,
      icon: Moon,
    })
  }

  if (scores.mood.hasData) {
    const crankyCount = analytics.mood.dominantMoods.find((m) => m.mood === 'cranky')?.count || 0
    const fussyCount = analytics.mood.dominantMoods.find((m) => m.mood === 'fussy')?.count || 0
    if (crankyCount + fussyCount > 3) {
      tips.push({
        title: 'Mood Pattern Detected',
        body: 'Higher fussy/cranky episodes this week. Could be teething, growth spurt, or routine changes. Monitor closely.',
        color: PILLAR_CONFIG.mood.color,
        icon: Sparkles,
      })
    }
  }

  if (scores.health.hasData && scores.health.value >= 8) {
    tips.push({
      title: 'Great Health Week!',
      body: 'No concerning health events. Keep up the good routine and stay on top of vaccine schedule.',
      color: PILLAR_CONFIG.health.color,
      icon: Heart,
    })
  }

  // Always add general tips
  tips.push({
    title: 'Daily Activity Goal',
    body: 'Active play supports motor development and better sleep. Aim for at least 30 minutes of tummy time or active play.',
    color: '#FF6B35',
    icon: TrendingUp,
  })

  tips.push({
    title: 'Track Consistently',
    body: 'Logging meals, sleep, and mood daily helps Grandma spot patterns and give better insights.',
    color: brand.primary,
    icon: Sparkles,
  })

  return tips.slice(0, 4)
}

// ─── Main Component ────────────────────────────────────────────────────────

export function KidsAnalytics() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const [selectedChildId, setSelectedChildId] = useState<string | 'all'>('all')
  const [expandedPillar, setExpandedPillar] = useState<PillarKey | null>(null)
  const [fullScreen, setFullScreen] = useState<string | null>(null)

  const { data: analytics, isLoading, error, refetch } = useKidsAnalytics(selectedChildId)
  const [refreshing, setRefreshing] = useState(false)

  const chartW = SCREEN_W - 72

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  // Realtime: refetch when child_logs change
  useEffect(() => {
    const childIds = selectedChildId === 'all'
      ? children.map((c) => c.id)
      : [selectedChildId]

    if (childIds.length === 0) return

    const channel = supabase
      .channel('analytics-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'child_logs' },
        (payload: any) => {
          if (payload.new?.child_id && childIds.includes(payload.new.child_id)) {
            refetch()
          } else if (payload.old?.child_id && childIds.includes(payload.old.child_id)) {
            refetch()
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedChildId, children, refetch])

  // Refetch when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch()
    })
    return () => sub.remove()
  }, [refetch])

  // Fire wellness notifications when scores are computed (deduped per day)
  useEffect(() => {
    if (!analytics?.scores || selectedChildId === 'all') return
    const child = children.find((c) => c.id === selectedChildId)
    if (child) {
      runWellnessNotifications(analytics.scores, child.id, child.name).catch(() => {})
    }
  }, [analytics?.scores, selectedChildId, children])

  // Get selected child name for the insight card
  const selectedChild = selectedChildId === 'all'
    ? null
    : children.find((c) => c.id === selectedChildId)

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ═══ 1. CHILD SELECTOR ═══ */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childRow}>
          <ChildChip label="All Kids" active={selectedChildId === 'all'} onPress={() => setSelectedChildId('all')} />
          {children.map((c) => (
            <ChildChip
              key={c.id}
              label={c.name}
              active={selectedChildId === c.id}
              onPress={() => { setSelectedChildId(c.id); setActiveChild(c) }}
            />
          ))}
        </ScrollView>

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading analytics...</Text>
          </View>
        )}

        {/* Error state */}
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
            {/* ═══ 2. WELLNESS SCORE ARC ═══ */}
            <WellnessScoreArc scores={analytics.scores} />

            {/* ═══ 3. GRANDMA AI INSIGHT ═══ */}
            <GrandmaInsightCard scores={analytics.scores} childName={selectedChild?.name || 'your kids'} />

            {/* ═══ 4. HEALTH TIPS ═══ */}
            <HealthTipsSection tips={getHealthTips(analytics.scores, analytics)} />

            {/* ═══ 5. PILLAR BREAKDOWN ═══ */}
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
                    />
                  )}
                </View>
              ))}

              {/* ═══ 6. ROUTINE COMPLIANCE ═══ */}
              <RoutineComplianceSection data={analytics.routineCompliance} />
            </View>
          </>
        )}

        {/* No data at all */}
        {analytics && analytics.totalLogs === 0 && !isLoading && (
          <View style={[styles.emptyAll, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <FileQuestion size={32} color={colors.textMuted} />
            <Text style={[styles.emptyAllTitle, { color: colors.text }]}>No data yet</Text>
            <Text style={[styles.emptyAllSub, { color: colors.textMuted }]}>
              Start logging meals, sleep, mood, and activities from the Calendar tab to see your wellness dashboard here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ─── Full Screen Modals ──────────────────────────────────────── */}
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
              label: f.label,
              value: f.count,
              color: [PILLAR_CONFIG.nutrition.color, PILLAR_CONFIG.health.color, PILLAR_CONFIG.mood.color, PILLAR_CONFIG.sleep.color, PILLAR_CONFIG.growth.color, '#FF6B35'][i % 6],
            }))} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_weekly'} title="Daily Sleep" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.sleep.dailyHours} labels={analytics.sleep.weekLabels} color={PILLAR_CONFIG.sleep.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_quality'} title="Sleep Quality" onClose={() => setFullScreen(null)}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'mood_dist'} title="Mood This Week" onClose={() => setFullScreen(null)}>
            <MoodDistribution moods={analytics.mood.dominantMoods} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'mood_daily'} title="Daily Mood Tracking" onClose={() => setFullScreen(null)}>
            <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={SCREEN_W - 48} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'health_freq'} title="Health Events" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          {analytics.growth.weights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'weight'} title="Weight" onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.weights.map((w) => w.value)} labels={analytics.growth.weights.map((w) => { const d = new Date(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.health.color} width={SCREEN_W - 48} height={220} unit="kg" showAverage />
            </FullScreenChart>
          )}
          {analytics.growth.heights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'height'} title="Height" onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.heights.map((h) => h.value)} labels={analytics.growth.heights.map((h) => { const d = new Date(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={PILLAR_CONFIG.growth.color} width={SCREEN_W - 48} height={220} unit="cm" showAverage />
            </FullScreenChart>
          )}
        </>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WELLNESS SCORE ARC
// ═══════════════════════════════════════════════════════════════════════════════

function WellnessScoreArc({ scores }: { scores: WellnessScores }) {
  const { colors } = useTheme()
  const size = SCREEN_W - 32
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 40 // radius for the arc

  // Arc spans from 150° to 390° (240° total sweep) — bottom-open horseshoe
  const startAngle = 150
  const totalSweep = 240
  const gapDeg = 4 // gap between segments

  // 5 pillar segments, equal sweep
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
    const largeArc = sweepDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  // Icon positions along the arc (at midpoint of each segment)
  function iconPos(segIndex: number) {
    const midAngle = startAngle + segIndex * (segmentSweep + gapDeg) + segmentSweep / 2
    const rad = (midAngle * Math.PI) / 180
    const iconR = r + 26
    return { x: cx + iconR * Math.cos(rad), y: cy + iconR * Math.sin(rad) }
  }

  const hasAnyData = PILLAR_ORDER.some((k) => scores[k].hasData)

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

        {/* Background arcs (dim) */}
        {PILLAR_ORDER.map((key, i) => {
          const segStart = startAngle + i * (segmentSweep + gapDeg)
          return (
            <Path
              key={`bg-${key}`}
              d={arcPath(segStart, segmentSweep, r)}
              stroke={PILLAR_CONFIG[key].color + '20'}
              strokeWidth={bgStrokeW}
              fill="none"
              strokeLinecap="round"
            />
          )
        })}

        {/* Filled arcs (proportional to score) */}
        {PILLAR_ORDER.map((key, i) => {
          const score = scores[key]
          if (!score.hasData) return null
          const segStart = startAngle + i * (segmentSweep + gapDeg)
          const fillSweep = (score.value / 10) * segmentSweep
          if (fillSweep < 1) return null
          return (
            <Path
              key={`fill-${key}`}
              d={arcPath(segStart, fillSweep, r)}
              stroke={`url(#grad-${key})`}
              strokeWidth={strokeW}
              fill="none"
              strokeLinecap="round"
            />
          )
        })}

        {/* Pillar icons around the arc */}
        {PILLAR_ORDER.map((key, i) => {
          const pos = iconPos(i)
          const Icon = PILLAR_CONFIG[key].icon
          const color = scores[key].hasData ? PILLAR_CONFIG[key].color : colors.textMuted
          return (
            <G key={`icon-${key}`}>
              <Circle
                cx={pos.x}
                cy={pos.y}
                r={14}
                fill={color + '15'}
                stroke={color + '30'}
                strokeWidth={1}
              />
            </G>
          )
        })}

        {/* Center score */}
        <SvgText
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill={colors.text}
          fontSize={48}
          fontWeight="900"
        >
          {hasAnyData ? scores.overall.toFixed(1) : '—'}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          fill={colors.textSecondary}
          fontSize={13}
          fontWeight="600"
        >
          wellness score
        </SvgText>
      </Svg>

      {/* Icon overlays (React Native icons on top of SVG) */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        {PILLAR_ORDER.map((key, i) => {
          const pos = iconPos(i)
          const Icon = PILLAR_CONFIG[key].icon
          const color = scores[key].hasData ? PILLAR_CONFIG[key].color : colors.textMuted
          const topOffset = -size * 0.08
          return (
            <View
              key={`overlay-${key}`}
              style={{
                position: 'absolute',
                left: pos.x - 9,
                top: pos.y - 9 + topOffset,
              }}
            >
              <Icon size={18} color={color} strokeWidth={2} />
            </View>
          )
        })}
      </View>

      {/* Legend */}
      <View style={styles.arcLegend}>
        {PILLAR_ORDER.map((key) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PILLAR_CONFIG[key].color }]} />
            <Text style={[styles.legendLabel, { color: colors.textMuted }]}>{PILLAR_CONFIG[key].label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRANDMA AI INSIGHT CARD
// ═══════════════════════════════════════════════════════════════════════════════

function GrandmaInsightCard({ scores, childName }: { scores: WellnessScores; childName: string }) {
  const { colors, radius } = useTheme()

  // Generate dynamic insight message
  let message = `${childName}'s wellness is looking good this week!`
  let highlight = ''

  const lowest = PILLAR_ORDER.reduce((min, key) => {
    if (!scores[key].hasData) return min
    if (!min || scores[key].value < scores[min].value) return key
    return min
  }, null as PillarKey | null)

  const highest = PILLAR_ORDER.reduce((max, key) => {
    if (!scores[key].hasData) return max
    if (!max || scores[key].value > scores[max].value) return key
    return max
  }, null as PillarKey | null)

  if (lowest && scores[lowest].value < 6) {
    message = `${childName}'s ${PILLAR_CONFIG[lowest].label.toLowerCase()} score needs attention at ${scores[lowest].value}/10.`
    highlight = `${scores[lowest].value}/10`
  } else if (highest && scores[highest].value >= 8) {
    message = `${childName}'s ${PILLAR_CONFIG[highest].label.toLowerCase()} is excellent at ${scores[highest].value}/10!`
    highlight = `${scores[highest].value}/10`
  }

  if (scores.nutrition.trend !== 0 && scores.nutrition.hasData) {
    const dir = scores.nutrition.trend > 0 ? 'up' : 'down'
    message += ` Nutrition trending ${dir} ${Math.abs(scores.nutrition.trend)}% this week.`
  }

  return (
    <Pressable
      onPress={() => router.push('/grandma-talk')}
      style={({ pressed }) => [
        styles.insightCard,
        {
          backgroundColor: colors.primaryTint + (colors.text === '#FFFFFF' ? '' : ''),
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.primary + '30',
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.insightHeader}>
        <View style={[styles.insightBadge, { backgroundColor: colors.primary + '20' }]}>
          <Sparkles size={14} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.insightBadgeText, { color: colors.primary }]}>Grandma insight</Text>
        </View>
      </View>

      <Text style={[styles.insightMessage, { color: colors.text }]}>
        {message}
      </Text>

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

function HealthTipsSection({ tips }: { tips: { title: string; body: string; color: string; icon: any }[] }) {
  const { colors, radius } = useTheme()

  return (
    <View style={styles.tipsSection}>
      <View style={styles.tipsSectionHeader}>
        <Text style={[styles.tipsSectionTitle, { color: colors.text }]}>HEALTH TIPS</Text>
        <Text style={[styles.tipsSectionSub, { color: colors.textMuted }]}>Daily insights for your family</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tipsScroll}
      >
        {tips.map((tip, i) => {
          const Icon = tip.icon
          return (
            <View
              key={i}
              style={[
                styles.tipCard,
                {
                  backgroundColor: tip.color + '10',
                  borderRadius: radius.xl,
                  borderWidth: 1,
                  borderColor: tip.color + '20',
                },
              ]}
            >
              <View style={[styles.tipIconWrap, { backgroundColor: tip.color + '20' }]}>
                <Icon size={18} color={tip.color} strokeWidth={2} />
              </View>
              <Text style={[styles.tipTitle, { color: colors.text }]} numberOfLines={2}>{tip.title}</Text>
              <Text style={[styles.tipBody, { color: colors.textSecondary }]} numberOfLines={3}>{tip.body}</Text>
            </View>
          )
        })}
      </ScrollView>

      {/* Ask Grandma Button */}
      <Pressable
        onPress={() => router.push('/grandma-talk')}
        style={({ pressed }) => [
          styles.askButton,
          {
            backgroundColor: colors.surface,
            borderRadius: radius.full,
            borderWidth: 1,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <MessageCircle size={16} color={colors.primary} strokeWidth={2} />
        <Text style={[styles.askButtonText, { color: colors.text }]}>Ask Grandma anything</Text>
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
            backgroundColor: colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: expanded ? SKIP_COLOR + '30' : colors.border,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          },
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: SKIP_COLOR + '15', alignItems: 'center', justifyContent: 'center' }}>
          <SkipForward size={18} color={SKIP_COLOR} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Routine Compliance</Text>
          <View style={[{ height: 6, borderRadius: 3, marginTop: 6, overflow: 'hidden', backgroundColor: SKIP_COLOR + '15' }]}>
            <View style={{ width: `${adherenceRate}%`, height: '100%', backgroundColor: adherenceRate >= 70 ? '#A2FF86' : adherenceRate >= 40 ? SKIP_COLOR : '#FF7070', borderRadius: 3 }} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {data.hasData ? (
            <>
              <Text style={{ color: SKIP_COLOR, fontSize: 18, fontWeight: '800' }}>{data.totalSkips}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>skips</Text>
            </>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>No skips</Text>
          )}
        </View>
        {expanded ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronRight size={18} color={colors.textMuted} />}
      </Pressable>

      {expanded && (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: SKIP_COLOR + '20', marginTop: 2, padding: 16, gap: 14 }}>
          {/* Adherence bar summary */}
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

          {/* Daily skips bar */}
          {data.hasData && (
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>SKIPS PER DAY</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 48 }}>
                {data.weeklySkips.map((count, i) => {
                  const maxVal = Math.max(...data.weeklySkips, 1)
                  const barH = count > 0 ? Math.max((count / maxVal) * 40, 8) : 4
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

          {/* Most skipped routines */}
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

          {!data.hasData && (
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>No skipped routines this week</Text>
          )}
        </View>
      )}
    </View>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR ROW (score bar + expandable)
// ═══════════════════════════════════════════════════════════════════════════════

function PillarRow({ pillarKey, score, expanded, onToggle }: {
  pillarKey: PillarKey; score: PillarScore; expanded: boolean; onToggle: () => void
}) {
  const { colors, radius } = useTheme()
  const config = PILLAR_CONFIG[pillarKey]
  const Icon = config.icon
  const pct = score.hasData ? (score.value / 10) * 100 : 0

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.pillarRow,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: expanded ? config.color + '30' : colors.border,
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.pillarIcon, { backgroundColor: config.color + '15' }]}>
        <Icon size={18} color={config.color} strokeWidth={2} />
      </View>

      <View style={styles.pillarInfo}>
        <Text style={[styles.pillarName, { color: colors.text }]}>{config.label}</Text>
        <View style={[styles.pillarBarBg, { backgroundColor: config.color + '15', borderRadius: radius.full }]}>
          <View style={[styles.pillarBarFill, { width: `${pct}%`, backgroundColor: config.color, borderRadius: radius.full }]} />
        </View>
      </View>

      <View style={styles.pillarScoreWrap}>
        {score.hasData ? (
          <>
            <Text style={[styles.pillarScoreValue, { color: config.color }]}>{score.value.toFixed(1)}</Text>
            <Text style={[styles.pillarScoreOf, { color: colors.textMuted }]}> of 10</Text>
          </>
        ) : (
          <Text style={[styles.pillarScoreOf, { color: colors.textMuted }]}>No data</Text>
        )}
      </View>

      {expanded
        ? <ChevronUp size={18} color={colors.textMuted} />
        : <ChevronRight size={18} color={colors.textMuted} />
      }
    </Pressable>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR DETAIL (expanded charts)
// ═══════════════════════════════════════════════════════════════════════════════

function PillarDetail({ pillarKey, analytics, chartW, onFullScreen }: {
  pillarKey: PillarKey; analytics: AnalyticsData; chartW: number; onFullScreen: (id: string) => void
}) {
  const { colors, radius } = useTheme()

  switch (pillarKey) {
    case 'nutrition':
      return analytics.nutrition.hasData ? (
        <View style={styles.detailBody}>
          <ChartCard title="Weekly Eat Quality" onExpand={() => onFullScreen('eat_quality')}>
            <StackedBarChart good={analytics.nutrition.eatQuality.good} little={analytics.nutrition.eatQuality.little} none={analytics.nutrition.eatQuality.none} labels={analytics.nutrition.weekLabels} width={chartW} />
          </ChartCard>
          <ChartCard title="Meals per Day" onExpand={() => onFullScreen('meal_freq')}>
            <BarChart data={analytics.nutrition.mealFrequency} labels={analytics.nutrition.weekLabels} color={PILLAR_CONFIG.nutrition.color} width={chartW} />
          </ChartCard>
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
          <ChartCard title="Daily Sleep Hours" onExpand={() => onFullScreen('sleep_weekly')}>
            <BarChart data={analytics.sleep.dailyHours} labels={analytics.sleep.weekLabels} color={PILLAR_CONFIG.sleep.color} width={chartW} />
          </ChartCard>
          <ChartCard title="Sleep Quality" onExpand={() => onFullScreen('sleep_quality')}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </ChartCard>
          <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <StatPill label="Avg sleep" value={`${analytics.sleep.avgHours.toFixed(1)}h`} color={PILLAR_CONFIG.sleep.color} />
            <StatPill label="Quality" value={getBestQuality(analytics.sleep.qualityCounts)} color={brand.success} />
          </View>
        </View>
      ) : <EmptyDetail pillar="sleep" />

    case 'mood':
      return analytics.mood.hasData ? (
        <View style={styles.detailBody}>
          <ChartCard title="Mood This Week" onExpand={() => onFullScreen('mood_dist')}>
            <MoodDistribution moods={analytics.mood.dominantMoods} />
          </ChartCard>
          <ChartCard title="Daily Mood Tracking" onExpand={() => onFullScreen('mood_daily')}>
            <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={chartW} />
          </ChartCard>
        </View>
      ) : <EmptyDetail pillar="mood" />

    case 'health':
      return (
        <View style={styles.detailBody}>
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
      return analytics.growth.hasData ? (
        <View style={styles.detailBody}>
          {analytics.growth.weights.length >= 2 && (
            <ChartCard title="Weight (kg)" onExpand={() => onFullScreen('weight')}>
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
            <ChartCard title="Height (cm)" onExpand={() => onFullScreen('height')}>
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
        </View>
      ) : <EmptyDetail pillar="growth" />

    default:
      return null
  }
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
    mood: 'No mood entries yet. Track your child\'s mood daily to see patterns.',
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

// ─── Chart Sub-components (carried from original) ─────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────

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
  const goodPct = Math.round(((counts.great + counts.good) / total) * 100)
  return `${goodPct}% good`
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },

  // Child selector
  childRow: { gap: 8, paddingVertical: 4 },
  childChip: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1 },
  childChipText: { fontSize: 14, fontWeight: '600' },

  // Arc
  arcContainer: { alignItems: 'center', marginTop: -8 },
  arcLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 4 },

  // Insight card
  insightCard: { padding: 16, gap: 12 },
  insightHeader: { flexDirection: 'row', alignItems: 'center' },
  insightBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  insightBadgeText: { fontSize: 12, fontWeight: '700' },
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
  askButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4 },
  askButtonText: { fontSize: 15, fontWeight: '700' },

  // Pillar section
  pillarSection: { gap: 10 },
  pillarSectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pillarIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pillarInfo: { flex: 1, gap: 6 },
  pillarName: { fontSize: 15, fontWeight: '700' },
  pillarBarBg: { height: 6, width: '100%', overflow: 'hidden' },
  pillarBarFill: { height: '100%' },
  pillarScoreWrap: { flexDirection: 'row', alignItems: 'baseline', marginRight: 4 },
  pillarScoreValue: { fontSize: 18, fontWeight: '900' },
  pillarScoreOf: { fontSize: 11, fontWeight: '600' },

  // Detail body
  detailBody: { gap: 12, paddingTop: 4 },

  // Chart card
  card: { padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  chartBody: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },

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
  vaccineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
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
  statLabel: { fontSize: 11, fontWeight: '600' },

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
})
