import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { colors, brand, stickers, borderRadius, typography } from '../../constants/theme'

interface ChecklistItem {
  id: string
  title: string
  description: string
  category: string
  completed: boolean
}

interface PrePregChecklistProps {
  items: ChecklistItem[]
  onToggle?: (itemId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  health: brand.prePregnancy,
  fertility: stickers.green,
  lifestyle: brand.kids,
  financial: stickers.yellow,
  emotional: brand.pregnancy,
}

export function PrePregChecklist({ items, onToggle }: PrePregChecklistProps) {
  const completed = items.filter((i) => i.completed).length
  const total = items.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <View style={styles.container}>
      {/* Progress header */}
      <PaperCard radius={28} padding={20} style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressTitle}>{pct}% COMPLETE</Text>
            <Text style={styles.progressSubtitle}>
              {completed} of {total} tasks done
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressNumber}>{completed}</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </PaperCard>

      {/* Checklist items */}
      {items.map((item) => {
        const catColor = CATEGORY_COLORS[item.category] ?? brand.kids
        return (
          <Pressable
            key={item.id}
            onPress={() => onToggle?.(item.id)}
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
          >
            <PaperCard radius={28} padding={20} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={[
                  styles.checkbox,
                  item.completed && { backgroundColor: stickers.green, borderColor: stickers.green },
                ]}>
                  {item.completed && (
                    <Ionicons name="checkmark" size={14} color="#1A1030" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemHeader}>
                    <Text style={[
                      styles.itemTitle,
                      item.completed && { textDecorationLine: 'line-through', color: colors.textTertiary },
                    ]}>
                      {item.title}
                    </Text>
                    <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
                      <Text style={[styles.categoryText, { color: catColor }]}>
                        {item.category}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                </View>
              </View>
            </PaperCard>
          </Pressable>
        )
      })}

      {items.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="checkbox-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Your checklist is empty</Text>
          <Text style={styles.emptyDesc}>
            Preparation tasks will appear here to guide your journey to conception.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {},

  progressCard: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
  },
  progressSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: stickers.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: stickers.green,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: stickers.green,
  },

  itemCard: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
})
