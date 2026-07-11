import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'
import type { ChecklistItem } from '../../lib/prepregnancyData'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKey } from '../../lib/i18n'
import { useTranslatedContent } from '../../lib/useTranslatedContent'

interface ChecklistCardProps {
  items: ChecklistItem[]
  onToggle?: (id: string, completed: boolean) => void
}

// Stable id → static title key. Titles are short labels → static t() catalog.
const CHECKLIST_TITLE_KEYS: Record<string, string> = {
  'prenatal-vitamins': 'prepreg_checklist_prenatalVitamins_title',
  'doctor-visit': 'prepreg_checklist_doctorVisit_title',
  'dental-check': 'prepreg_checklist_dentalCheck_title',
  vaccines: 'prepreg_checklist_vaccines_title',
  'track-cycle': 'prepreg_checklist_trackCycle_title',
  'cut-alcohol': 'prepreg_checklist_cutAlcohol_title',
  exercise: 'prepreg_checklist_exercise_title',
  finances: 'prepreg_checklist_finances_title',
  'partner-talk': 'prepreg_checklist_partnerTalk_title',
  stress: 'prepreg_checklist_stress_title',
}

// One hook call per row → each item must render as its own component (hooks can't
// live inside a .map). Mirrors the WeekDetailModal sub-component pattern.
function ChecklistRow({
  item,
  isDone,
  onPress,
}: {
  item: ChecklistItem
  isDone: boolean
  onPress: () => void
}) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  // Long-form description → runtime-translated + cached (id-based stable key).
  const { text: description } = useTranslatedContent(`prepreg_checklist_${item.id}_desc`, item.description)
  const titleKey = CHECKLIST_TITLE_KEYS[item.id]
  const title = titleKey ? t(titleKey as TranslationKey) : item.title
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.checkbox, { borderColor: colors.border }, isDone && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
        {isDone && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.itemTitle, { color: colors.text }, isDone && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
          {title}
        </Text>
        <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{description}</Text>
      </View>
    </Pressable>
  )
}

export function ChecklistCard({ items, onToggle }: ChecklistCardProps) {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onToggle?.(id, next.has(id))
      return next
    })
  }

  const doneCount = completed.size
  const progress = items.length > 0 ? doneCount / items.length : 0

  return (
    <PaperCard radius={28} padding={20}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('prepreg_checklist_title')}</Text>
        <Text style={[styles.counter, { color: colors.accent }]}>{doneCount}/{items.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.surfaceGlass }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
      </View>

      {items.map((item) => (
        <ChecklistRow
          key={item.id}
          item={item}
          isDone={completed.has(item.id)}
          onPress={() => toggle(item.id)}
        />
      ))}
    </PaperCard>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  counter: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
})
