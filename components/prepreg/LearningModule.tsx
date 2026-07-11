import { View, Text, Pressable, StyleSheet } from 'react-native'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'
import type { LearningModule as LearningModuleType } from '../../lib/prepregnancyData'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n'
import { useTranslatedContent } from '../../lib/useTranslatedContent'

interface LearningModuleProps {
  module: LearningModuleType
  onPress?: () => void
}

// Stable id → static title key. Titles are short labels → static t() catalog.
const MODULE_TITLE_KEYS: Record<string, string> = {
  'fertility-basics': 'prepreg_learn_fertilityBasics_title',
  'nutrition-prep': 'prepreg_learn_nutritionPrep_title',
  'emotional-readiness': 'prepreg_learn_emotionalReadiness_title',
  'financial-planning': 'prepreg_learn_financialPlanning_title',
  'partner-journey': 'prepreg_learn_partnerJourney_title',
  'health-checkups': 'prepreg_learn_healthCheckups_title',
}

export function LearningModule({ module, onPress }: LearningModuleProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  // Long-form description → runtime-translated + cached (id-based stable key).
  const { text: description } = useTranslatedContent(`prepreg_learn_${module.id}_desc`, module.description)
  const titleKey = MODULE_TITLE_KEYS[module.id]
  const title = titleKey ? t(titleKey as TranslationKey) : module.title
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <PaperCard radius={28} padding={20} style={styles.container}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryTint }]}>
            <Text style={styles.icon}>{module.icon}</Text>
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>{description}</Text>
            <Text style={[styles.lessons, { color: colors.accent }]}>{t('prepreg_lessonsCount', { count: module.lessons })}</Text>
          </View>
        </View>
      </PaperCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  lessons: {
    fontSize: 11,
    fontWeight: '600',
  },
})
