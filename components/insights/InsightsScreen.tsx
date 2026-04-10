/**
 * D4 — Insights Screen (Full Feature)
 *
 * - Metrics highlights banner from real logged data
 * - Active / History tab toggle
 * - Gradient cards with glow, grouped by type
 * - Tap card → detail bottom sheet with tips & "Ask Grandma"
 * - History view with date-grouped archived insights + restore
 */

import { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Lightbulb,
  TrendingUp,
  CalendarClock,
  Sparkles,
  X,
  ArrowLeft,
  MessageCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Brain,
  Heart,
  Zap,
  Clock,
  Flame,
  Activity,
  BarChart3,
  RotateCcw,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, brand } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import {
  fetchInsights,
  fetchArchivedInsights,
  generateInsights,
  archiveInsight,
  restoreInsight,
  archiveStaleInsights,
  fetchBehaviorMetrics,
  type Insight,
  type InsightType,
  type BehaviorMetrics,
} from '../../lib/insights'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Type config ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  InsightType,
  {
    icon: typeof Lightbulb
    color: string
    gradient: readonly [string, string]
    label: string
    detailIcon: typeof Brain
    tip: string
  }
> = {
  pattern: {
    icon: Lightbulb,
    color: '#FBBF24',
    gradient: ['rgba(251,191,36,0.18)', 'rgba(245,158,11,0.04)'],
    label: 'Pattern',
    detailIcon: Brain,
    tip: 'Patterns become clearer with consistent logging over time.',
  },
  trend: {
    icon: TrendingUp,
    color: '#3DAA6E',
    gradient: ['rgba(61,170,110,0.18)', 'rgba(45,139,87,0.04)'],
    label: 'Trend',
    detailIcon: Zap,
    tip: 'Trends are calculated from your recent 30-day activity window.',
  },
  upcoming: {
    icon: CalendarClock,
    color: '#6AABF7',
    gradient: ['rgba(106,171,247,0.18)', 'rgba(59,125,216,0.04)'],
    label: 'Upcoming',
    detailIcon: CalendarClock,
    tip: 'Predictions improve as we learn more about your unique rhythms.',
  },
  nudge: {
    icon: Sparkles,
    color: '#FF8AD8',
    gradient: ['rgba(255,138,216,0.18)', 'rgba(214,95,182,0.04)'],
    label: 'Nudge',
    detailIcon: Heart,
    tip: 'Small daily habits make the biggest difference over time.',
  },
}

