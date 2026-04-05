/**
 * D2 — Pregnancy Analytics Screen
 *
 * 9-section scrollable analytics:
 * 1. Progress arc header
 * 2. Grandma talk banner
 * 3. Insight cards
 * 4. Weight tracking chart
 * 5. Symptom frequency by trimester
 * 6. Mood trend chart
 * 7. Kick count log (T3 only)
 * 8. Appointment timeline
 * 9. Wellbeing score card
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
  Circle as SvgCircle,
  Path,
  Text as SvgText,
  Line,
  Rect,
  Polyline,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg'
import {
  MessageCircle,
  TrendingUp,
  Zap,
  Heart,
  Hand,
  Calendar,
  ChevronRight,
  Smile,
  Activity,
  Shield,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { getTrimester, getWeekInfo } from '../../lib/pregnancyWeeks'
import { LineChart, BarChart, HeatmapGrid } from '../charts/SvgCharts'
import { FullScreenChart } from '../charts/FullScreenChart'

const SCREEN_W = Dimensions.get('window').width

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_WEIGHTS = [58, 58.5, 59.2, 60.1, 61.0, 62.3, 63.5, 64.2, 65.0, 65.8]
const MOCK_WEIGHT_LABELS = ['W12', 'W14', 'W16', 'W18', 'W20', 'W22', 'W24', 'W26', 'W28', 'W30']

// Symptom frequency per trimester: [T1, T2, T3]
const MOCK_SYMPTOM_FREQ = [
  { name: 'Nausea', t1: 8, t2: 2, t3: 1 },
  { name: 'Fatigue', t1: 7, t2: 4, t3: 6 },
  { name: 'Back pain', t1: 1, t2: 5, t3: 8 },
  { name: 'Swelling', t1: 0, t2: 3, t3: 7 },
  { name: 'Heartburn', t1: 2, t2: 4, t3: 6 },
]

const MOCK_MOOD_WEEKS = [0.7, 0.6, 0.8, 0.5, 0.4, 0.6, 0.7, 0.8, 0.9, 0.7, 0.5, 0.6]

const MOCK_KICK_SESSIONS = [8, 10, 12, 9, 11, 10, 13, 10]
const MOCK_KICK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon']

const MOCK_APPOINTMENTS = [
  { week: 12, type: 'Ultrasound', label: 'NT Scan' },
  { week: 16, type: 'Blood test', label: 'Quad Screen' },
  { week: 20, type: 'Ultrasound', label: 'Anatomy Scan' },
  { week: 24, type: 'Checkup', label: 'Glucose Test' },
  { week: 28, type: 'Blood test', label: 'Rh Factor' },
  { week: 32, type: 'Checkup', label: 'Growth Check' },
  { week: 36, type: 'Test', label: 'Group B Strep' },
  { week: 38, type: 'Checkup', label: 'Pre-birth Check' },
]

const MOCK_INSIGHTS = [
  { title: 'Weight gain is on track — within recommended range', color: brand.success },
  { title: 'Nausea decreased significantly in second trimester', color: brand.phase.ovulation },
  { title: 'Mood improved with regular exercise weeks', color: brand.prePregnancy },
]

// ─── Main Component ────────────────────────────────────────────────────────

export function PregnancyAnalytics() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const trimester = getTrimester(weekNumber)
  const weekInfo = getWeekInfo(weekNumber)
  const progress = weekNumber / 40
  const showKicks = weekNumber >= 28

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
      >
        {/* 1. Progress Arc Header */}
        <View style={[styles.arcCard, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <ProgressArc
            week={weekNumber}
            progress={progress}
            trimester={trimester}
          />
          <Text style={[styles.arcWeekLabel, { color: colors.text }]}>
            Week {weekNumber} of 40
          </Text>
          <Text style={[styles.arcPercent, { color: colors.primary }]}>
            {Math.round(progress * 100)}% complete
          </Text>
          <View style={styles.trimesterRow}>
            {[1, 2, 3].map((t) => (
              <View
                key={t}
                style={[
                  styles.trimesterBadge,
                  {
                    backgroundColor:
                      t === trimester
                        ? brand.trimester[t === 1 ? 'first' : t === 2 ? 'second' : 'third'] + '25'
                        : colors.surfaceRaised,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.trimesterText,
                    {
                      color:
                        t === trimester
                          ? brand.trimester[t === 1 ? 'first' : t === 2 ? 'second' : 'third']
                          : colors.textMuted,
                    },
                  ]}
                >
                  T{t}
                </Text>
              </View>
            ))}
          </View>
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
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.grandmaTitle, { color: colors.primary }]}>
                Ask Grandma about your progress
              </Text>
              <Text style={[styles.grandmaSub, { color: colors.textSecondary }]}>
                Week-by-week insights from your data
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
          {MOCK_INSIGHTS.map((card, i) => (
            <View
              key={i}
              style={[
                styles.insightCard,
                {
                  backgroundColor: card.color + '12',
                  borderRadius: radius.xl,
                  borderColor: card.color + '25',
                  borderWidth: 1,
                },
              ]}
            >
              <Zap size={16} color={card.color} strokeWidth={2} />
              <Text style={[styles.insightText, { color: colors.text }]}>
                {card.title}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* 4. Weight Tracking */}
        <ChartCard
          title="Weight Tracking"
          subtitle="With recommended range"
          icon={<TrendingUp size={18} color={brand.pregnancy} strokeWidth={2} />}
          onExpand={() => setFullScreen('weight')}
        >
          <LineChart
            data={MOCK_WEIGHTS}
            labels={MOCK_WEIGHT_LABELS}
            color={brand.pregnancy}
            width={chartWidth}
            showAverage
          />
        </ChartCard>

        {/* 5. Symptom Frequency by Trimester */}
        <ChartCard
          title="Symptoms by Trimester"
          subtitle="Frequency comparison"
          icon={<Activity size={18} color={brand.phase.menstrual} strokeWidth={2} />}
          onExpand={() => setFullScreen('symptoms')}
        >
          <SymptomTrimesterChart data={MOCK_SYMPTOM_FREQ} width={chartWidth} />
        </ChartCard>

        {/* 6. Mood Trend */}
        <ChartCard
          title="Mood Trend"
          subtitle="Weekly average across pregnancy"
          icon={<Smile size={18} color={brand.prePregnancy} strokeWidth={2} />}
          onExpand={() => setFullScreen('mood')}
        >
          <MoodAreaChart data={MOCK_MOOD_WEEKS} width={chartWidth} />
        </ChartCard>

        {/* 7. Kick Count (T3 only) */}
        {showKicks && (
          <ChartCard
            title="Kick Count Sessions"
            subtitle="Kicks per session this week"
            icon={<Hand size={18} color={brand.pregnancy} strokeWidth={2} />}
            onExpand={() => setFullScreen('kicks')}
          >
            <BarChart
              data={MOCK_KICK_SESSIONS}
              labels={MOCK_KICK_LABELS}
              color={brand.pregnancy}
              width={chartWidth}
            />
          </ChartCard>
        )}

        {/* 8. Appointment Timeline */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.cardHeaderRow}>
            <Calendar size={18} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Appointment Timeline
            </Text>
          </View>
          <View style={styles.timeline}>
            {MOCK_APPOINTMENTS.map((apt, i) => {
              const isPast = apt.week <= weekNumber
              const isCurrent = apt.week === weekNumber || (i < MOCK_APPOINTMENTS.length - 1 && MOCK_APPOINTMENTS[i + 1].week > weekNumber && apt.week <= weekNumber)
              return (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: isPast ? colors.primary : colors.border,
                          borderColor: isCurrent ? colors.primary : 'transparent',
                          borderWidth: isCurrent ? 2 : 0,
                        },
                      ]}
                    />
                    {i < MOCK_APPOINTMENTS.length - 1 && (
                      <View
                        style={[
                          styles.timelineConnector,
                          { backgroundColor: isPast ? colors.primary + '40' : colors.border },
                        ]}
                      />
                    )}
                  </View>
                  <View style={[styles.timelineContent, { opacity: isPast ? 1 : 0.5 }]}>
                    <Text style={[styles.timelineWeek, { color: colors.textMuted }]}>
                      Week {apt.week}
                    </Text>
                    <Text style={[styles.timelineLabel, { color: colors.text }]}>
                      {apt.label}
                    </Text>
                    <Text style={[styles.timelineType, { color: colors.textSecondary }]}>
                      {apt.type}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        {/* 9. Wellbeing Score */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={styles.cardHeaderRow}>
            <Shield size={18} color={brand.success} strokeWidth={2} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Weekly Wellbeing
            </Text>
          </View>
          <WellbeingScore />
        </View>
      </ScrollView>

      {/* ─── Full Screen Modals ──────────────────────────────────────── */}

      <FullScreenChart visible={fullScreen === 'weight'} title="Weight Tracking" onClose={() => setFullScreen(null)}>
        <LineChart data={MOCK_WEIGHTS} labels={MOCK_WEIGHT_LABELS} color={brand.pregnancy} width={SCREEN_W - 48} height={220} showAverage />
      </FullScreenChart>

      <FullScreenChart visible={fullScreen === 'symptoms'} title="Symptoms by Trimester" onClose={() => setFullScreen(null)}>
        <SymptomTrimesterChart data={MOCK_SYMPTOM_FREQ} width={SCREEN_W - 48} />
      </FullScreenChart>

      <FullScreenChart visible={fullScreen === 'mood'} title="Mood Trend" onClose={() => setFullScreen(null)}>
        <MoodAreaChart data={MOCK_MOOD_WEEKS} width={SCREEN_W - 48} />
      </FullScreenChart>

      <FullScreenChart visible={fullScreen === 'kicks'} title="Kick Count Sessions" onClose={() => setFullScreen(null)}>
        <BarChart data={MOCK_KICK_SESSIONS} labels={MOCK_KICK_LABELS} color={brand.pregnancy} width={SCREEN_W - 48} height={220} />
      </FullScreenChart>
    </View>
  )
}

// ─── Progress Arc ──────────────────────────────────────────────────────────

function ProgressArc({ week, progress, trimester }: { week: number; progress: number; trimester: 1 | 2 | 3 }) {
  const { colors } = useTheme()
  const size = 160
  const stroke = 10
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = Math.PI * r // half circle
  const offset = circumference * (1 - progress)

  const triColor = brand.trimester[trimester === 1 ? 'first' : trimester === 2 ? 'second' : 'third']

  // Arc from 180° to 0° (bottom half)
  const startAngle = Math.PI
  const endAngle = 0

  function polarToCart(angle: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const bgStart = polarToCart(startAngle)
  const bgEnd = polarToCart(endAngle)
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${bgEnd.x} ${bgEnd.y}`

  const fillAngle = startAngle - progress * Math.PI
  const fillEnd = polarToCart(fillAngle)
  const largeArc = progress > 0.5 ? 1 : 0
  const fillPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`

  return (
    <View style={styles.arcWrap}>
      <Svg width={size} height={size / 2 + 10}>
        <Path d={bgPath} fill="none" stroke={colors.surfaceRaised} strokeWidth={stroke} strokeLinecap="round" />
        <Path d={fillPath} fill="none" stroke={triColor} strokeWidth={stroke} strokeLinecap="round" />
      </Svg>
      <Text style={[styles.arcNumber, { color: triColor }]}>{week}</Text>
    </View>
  )
}

// ─── Symptom Trimester Chart (grouped bars) ────────────────────────────────

function SymptomTrimesterChart({
  data,
  width,
}: {
  data: { name: string; t1: number; t2: number; t3: number }[]
  width: number
}) {
  const { colors, radius } = useTheme()
  const height = 120
  const pad = 16
  const maxVal = Math.max(...data.flatMap((d) => [d.t1, d.t2, d.t3])) + 1
  const groupW = (width - pad * 2) / data.length
  const barW = Math.min(8, groupW / 4)

  return (
    <View style={styles.chartCenter}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const gx = pad + i * groupW + groupW / 2
          const bars = [
            { v: d.t1, c: brand.trimester.first },
            { v: d.t2, c: brand.trimester.second },
            { v: d.t3, c: brand.trimester.third },
          ]
          return bars.map((b, bi) => {
            const bh = (b.v / maxVal) * (height - pad * 2)
            const x = gx - barW * 1.5 + bi * (barW + 2)
            return (
              <Rect
                key={`${i}-${bi}`}
                x={x}
                y={height - pad - bh}
                width={barW}
                height={bh}
                rx={barW / 3}
                fill={b.c}
                opacity={0.8}
              />
            )
          })
        })}
      </Svg>
      <View style={[styles.symLabelRow, { width, paddingHorizontal: pad }]}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.symLabel, { color: colors.textMuted, width: groupW }]}>
            {d.name.split(' ')[0]}
          </Text>
        ))}
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={brand.trimester.first} label="T1" />
        <LegendDot color={brand.trimester.second} label="T2" />
        <LegendDot color={brand.trimester.third} label="T3" />
      </View>
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  )
}

