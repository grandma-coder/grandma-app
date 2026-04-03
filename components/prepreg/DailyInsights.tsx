import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { useAppTheme } from '../ui/ThemeProvider'
import { colors, THEME_COLORS, borderRadius } from '../../constants/theme'
import type { CycleInfo } from '../../lib/cycleLogic'

interface DailyInsightsProps {
  cycleInfo: CycleInfo
  onLogSymptoms?: () => void
  onAskGrandma?: (question: string) => void
}

const PHASE_INSIGHTS: Record<string, { icon: string; iconColor: string; bgColor: string; title: string; body: string }[]> = {
  menstruation: [
    { icon: 'heart-outline', iconColor: '#FF6B6B', bgColor: '#FF6B6B15', title: 'Self-care day', body: 'Your body is doing hard work. Prioritize rest, warmth, and nourishing food.' },
    { icon: 'restaurant-outline', iconColor: '#A2FF86', bgColor: '#A2FF8615', title: 'Eat iron-rich foods', body: 'Spinach, lentils, and red meat help replenish iron lost during menstruation.' },
    { icon: 'water-outline', iconColor: '#4D96FF', bgColor: '#4D96FF15', title: 'Stay extra hydrated', body: 'You lose more fluids during your period. Aim for 10 glasses of water today.' },
  ],
  follicular: [
    { icon: 'flash-outline', iconColor: '#F4FD50', bgColor: '#F4FD5015', title: 'Energy is rising', body: 'Estrogen is climbing — this is your most energetic phase. Great for exercise and planning.' },
    { icon: 'fitness-outline', iconColor: '#A2FF86', bgColor: '#A2FF8615', title: 'Best time for workouts', body: 'Your body can handle more intense exercise now. Try HIIT, running, or strength training.' },
    { icon: 'calendar-outline', iconColor: '#FF8AD8', bgColor: '#FF8AD815', title: 'Fertile window approaching', body: 'Your fertile window opens soon. Start tracking ovulation signs like cervical mucus.' },
  ],
  ovulation: [
    { icon: 'flower-outline', iconColor: '#A2FF86', bgColor: '#A2FF8615', title: 'Peak fertility!', body: 'The egg has been released. This is the best time to conceive if you are trying.' },
    { icon: 'eye-outline', iconColor: '#FF8AD8', bgColor: '#FF8AD815', title: 'Watch for signs', body: 'Egg-white cervical mucus, mild cramping (mittelschmerz), and increased libido are all ovulation signs.' },
    { icon: 'thermometer-outline', iconColor: '#FF6B35', bgColor: '#FF6B3515', title: 'Check your temp', body: 'Basal body temperature rises 0.2-0.5°F after ovulation. Track it each morning before getting up.' },
  ],
  luteal: [
    { icon: 'leaf-outline', iconColor: '#B983FF', bgColor: '#B983FF15', title: 'Two-week wait', body: 'If you tried to conceive, implantation may happen in 6-12 days. Avoid alcohol and excess caffeine.' },
    { icon: 'nutrition-outline', iconColor: '#A2FF86', bgColor: '#A2FF8615', title: 'Magnesium helps', body: 'Dark chocolate, almonds, and bananas are rich in magnesium — eases PMS symptoms and supports implantation.' },
    { icon: 'moon-outline', iconColor: '#4D96FF', bgColor: '#4D96FF15', title: 'Prioritize sleep', body: 'Progesterone may make you sleepier. Lean into it — 7-9 hours of sleep supports fertility.' },
  ],
}

export function DailyInsights({ cycleInfo, onLogSymptoms, onAskGrandma }: DailyInsightsProps) {
  const { colors: tc } = useAppTheme()
  const insights = PHASE_INSIGHTS[cycleInfo.phase] ?? PHASE_INSIGHTS.follicular

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: tc.text }]}>MY DAILY INSIGHTS</Text>
        <Text style={[styles.headerSub, { color: tc.textTertiary }]}>Today</Text>
      </View>

      {/* Horizontal insight cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Log symptoms card */}
        <Pressable onPress={onLogSymptoms} style={[styles.logCard, { backgroundColor: tc.surfaceGlass, borderColor: tc.border }]}>
          <Text style={[styles.logCardTitle, { color: tc.text }]}>Log your{'\n'}symptoms</Text>
          <View style={styles.logCardButton}>
            <Ionicons name="add" size={18} color="#FFF" />
          </View>
        </Pressable>

        {/* Phase-specific insight cards */}
        {insights.map((insight, i) => (
          <Pressable
            key={i}
            onPress={() => onAskGrandma?.(insight.title)}
            style={[styles.insightCard, { backgroundColor: insight.bgColor }]}
          >
            <View style={[styles.insightIcon, { backgroundColor: insight.iconColor + '25' }]}>
              <Ionicons name={insight.icon as any} size={18} color={insight.iconColor} />
            </View>
            <Text style={[styles.insightTitle, { color: tc.text }]}>{insight.title}</Text>
            <Text style={[styles.insightBody, { color: tc.textSecondary }]} numberOfLines={3}>{insight.body}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tips section */}
      <View style={styles.tipsSection}>
        <Text style={[styles.tipsTitle, { color: tc.text }]}>
          <Ionicons name="sparkles" size={14} color={THEME_COLORS.yellow} /> PHASE TIPS
        </Text>
        {cycleInfo.dailyTips.slice(0, 3).map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipBullet} />
            <Text style={[styles.tipText, { color: tc.textSecondary }]}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Activities + Nutrition row */}
      <View style={styles.listsRow}>
        <GlassCard style={styles.listCard}>
          <View style={styles.listHeader}>
            <Ionicons name="fitness" size={16} color={THEME_COLORS.green} />
            <Text style={styles.listTitle}>ACTIVITIES</Text>
          </View>
          {cycleInfo.activities.slice(0, 4).map((act, i) => (
            <Text key={i} style={[styles.listItem, { color: tc.textSecondary }]}>• {act}</Text>
          ))}
        </GlassCard>

        <GlassCard style={styles.listCard}>
          <View style={styles.listHeader}>
            <Ionicons name="nutrition" size={16} color={THEME_COLORS.orange} />
            <Text style={[styles.listTitle, { color: tc.textTertiary }]}>NUTRITION</Text>
          </View>
          {cycleInfo.nutritionTips.slice(0, 3).map((tip, i) => (
            <Text key={i} style={[styles.listItem, { color: tc.textSecondary }]} numberOfLines={2}>• {tip}</Text>
          ))}
        </GlassCard>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},

  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
  },

  scrollContent: {
    gap: 10,
    paddingBottom: 4,
  },

  logCard: {
    width: 120,
    height: 150,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    justifyContent: 'space-between',
  },
  logCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 18,
  },
  logCardButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME_COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  insightCard: {
    width: 160,
    height: 150,
    borderRadius: borderRadius.lg,
    padding: 14,
    justifyContent: 'flex-start',
    gap: 6,
  },
  insightIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 15,
  },
  insightBody: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 14,
  },

  tipsSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME_COLORS.pink,
    marginTop: 5,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },

  listsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  listCard: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  listItem: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
})
