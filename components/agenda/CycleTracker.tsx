import { useState, useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { CyclePhaseRing } from '../prepreg/CyclePhaseRing'
import { getCycleInfo, getMonthCycleDots, toDateStr } from '../../lib/cycleLogic'
import type { CycleInfo, CyclePhase } from '../../lib/cycleLogic'
import { brand, stickers, borderRadius, typography, useTheme } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'
import { useTranslatedContent } from '../../lib/useTranslatedContent'

interface CycleTrackerProps {
  selectedDate: string
  onLogEntry?: (type: string, value?: string, notes?: string) => void
}

const QUICK_LOGS: { type: string; labelKey: keyof TranslationKeys; icon: string; color: string }[] = [
  { type: 'period_start', labelKey: 'cycleTracker_log_periodStarted', icon: 'water-outline', color: brand.phase.menstrual },
  { type: 'period_end', labelKey: 'cycleTracker_log_periodEnded', icon: 'water-outline', color: stickers.peach },
  { type: 'ovulation', labelKey: 'cycleTracker_log_ovulationSign', icon: 'flower-outline', color: stickers.green },
  { type: 'symptom', labelKey: 'cycleTracker_log_symptom', icon: 'pulse-outline', color: stickers.yellow },
  { type: 'basal_temp', labelKey: 'cycleTracker_log_basalTemp', icon: 'thermometer-outline', color: brand.kids },
  { type: 'intercourse', labelKey: 'cycleTracker_log_intercourse', icon: 'heart-outline', color: brand.prePregnancy },
]

const SYMPTOM_OPTIONS: { id: string; labelKey: keyof TranslationKeys; icon: string; color: string }[] = [
  { id: 'cramps', labelKey: 'cycleTracker_symptom_cramps', icon: 'flash-outline', color: brand.phase.menstrual },
  { id: 'bloating', labelKey: 'cycleTracker_symptom_bloating', icon: 'resize-outline', color: stickers.peach },
  { id: 'headache', labelKey: 'cycleTracker_symptom_headache', icon: 'flash-outline', color: stickers.yellow },
  { id: 'fatigue', labelKey: 'cycleTracker_symptom_fatigue', icon: 'bed-outline', color: stickers.blue },
  { id: 'mood_swings', labelKey: 'cycleTracker_symptom_moodSwings', icon: 'happy-outline', color: stickers.lilac },
  { id: 'breast_tenderness', labelKey: 'cycleTracker_symptom_breastPain', icon: 'body-outline', color: stickers.pink },
  { id: 'acne', labelKey: 'cycleTracker_symptom_acne', icon: 'ellipse-outline', color: stickers.coral },
  { id: 'nausea', labelKey: 'cycleTracker_symptom_nausea', icon: 'water-outline', color: stickers.green },
  { id: 'cm_eggwhite', labelKey: 'cycleTracker_symptom_cmEggWhite', icon: 'water', color: stickers.green },
  { id: 'cm_creamy', labelKey: 'cycleTracker_symptom_cmCreamy', icon: 'water', color: stickers.yellow },
  { id: 'cm_sticky', labelKey: 'cycleTracker_symptom_cmSticky', icon: 'water', color: stickers.peach },
  { id: 'cm_dry', labelKey: 'cycleTracker_symptom_cmDry', icon: 'water-outline', color: '#6E6763' }, // colors.textMuted (light)
]

// Short phase labels come from getPhaseLabel() in lib/cycleLogic.ts (English
// prose we can't hook inside a lib fn). Map the phase → a static t() key so the
// label localizes. Keyed by phase so the source string never leaks in.
const PHASE_LABEL_KEY: Record<CyclePhase, TranslationKey> = {
  menstruation: 'cyclePhase_menstruation_label' as TranslationKey,
  follicular: 'cyclePhase_follicular_label' as TranslationKey,
  ovulation: 'cyclePhase_ovulation_label' as TranslationKey,
  luteal: 'cyclePhase_luteal_label' as TranslationKey,
}

// One useTranslatedContent hook per list item — hooks can't run inside a .map,
// so each tip/nutrition line renders as its own row sub-component. Mirrors the
// DevPointRow pattern in components/home/pregnancy/WeekDetailModal.tsx.
function PhaseTipRow({
  phase,
  index,
  tip,
  bulletColor,
  styles,
}: {
  phase: CyclePhase
  index: number
  tip: string
  bulletColor: string
  styles: ReturnType<typeof makeStyles>
}) {
  const { text } = useTranslatedContent(`cyclePhase_${phase}_tip_${index}`, tip)
  return (
    <View style={styles.tipRow}>
      <View style={[styles.tipBullet, { backgroundColor: bulletColor }]} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  )
}

function PhaseNutritionRow({
  phase,
  index,
  tip,
  styles,
}: {
  phase: CyclePhase
  index: number
  tip: string
  styles: ReturnType<typeof makeStyles>
}) {
  const { text } = useTranslatedContent(`cyclePhase_${phase}_nutrition_${index}`, tip)
  return <Text style={styles.nutritionItem}>{'•'} {text}</Text>
}

export function CycleTracker({ selectedDate, onLogEntry }: CycleTrackerProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])
  // Demo: period started 10 days ago — in production from Supabase
  const [lastPeriodStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return toDateStr(d)
  })

  const cycleInfo = getCycleInfo({ lastPeriodStart, cycleLength: 28, periodLength: 5 }, selectedDate)
  const selectedInfo = getCycleInfo({ lastPeriodStart, cycleLength: 28, periodLength: 5 }, selectedDate)

  const selectedPhase = selectedInfo.phase as CyclePhase
  const cyclePhase = cycleInfo.phase as CyclePhase
  // Long-form phase paragraph — translate at render (source is a lib fn we can't
  // hook inside). Stable id-based key derived from phase, never the text.
  const { text: phaseDescription } = useTranslatedContent(
    `cyclePhase_${selectedPhase}_desc`,
    selectedInfo.phaseDescription,
  )

  return (
    <View style={styles.container}>
      {/* Cycle Phase Ring */}
      <CyclePhaseRing cycleInfo={cycleInfo} />

      {/* Selected date phase info */}
      <PaperCard radius={28} padding={20} style={styles.dateInfoCard}>
        <View style={styles.dateInfoHeader}>
          <View style={[styles.datePhaseDot, { backgroundColor: selectedInfo.phaseColor }]} />
          <Text style={styles.dateInfoPhase}>{t(PHASE_LABEL_KEY[selectedPhase])}</Text>
          <Text style={styles.dateInfoDay}>{t('cycleTracker_day', { day: selectedInfo.cycleDay })}</Text>
        </View>
        <Text style={styles.dateInfoDesc}>{phaseDescription}</Text>

        {/* Fertility indicator */}
        {selectedInfo.isFertile && (
          <View style={styles.fertileBanner}>
            <Ionicons name="flower" size={16} color={stickers.green} />
            <Text style={styles.fertileText}>{t('cycleTracker_fertileWindow', { prob: selectedInfo.conceptionProbability })}</Text>
          </View>
        )}
      </PaperCard>

      {/* Quick log buttons */}
      <Text style={styles.sectionLabel}>{t('cycleTracker_quickLog')}</Text>
      <View style={styles.quickGrid}>
        {QUICK_LOGS.map((log) => (
          <Pressable
            key={log.type}
            onPress={() => onLogEntry?.(log.type)}
            style={({ pressed }) => [
              styles.quickBtn,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <View style={[styles.quickIconBox, { backgroundColor: log.color + '15' }]}>
              <Ionicons name={log.icon as any} size={20} color={log.color} />
            </View>
            <Text style={styles.quickLabel}>{t(log.labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Symptom tracking */}
      <Text style={styles.sectionLabel}>{t('cycleTracker_symptomsLabel')}</Text>
      <View style={styles.symptomGrid}>
        {SYMPTOM_OPTIONS.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onLogEntry?.('symptom', s.id)}
            style={({ pressed }) => [
              styles.symptomChip,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={s.icon as any} size={14} color={s.color} />
            <Text style={styles.symptomChipText}>{t(s.labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      {/* Phase tips */}
      <Text style={styles.sectionLabel}>{t('cycleTracker_todaysTips')}</Text>
      {cycleInfo.dailyTips.map((tip, i) => (
        <PhaseTipRow
          key={i}
          phase={cyclePhase}
          index={i}
          tip={tip}
          bulletColor={cycleInfo.phaseColor}
          styles={styles}
        />
      ))}

      {/* Nutrition for this phase */}
      <PaperCard radius={28} padding={20} style={styles.nutritionCard}>
        <View style={styles.nutritionHeader}>
          <Ionicons name="nutrition" size={18} color={stickers.green} />
          <Text style={styles.nutritionTitle}>{t('cycleTracker_nutritionFor', { phase: t(PHASE_LABEL_KEY[cyclePhase]).toUpperCase() })}</Text>
        </View>
        {cycleInfo.nutritionTips.map((tip, i) => (
          <PhaseNutritionRow key={i} phase={cyclePhase} index={i} tip={tip} styles={styles} />
        ))}
      </PaperCard>
    </View>
  )
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {},

  dateInfoCard: {
    marginBottom: 20,
  },
  dateInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  datePhaseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dateInfoPhase: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  dateInfoDay: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
  },
  dateInfoDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 19,
  },
  fertileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: stickers.green + '15',
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
  },
  fertileText: {
    fontSize: 12,
    fontWeight: '700',
    color: stickers.green,
    flex: 1,
  },

  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 12,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  quickBtn: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  quickIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  symptomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  symptomChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },

  nutritionCard: {
    marginTop: 16,
  },
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  nutritionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: stickers.green,
    letterSpacing: 1,
  },
  nutritionItem: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
})
