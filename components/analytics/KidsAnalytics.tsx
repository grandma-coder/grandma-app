/**
 * D3 — Kids Analytics Screen
 *
 * 5 major sections: Nutrition, Sleep, Mood, Health, Growth
 * Each section has multiple charts. Child selector at top.
 * All data from Supabase child_logs (mocked for now).
 */

import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native'
import { router } from 'expo-router'
import Svg, {
  Rect,
  Circle,
  Polyline,
  Line,
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
  User,
  Shield,
  Syringe,
  Apple,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import { LineChart, BarChart, HeatmapGrid, BubbleGrid } from '../charts/SvgCharts'
import { FullScreenChart } from '../charts/FullScreenChart'

const SCREEN_W = Dimensions.get('window').width

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_EAT_QUALITY = { good: [4, 3, 5, 4, 3, 4, 5], little: [1, 2, 0, 1, 2, 1, 0], none: [0, 0, 0, 0, 0, 0, 0] }
const MOCK_MEAL_FREQ = [3, 4, 3, 5, 3, 4, 3]
const MOCK_NEW_FOODS_DAYS = [2, 5, 8, 14, 18, 22, 25]
const MOCK_NUTRITION_HEATMAP = [
  [0.8, 0.9, 0.7, 0.6, 0.8, 0.9, 0.7],
  [0.6, 0.7, 0.8, 0.9, 0.5, 0.7, 0.8],
  [0.9, 0.8, 0.6, 0.7, 0.8, 0.6, 0.9],
  [0.7, 0.6, 0.8, 0.7, 0.9, 0.8, 0.7],
]
const MOCK_TOP_FOODS: { label: string; value: number; color?: string }[] = [
  { label: 'Banana', value: 12, color: brand.accent },
  { label: 'Rice', value: 10, color: brand.kids },
  { label: 'Avocado', value: 8, color: brand.phase.ovulation },
  { label: 'Oats', value: 7, color: brand.pregnancy },
  { label: 'Chicken', value: 6, color: brand.phase.menstrual },
  { label: 'Sweet potato', value: 5, color: brand.secondary },
]

const MOCK_SLEEP_WEEKLY = [10.5, 11, 10, 11.5, 10.5, 11, 10.5]
const MOCK_SLEEP_QUALITY = { deep: 45, light: 35, restless: 20 }

const MOCK_MOOD_HEATMAP = [
  [0.9, 0.8, 0.7, 0.6, 0.8, 0.9, 0.8],
  [0.7, 0.5, 0.6, 0.8, 0.7, 0.8, 0.9],
  [0.8, 0.7, 0.5, 0.4, 0.6, 0.7, 0.8],
  [0.6, 0.8, 0.9, 0.7, 0.8, 0.6, 0.7],
]

const MOCK_HEALTH_EVENTS = [
  { date: 'Mar 15', type: 'Vaccine', label: 'DTaP dose 3' },
  { date: 'Mar 20', type: 'Temperature', label: '38.2°C — mild fever' },
  { date: 'Apr 1', type: 'Checkup', label: '9-month pediatric visit' },
]
const MOCK_HEALTH_FREQ = [2, 1, 3, 1, 2, 0, 1]

const MOCK_VACCINES = [
  { name: 'HepB', done: true }, { name: 'DTaP', done: true },
  { name: 'IPV', done: true }, { name: 'Hib', done: false },
  { name: 'PCV13', done: false }, { name: 'RV', done: true },
  { name: 'MMR', done: false }, { name: 'Varicella', done: false },
]

const MOCK_WEIGHTS = [3.5, 4.8, 6.2, 7.5, 8.3, 9.1]
const MOCK_HEIGHTS = [50, 55, 60, 64, 67, 70]
const MOCK_GROWTH_LABELS = ['0m', '2m', '4m', '6m', '8m', '10m']

const MOCK_INSIGHTS = [
  { title: 'Banana is the most eaten food this month', color: brand.accent },
  { title: 'Sleep duration improved 8% this week', color: brand.kids },
  { title: 'Mood tends to dip on low-sleep days', color: brand.prePregnancy },
]

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Main Component ────────────────────────────────────────────────────────

export function KidsAnalytics() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const activeChild = useChildStore((s) => s.activeChild)
  const setActiveChild = useChildStore((s) => s.setActiveChild)

  const [selectedChildId, setSelectedChildId] = useState<string | 'all'>('all')
  const [fullScreen, setFullScreen] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    nutrition: true, sleep: true, mood: false, health: false, growth: false,
  })

  const chartW = SCREEN_W - 72
  const toggle = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Child Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childRow}>
          <ChildChip
            label="All Kids"
            active={selectedChildId === 'all'}
            onPress={() => setSelectedChildId('all')}
          />
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

        {/* 3. Insight Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightScroll}>
          {MOCK_INSIGHTS.map((c, i) => (
            <View key={i} style={[styles.insightCard, { backgroundColor: c.color + '12', borderRadius: radius.xl, borderColor: c.color + '25', borderWidth: 1 }]}>
              <Zap size={14} color={c.color} strokeWidth={2} />
              <Text style={[styles.insightText, { color: colors.text }]}>{c.title}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ═══ NUTRITION SECTION ═══ */}
        <SectionHeader title="Nutrition" icon={<Utensils size={18} color={brand.phase.ovulation} strokeWidth={2} />} expanded={expanded.nutrition} onToggle={() => toggle('nutrition')} />
        {expanded.nutrition && (
          <View style={styles.sectionBody}>
            {/* Eat Quality */}
            <ChartCard title="Weekly Eat Quality" onExpand={() => setFullScreen('eat_quality')}>
              <StackedBarChart good={MOCK_EAT_QUALITY.good} little={MOCK_EAT_QUALITY.little} none={MOCK_EAT_QUALITY.none} labels={DAY_LABELS} width={chartW} />
            </ChartCard>

            {/* Meal Frequency */}
            <ChartCard title="Meal Frequency" onExpand={() => setFullScreen('meal_freq')}>
              <BarChart data={MOCK_MEAL_FREQ} labels={DAY_LABELS} color={brand.kids} width={chartW} />
            </ChartCard>

            {/* Nutrition Heatmap */}
            <ChartCard title="Monthly Nutrition" onExpand={() => setFullScreen('nutrition_heat')}>
              <HeatmapGrid data={MOCK_NUTRITION_HEATMAP} rowLabels={['W1', 'W2', 'W3', 'W4']} colLabels={DAYS} color={brand.phase.ovulation} />
            </ChartCard>

            {/* Top Foods */}
            <ChartCard title="Most Logged Foods" onExpand={() => setFullScreen('top_foods')}>
              <BubbleGrid items={MOCK_TOP_FOODS} />
            </ChartCard>
          </View>
        )}

        {/* ═══ SLEEP SECTION ═══ */}
        <SectionHeader title="Sleep" icon={<Moon size={18} color={brand.pregnancy} strokeWidth={2} />} expanded={expanded.sleep} onToggle={() => toggle('sleep')} />
        {expanded.sleep && (
          <View style={styles.sectionBody}>
            {/* Weekly Sleep */}
            <ChartCard title="Weekly Sleep Hours" onExpand={() => setFullScreen('sleep_weekly')}>
              <BarChart data={MOCK_SLEEP_WEEKLY} labels={DAY_LABELS} color={brand.pregnancy} width={chartW} />
            </ChartCard>

            {/* Sleep Quality Donut */}
            <ChartCard title="Sleep Quality" onExpand={() => setFullScreen('sleep_quality')}>
              <DonutChart deep={MOCK_SLEEP_QUALITY.deep} light={MOCK_SLEEP_QUALITY.light} restless={MOCK_SLEEP_QUALITY.restless} />
            </ChartCard>
          </View>
        )}

        {/* ═══ MOOD SECTION ═══ */}
        <SectionHeader title="Mood" icon={<Smile size={18} color={brand.prePregnancy} strokeWidth={2} />} expanded={expanded.mood} onToggle={() => toggle('mood')} />
        {expanded.mood && (
          <View style={styles.sectionBody}>
            <ChartCard title="Weekly Mood Heatmap" onExpand={() => setFullScreen('mood_heat')}>
              <HeatmapGrid data={MOCK_MOOD_HEATMAP} rowLabels={['W1', 'W2', 'W3', 'W4']} colLabels={DAYS} color={brand.prePregnancy} />
            </ChartCard>

            <CorrelationCard
              leftLabel="Mood"
              leftData={[0.7, 0.5, 0.8, 0.6, 0.9, 0.7, 0.8]}
              leftColor={brand.prePregnancy}
              rightLabel="Sleep"
              rightData={MOCK_SLEEP_WEEKLY.map((v) => v / 12)}
              rightColor={brand.pregnancy}
              labels={DAY_LABELS}
              width={chartW}
            />
          </View>
        )}

        {/* ═══ HEALTH SECTION ═══ */}
        <SectionHeader title="Health" icon={<Heart size={18} color={brand.error} strokeWidth={2} />} expanded={expanded.health} onToggle={() => toggle('health')} />
        {expanded.health && (
          <View style={styles.sectionBody}>
            {/* Event Timeline */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Recent Events</Text>
              {MOCK_HEALTH_EVENTS.map((e, i) => (
                <View key={i} style={styles.eventRow}>
                  <View style={[styles.eventDot, { backgroundColor: e.type === 'Vaccine' ? brand.kids : e.type === 'Temperature' ? brand.error : brand.secondary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventLabel, { color: colors.text }]}>{e.label}</Text>
                    <Text style={[styles.eventDate, { color: colors.textMuted }]}>{e.date} — {e.type}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Health Frequency */}
            <ChartCard title="Health Events (weekly)" onExpand={() => setFullScreen('health_freq')}>
              <BarChart data={MOCK_HEALTH_FREQ} labels={DAY_LABELS} color={brand.error} width={chartW} />
            </ChartCard>

            {/* Vaccine Tracker */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <View style={styles.row}>
                <Syringe size={18} color={brand.kids} strokeWidth={2} />
                <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 0 }]}>Vaccine Tracker</Text>
              </View>
              <View style={styles.vaccineGrid}>
                {MOCK_VACCINES.map((v, i) => (
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
            <ChartCard title="Weight (kg)" onExpand={() => setFullScreen('weight')}>
              <LineChart data={MOCK_WEIGHTS} labels={MOCK_GROWTH_LABELS} color={brand.kids} width={chartW} showAverage />
            </ChartCard>

            <ChartCard title="Height (cm)" onExpand={() => setFullScreen('height')}>
              <LineChart data={MOCK_HEIGHTS} labels={MOCK_GROWTH_LABELS} color={brand.phase.ovulation} width={chartW} showAverage />
            </ChartCard>

            {/* Growth Velocity */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Growth Velocity</Text>
              <View style={styles.velocityRow}>
                <VelocityStat label="Weight" value="+0.8 kg/mo" trend="normal" />
                <VelocityStat label="Height" value="+2.5 cm/mo" trend="good" />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── Full Screen Modals ──────────────────────────────────────── */}
      <FullScreenChart visible={fullScreen === 'eat_quality'} title="Weekly Eat Quality" onClose={() => setFullScreen(null)}>
        <StackedBarChart good={MOCK_EAT_QUALITY.good} little={MOCK_EAT_QUALITY.little} none={MOCK_EAT_QUALITY.none} labels={DAY_LABELS} width={SCREEN_W - 48} height={200} />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'meal_freq'} title="Meal Frequency" onClose={() => setFullScreen(null)}>
        <BarChart data={MOCK_MEAL_FREQ} labels={DAY_LABELS} color={brand.kids} width={SCREEN_W - 48} height={200} />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'nutrition_heat'} title="Monthly Nutrition" onClose={() => setFullScreen(null)}>
        <HeatmapGrid data={MOCK_NUTRITION_HEATMAP} rowLabels={['W1', 'W2', 'W3', 'W4']} colLabels={DAYS} color={brand.phase.ovulation} />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'top_foods'} title="Most Logged Foods" onClose={() => setFullScreen(null)}>
        <BubbleGrid items={MOCK_TOP_FOODS} />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'sleep_weekly'} title="Weekly Sleep" onClose={() => setFullScreen(null)}>
        <BarChart data={MOCK_SLEEP_WEEKLY} labels={DAY_LABELS} color={brand.pregnancy} width={SCREEN_W - 48} height={200} />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'sleep_quality'} title="Sleep Quality" onClose={() => setFullScreen(null)}>
        <DonutChart deep={MOCK_SLEEP_QUALITY.deep} light={MOCK_SLEEP_QUALITY.light} restless={MOCK_SLEEP_QUALITY.restless} />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'mood_heat'} title="Mood Heatmap" onClose={() => setFullScreen(null)}>
        <HeatmapGrid data={MOCK_MOOD_HEATMAP} rowLabels={['W1', 'W2', 'W3', 'W4']} colLabels={DAYS} color={brand.prePregnancy} />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'health_freq'} title="Health Events" onClose={() => setFullScreen(null)}>
        <BarChart data={MOCK_HEALTH_FREQ} labels={DAY_LABELS} color={brand.error} width={SCREEN_W - 48} height={200} />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'weight'} title="Weight" onClose={() => setFullScreen(null)}>
        <LineChart data={MOCK_WEIGHTS} labels={MOCK_GROWTH_LABELS} color={brand.kids} width={SCREEN_W - 48} height={200} showAverage />
      </FullScreenChart>
      <FullScreenChart visible={fullScreen === 'height'} title="Height" onClose={() => setFullScreen(null)}>
        <LineChart data={MOCK_HEIGHTS} labels={MOCK_GROWTH_LABELS} color={brand.phase.ovulation} width={SCREEN_W - 48} height={200} showAverage />
      </FullScreenChart>
    </View>
  )
}

