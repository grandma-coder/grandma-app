/**
 * D4 — Insights Screen
 *
 * Shows AI-generated insight cards organized by type.
 * Tap card → opens Grandma Talk with insight as context.
 * Pull to refresh triggers new insight generation.
 */

import { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native'
import { router } from 'expo-router'
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
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, brand } from '../../constants/theme'
import { useModeStore } from '../../store/useModeStore'
import {
  fetchInsights,
  generateInsights,
  archiveInsight,
  archiveStaleInsights,
  type Insight,
  type InsightType,
} from '../../lib/insights'

// ─── Type config ───────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<InsightType, { icon: typeof Lightbulb; color: string; label: string }> = {
  pattern: { icon: Lightbulb, color: brand.accent, label: 'Pattern' },
  trend: { icon: TrendingUp, color: brand.phase.ovulation, label: 'Trend' },
  upcoming: { icon: CalendarClock, color: brand.secondary, label: 'Upcoming' },
  nudge: { icon: Sparkles, color: brand.prePregnancy, label: 'Nudge' },
}

// ─── Main Component ────────────────────────────────────────────────────────

export function InsightsScreen() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const mode = useModeStore((s) => s.mode)
  const queryClient = useQueryClient()

  const [refreshing, setRefreshing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['insights', mode],
    queryFn: () => fetchInsights(mode),
    staleTime: 5 * 60 * 1000,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setGenerating(true)
    setError(null)
    try {
      await archiveStaleInsights()
      await generateInsights(mode)
      queryClient.invalidateQueries({ queryKey: ['insights', mode] })
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
      queryClient.invalidateQueries({ queryKey: ['insights', mode] })
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function handleArchive(id: string) {
    await archiveInsight(id)
    queryClient.invalidateQueries({ queryKey: ['insights', mode] })
  }

  function handleTapInsight(insight: Insight) {
    router.push({
      pathname: '/(tabs)/library',
      params: { insightContext: `${insight.title}: ${insight.body}` },
    })
  }

  // Group by type
  const grouped = insights.reduce<Record<InsightType, Insight[]>>(
    (acc, ins) => {
      const type = ins.type as InsightType
      if (!acc[type]) acc[type] = []
      acc[type].push(ins)
      return acc
    },
    { pattern: [], trend: [], upcoming: [], nudge: [] }
  )

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header with back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.heading, { color: colors.text }]}>Insights</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          AI-powered observations from your data. Pull down to refresh.
        </Text>

        {/* Generating banner */}
        {generating && (
          <View style={[styles.generatingBanner, { backgroundColor: colors.primary + '15', borderRadius: radius.lg }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.generatingText, { color: colors.primary }]}>
              Grandma is thinking...
            </Text>
          </View>
        )}

        {/* Error banner */}
        {error && !generating && (
          <View style={[styles.errorBanner, { backgroundColor: '#FF4D4F15', borderRadius: radius.lg }]}>
            <AlertTriangle size={16} color="#FF4D4F" strokeWidth={2} />
            <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{error}</Text>
            <Pressable onPress={onRefresh} hitSlop={8}>
              <RefreshCw size={16} color={colors.primary} strokeWidth={2} />
            </Pressable>
          </View>
        )}

        {/* Loading state */}
        {isLoading && !generating && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {/* Empty state */}
        {!isLoading && !generating && insights.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Sparkles size={32} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No insights yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Log a few days of data and tap below to generate your first insights.
            </Text>
            <Pressable
              onPress={handleGenerate}
              style={[styles.generateBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
            >
              <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.generateBtnText}>Generate Insights</Text>
            </Pressable>
          </View>
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
                <Icon size={16} color={config.color} strokeWidth={2} />
                <Text style={[styles.sectionLabel, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
              {items.map((ins) => (
                <InsightCard
                  key={ins.id}
                  insight={ins}
                  config={config}
                  onTap={() => handleTapInsight(ins)}
                  onArchive={() => handleArchive(ins.id)}
                />
              ))}
            </View>
          )
        })}

        {/* Refresh hint when insights exist */}
        {!isLoading && insights.length > 0 && !generating && (
          <Pressable
            onPress={handleGenerate}
            style={[styles.refreshHint, { borderRadius: radius.lg }]}
          >
            <RefreshCw size={14} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.refreshHintText, { color: colors.textMuted }]}>
              Tap to regenerate insights
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
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
  config: { icon: typeof Lightbulb; color: string; label: string }
  onTap: () => void
  onArchive: () => void
}) {
  const { colors, radius } = useTheme()
  const Icon = config.icon

  return (
    <Pressable
      onPress={onTap}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          borderLeftWidth: 3,
          borderLeftColor: config.color,
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, { backgroundColor: config.color + '15', borderRadius: radius.full }]}>
          <Icon size={12} color={config.color} strokeWidth={2.5} />
          <Text style={[styles.typeBadgeText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>

        <View style={styles.cardActions}>
          <Pressable onPress={onArchive} hitSlop={8}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: colors.text }]}>{insight.title}</Text>
      <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{insight.body}</Text>

      <View style={styles.cardFooter}>
        <View style={[styles.behaviorBadge, { backgroundColor: colors.surfaceRaised, borderRadius: radius.full }]}>
          <Text style={[styles.behaviorText, { color: colors.textMuted }]}>
            {insight.behavior}
          </Text>
        </View>
        <View style={styles.talkHint}>
          <MessageCircle size={14} color={colors.primary} strokeWidth={2} />
          <Text style={[styles.talkHintText, { color: colors.primary }]}>Ask Grandma</Text>
        </View>
      </View>
    </Pressable>
  )
}

// ─── Compact card for Home screens ─────────────────────────────────────────

export function InsightCardCompact({ insight }: { insight: Insight }) {
  const { colors, radius } = useTheme()
  const config = TYPE_CONFIG[insight.type as InsightType] ?? TYPE_CONFIG.nudge
  const Icon = config.icon

  return (
    <View
      style={[
        styles.compactCard,
        { backgroundColor: colors.surface, borderRadius: radius.xl },
      ]}
    >
      <View style={[styles.compactTag, { backgroundColor: config.color + '20', borderRadius: radius.sm }]}>
        <Text style={[styles.compactTagText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
      <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>
        {insight.title}
      </Text>
      <Text style={[styles.compactBody, { color: colors.textMuted }]} numberOfLines={2}>
        {insight.body}
      </Text>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 8 },
  heading: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 24 },

  loadingWrap: { paddingVertical: 40, alignItems: 'center' },

  // Generating banner
  generatingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 16 },
  generatingText: { fontSize: 14, fontWeight: '600' },

  // Error banner
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Empty
  emptyCard: { alignItems: 'center', padding: 32, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  generateBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Sections
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card: { padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardBody: { fontSize: 14, fontWeight: '400', lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  behaviorBadge: { paddingVertical: 2, paddingHorizontal: 8 },
  behaviorText: { fontSize: 11, fontWeight: '600' },
  talkHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  talkHintText: { fontSize: 12, fontWeight: '600' },

  // Refresh hint
  refreshHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 4 },
  refreshHintText: { fontSize: 13, fontWeight: '500' },

  // Compact (for home screens)
  compactCard: { flex: 1, padding: 14, gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  compactTag: { alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 6 },
  compactTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  compactTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  compactBody: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
})
