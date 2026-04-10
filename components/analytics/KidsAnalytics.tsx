/**
 * Kids Analytics Screen — real data from child_logs via Supabase.
 *
 * 5 sections: Nutrition, Sleep, Mood, Health, Growth
 * Child selector at top. All charts driven by useKidsAnalytics hook.
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
  Rect,
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
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
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { LineChart, BarChart, HeatmapGrid, BubbleGrid } from '../charts/SvgCharts'
import { FullScreenChart } from '../charts/FullScreenChart'
import { useKidsAnalytics, type NutritionData, type SleepData, type MoodData, type HealthData } from '../../lib/analyticsData'
import { supabase } from '../../lib/supabase'

const SCREEN_W = Dimensions.get('window').width

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

// ─── Main Component ────────────────────────────────────────────────────────

export function KidsAnalytics() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const [selectedChildId, setSelectedChildId] = useState<string | 'all'>('all')
  const [fullScreen, setFullScreen] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    nutrition: true, sleep: true, mood: false, health: false, growth: false,
  })

  const { data: analytics, isLoading, isFetching, error, refetch } = useKidsAnalytics(selectedChildId)
  const [refreshing, setRefreshing] = useState(false)

  const chartW = SCREEN_W - 72
  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  // Pull-to-refresh
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
          // Only refetch if the change is for one of our children
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

  // Build insight cards from real data
  const insights = buildInsightCards(analytics)

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
        {/* 1. Child Selector */}
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

        {/* 2. Grandma Talk */}
        <Pressable
          onPress={() => router.push('/grandma-talk')}
          style={({ pressed }) => [
            styles.card, { backgroundColor: colors.primaryTint, borderRadius: radius.xl },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.grandmaTitle, { color: colors.primary }]}>Ask Grandma about patterns</Text>
              <Text style={[styles.grandmaSub, { color: colors.textSecondary }]}>Nutrition, sleep, and growth insights</Text>
            </View>
            <MessageCircle size={24} color={colors.primary} strokeWidth={2} />
          </View>
        </Pressable>

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

        {/* 3. Insight Cards (generated from real data) */}
        {insights.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightScroll}>
            {insights.map((c, i) => (
              <View key={i} style={[styles.insightCard, { backgroundColor: c.color + '12', borderRadius: radius.xl, borderColor: c.color + '25', borderWidth: 1 }]}>
                <Zap size={14} color={c.color} strokeWidth={2} />
                <Text style={[styles.insightText, { color: colors.text }]}>{c.title}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {analytics && (
          <>
            {/* ═══ NUTRITION SECTION ═══ */}
            <SectionHeader title="Nutrition" icon={<Utensils size={18} color={brand.phase.ovulation} strokeWidth={2} />} expanded={expanded.nutrition} onToggle={() => toggle('nutrition')} />
            {expanded.nutrition && (
              <View style={styles.sectionBody}>
                {analytics.nutrition.hasData ? (
                  <>
                    {/* Eat Quality */}
                    <ChartCard title="Weekly Eat Quality" onExpand={() => setFullScreen('eat_quality')}>
                      <StackedBarChart
                        good={analytics.nutrition.eatQuality.good}
                        little={analytics.nutrition.eatQuality.little}
                        none={analytics.nutrition.eatQuality.none}
                        labels={analytics.nutrition.weekLabels}
                        width={chartW}
                      />
                    </ChartCard>

                    {/* Meal Frequency */}
                    <ChartCard title="Meals per Day" onExpand={() => setFullScreen('meal_freq')}>
                      <BarChart data={analytics.nutrition.mealFrequency} labels={analytics.nutrition.weekLabels} color={brand.phase.ovulation} width={chartW} />
                    </ChartCard>

                    {/* Top Foods */}
                    {analytics.nutrition.topFoods.length > 0 && (
                      <ChartCard title="Most Logged Foods" onExpand={() => setFullScreen('top_foods')}>
                        <BubbleGrid items={analytics.nutrition.topFoods.map((f, i) => ({
                          label: f.label,
                          value: f.count,
                          color: [brand.accent, brand.kids, brand.phase.ovulation, brand.pregnancy, brand.phase.menstrual, brand.secondary][i % 6],
                        }))} />
                      </ChartCard>
                    )}
                  </>
                ) : (
                  <EmptySection icon={<Utensils size={20} color={colors.textMuted} />} message="No meals logged yet this week. Log feeding from the calendar to see nutrition trends." />
                )}
              </View>
            )}

            {/* ═══ SLEEP SECTION ═══ */}
            <SectionHeader title="Sleep" icon={<Moon size={18} color={brand.pregnancy} strokeWidth={2} />} expanded={expanded.sleep} onToggle={() => toggle('sleep')} />
            {expanded.sleep && (
              <View style={styles.sectionBody}>
                {analytics.sleep.hasData ? (
                  <>
                    <ChartCard title="Daily Sleep Hours" onExpand={() => setFullScreen('sleep_weekly')}>
                      <BarChart data={analytics.sleep.dailyHours} labels={analytics.sleep.weekLabels} color={brand.pregnancy} width={chartW} />
                    </ChartCard>

                    <ChartCard title="Sleep Quality" onExpand={() => setFullScreen('sleep_quality')}>
                      <SleepQualityChart counts={analytics.sleep.qualityCounts} />
                    </ChartCard>

                    {/* Average stat */}
                    <View style={[styles.statRow, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                      <StatPill label="Avg sleep" value={`${analytics.sleep.avgHours.toFixed(1)}h`} color={brand.pregnancy} />
                      <StatPill
                        label="Quality"
                        value={getBestQuality(analytics.sleep.qualityCounts)}
                        color={brand.success}
                      />
                    </View>
                  </>
                ) : (
                  <EmptySection icon={<Moon size={20} color={colors.textMuted} />} message="No sleep entries yet. Log sleep from the calendar to track patterns." />
                )}
              </View>
            )}

            {/* ═══ MOOD SECTION ═══ */}
            <SectionHeader title="Mood" icon={<Smile size={18} color={brand.prePregnancy} strokeWidth={2} />} expanded={expanded.mood} onToggle={() => toggle('mood')} />
            {expanded.mood && (
              <View style={styles.sectionBody}>
                {analytics.mood.hasData ? (
                  <>
                    {/* Mood distribution */}
                    <ChartCard title="Mood This Week" onExpand={() => setFullScreen('mood_dist')}>
                      <MoodDistribution moods={analytics.mood.dominantMoods} />
                    </ChartCard>

                    {/* Mood by day stacked bar */}
                    <ChartCard title="Daily Mood Tracking" onExpand={() => setFullScreen('mood_daily')}>
                      <MoodDailyChart dailyCounts={analytics.mood.dailyCounts} labels={analytics.mood.weekLabels} width={chartW} />
                    </ChartCard>
                  </>
                ) : (
                  <EmptySection icon={<Smile size={20} color={colors.textMuted} />} message="No mood entries yet. Track your child's mood daily to see patterns." />
                )}
              </View>
            )}

            {/* ═══ HEALTH SECTION ═══ */}
            <SectionHeader title="Health" icon={<Heart size={18} color={brand.error} strokeWidth={2} />} expanded={expanded.health} onToggle={() => toggle('health')} />
            {expanded.health && (
              <View style={styles.sectionBody}>
                {analytics.health.hasData ? (
                  <>
                    {/* Event Timeline */}
                    {analytics.health.recentEvents.length > 0 && (
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

                    <ChartCard title="Health Events (weekly)" onExpand={() => setFullScreen('health_freq')}>
                      <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={brand.error} width={chartW} />
                    </ChartCard>
                  </>
                ) : (
                  <EmptySection icon={<Heart size={20} color={colors.textMuted} />} message="No health events logged. Record temperatures, vaccines, and doctor visits here." />
                )}

                {/* Vaccine Tracker (always show) */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                  <View style={styles.row}>
                    <Syringe size={18} color={brand.kids} strokeWidth={2} />
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
            )}

            {/* ═══ GROWTH SECTION ═══ */}
            <SectionHeader title="Growth" icon={<TrendingUp size={18} color={brand.kids} strokeWidth={2} />} expanded={expanded.growth} onToggle={() => toggle('growth')} />
            {expanded.growth && (
              <View style={styles.sectionBody}>
                {analytics.growth.hasData ? (
                  <>
                    {analytics.growth.weights.length >= 2 && (
                      <ChartCard title="Weight (kg)" onExpand={() => setFullScreen('weight')}>
                        <LineChart
                          data={analytics.growth.weights.map((w) => w.value)}
                          labels={analytics.growth.weights.map((w) => {
                            const d = new Date(w.date)
                            return `${d.getMonth() + 1}/${d.getDate()}`
                          })}
                          color={brand.kids}
                          width={chartW}
                          unit="kg"
                          showAverage
                        />
                      </ChartCard>
                    )}

                    {analytics.growth.heights.length >= 2 && (
                      <ChartCard title="Height (cm)" onExpand={() => setFullScreen('height')}>
                        <LineChart
                          data={analytics.growth.heights.map((h) => h.value)}
                          labels={analytics.growth.heights.map((h) => {
                            const d = new Date(h.date)
                            return `${d.getMonth() + 1}/${d.getDate()}`
                          })}
                          color={brand.phase.ovulation}
                          width={chartW}
                          unit="cm"
                          showAverage
                        />
                      </ChartCard>
                    )}
                  </>
                ) : (
                  <EmptySection icon={<TrendingUp size={20} color={colors.textMuted} />} message="No growth data yet. Log weight and height measurements to track development." />
                )}
              </View>
            )}
          </>
        )}

        {/* No data at all */}
        {analytics && analytics.totalLogs === 0 && !isLoading && (
          <View style={[styles.emptyAll, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <FileQuestion size={32} color={colors.textMuted} />
            <Text style={[styles.emptyAllTitle, { color: colors.text }]}>No data yet</Text>
            <Text style={[styles.emptyAllSub, { color: colors.textMuted }]}>
              Start logging meals, sleep, mood, and activities from the Calendar tab to see your analytics here.
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
            <BarChart data={analytics.nutrition.mealFrequency} labels={analytics.nutrition.weekLabels} color={brand.phase.ovulation} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'top_foods'} title="Most Logged Foods" onClose={() => setFullScreen(null)}>
            <BubbleGrid items={analytics.nutrition.topFoods.map((f, i) => ({
              label: f.label,
              value: f.count,
              color: [brand.accent, brand.kids, brand.phase.ovulation, brand.pregnancy, brand.phase.menstrual, brand.secondary][i % 6],
            }))} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_weekly'} title="Daily Sleep" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.sleep.dailyHours} labels={analytics.sleep.weekLabels} color={brand.pregnancy} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'sleep_quality'} title="Sleep Quality" onClose={() => setFullScreen(null)}>
            <SleepQualityChart counts={analytics.sleep.qualityCounts} />
          </FullScreenChart>
          <FullScreenChart visible={fullScreen === 'health_freq'} title="Health Events" onClose={() => setFullScreen(null)}>
            <BarChart data={analytics.health.weeklyFrequency} labels={analytics.health.weekLabels} color={brand.error} width={SCREEN_W - 48} height={220} />
          </FullScreenChart>
          {analytics.growth.weights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'weight'} title="Weight" onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.weights.map((w) => w.value)} labels={analytics.growth.weights.map((w) => { const d = new Date(w.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={brand.kids} width={SCREEN_W - 48} height={220} unit="kg" showAverage />
            </FullScreenChart>
          )}
          {analytics.growth.heights.length >= 2 && (
            <FullScreenChart visible={fullScreen === 'height'} title="Height" onClose={() => setFullScreen(null)}>
              <LineChart data={analytics.growth.heights.map((h) => h.value)} labels={analytics.growth.heights.map((h) => { const d = new Date(h.date); return `${d.getMonth() + 1}/${d.getDate()}` })} color={brand.phase.ovulation} width={SCREEN_W - 48} height={220} unit="cm" showAverage />
            </FullScreenChart>
          )}
        </>
      )}
    </View>
  )
}

// ─── Insight Card Builder ─────────────────────────────────────────────────

function buildInsightCards(analytics: ReturnType<typeof useKidsAnalytics>['data']) {
  if (!analytics) return []
  const cards: { title: string; color: string }[] = []

  // Nutrition insights
  if (analytics.nutrition.hasData) {
    const totalMeals = analytics.nutrition.mealFrequency.reduce((a, b) => a + b, 0)
    const totalGood = analytics.nutrition.eatQuality.good.reduce((a, b) => a + b, 0)
    if (totalMeals > 0) {
      const pct = Math.round((totalGood / totalMeals) * 100)
      cards.push({ title: `${pct}% of meals eaten well this week`, color: brand.phase.ovulation })
    }
    if (analytics.nutrition.topFoods.length > 0) {
      cards.push({ title: `${analytics.nutrition.topFoods[0].label} is the most eaten food`, color: brand.accent })
    }
  }

  // Sleep insights
  if (analytics.sleep.hasData && analytics.sleep.avgHours > 0) {
    cards.push({ title: `Average ${analytics.sleep.avgHours.toFixed(1)}h of sleep per night`, color: brand.pregnancy })
  }

  // Mood insights
  if (analytics.mood.hasData && analytics.mood.dominantMoods.length > 0) {
    const top = analytics.mood.dominantMoods[0]
    cards.push({ title: `Most common mood: ${top.mood} (${top.count}x)`, color: MOOD_COLORS[top.mood] || brand.prePregnancy })
  }

  return cards.slice(0, 3)
}

// ─── Section Header (collapsible) ──────────────────────────────────────────

function SectionHeader({ title, icon, expanded, onToggle }: { title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void }) {
  const { colors } = useTheme()
  return (
    <Pressable onPress={onToggle} style={[styles.sectionHeader, { borderColor: colors.border }]}>
      <View style={styles.row}>
        {icon}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {expanded ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
    </Pressable>
  )
}

// ─── Chart Card ────────────────────────────────────────────────────────────

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

// ─── Child Chip ────────────────────────────────────────────────────────────

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

// ─── Stacked Bar Chart ─────────────────────────────────────────────────────

function StackedBarChart({ good, little, none, labels, width = 300, height = 140 }: {
  good: number[]; little: number[]; none: number[]; labels: string[]; width?: number; height?: number
}) {
  const { colors } = useTheme()
  const leftPad = 28
  const rightPad = 8
  const topPad = 16
  const bottomPad = 8
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

        {/* Grid lines */}
        {[0, 0.5, 1].map((pct, i) => {
          const y = topPad + chartH * (1 - pct)
          const val = Math.round(maxVal * pct)
          return (
            <View key={i}>
              <Rect x={leftPad} y={y} width={chartW} height={0.5} fill={colors.border} opacity={0.4} />
              {val > 0 && (
                <Circle cx={0} cy={0} r={0}>
                  {/* Y label via SvgText below */}
                </Circle>
              )}
            </View>
          )
        })}

        {good.map((g, i) => {
          const x = leftPad + (i + 0.5) * (chartW / count) - barW / 2
          const baseY = topPad + chartH
          const gH = (g / maxVal) * chartH
          const lH = (little[i] / maxVal) * chartH
          const nH = (none[i] / maxVal) * chartH
          return (
            <View key={i}>
              {gH > 0 && <Rect x={x} y={baseY - gH} width={barW} height={gH} rx={3} fill="url(#stackGood)" />}
              {lH > 0 && <Rect x={x} y={baseY - gH - lH} width={barW} height={lH} rx={lH === gH + lH + nH ? 3 : 0} fill="url(#stackLittle)" />}
              {nH > 0 && <Rect x={x} y={baseY - gH - lH - nH} width={barW} height={nH} rx={3} fill="url(#stackNone)" />}
            </View>
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

// ─── Sleep Quality Chart (horizontal bars) ─────────────────────────────────

function SleepQualityChart({ counts }: { counts: { great: number; good: number; restless: number; poor: number } }) {
  const { colors, radius } = useTheme()
  const total = counts.great + counts.good + counts.restless + counts.poor
  if (total === 0) return null

  const items = [
    { label: 'Great', count: counts.great, color: brand.success, emoji: '😴' },
    { label: 'Good', count: counts.good, color: brand.kids, emoji: '🙂' },
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
            <Text style={[styles.qualityEmoji]}>{item.emoji}</Text>
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

// ─── Mood Distribution ─────────────────────────────────────────────────────

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

// ─── Mood Daily Chart (stacked colored dots per day) ───────────────────────

function MoodDailyChart({ dailyCounts, labels, width }: { dailyCounts: Record<string, number[]>; labels: string[]; width: number }) {
  const { colors, radius } = useTheme()
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
                  <View
                    key={`${mood}-${dotIdx}`}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: color + '30',
                      borderWidth: 1.5,
                      borderColor: color + '50',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
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

// ─── Stat Pill ─────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors, radius } = useTheme()
  return (
    <View style={[styles.statPill, { backgroundColor: color + '12', borderRadius: radius.xl }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  )
}

// ─── Empty Section ─────────────────────────────────────────────────────────

function EmptySection({ icon, message }: { icon: React.ReactNode; message: string }) {
  const { colors, radius } = useTheme()
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      {icon}
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{message}</Text>
    </View>
  )
}

// ─── Legend Dot ─────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDotStyle, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getEventColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'vaccine': return brand.kids
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
  scroll: { paddingHorizontal: 16, gap: 12 },

  // Child selector
  childRow: { gap: 8, paddingVertical: 4 },
  childChip: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1 },
  childChipText: { fontSize: 14, fontWeight: '600' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionBody: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  // Grandma
  grandmaTitle: { fontSize: 16, fontWeight: '700' },
  grandmaSub: { fontSize: 13, fontWeight: '500' },

  // Insights
  insightScroll: { gap: 10, paddingRight: 16 },
  insightCard: { width: 200, padding: 14, gap: 8 },
  insightText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  // Card
  card: { padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  chartBody: { alignItems: 'center' },

  // Labels & Legend
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 10, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDotStyle: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '600' },

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