type Tab = 'active' | 'history'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatLogType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function groupByDate(insights: Insight[]): { label: string; items: Insight[] }[] {
  const groups: Record<string, Insight[]> = {}
  for (const ins of insights) {
    const d = new Date(ins.created_at)
    const key = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(ins)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

// ─── Main Component ────────────────────────────────────────────────────────

export function InsightsScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<Tab>('active')
  const [refreshing, setRefreshing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)

  // Active insights
  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['insights', mode],
    queryFn: () => fetchInsights(mode),
    staleTime: 5 * 60 * 1000,
  })

  // Archived insights (history)
  const { data: archivedInsights = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['insights-history', mode],
    queryFn: () => fetchArchivedInsights(mode),
    staleTime: 5 * 60 * 1000,
    enabled: tab === 'history',
  })

  // Metrics
  const { data: metrics } = useQuery({
    queryKey: ['behavior-metrics', mode],
    queryFn: () => fetchBehaviorMetrics(mode),
    staleTime: 10 * 60 * 1000,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setGenerating(true)
    setError(null)
    try {
      await archiveStaleInsights()
      await generateInsights(mode)
      await queryClient.refetchQueries({ queryKey: ['insights', mode] })
      queryClient.invalidateQueries({ queryKey: ['behavior-metrics', mode] })
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setRefreshing(false)
      setGenerating(false)
    }
  }, [mode])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      await generateInsights(mode)
      await queryClient.refetchQueries({ queryKey: ['insights', mode] })
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function handleArchive(id: string) {
    await archiveInsight(id)
    queryClient.invalidateQueries({ queryKey: ['insights', mode] })
    queryClient.invalidateQueries({ queryKey: ['insights-history', mode] })
    if (selectedInsight?.id === id) setSelectedInsight(null)
  }

  async function handleRestore(id: string) {
    await restoreInsight(id)
    queryClient.invalidateQueries({ queryKey: ['insights', mode] })
    queryClient.invalidateQueries({ queryKey: ['insights-history', mode] })
  }

  function handleAskGrandma(insight: Insight) {
    setSelectedInsight(null)
    router.push({
      pathname: '/(tabs)/library',
      params: { insightContext: `${insight.title}: ${insight.body}` },
    })
  }

  // Group active by type
  const grouped = useMemo(() => {
    return insights.reduce<Record<InsightType, Insight[]>>(
      (acc, ins) => {
        const type = ins.type as InsightType
        if (!acc[type]) acc[type] = []
        acc[type].push(ins)
        return acc
      },
      { pattern: [], trend: [], upcoming: [], nudge: [] }
    )
  }, [insights])

  // Group history by date
  const historyGroups = useMemo(() => groupByDate(archivedInsights), [archivedInsights])

  const typeOrder: InsightType[] = ['upcoming', 'trend', 'pattern', 'nudge']

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ArrowLeft size={22} color={colors.text} />
          </Pressable>
        </View>
        <Text style={[styles.heading, { color: colors.text }]}>Insights</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          AI-powered observations from your data
        </Text>

        {/* ─── Metrics Highlights ─────────────────────────────────── */}
        {metrics && metrics.totalLogs > 0 && (
          <MetricsCard metrics={metrics} mode={mode} />
        )}

        {/* ─── Tab Toggle ────────────────────────────────────────── */}
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderRadius: radius.sm }]}>
          <Pressable
            onPress={() => setTab('active')}
            style={[
              styles.tabBtn,
              { borderRadius: radius.sm - 2 },
              tab === 'active' && { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Sparkles size={14} color={tab === 'active' ? colors.primary : colors.textMuted} strokeWidth={2} />
            <Text
              style={[
                styles.tabText,
                { color: tab === 'active' ? colors.primary : colors.textMuted },
                tab === 'active' && styles.tabTextActive,
              ]}
            >
              Active
            </Text>
            {insights.length > 0 && (
              <View style={[styles.tabCount, { backgroundColor: tab === 'active' ? colors.primary + '30' : colors.surfaceRaised }]}>
                <Text style={[styles.tabCountText, { color: tab === 'active' ? colors.primary : colors.textMuted }]}>
                  {insights.length}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => setTab('history')}
            style={[
              styles.tabBtn,
              { borderRadius: radius.sm - 2 },
              tab === 'history' && { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Clock size={14} color={tab === 'history' ? colors.primary : colors.textMuted} strokeWidth={2} />
            <Text
              style={[
                styles.tabText,
                { color: tab === 'history' ? colors.primary : colors.textMuted },
                tab === 'history' && styles.tabTextActive,
              ]}
            >
              History
            </Text>
          </Pressable>
        </View>

        {/* ─── Generating banner ──────────────────────────────────── */}
        {generating && (
          <LinearGradient
            colors={['rgba(160,127,220,0.15)', 'rgba(106,171,247,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.generatingBanner, { borderRadius: radius.md }]}
          >
            <View style={styles.generatingDot}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.generatingTitle, { color: colors.text }]}>Grandma is thinking...</Text>
              <Text style={[styles.generatingSubtext, { color: colors.textSecondary }]}>
                Analyzing your recent data for insights
              </Text>
            </View>
          </LinearGradient>
        )}

        {/* Error banner */}
        {error && !generating && (
          <View style={[styles.errorBanner, { borderRadius: radius.md }]}>
            <AlertTriangle size={16} color="#FF6B6B" strokeWidth={2} />
            <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{error}</Text>
            <Pressable onPress={onRefresh} hitSlop={8} style={styles.errorRetry}>
              <RefreshCw size={14} color={colors.primary} strokeWidth={2} />
            </Pressable>
          </View>
        )}

        {/* ─── ACTIVE TAB ─────────────────────────────────────────── */}
        {tab === 'active' && (
          <>
            {isLoading && !generating && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {/* Empty state */}
            {!isLoading && !generating && insights.length === 0 && (
              <LinearGradient
                colors={['rgba(112,72,184,0.12)', 'rgba(59,125,216,0.06)', 'rgba(255,138,216,0.04)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.emptyCard, { borderRadius: radius.xl }]}
              >
                <View style={styles.emptyIconWrap}>
                  <LinearGradient
                    colors={['rgba(160,127,220,0.3)', 'rgba(255,138,216,0.15)']}
                    style={styles.emptyIconBg}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  <Sparkles size={28} color={colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No insights yet</Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  Log a few days of data and tap below to generate your first AI-powered insights.
                </Text>
                <Pressable onPress={handleGenerate}>
                  <LinearGradient
                    colors={[brand.primary, brand.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.generateBtn, { borderRadius: radius.lg }]}
                  >
                    <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.generateBtnText}>Generate Insights</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            )}

            {/* Insight cards grouped by type */}
            {typeOrder.map((type) => {
              const items = grouped[type]
              if (!items || items.length === 0) return null
              const config = TYPE_CONFIG[type]
              const Icon = config.icon
              return (
                <View key={type} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconWrap, { backgroundColor: config.color + '20' }]}>
                      <Icon size={14} color={config.color} strokeWidth={2.5} />
                    </View>
                    <Text style={[styles.sectionLabel, { color: config.color }]}>{config.label}</Text>
                    <View style={[styles.sectionLine, { backgroundColor: config.color + '20' }]} />
                  </View>
                  {items.map((ins) => (
                    <InsightCard
                      key={ins.id}
                      insight={ins}
                      config={config}
                      onTap={() => setSelectedInsight(ins)}
                      onArchive={() => handleArchive(ins.id)}
                    />
                  ))}
                </View>
              )
            })}

            {/* Refresh hint */}
            {!isLoading && insights.length > 0 && !generating && (
              <Pressable onPress={handleGenerate} style={styles.refreshHint}>
                <RefreshCw size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.refreshHintText, { color: colors.textMuted }]}>
                  Tap to regenerate insights
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* ─── HISTORY TAB ────────────────────────────────────────── */}
        {tab === 'history' && (
          <>
            {isLoadingHistory && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {!isLoadingHistory && archivedInsights.length === 0 && (
              <View style={[styles.historyEmpty, { backgroundColor: colors.surface, borderRadius: radius.md }]}>
                <Clock size={24} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={[styles.historyEmptyTitle, { color: colors.text }]}>No past insights</Text>
                <Text style={[styles.historyEmptyBody, { color: colors.textSecondary }]}>
                  Dismissed and expired insights will appear here.
                </Text>
              </View>
            )}

            {historyGroups.map((group) => (
              <View key={group.label} style={styles.historyGroup}>
                <Text style={[styles.historyDateLabel, { color: colors.textMuted }]}>{group.label}</Text>
                {group.items.map((ins) => {
                  const config = TYPE_CONFIG[ins.type as InsightType] ?? TYPE_CONFIG.nudge
                  return (
                    <HistoryCard
                      key={ins.id}
                      insight={ins}
                      config={config}
                      onTap={() => setSelectedInsight(ins)}
                      onRestore={() => handleRestore(ins.id)}
                    />
                  )
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Detail Modal */}
      {selectedInsight && (
        <InsightDetailModal
          insight={selectedInsight}
          isArchived={selectedInsight.archived}
          onClose={() => setSelectedInsight(null)}
          onAskGrandma={() => handleAskGrandma(selectedInsight)}
          onArchive={() => handleArchive(selectedInsight.id)}
          onRestore={() => {
            handleRestore(selectedInsight.id)
            setSelectedInsight(null)
          }}
        />
      )}
    </View>
  )
}

// ─── Metrics Card ─────────────────────────────────────────────────────────

function MetricsCard({ metrics, mode }: { metrics: BehaviorMetrics; mode: string }) {
  const { colors, radius } = useTheme()

  const maxActivity = Math.max(...metrics.recentActivity.map((d) => d.count), 1)
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <LinearGradient
      colors={['rgba(112,72,184,0.10)', 'rgba(59,125,216,0.06)', 'rgba(14,11,26,0.0)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.metricsCard, { borderRadius: radius.md, borderColor: colors.border }]}
    >
      {/* Top row: key stats */}
      <View style={styles.metricsTopRow}>
        <View style={styles.metricItem}>
          <View style={[styles.metricIconWrap, { backgroundColor: '#6AABF720' }]}>
            <BarChart3 size={14} color="#6AABF7" strokeWidth={2.5} />
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.totalLogs}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Logs (30d)</Text>
        </View>

        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

        <View style={styles.metricItem}>
          <View style={[styles.metricIconWrap, { backgroundColor: '#FBBF2420' }]}>
            <Flame size={14} color="#FBBF24" strokeWidth={2.5} />
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {metrics.logStreak}{metrics.logStreak > 0 ? 'd' : ''}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Streak</Text>
        </View>

        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

        <View style={styles.metricItem}>
          <View style={[styles.metricIconWrap, { backgroundColor: '#3DAA6E20' }]}>
            <Activity size={14} color="#3DAA6E" strokeWidth={2.5} />
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {metrics.topTypes[0]?.type ? formatLogType(metrics.topTypes[0].type) : '—'}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Top Activity</Text>
        </View>
      </View>

      {/* Mini activity chart */}
      <View style={styles.activityChart}>
        <Text style={[styles.activityLabel, { color: colors.textMuted }]}>Last 7 days</Text>
        <View style={styles.activityBars}>
          {metrics.recentActivity.map((day, i) => {
            const height = day.count > 0 ? Math.max((day.count / maxActivity) * 28, 4) : 2
            const hasActivity = day.count > 0
            return (
              <View key={day.date} style={styles.activityBarCol}>
                <View
                  style={[
                    styles.activityBar,
                    {
                      height,
                      backgroundColor: hasActivity ? colors.primary : colors.surfaceRaised,
                      borderRadius: 3,
                    },
                  ]}
                />
                <Text style={[styles.activityDayLabel, { color: colors.textMuted }]}>
                  {dayLabels[i % 7]}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* Top log types */}
      {metrics.topTypes.length > 1 && (
        <View style={styles.topTypesRow}>
          {metrics.topTypes.slice(0, 4).map((t) => (
            <View key={t.type} style={[styles.topTypeChip, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.topTypeText, { color: colors.textSecondary }]}>
                {formatLogType(t.type)}
              </Text>
              <Text style={[styles.topTypeCount, { color: colors.primary }]}>{t.count}</Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  )
}

// ─── Insight Card ──────────────────────────────────────────────────────────

function InsightCard({
  insight,
  config,
  onTap,
  onArchive,
}: {
  insight: Insight
  config: (typeof TYPE_CONFIG)[InsightType]
  onTap: () => void
  onArchive: () => void
}) {
  const { colors, radius } = useTheme()
  const Icon = config.icon

  return (
    <Pressable onPress={onTap} style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}>
      <LinearGradient
        colors={config.gradient as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderRadius: radius.md, borderWidth: 1, borderColor: config.color + '20' }]}
      >
        <View style={[styles.cardGlowLine, { backgroundColor: config.color }]} />
        <View style={styles.cardInner}>
          <View style={styles.cardTop}>
            <View style={[styles.typeBadge, { backgroundColor: config.color + '20' }]}>
              <Icon size={11} color={config.color} strokeWidth={2.5} />
              <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onArchive() }}
              hitSlop={12}
              style={styles.dismissBtn}
            >
              <X size={14} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{insight.title}</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={3}>{insight.body}</Text>
          <View style={styles.cardFooter}>
            <View style={[styles.modeBadge, { backgroundColor: config.color + '10' }]}>
              <Text style={[styles.modeText, { color: config.color + 'AA' }]}>{insight.behavior}</Text>
            </View>
            <View style={styles.tapHint}>
              <Text style={[styles.tapHintText, { color: colors.textMuted }]}>Tap for details</Text>
              <ChevronRight size={12} color={colors.textMuted} strokeWidth={2} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  )
}

// ─── History Card ─────────────────────────────────────────────────────────

function HistoryCard({
  insight,
  config,
  onTap,
  onRestore,
}: {
  insight: Insight
  config: (typeof TYPE_CONFIG)[InsightType]
  onTap: () => void
  onRestore: () => void
}) {
  const { colors, radius } = useTheme()
  const Icon = config.icon

  return (
    <Pressable onPress={onTap} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
      <View
        style={[
          styles.historyCard,
          { backgroundColor: colors.surface, borderRadius: radius.md, borderColor: colors.border },
        ]}
      >
        <View style={[styles.historyIconWrap, { backgroundColor: config.color + '12' }]}>
          <Icon size={16} color={config.color + '80'} strokeWidth={2} />
        </View>
        <View style={styles.historyContent}>
          <Text style={[styles.historyTitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {insight.title}
          </Text>
          <Text style={[styles.historyBody, { color: colors.textMuted }]} numberOfLines={1}>
            {insight.body}
          </Text>
        </View>
        <Pressable
          onPress={(e) => { e.stopPropagation?.(); onRestore() }}
          hitSlop={10}
          style={[styles.restoreBtn, { backgroundColor: colors.primary + '12' }]}
        >
          <RotateCcw size={14} color={colors.primary} strokeWidth={2} />
        </Pressable>
      </View>
    </Pressable>
  )
}

// ─── Detail Bottom Sheet ──────────────────────────────────────────────────

function InsightDetailModal({
  insight,
  isArchived,
  onClose,
  onAskGrandma,
  onArchive,
  onRestore,
}: {
  insight: Insight
  isArchived: boolean
  onClose: () => void
  onAskGrandma: () => void
  onArchive: () => void
  onRestore: () => void
}) {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const config = TYPE_CONFIG[insight.type as InsightType] ?? TYPE_CONFIG.nudge
  const Icon = config.icon
  const DetailIcon = config.detailIcon

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
          <LinearGradient
            colors={[config.color + '12', colors.bg + 'F8', colors.bg]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.4 }}
            style={[styles.modalContent, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}
          >
            <View style={styles.modalHandle}>
              <View style={[styles.handleBar, { backgroundColor: colors.textMuted + '40' }]} />
            </View>
            <Pressable onPress={onClose} style={styles.modalClose} hitSlop={12}>
              <X size={20} color={colors.textMuted} />
            </Pressable>

            {/* Header */}
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={[config.color + '30', config.color + '08']}
                style={[styles.modalIconWrap, { borderRadius: radius.md }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon size={24} color={config.color} strokeWidth={2} />
              </LinearGradient>
              <View style={[styles.modalTypeBadge, { backgroundColor: config.color + '18' }]}>
                <Text style={[styles.modalTypeText, { color: config.color }]}>{config.label}</Text>
              </View>
              {isArchived && (
                <View style={[styles.archivedBadge, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={[styles.archivedBadgeText, { color: colors.textMuted }]}>Archived</Text>
                </View>
              )}
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>{insight.title}</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>{insight.body}</Text>

            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

            {/* Tip */}
            <View style={[styles.tipCard, { backgroundColor: config.color + '0A', borderColor: config.color + '15' }]}>
              <View style={styles.tipHeader}>
                <DetailIcon size={16} color={config.color} strokeWidth={2} />
                <Text style={[styles.tipLabel, { color: config.color }]}>Grandma's Tip</Text>
              </View>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{config.tip}</Text>
            </View>

            {/* Meta */}
            <View style={styles.modalMeta}>
              <View style={[styles.metaBadge, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={[styles.metaText, { color: colors.textMuted }]}>Mode: {insight.behavior}</Text>
              </View>
              <Text style={[styles.metaDate, { color: colors.textMuted }]}>
                {new Date(insight.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable onPress={onAskGrandma} style={{ flex: 1 }}>
                <LinearGradient
                  colors={[brand.primary, brand.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.askBtn, { borderRadius: radius.lg }]}
                >
                  <MessageCircle size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.askBtnText}>Ask Grandma</Text>
                </LinearGradient>
              </Pressable>
              {isArchived ? (
                <Pressable
                  onPress={onRestore}
                  style={[styles.secondaryBtn, { borderRadius: radius.lg, borderColor: colors.primary + '40' }]}
                >
                  <RotateCcw size={18} color={colors.primary} strokeWidth={2} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={onArchive}
                  style={[styles.secondaryBtn, { borderRadius: radius.lg, borderColor: colors.border }]}
                >
                  <X size={18} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              )}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  )
}

// ─── Compact card (Home screens) ──────────────────────────────────────────

export function InsightCardCompact({ insight }: { insight: Insight }) {
  const { colors, radius } = useTheme()
  const config = TYPE_CONFIG[insight.type as InsightType] ?? TYPE_CONFIG.nudge
  const Icon = config.icon

  return (
    <LinearGradient
      colors={config.gradient as unknown as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.compactCard, { borderRadius: radius.md, borderWidth: 1, borderColor: config.color + '15' }]}
    >
      <View style={[styles.compactTag, { backgroundColor: config.color + '20' }]}>
        <Icon size={10} color={config.color} strokeWidth={2.5} />
        <Text style={[styles.compactTagText, { color: config.color }]}>{config.label}</Text>
      </View>
      <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>{insight.title}</Text>
      <Text style={[styles.compactBody, { color: colors.textMuted }]} numberOfLines={2}>{insight.body}</Text>
    </LinearGradient>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4 },
  heading: { fontSize: 32, fontWeight: '900', letterSpacing: -0.8, marginBottom: 4 },
  subtitle: { fontSize: 15, fontWeight: '500', lineHeight: 21, marginBottom: 20 },

  // ── Metrics Card
  metricsCard: { padding: 18, marginBottom: 20, borderWidth: 1 },
  metricsTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricItem: { flex: 1, alignItems: 'center', gap: 4 },
  metricIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  metricValue: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  metricLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  metricDivider: { width: 1, height: 36, marginHorizontal: 4 },
  activityChart: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  activityLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  activityBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  activityBarCol: { flex: 1, alignItems: 'center', gap: 4 },
  activityBar: { width: '100%', minHeight: 2 },
  activityDayLabel: { fontSize: 10, fontWeight: '600' },
  topTypesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  topTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  topTypeText: { fontSize: 11, fontWeight: '600' },
  topTypeCount: { fontSize: 11, fontWeight: '800' },

  // ── Tabs
  tabRow: { flexDirection: 'row', padding: 3, marginBottom: 20, gap: 2 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: { fontWeight: '700' },
  tabCount: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10 },
  tabCountText: { fontSize: 11, fontWeight: '800' },

  // ── Banners
  generatingBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(160,127,220,0.15)' },
  generatingDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(160,127,220,0.15)', alignItems: 'center', justifyContent: 'center' },
  generatingTitle: { fontSize: 14, fontWeight: '700' },
  generatingSubtext: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 20, backgroundColor: 'rgba(255,77,79,0.08)', borderWidth: 1, borderColor: 'rgba(255,77,79,0.15)' },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  errorRetry: { padding: 4 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },

  // ── Empty
  emptyCard: { alignItems: 'center', padding: 36, gap: 14, borderWidth: 1, borderColor: 'rgba(160,127,220,0.12)' },
  emptyIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  emptyIconBg: { ...StyleSheet.absoluteFillObject },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 21 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 28, marginTop: 4 },
  generateBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // ── Sections
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  sectionLine: { flex: 1, height: 1, marginLeft: 4 },

  // ── Card
  card: { marginBottom: 12, overflow: 'hidden' },
  cardGlowLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  cardInner: { padding: 16, paddingLeft: 18 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  dismissBtn: { padding: 4 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4, letterSpacing: -0.2 },
  cardBody: { fontSize: 14, fontWeight: '400', lineHeight: 21, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 },
  modeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tapHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tapHintText: { fontSize: 11, fontWeight: '500' },
  refreshHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 4 },
  refreshHintText: { fontSize: 13, fontWeight: '500' },

  // ── History
  historyEmpty: { alignItems: 'center', padding: 32, gap: 10 },
  historyEmptyTitle: { fontSize: 17, fontWeight: '700' },
  historyEmptyBody: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  historyGroup: { marginBottom: 20 },
  historyDateLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  historyIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  historyContent: { flex: 1, gap: 2 },
  historyTitle: { fontSize: 14, fontWeight: '600' },
  historyBody: { fontSize: 12, fontWeight: '400' },
  restoreBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  // ── Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { maxHeight: '85%' },
  modalContent: { padding: 24, paddingTop: 12 },
  modalHandle: { alignItems: 'center', paddingVertical: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  modalClose: { position: 'absolute', top: 16, right: 20, zIndex: 10, padding: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 20 },
  modalIconWrap: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  modalTypeBadge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },
  modalTypeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  archivedBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  archivedBadgeText: { fontSize: 11, fontWeight: '600' },
  modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3, marginBottom: 8 },
  modalBody: { fontSize: 16, fontWeight: '400', lineHeight: 24, marginBottom: 20 },
  modalDivider: { height: 1, marginBottom: 20 },
  tipCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipLabel: { fontSize: 13, fontWeight: '700' },
  tipText: { fontSize: 14, fontWeight: '400', lineHeight: 21 },
  modalMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  metaBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  metaText: { fontSize: 11, fontWeight: '600' },
  metaDate: { fontSize: 12, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12 },
  askBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  askBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: { width: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // ── Compact
  compactCard: { flex: 1, padding: 14, gap: 6 },
  compactTag: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 10 },
  compactTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  compactTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  compactBody: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
})