// ─── Mood Area Chart ───────────────────────────────────────────────────────

function MoodAreaChart({ data, width }: { data: number[]; width: number }) {
  const { colors } = useTheme()
  const height = 100
  const pad = 16

  if (data.length < 2) return null

  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: height - pad - v * (height - pad * 2),
  }))

  const areaPath =
    `M ${pts[0].x} ${height - pad} ` +
    pts.map((p) => `L ${p.x} ${p.y}`).join(' ') +
    ` L ${pts[pts.length - 1].x} ${height - pad} Z`

  const linePath = pts.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <View style={styles.chartCenter}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={brand.prePregnancy} stopOpacity="0.3" />
            <Stop offset="1" stopColor={brand.prePregnancy} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#moodGrad)" />
        <Polyline
          points={linePath}
          fill="none"
          stroke={brand.prePregnancy}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={brand.prePregnancy} stroke={colors.surface} strokeWidth={2} />
        ))}
      </Svg>
    </View>
  )
}

// ─── Wellbeing Score ───────────────────────────────────────────────────────

function WellbeingScore() {
  const { colors, radius } = useTheme()

  const categories = [
    { label: 'Sleep', score: 7, color: brand.pregnancy },
    { label: 'Mood', score: 8, color: brand.prePregnancy },
    { label: 'Nutrition', score: 6, color: brand.phase.ovulation },
    { label: 'Exercise', score: 5, color: brand.kids },
    { label: 'Hydration', score: 9, color: brand.secondary },
  ]

  const avg = Math.round(categories.reduce((s, c) => s + c.score, 0) / categories.length * 10)

  return (
    <View style={styles.wellbeingWrap}>
      <View style={[styles.wellbeingScore, { backgroundColor: brand.success + '15', borderRadius: radius.xl }]}>
        <Text style={[styles.wellbeingNumber, { color: brand.success }]}>{avg}%</Text>
        <Text style={[styles.wellbeingLabel, { color: colors.textSecondary }]}>Overall</Text>
      </View>
      <View style={styles.wellbeingBars}>
        {categories.map((cat) => (
          <View key={cat.label} style={styles.wellbeingBarRow}>
            <Text style={[styles.wellbeingBarLabel, { color: colors.textSecondary }]}>{cat.label}</Text>
            <View style={[styles.wellbeingBarTrack, { backgroundColor: colors.surfaceRaised, borderRadius: 3 }]}>
              <View
                style={[
                  styles.wellbeingBarFill,
                  {
                    backgroundColor: cat.color,
                    width: `${cat.score * 10}%`,
                    borderRadius: 3,
                  },
                ]}
              />
            </View>
            <Text style={[styles.wellbeingBarValue, { color: cat.color }]}>{cat.score}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Chart Card ────────────────────────────────────────────────────────────

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
      <Pressable onPress={onExpand} style={styles.cardHeaderRow}>
        {icon}
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </Pressable>
      <View style={styles.cardBody}>{children}</View>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },

  // Arc
  arcCard: { padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  arcWrap: { alignItems: 'center', position: 'relative' },
  arcNumber: { position: 'absolute', bottom: 0, fontSize: 36, fontWeight: '900' },
  arcWeekLabel: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  arcPercent: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  trimesterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  trimesterBadge: { paddingVertical: 4, paddingHorizontal: 14 },
  trimesterText: { fontSize: 13, fontWeight: '700' },

  // Grandma
  grandmaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grandmaTitle: { fontSize: 16, fontWeight: '700' },
  grandmaSub: { fontSize: 13, fontWeight: '500' },

  // Insights
  insightScroll: { gap: 10, paddingRight: 16 },
  insightCard: { width: 200, padding: 14, gap: 8 },
  insightText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  // Card
  card: { padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  cardBody: { alignItems: 'center' },

  // Chart helpers
  chartCenter: { alignItems: 'center' },
  symLabelRow: { flexDirection: 'row', marginTop: 4 },
  symLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '600' },

  // Timeline
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: 12 },
  timelineLine: { alignItems: 'center', width: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6 },
  timelineConnector: { width: 2, height: 40, marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineWeek: { fontSize: 11, fontWeight: '600' },
  timelineLabel: { fontSize: 15, fontWeight: '700' },
  timelineType: { fontSize: 12, fontWeight: '500' },

  // Wellbeing
  wellbeingWrap: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  wellbeingScore: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  wellbeingNumber: { fontSize: 24, fontWeight: '900' },
  wellbeingLabel: { fontSize: 11, fontWeight: '600' },
  wellbeingBars: { flex: 1, gap: 6 },
  wellbeingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wellbeingBarLabel: { width: 56, fontSize: 11, fontWeight: '600' },
  wellbeingBarTrack: { flex: 1, height: 6 },
  wellbeingBarFill: { height: '100%' },
  wellbeingBarValue: { width: 16, fontSize: 11, fontWeight: '700', textAlign: 'right' },
})
