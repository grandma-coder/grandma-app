import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme, brand, stickers, borderRadius } from '../../constants/theme'
import type { CycleInfo } from '../../lib/cycleLogic'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n'
import { useTranslatedContent } from '../../lib/useTranslatedContent'

interface DailyInsightsProps {
  cycleInfo: CycleInfo
  onLogSymptoms?: () => void
  onAskGrandma?: (question: string) => void
}

interface PhaseInsight {
  id: string
  icon: string
  iconColor: string
  bgColor: string
  titleKey: string
  title: string
  body: string
}

// iconColor uses the saturated sticker; bgColor uses the same hue at ~15% alpha
// (RN/iOS reads an 'XX' alpha suffix on hex strings).
// `id` = stable prose key for body translation; `titleKey` = static t() label key.
const PHASE_INSIGHTS: Record<string, PhaseInsight[]> = {
  menstruation: [
    { id: 'menstruation_0', icon: 'heart-outline', iconColor: stickers.coral, bgColor: stickers.coral + '15', titleKey: 'prepreg_insight_selfCareDay_title', title: 'Self-care day', body: 'Your body is doing hard work. Prioritize rest, warmth, and nourishing food.' },
    { id: 'menstruation_1', icon: 'restaurant-outline', iconColor: stickers.green, bgColor: stickers.green + '15', titleKey: 'prepreg_insight_ironRichFoods_title', title: 'Eat iron-rich foods', body: 'Spinach, lentils, and red meat help replenish iron lost during menstruation.' },
    { id: 'menstruation_2', icon: 'water-outline', iconColor: stickers.blue, bgColor: stickers.blue + '15', titleKey: 'prepreg_insight_extraHydrated_title', title: 'Stay extra hydrated', body: 'You lose more fluids during your period. Aim for 10 glasses of water today.' },
  ],
  follicular: [
    { id: 'follicular_0', icon: 'flash-outline', iconColor: stickers.yellow, bgColor: stickers.yellow + '15', titleKey: 'prepreg_insight_energyRising_title', title: 'Energy is rising', body: 'Estrogen is climbing — this is your most energetic phase. Great for exercise and planning.' },
    { id: 'follicular_1', icon: 'fitness-outline', iconColor: stickers.green, bgColor: stickers.green + '15', titleKey: 'prepreg_insight_bestWorkouts_title', title: 'Best time for workouts', body: 'Your body can handle more intense exercise now. Try HIIT, running, or strength training.' },
    { id: 'follicular_2', icon: 'calendar-outline', iconColor: brand.prePregnancy, bgColor: brand.prePregnancy + '15', titleKey: 'prepreg_insight_fertileApproaching_title', title: 'Fertile window approaching', body: 'Your fertile window opens soon. Start tracking ovulation signs like cervical mucus.' },
  ],
  ovulation: [
    { id: 'ovulation_0', icon: 'flower-outline', iconColor: stickers.green, bgColor: stickers.green + '15', titleKey: 'prepreg_insight_peakFertility_title', title: 'Peak fertility!', body: 'The egg has been released. This is the best time to conceive if you are trying.' },
    { id: 'ovulation_1', icon: 'eye-outline', iconColor: brand.prePregnancy, bgColor: brand.prePregnancy + '15', titleKey: 'prepreg_insight_watchForSigns_title', title: 'Watch for signs', body: 'Egg-white cervical mucus, mild cramping (mittelschmerz), and increased libido are all ovulation signs.' },
    { id: 'ovulation_2', icon: 'thermometer-outline', iconColor: stickers.coral, bgColor: stickers.coral + '15', titleKey: 'prepreg_insight_checkYourTemp_title', title: 'Check your temp', body: 'Basal body temperature rises 0.2-0.5°F after ovulation. Track it each morning before getting up.' },
  ],
  luteal: [
    { id: 'luteal_0', icon: 'leaf-outline', iconColor: stickers.lilac, bgColor: stickers.lilac + '15', titleKey: 'prepreg_insight_twoWeekWait_title', title: 'Two-week wait', body: 'If you tried to conceive, implantation may happen in 6-12 days. Avoid alcohol and excess caffeine.' },
    { id: 'luteal_1', icon: 'nutrition-outline', iconColor: stickers.green, bgColor: stickers.green + '15', titleKey: 'prepreg_insight_magnesiumHelps_title', title: 'Magnesium helps', body: 'Dark chocolate, almonds, and bananas are rich in magnesium — eases PMS symptoms and supports implantation.' },
    { id: 'luteal_2', icon: 'moon-outline', iconColor: stickers.blue, bgColor: stickers.blue + '15', titleKey: 'prepreg_insight_prioritizeSleep_title', title: 'Prioritize sleep', body: 'Progesterone may make you sleepier. Lean into it — 7-9 hours of sleep supports fertility.' },
  ],
}

