import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'
import type { ChecklistItem } from '../../lib/prepregnancyData'
import { useTranslation } from '../../lib/i18n'

interface ChecklistCardProps {
  items: ChecklistItem[]
  onToggle?: (id: string, completed: boolean) => void
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

      {items.map((item) => {
        const isDone = completed.has(item.id)
        return (
          <Pressable key={item.id} onPress={() => toggle(item.id)} style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.checkbox, { borderColor: colors.border }, isDone && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              {isDone && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.itemTitle, { color: colors.text }, isDone && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                {item.title}
              </Text>
              <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.description}</Text>
            </View>
          </Pressable>
        )
      })}
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
