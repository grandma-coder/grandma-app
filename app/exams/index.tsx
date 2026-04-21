/**
 * Exams list — unified view across all three behaviors.
 *
 * Shows every exam on the user's account, filterable by behavior (pre-preg /
 * pregnancy / kids) and child. Entry point from Vault + home grid.
 */

import { useMemo, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { ChevronLeft, FlaskConical } from 'lucide-react-native'

import { useTheme, brand } from '../../constants/theme'
import { useChildStore } from '../../store/useChildStore'
import {
  type Exam,
  type ExamBehavior,
  useExams,
  useExamPhotoUrls,
  formatExamDate,
  examBehaviorLabel,
} from '../../lib/examData'
import { Display, Body, MonoCaps } from '../../components/ui/Typography'
import { logSticker } from '../../components/calendar/logStickers'
import { childColor } from '../../components/ui/ChildPills'

const BEHAVIOR_COLORS: Record<ExamBehavior, string> = {
  'pre-pregnancy': brand.prePregnancy,
  pregnancy: brand.pregnancy,
  kids: brand.kids,
}

export default function ExamsListScreen() {
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)

  const [behaviorFilter, setBehaviorFilter] = useState<ExamBehavior | 'all'>('all')
  const [childFilter, setChildFilter] = useState<string | 'all'>('all')

  const { data: exams = [], isLoading } = useExams({
    behavior: behaviorFilter === 'all' ? undefined : behaviorFilter,
    childId: childFilter === 'all' ? undefined : childFilter,
  })

  const grouped = useMemo(() => {
    const byMonth = new Map<string, Exam[]>()
    for (const e of exams) {
      const key = e.examDate.slice(0, 7) // YYYY-MM
      if (!byMonth.has(key)) byMonth.set(key, [])
      byMonth.get(key)!.push(e)
    }
    return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [exams])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Display size={26} color={colors.text}>Exams</Display>
        <View style={{ width: 32 }} />
      </View>

      {/* Behavior filter */}
      <View style={styles.filterRow}>
        <FilterPill
          label="All"
          active={behaviorFilter === 'all'}
          onPress={() => setBehaviorFilter('all')}
          accent={colors.primary}
          colors={colors}
        />
        {(['pre-pregnancy', 'pregnancy', 'kids'] as ExamBehavior[]).map((b) => (
          <FilterPill
            key={b}
            label={examBehaviorLabel(b)}
            active={behaviorFilter === b}
            onPress={() => setBehaviorFilter(b)}
            accent={BEHAVIOR_COLORS[b]}
            colors={colors}
          />
        ))}
      </View>

      {/* Child filter (only meaningful in kids/all) */}
      {children.length > 1 && (behaviorFilter === 'all' || behaviorFilter === 'kids') && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.childRow}
        >
          <FilterPill
            label="All kids"
            active={childFilter === 'all'}
            onPress={() => setChildFilter('all')}
            accent={colors.primary}
            colors={colors}
          />
          {children.map((c, i) => (
            <FilterPill
              key={c.id}
              label={c.name}
              active={childFilter === c.id}
              onPress={() => setChildFilter(c.id)}
              accent={childColor(i)}
              colors={colors}
            />
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <Body size={13} color={colors.textMuted} align="center" style={{ marginTop: 40 }}>
            Loading…
          </Body>
        )}

        {!isLoading && exams.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FlaskConical size={32} color={colors.textMuted} strokeWidth={1.5} />
            <Body size={15} color={colors.text} align="center" style={{ marginTop: 12, fontWeight: '600' }}>
              No exams yet
            </Body>
            <Body size={13} color={colors.textMuted} align="center" style={{ marginTop: 4 }}>
              Log an exam from any calendar — photos get auto-read by AI.
            </Body>
          </View>
        )}

        {grouped.map(([monthKey, items]) => (
          <View key={monthKey} style={styles.monthGroup}>
            <MonoCaps size={11} color={colors.textMuted} style={{ marginBottom: 8 }}>
              {monthLabel(monthKey)}
            </MonoCaps>
            <View style={{ gap: 10 }}>
              {items.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  childName={exam.childId ? children.find((c) => c.id === exam.childId)?.name : undefined}
                  childIndex={exam.childId ? children.findIndex((c) => c.id === exam.childId) : -1}
                  isDark={isDark}
                  colors={colors}
                  onPress={() => router.push({ pathname: '/exams/[id]', params: { id: exam.id } })}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  onPress,
  accent,
  colors,
}: {
  label: string
  active: boolean
  onPress: () => void
  accent: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? accent + '20' : colors.surface,
          borderColor: active ? accent : colors.border,
        },
      ]}
    >
      <Text
        style={[styles.pillText, { color: active ? accent : colors.textSecondary }]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function ExamCard({
  exam,
  childName,
  childIndex,
  isDark,
  colors,
  onPress,
}: {
  exam: Exam
  childName?: string
  childIndex: number
  isDark: boolean
  colors: ReturnType<typeof useTheme>['colors']
  onPress: () => void
}) {
  const accent = BEHAVIOR_COLORS[exam.behavior]
  const firstPhotoPath = exam.photos[0]
  const [thumbUrl] = useExamPhotoUrls(firstPhotoPath ? [firstPhotoPath] : [])
  const flaggedCount = exam.extracted?.flagged?.length ?? 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.cardLeft}>
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={styles.cardThumb} />
        ) : (
          <View style={[styles.cardIconWrap, { backgroundColor: accent + '18' }]}>
            {logSticker('exam', 28, isDark)}
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {exam.title}
          </Text>
          {flaggedCount > 0 && (
            <View style={[styles.flagPill, { backgroundColor: brand.error + '15', borderColor: brand.error + '40' }]}>
              <Text style={[styles.flagPillText, { color: brand.error }]}>{flaggedCount} flagged</Text>
            </View>
          )}
        </View>
        {exam.result && (
          <Text style={[styles.cardResult, { color: colors.textSecondary }]} numberOfLines={1}>
            {exam.result}
          </Text>
        )}
        <View style={styles.cardMetaRow}>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
            {formatExamDate(exam.examDate)}
          </Text>
          <View style={[styles.behaviorPill, { backgroundColor: accent + '18' }]}>
            <Text style={[styles.behaviorPillText, { color: accent }]}>
              {examBehaviorLabel(exam.behavior)}
            </Text>
          </View>
          {childName && childIndex >= 0 && (
            <View style={[styles.behaviorPill, { backgroundColor: childColor(childIndex) + '18' }]}>
              <Text style={[styles.behaviorPillText, { color: childColor(childIndex) }]}>{childName}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  childRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  monthGroup: { marginBottom: 20 },
  emptyCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardLeft: { width: 56, alignItems: 'center', justifyContent: 'center' },
  cardThumb: { width: 56, height: 56, borderRadius: 12 },
  cardIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  cardResult: { fontSize: 13, fontWeight: '500' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  cardMeta: { fontSize: 11, fontWeight: '600' },
  behaviorPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  behaviorPillText: { fontSize: 10, fontWeight: '700' },
  flagPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  flagPillText: { fontSize: 10, fontWeight: '700' },
})
