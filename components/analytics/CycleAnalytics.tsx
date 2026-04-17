/**
 * D1 — Cycle Analytics Screen
 *
 * 10-section scrollable analytics with custom SVG charts.
 * All data from Supabase cycle_logs (mocked for now).
 */

import { useState, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import {
  MessageCircle,
  TrendingUp,
  Thermometer,
  Zap,
  Heart,
  Target,
  ChevronRight,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import {
  LineChart,
  BarChart,
  HeatmapGrid,
  BubbleGrid,
  DotTimeline,
} from '../charts/SvgCharts'
import { FullScreenChart } from '../charts/FullScreenChart'

const SCREEN_W = Dimensions.get('window').width

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_CYCLE_LENGTHS = [29, 28, 30, 27, 28, 29]
const MOCK_PERIOD_DURATIONS = [5, 4, 5, 6, 5, 4]
const MOCK_BBT = [36.2, 36.3, 36.1, 36.4, 36.6, 36.8, 36.9, 36.7, 36.5, 36.3, 36.2, 36.4, 36.5, 36.8]
const MOCK_SYMPTOMS: { label: string; value: number; color?: string }[] = [
  { label: 'Cramps', value: 8, color: brand.phase.menstrual },
  { label: 'Fatigue', value: 6, color: brand.pregnancy },
  { label: 'Bloating', value: 5, color: brand.accent },
  { label: 'Headache', value: 4, color: brand.secondary },
  { label: 'Nausea', value: 3, color: brand.phase.ovulation },
  { label: 'Back pain', value: 3, color: brand.prePregnancy },
  { label: 'Cravings', value: 2, color: brand.kids },
  { label: 'Insomnia', value: 2, color: brand.phase.luteal },
]

// Mood heatmap: 4 weeks x 7 days, values 0-1 (0=no data, 0.2=low, 0.5=mid, 0.8=good, 1=great)
const MOCK_MOOD_HEATMAP = [
  [0.8, 0.6, 0.4, 0.3, 0.2, 0.5, 0.7],
  [0.9, 0.8, 0.7, 0.5, 0.4, 0.6, 0.8],
  [0.5, 0.3, 0.2, 0.4, 0.6, 0.8, 0.9],
  [0.7, 0.6, 0.5, 0.3, 0.2, 0.4, 0.6],
]

const MOCK_INTIMACY_DAYS = [8, 10, 12, 13, 14, 15, 20]
const MOCK_INSIGHT_CARDS = [
  { title: 'Your average cycle is 28.5 days — very regular!', color: brand.phase.ovulation },
  { title: 'Cramps are most common on days 1-3 of your cycle', color: brand.phase.menstrual },
  { title: 'Your mood peaks during the follicular phase', color: brand.prePregnancy },
]

// ─── Period Toggle ─────────────────────────────────────────────────────────

type TimePeriod = 'daily' | 'weekly' | 'monthly'

// ─── Main Component ────────────────────────────────────────────────────────

export function CycleAnalytics() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const tryingToConceive = true // TODO: read from store

  const [period, setPeriod] = useState<TimePeriod>('monthly')
  const [fullScreen, setFullScreen] = useState<string | null>(null)

  const chartWidth = SCREEN_W - 72

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* 1. Period Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
          {(['daily', 'weekly', 'monthly'] as TimePeriod[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.toggleBtn,
                { backgroundColor: period === p ? colors.primary : 'transparent', borderRadius: radius.md },
              ]}
            >
              <Text style={[styles.toggleText, { color: period === p ? '#FFFFFF' : colors.textSecondary }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 2. Grandma Talk Banner */}
        <Pressable
          onPress={() => router.push('/grandma-talk')}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.primaryTint, borderRadius: radius.xl },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={styles.grandmaRow}>
            <View style={styles.grandmaText}>
              <Text style={[styles.grandmaTitle, { color: colors.primary }]}>
                Ask Grandma about your patterns
              </Text>
              <Text style={[styles.grandmaSub, { color: colors.textSecondary }]}>
                Get personalized insights from your data
              </Text>
            </View>
            <MessageCircle size={24} color={colors.primary} strokeWidth={2} />
          </View>
        </Pressable>

        {/* 3. Insight Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.insightScroll}
        >
          {MOCK_INSIGHT_CARDS.map((card, i) => (
            <View
              key={i}
              style={[styles.insightCard, { backgroundColor: card.color + '12', borderRadius: radius.xl, borderColor: card.color + '25', borderWidth: 1 }]}
            >
              <Zap size={16} color={card.color} strokeWidth={2} />
              <Text style={[styles.insightText, { color: colors.text }]}>{card.title}</Text>
            </View>
          ))}
        </ScrollView>

        {/* 4. Cycle Length Trend */}
        <ChartCard
          title="Cycle Length Trend"
          subtitle="Last 6 cycles"
          icon={<TrendingUp size={18} color={colors.primary} strokeWidth={2} />}
          onExpand={() => setFullScreen('cycle_length')}
        >
          <LineChart
            data={MOCK_CYCLE_LENGTHS}
            labels={['C1', 'C2', 'C3', 'C4', 'C5', 'C6']}
            color={colors.primary}
            width={chartWidth}
            showAverage
          />
        </ChartCard>

        {/* 5. Period Duration Trend */}
        <ChartCard
          title="Period Duration"
          subtitle="Last 6 periods (days)"
          icon={<TrendingUp size={18} color={brand.phase.menstrual} strokeWidth={2} />}
          onExpand={() => setFullScreen('period_duration')}
        >
          <BarChart
            data={MOCK_PERIOD_DURATIONS}
            labels={['C1', 'C2', 'C3', 'C4', 'C5', 'C6']}
            color={brand.phase.menstrual}
            width={chartWidth}
          />
        </ChartCard>

        {/* 6. BBT Curve */}
        <ChartCard
          title="Basal Body Temperature"
          subtitle="This cycle"
          icon={<Thermometer size={18} color={brand.accent} strokeWidth={2} />}
          onExpand={() => setFullScreen('bbt')}
        >
          <LineChart
            data={MOCK_BBT}
            color={brand.accent}
            width={chartWidth}
            showAverage
          />
        </ChartCard>

        {/* 7. Symptom Frequency */}
        <ChartCard
          title="Symptom Frequency"
          subtitle="Most reported symptoms"
          icon={<Zap size={18} color={brand.secondary} strokeWidth={2} />}
          onExpand={() => setFullScreen('symptoms')}
        >
          <BubbleGrid items={MOCK_SYMPTOMS} />
        </ChartCard>

        {/* 8. Mood Pattern */}
        <ChartCard
          title="Mood Patterns"
          subtitle="4-week heatmap"
          icon={<Heart size={18} color={brand.prePregnancy} strokeWidth={2} />}
          onExpand={() => setFullScreen('mood')}
        >
          <HeatmapGrid
            data={MOCK_MOOD_HEATMAP}
            rowLabels={['W1', 'W2', 'W3', 'W4']}
            colLabels={['S', 'M', 'T', 'W', 'T', 'F', 'S']}
            color={brand.prePregnancy}
          />
        </ChartCard>

        {/* 9. Intimacy Log (TTC only) */}
        {tryingToConceive && (
          <ChartCard
            title="Intimacy Log"
            subtitle="Logged days on cycle timeline"
            icon={<Heart size={18} color={brand.prePregnancy} strokeWidth={2} />}
            onExpand={() => setFullScreen('intimacy')}
          >
            <DotTimeline
              dots={MOCK_INTIMACY_DAYS}
              color={brand.prePregnancy}
              width={chartWidth}
            />
          </ChartCard>
        )}

        {/* 10. Fertility Window Accuracy (TTC only) */}
        {tryingToConceive && (
          <ChartCard
            title="Fertility Window Accuracy"
            subtitle="Predicted vs actual ovulation"
            icon={<Target size={18} color={brand.phase.ovulation} strokeWidth={2} />}
            onExpand={() => setFullScreen('fertility')}
          >
            <View style={styles.accuracyRow}>
              <AccuracyStat label="Predicted" value="Day 14" color={colors.textSecondary} />
              <AccuracyStat label="Actual (BBT shift)" value="Day 15" color={brand.phase.ovulation} />
              <AccuracyStat label="Accuracy" value="93%" color={brand.success} />
            </View>
          </ChartCard>
        )}
      </ScrollView>

      {/* ─── Full Screen Modals ──────────────────────────────────────── */}

      <FullScreenChart
        visible={fullScreen === 'cycle_length'}
        title="Cycle Length Trend"
        onClose={() => setFullScreen(null)}
      >
        <LineChart data={MOCK_CYCLE_LENGTHS} labels={['C1', 'C2', 'C3', 'C4', 'C5', 'C6']} color={colors.primary} width={SCREEN_W - 48} height={220} showAverage />
      </FullScreenChart>

      <FullScreenChart
        visible={fullScreen === 'period_duration'}
        title="Period Duration"
        onClose={() => setFullScreen(null)}
      >
        <BarChart data={MOCK_PERIOD_DURATIONS} labels={['C1', 'C2', 'C3', 'C4', 'C5', 'C6']} color={brand.phase.menstrual} width={SCREEN_W - 48} height={220} />
      </FullScreenChart>

      <FullScreenChart
        visible={fullScreen === 'bbt'}
        title="Basal Body Temperature"
        onClose={() => setFullScreen(null)}
      >
        <LineChart data={MOCK_BBT} color={brand.accent} width={SCREEN_W - 48} height={220} showAverage />
      </FullScreenChart>

      <FullScreenChart
        visible={fullScreen === 'symptoms'}
        title="Symptom Frequency"
        onClose={() => setFullScreen(null)}
      >
        <BubbleGrid items={MOCK_SYMPTOMS} />
      </FullScreenChart>

      <FullScreenChart
        visible={fullScreen === 'mood'}
        title="Mood Patterns"
        onClose={() => setFullScreen(null)}
      >
        <HeatmapGrid data={MOCK_MOOD_HEATMAP} rowLabels={['W1', 'W2', 'W3', 'W4']} colLabels={['S', 'M', 'T', 'W', 'T', 'F', 'S']} color={brand.prePregnancy} />
      </FullScreenChart>

      <FullScreenChart
        visible={fullScreen === 'intimacy'}
        title="Intimacy Log"
        onClose={() => setFullScreen(null)}
      >
        <DotTimeline dots={MOCK_INTIMACY_DAYS} color={brand.prePregnancy} width={SCREEN_W - 48} />
      </FullScreenChart>

      <FullScreenChart
        visible={fullScreen === 'fertility'}
        title="Fertility Window Accuracy"
        onClose={() => setFullScreen(null)}
      >
        <View style={styles.accuracyRow}>
          <AccuracyStat label="Predicted" value="Day 14" color={colors.textSecondary} />
          <AccuracyStat label="Actual (BBT shift)" value="Day 15" color={brand.phase.ovulation} />
          <AccuracyStat label="Accuracy" value="93%" color={brand.success} />
        </View>
      </FullScreenChart>
    </View>
  )
}

// ─── Chart Card Wrapper ────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  icon,
  children,
  onExpand,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  children: React.ReactNode
  onExpand: () => void
}) {
  const { colors, radius } = useTheme()

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      <Pressable onPress={onExpand} style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {icon}
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>
      <View style={styles.cardBody}>{children}</View>
    </View>
  )
}

// ─── Accuracy Stat ─────────────────────────────────────────────────────────

function AccuracyStat({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.accuracyStat}>
      <Text style={[styles.accuracyValue, { color }]}>{value}</Text>
      <Text style={[styles.accuracyLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },

  // Toggle
  toggleRow: { flexDirection: 'row', padding: 4 },
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, fontWeight: '700' },

  // Grandma
  grandmaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grandmaText: { flex: 1, gap: 2 },
  grandmaTitle: { fontSize: 16, fontWeight: '700' },
  grandmaSub: { fontSize: 13, fontWeight: '500' },

  // Insights
  insightScroll: { gap: 10, paddingRight: 16 },
  insightCard: { width: 200, padding: 14, gap: 8 },
  insightText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  // Card
  card: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  cardBody: { alignItems: 'center' },

  // Accuracy
  accuracyRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  accuracyStat: { alignItems: 'center', gap: 4 },
  accuracyValue: { fontSize: 20, fontWeight: '800' },
  accuracyLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
})