// ─── Section Header (collapsible) ──────────────────────────────────────────

function SectionHeader({ title, icon, expanded, onToggle }: { title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void }) {
  const { colors, radius } = useTheme()
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

function StackedBarChart({ good, little, none, labels, width = 300, height = 120 }: {
  good: number[]; little: number[]; none: number[]; labels: string[]; width?: number; height?: number
}) {
  const { colors, radius } = useTheme()
  const pad = 20
  const count = good.length
  const maxVal = Math.max(...good.map((g, i) => g + little[i] + none[i])) + 1
  const barW = Math.min(24, (width - pad * 2) / count - 6)

  return (
    <View style={styles.chartCenter}>
      <Svg width={width} height={height}>
        {good.map((g, i) => {
          const x = pad + (i / count) * (width - pad * 2) + (width - pad * 2) / count / 2 - barW / 2
          const total = g + little[i] + none[i]
          const gH = (g / maxVal) * (height - pad * 2)
          const lH = (little[i] / maxVal) * (height - pad * 2)
          const nH = (none[i] / maxVal) * (height - pad * 2)
          const baseY = height - pad
          return (
            <View key={i}>
              <Rect x={x} y={baseY - gH} width={barW} height={gH} rx={barW / 4} fill={brand.success} opacity={0.8} />
              <Rect x={x} y={baseY - gH - lH} width={barW} height={lH} rx={0} fill={brand.accent} opacity={0.8} />
              {nH > 0 && <Rect x={x} y={baseY - gH - lH - nH} width={barW} height={nH} rx={barW / 4} fill={brand.error} opacity={0.6} />}
            </View>
          )
        })}
      </Svg>
      <View style={[styles.labelRow, { width, paddingHorizontal: pad }]}>
        {labels.map((l, i) => <Text key={i} style={[styles.label, { color: colors.textMuted }]}>{l}</Text>)}
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={brand.success} label="Ate well" />
        <LegendDot color={brand.accent} label="A little" />
        <LegendDot color={brand.error} label="Did not eat" />
      </View>
    </View>
  )
}

// ─── Donut Chart ───────────────────────────────────────────────────────────

function DonutChart({ deep, light, restless }: { deep: number; light: number; restless: number }) {
  const { colors } = useTheme()
  const size = 120
  const stroke = 14
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const total = deep + light + restless
  const circ = 2 * Math.PI * r

  function arc(startPct: number, pct: number) {
    const startAngle = startPct * 2 * Math.PI - Math.PI / 2
    const endAngle = (startPct + pct) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const large = pct > 0.5 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }

  const deepPct = deep / total
  const lightPct = light / total
  const restlessPct = restless / total

  return (
    <View style={styles.donutWrap}>
      <Svg width={size} height={size}>
        <Path d={arc(0, deepPct)} fill="none" stroke={brand.kids} strokeWidth={stroke} strokeLinecap="round" />
        <Path d={arc(deepPct, lightPct)} fill="none" stroke={brand.accent} strokeWidth={stroke} strokeLinecap="round" />
        <Path d={arc(deepPct + lightPct, restlessPct)} fill="none" stroke={brand.error} strokeWidth={stroke} strokeLinecap="round" />
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={[styles.donutValue, { color: colors.text }]}>{deep}%</Text>
        <Text style={[styles.donutLabel, { color: colors.textMuted }]}>Deep</Text>
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={brand.kids} label={`Deep ${deep}%`} />
        <LegendDot color={brand.accent} label={`Light ${light}%`} />
        <LegendDot color={brand.error} label={`Restless ${restless}%`} />
      </View>
    </View>
  )
}

// ─── Correlation Card ──────────────────────────────────────────────────────

function CorrelationCard({ leftLabel, leftData, leftColor, rightLabel, rightData, rightColor, labels, width }: {
  leftLabel: string; leftData: number[]; leftColor: string
  rightLabel: string; rightData: number[]; rightColor: string
  labels: string[]; width: number
}) {
  const { colors, radius } = useTheme()
  const scaledLeft = leftData.map((v) => v * 10)
  const scaledRight = rightData.map((v) => v * 10)

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
      <Text style={[styles.chartTitle, { color: colors.text }]}>{leftLabel} vs {rightLabel}</Text>
      <View style={styles.chartCenter}>
        <LineChart data={scaledLeft} labels={labels} color={leftColor} width={width} />
        <View style={{ marginTop: 8 }}>
          <LineChart data={scaledRight} labels={labels} color={rightColor} width={width} />
        </View>
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={leftColor} label={leftLabel} />
        <LegendDot color={rightColor} label={rightLabel} />
      </View>
    </View>
  )
}

