import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Check } from 'lucide-react-native'
import { PaperCard } from '../ui/PaperCard'
import { brand, stickers, borderRadius, useTheme, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { useTranslation } from '../../lib/i18n'

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
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const completed = items.filter((i) => i.completed).length
  const total = items.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  if (diffuse) {
    const accent = getDiffuseAccent('pre-pregnancy', dt.isDark)
    return (
      <View>
        {/* Progress — serif number, mono meta, hairline .dprog bar */}
        <PaperCard radius={20} padding={20} style={{ marginBottom: 16 }}>
          <View style={dstyles.progHead}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: dt.colors.ink3 }}>
                {t('prepreg_checklistProgress_complete', { pct })}
              </Text>
              <Text style={{ fontFamily: diffuseFont.display, fontSize: 40, color: dt.colors.ink, letterSpacing: -1, marginTop: 6 }}>
                {completed}<Text style={{ fontSize: 18, color: dt.colors.ink3 }}>{` / ${total}`}</Text>
              </Text>
            </View>
          </View>
          <View style={[dstyles.progTrack, { backgroundColor: dt.colors.line }]}>
            <View style={{ height: 3, borderRadius: 999, width: `${pct}%`, backgroundColor: accent }} />
          </View>
        </PaperCard>

        {/* Items — hairline .dcheck rows, not cards */}
        {items.map((item, i) => (
          <Pressable
            key={item.id}
            onPress={() => onToggle?.(item.id)}
            style={({ pressed }) => [
              dstyles.checkRow,
              { borderBottomColor: dt.colors.line, borderBottomWidth: i === items.length - 1 ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <View style={[dstyles.checkBox, { borderColor: item.completed ? accent : dt.colors.line2 }]}>
              {item.completed ? <Check size={13} color={accent} strokeWidth={2} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <View style={dstyles.itemHeadD}>
                <Text
                  style={{ flex: 1, fontFamily: diffuseFont.body, fontSize: 15, color: item.completed ? dt.colors.ink3 : dt.colors.ink, textDecorationLine: item.completed ? 'line-through' : 'none' }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={{ fontFamily: diffuseFont.mono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: dt.colors.ink3 }}>
                  {item.category}
                </Text>
              </View>
              <Text style={{ fontFamily: diffuseFont.body, fontSize: 12.5, color: dt.colors.ink3, lineHeight: 18, marginTop: 3 }}>
                {item.description}
              </Text>
            </View>
          </Pressable>
        ))}

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={40} color={dt.colors.ink3} />
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 18, color: dt.colors.ink, marginTop: 4 }}>{t('prepreg_checklistProgress_empty')}</Text>
            <Text style={{ fontFamily: diffuseFont.body, fontSize: 13, color: dt.colors.ink3, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 }}>
              {t('prepreg_checklistProgress_emptyDesc')}
            </Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Progress header */}
      <PaperCard radius={28} padding={20} style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressTitle}>{t('prepreg_checklistProgress_complete', { pct })}</Text>
            <Text style={styles.progressSubtitle}>
              {t('prepreg_checklistProgress_tasksDone', { done: completed, total })}
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
                    <Ionicons name="checkmark" size={14} color={stickers.greenInk} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemHeader}>
                    <Text style={[
                      styles.itemTitle,
                      item.completed && { textDecorationLine: 'line-through', color: colors.textMuted },
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
          <Ionicons name="checkbox-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('prepreg_checklistProgress_empty')}</Text>
          <Text style={styles.emptyDesc}>
            {t('prepreg_checklistProgress_emptyDesc')}
          </Text>
        </View>
      )}
    </View>
  )
}

const dstyles = StyleSheet.create({
  progHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  progTrack: { height: 3, borderRadius: 999, overflow: 'hidden' },
  checkRow: { flexDirection: 'row', gap: 14, paddingVertical: 14, alignItems: 'flex-start' },
  checkBox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  itemHeadD: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
    color: colors.textMuted,
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
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
})
