import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'
import type { ChecklistItem } from '../../lib/prepregnancyData'

interface ChecklistCardProps {
  items: ChecklistItem[]
  onToggle?: (id: string, completed: boolean) => void
}

export function ChecklistCard({ items, onToggle }: ChecklistCardProps) {
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
    <GlassCard>
      <View style={styles.header}>
        <Text style={styles.title}>Preparation Checklist</Text>
        <Text style={styles.counter}>{doneCount}/{items.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {items.map((item) => {
        const isDone = completed.has(item.id)
        return (
          <Pressable key={item.id} onPress={() => toggle(item.id)} style={styles.row}>
            <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
              {isDone && <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />}
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.itemTitle, isDone && styles.itemTitleDone]}>
                {item.title}
              </Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
            </View>
          </Pressable>
        )
      })}
    </GlassCard>
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
    color: colors.text,
  },
  counter: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceGlass,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  rowContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  itemDesc: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 16,
  },
})