// ─── Velocity Stat ─────────────────────────────────────────────────────────

function VelocityStat({ label, value, trend }: { label: string; value: string; trend: 'good' | 'normal' | 'slow' }) {
  const { colors, radius } = useTheme()
  const trendColor = trend === 'good' ? brand.success : trend === 'normal' ? brand.accent : brand.error
  return (
    <View style={[styles.velocityStat, { backgroundColor: trendColor + '12', borderRadius: radius.xl }]}>
      <Text style={[styles.velocityValue, { color: trendColor }]}>{value}</Text>
      <Text style={[styles.velocityLabel, { color: colors.textSecondary }]}>{label}</Text>
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
  chartCenter: { alignItems: 'center' },

  // Labels
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'center' },
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

  // Donut
  donutWrap: { alignItems: 'center', gap: 8 },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, height: 120, alignItems: 'center', justifyContent: 'center' },
  donutValue: { fontSize: 22, fontWeight: '900' },
  donutLabel: { fontSize: 11, fontWeight: '600' },

  // Velocity
  velocityRow: { flexDirection: 'row', gap: 12 },
  velocityStat: { flex: 1, alignItems: 'center', padding: 16, gap: 4 },
  velocityValue: { fontSize: 18, fontWeight: '800' },
  velocityLabel: { fontSize: 12, fontWeight: '600' },
})
