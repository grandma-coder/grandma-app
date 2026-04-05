/**
 * C1 — Cycle Tracking Home Screen
 *
 * 9-section layout:
 * 1. Greeting header
 * 2. Phase card (color-coded)
 * 3. Fertility window card (TTC only)
 * 4. Daily log card (emoji shortcuts)
 * 5. Cycle trends graph (last 6 cycles)
 * 6. Supplement reminder
 * 7. Quick log row (horizontal pills)
 * 8. Grandma talk card
 * 9. Insight cards
 */

import { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import Svg, { Polyline, Circle } from 'react-native-svg'
import {
  Droplets,
  Thermometer,
  Heart,
  Frown,
  Smile,
  Meh,
  Laugh,
  Zap,
  Sparkles,
  ChevronRight,
  Pill,
  MessageCircle,
} from 'lucide-react-native'
import { useTheme, brand } from '../../constants/theme'
import { getCycleInfo, toDateStr, type CycleInfo } from '../../lib/cycleLogic'
import { useJourneyStore } from '../../store/useJourneyStore'

// ─── Phase colors ──────────────────────────────────────────────────────────

const PHASE_BG: Record<string, string> = {
  menstruation: brand.phase.menstrual,
  follicular: brand.prePregnancy,
  ovulation: brand.phase.ovulation,
  luteal: brand.phase.luteal,
}

const PHASE_BG_TINT: Record<string, string> = {
  menstruation: brand.phase.menstrual + '18',
  follicular: brand.prePregnancy + '18',
  ovulation: brand.phase.ovulation + '18',
  luteal: brand.phase.luteal + '18',
}

// ─── Mood emojis ───────────────────────────────────────────────────────────

const MOODS = [
  { id: 'great', icon: Laugh, label: 'Great' },
  { id: 'good', icon: Smile, label: 'Good' },
  { id: 'okay', icon: Meh, label: 'Okay' },
  { id: 'low', icon: Frown, label: 'Low' },
  { id: 'energetic', icon: Zap, label: 'Energetic' },
]

// ─── Quick log actions ─────────────────────────────────────────────────────

const QUICK_LOGS = [
  { id: 'period_start', label: 'Period Start', icon: Droplets },
  { id: 'period_end', label: 'Period End', icon: Droplets },
  { id: 'symptoms', label: 'Symptoms', icon: Heart },
  { id: 'mood', label: 'Mood', icon: Smile },
  { id: 'temp', label: 'Temp', icon: Thermometer },
]

// ─── Mock data (will be replaced by Supabase queries) ──────────────────────

const MOCK_CYCLE_LENGTHS = [29, 28, 30, 27, 28, 29]
const MOCK_SUPPLEMENTS = ['Folic Acid', 'Vitamin D']

// ─── Main Component ────────────────────────────────────────────────────────

export function CycleHome() {
  const { colors, radius, spacing } = useTheme()
  const parentName = useJourneyStore((s) => s.parentName)
  const [selectedMood, setSelectedMood] = useState<string | null>(null)

  // Cycle info from last period (mock — will come from Supabase)
  const [lastPeriodStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return toDateStr(d)
  })

  const cycleInfo = getCycleInfo({ lastPeriodStart, cycleLength: 28, periodLength: 5 })
  const greeting = getGreeting()
  const tryingToConceive = true // TODO: read from behavior store

  const nextPeriodFormatted = cycleInfo.nextPeriodDate
    ? new Date(cycleInfo.nextPeriodDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : ''

  return (
    <View style={styles.root}>
      {/* 1. Greeting Header */}
      <Text style={[styles.greeting, { color: colors.textSecondary }]}>
        {greeting}, {parentName ?? 'dear'}
      </Text>

      {/* 2. Phase Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: PHASE_BG_TINT[cycleInfo.phase],
            borderRadius: radius.xl,
            borderColor: PHASE_BG[cycleInfo.phase] + '30',
            borderWidth: 1,
          },
        ]}
      >
        <View style={styles.phaseRow}>
          <View
            style={[
              styles.phaseDot,
              { backgroundColor: PHASE_BG[cycleInfo.phase] },
            ]}
          />
          <Text
            style={[
              styles.phaseName,
              { color: PHASE_BG[cycleInfo.phase] },
            ]}
          >
            {cycleInfo.phaseLabel}
          </Text>
        </View>
        <Text style={[styles.phaseDayCounter, { color: colors.text }]}>
          Day {cycleInfo.cycleDay} of your cycle
        </Text>
        <Text style={[styles.phaseDescription, { color: colors.textSecondary }]}>
          {cycleInfo.phaseDescription}
        </Text>
        {nextPeriodFormatted && (
          <Text style={[styles.phaseNextPeriod, { color: colors.textMuted }]}>
            Next period predicted: {nextPeriodFormatted}
          </Text>
        )}
      </View>

      {/* 3. Fertility Window Card (TTC only) */}
      {tryingToConceive && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
            },
          ]}
        >
          <View style={styles.fertilityHeader}>
            <Heart size={18} color={brand.accent} strokeWidth={2} fill={brand.accent} />
            <Text style={[styles.fertilityTitle, { color: colors.text }]}>
              Fertility Window
            </Text>
          </View>
          {cycleInfo.isFertile ? (
            <Text style={[styles.fertilityStatus, { color: brand.phase.ovulation }]}>
              You're in your fertile window!
            </Text>
          ) : (
            <Text style={[styles.fertilityStatus, { color: colors.textSecondary }]}>
              {cycleInfo.daysUntilOvulation > 0
                ? `${cycleInfo.daysUntilOvulation} days until fertile window`
                : 'Fertile window has passed this cycle'}
            </Text>
          )}
          <View style={styles.fertilityConfidence}>
            <Text style={[styles.fertilityConfLabel, { color: colors.textMuted }]}>
              Conception probability
            </Text>
            <Text
              style={[
                styles.fertilityConfValue,
                {
                  color:
                    cycleInfo.conceptionProbability === 'peak'
                      ? brand.phase.ovulation
                      : cycleInfo.conceptionProbability === 'high'
                      ? brand.accent
                      : colors.textSecondary,
                },
              ]}
            >
              {cycleInfo.conceptionProbability.charAt(0).toUpperCase() +
                cycleInfo.conceptionProbability.slice(1)}
            </Text>
          </View>
        </View>
      )}

      {/* 4. Daily Log Card */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          How are you feeling today?
        </Text>
        <View style={styles.moodRow}>
          {MOODS.map((mood) => {
            const Icon = mood.icon
            const active = selectedMood === mood.id
            return (
              <Pressable
                key={mood.id}
                onPress={() => setSelectedMood(mood.id)}
                style={[
                  styles.moodButton,
                  {
                    backgroundColor: active ? colors.primaryTint : colors.surfaceRaised,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <Icon
                  size={22}
                  color={active ? colors.primary : colors.textMuted}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    { color: active ? colors.primary : colors.textMuted },
                  ]}
                >
                  {mood.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* 5. Cycle Trends Graph */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderRadius: radius.xl },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Cycle Trends
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          Last {MOCK_CYCLE_LENGTHS.length} cycles
        </Text>
        <CycleTrendsChart lengths={MOCK_CYCLE_LENGTHS} />
      </View>

      {/* 6. Supplement Reminder */}
      {MOCK_SUPPLEMENTS.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderRadius: radius.xl },
          ]}
        >
          <View style={styles.supplementHeader}>
            <Pill size={18} color={brand.accent} strokeWidth={2} />
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
              Today's Supplements
            </Text>
          </View>
          <View style={styles.supplementList}>
            {MOCK_SUPPLEMENTS.map((s) => (
              <View
                key={s}
                style={[
                  styles.supplementChip,
                  { backgroundColor: brand.accentTint, borderRadius: radius.full },
                ]}
              >
                <Text style={[styles.supplementText, { color: brand.accent }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 7. Quick Log Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickLogScroll}
      >
        {QUICK_LOGS.map((log) => {
          const Icon = log.icon
          return (
            <Pressable
              key={log.id}
              style={[
                styles.quickLogPill,
                { backgroundColor: colors.primaryTint, borderRadius: radius.full },
              ]}
            >
              <Icon size={16} color={colors.primary} strokeWidth={2} />
              <Text style={[styles.quickLogText, { color: colors.primary }]}>
                {log.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* 8. Grandma Talk Card */}
      <Pressable
        onPress={() => router.push('/grandma-talk')}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.primaryTint,
            borderRadius: radius.xl,
          },
          pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        ]}
      >
        <View style={styles.grandmaRow}>
          <View style={styles.grandmaText}>
            <Text style={[styles.grandmaTitle, { color: colors.primary }]}>
              Ask Grandma anything
            </Text>
            <Text style={[styles.grandmaSubtitle, { color: colors.textSecondary }]}>
              Cycle questions, fertility tips, wellness advice
            </Text>
          </View>
          <View
            style={[
              styles.grandmaIcon,
              { backgroundColor: colors.primary },
            ]}
          >
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2} />
          </View>
        </View>
      </Pressable>

      {/* 9. Insight Cards */}
      <View style={styles.insightRow}>
        <InsightCard
          title={cycleInfo.dailyTips[0] ?? 'Track your cycle for insights'}
          tag={cycleInfo.phaseLabel}
          tagColor={PHASE_BG[cycleInfo.phase]}
        />
        <InsightCard
          title={cycleInfo.nutritionTips[0] ?? 'Eat well for your phase'}
          tag="Nutrition"
          tagColor={brand.phase.ovulation}
        />
      </View>
    </View>
  )
}

// ─── Cycle Trends Mini Chart (SVG) ─────────────────────────────────────────

function CycleTrendsChart({ lengths }: { lengths: number[] }) {
  const { colors } = useTheme()

  const width = 280
  const height = 80
  const padding = 16
  const minVal = Math.min(...lengths) - 2
  const maxVal = Math.max(...lengths) + 2
  const range = maxVal - minVal || 1

  const points = lengths.map((v, i) => {
    const x = padding + (i / (lengths.length - 1)) * (width - padding * 2)
    const y = height - padding - ((v - minVal) / range) * (height - padding * 2)
    return { x, y, v }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height}>
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={colors.primary}
            stroke={colors.surface}
            strokeWidth={2}
          />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        {lengths.map((v, i) => (
          <Text key={i} style={[styles.chartLabel, { color: colors.textMuted }]}>
            {v}d
          </Text>
        ))}
      </View>
    </View>
  )
}

// ─── Insight Card ──────────────────────────────────────────────────────────

function InsightCard({
  title,
  tag,
  tagColor,
}: {
  title: string
  tag: string
  tagColor: string
}) {
  const { colors, radius } = useTheme()

  return (
    <View
      style={[
        styles.insightCard,
        { backgroundColor: colors.surface, borderRadius: radius.xl },
      ]}
    >
      <View style={[styles.insightTag, { backgroundColor: tagColor + '20', borderRadius: radius.sm }]}>
        <Text style={[styles.insightTagText, { color: tagColor }]}>{tag}</Text>
      </View>
      <Text style={[styles.insightTitle, { color: colors.text }]} numberOfLines={3}>
        {title}
      </Text>
    </View>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },

  // 1. Greeting
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },

  // Shared card
  card: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: -8,
    marginBottom: 12,
  },

  // 2. Phase card
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  phaseName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  phaseDayCounter: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  phaseDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 8,
  },
  phaseNextPeriod: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },

  // 3. Fertility
  fertilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fertilityTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  fertilityStatus: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  fertilityConfidence: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fertilityConfLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  fertilityConfValue: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // 4. Mood
  moodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 5. Chart
  chartWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 280,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // 6. Supplements
  supplementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  supplementList: {
    flexDirection: 'row',
    gap: 8,
  },
  supplementChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  supplementText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // 7. Quick log
  quickLogScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  quickLogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  quickLogText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // 8. Grandma
  grandmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grandmaText: {
    flex: 1,
    gap: 4,
  },
  grandmaTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  grandmaSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  grandmaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // 9. Insights
  insightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  insightTag: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  insightTagText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
})