// One hook call per card → each insight renders as its own component (hooks can't
// live inside a .map). Mirrors the WeekDetailModal sub-component pattern.
function InsightCard({
  insight,
  textColor,
  bodyColor,
  onAskGrandma,
}: {
  insight: PhaseInsight
  textColor: string
  bodyColor: string
  onAskGrandma?: (question: string) => void
}) {
  const { t } = useTranslation()
  // Long-form body → runtime-translated + cached (id-based stable key).
  const { text: body } = useTranslatedContent(`prepreg_insight_${insight.id}_body`, insight.body)
  const title = t(insight.titleKey as TranslationKey)
  return (
    <Pressable
      onPress={() => onAskGrandma?.(title)}
      style={[styles.insightCard, { backgroundColor: insight.bgColor }]}
    >
      <View style={[styles.insightIcon, { backgroundColor: insight.iconColor + '25' }]}>
        <Ionicons name={insight.icon as any} size={18} color={insight.iconColor} />
      </View>
      <Text style={[styles.insightTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.insightBody, { color: bodyColor }]} numberOfLines={3}>{body}</Text>
    </Pressable>
  )
}

export function DailyInsights({ cycleInfo, onLogSymptoms, onAskGrandma }: DailyInsightsProps) {
  const { colors: tc } = useTheme()
  const { t } = useTranslation()
  const insights = PHASE_INSIGHTS[cycleInfo.phase] ?? PHASE_INSIGHTS.follicular

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: tc.text }]}>{t('prepreg_dailyInsights_myDailyInsights')}</Text>
        <Text style={[styles.headerSub, { color: tc.textMuted }]}>{t('common_today')}</Text>
      </View>

      {/* Horizontal insight cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Log symptoms card */}
        <Pressable onPress={onLogSymptoms} style={[styles.logCard, { backgroundColor: tc.surfaceGlass, borderColor: tc.border }]}>
          <Text style={[styles.logCardTitle, { color: tc.text }]}>{t('prepreg_dailyInsights_logSymptoms')}</Text>
          <View style={styles.logCardButton}>
            <Ionicons name="add" size={18} color={tc.text} />
          </View>
        </Pressable>

        {/* Phase-specific insight cards */}
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            textColor={tc.text}
            bodyColor={tc.textSecondary}
            onAskGrandma={onAskGrandma}
          />
        ))}
      </ScrollView>

      {/* Tips section */}
      <View style={styles.tipsSection}>
        <Text style={[styles.tipsTitle, { color: tc.text }]}>
          <Ionicons name="sparkles" size={14} color={stickers.yellow} /> {t('prepreg_dailyInsights_phaseTips')}
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
        <PaperCard radius={28} padding={20} style={styles.listCard}>
          <View style={styles.listHeader}>
            <Ionicons name="fitness" size={16} color={stickers.green} />
            <Text style={[styles.listTitle, { color: tc.textMuted }]}>{t('prepreg_dailyInsights_activities')}</Text>
          </View>
          {cycleInfo.activities.slice(0, 4).map((act, i) => (
            <Text key={i} style={[styles.listItem, { color: tc.textSecondary }]}>{'•'} {act}</Text>
          ))}
        </PaperCard>

        <PaperCard radius={28} padding={20} style={styles.listCard}>
          <View style={styles.listHeader}>
            <Ionicons name="nutrition" size={16} color={stickers.coral} />
            <Text style={[styles.listTitle, { color: tc.textMuted }]}>{t('prepreg_dailyInsights_nutrition')}</Text>
          </View>
          {cycleInfo.nutritionTips.slice(0, 3).map((tip, i) => (
            <Text key={i} style={[styles.listItem, { color: tc.textSecondary }]} numberOfLines={2}>{'•'} {tip}</Text>
          ))}
        </PaperCard>
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
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
  },

  scrollContent: {
    gap: 10,
    paddingBottom: 4,
  },

  logCard: {
    width: 120,
    height: 150,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  logCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  logCardButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand.prePregnancy,
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
    lineHeight: 15,
  },
  insightBody: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },

  tipsSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '900',
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
    backgroundColor: brand.prePregnancy,
    marginTop: 5,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
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
    letterSpacing: 1,
  },
  listItem: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 4,
  },
})
