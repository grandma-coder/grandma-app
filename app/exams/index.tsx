/**
 * Exams list — unified view across all three behaviors.
 *
 * Cream-paper sticker aesthetic. Surfaces total / flagged / this-year counts,
 * month-grouped paper cards, and an inviting empty state with a CTA back to
 * the calendar (where new exams are actually created).
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
import { ChevronLeft } from 'lucide-react-native'

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
import { SegmentedTabs } from '../../components/calendar/SegmentedTabs'

type BehaviorFilter = 'all' | ExamBehavior

const BEHAVIOR_COLORS: Record<ExamBehavior, string> = {
  'pre-pregnancy': brand.prePregnancy,
  pregnancy: brand.pregnancy,
  kids: brand.kids,
}

export default function ExamsListScreen() {
  const { colors, isDark, font } = useTheme()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)

  const [behaviorFilter, setBehaviorFilter] = useState<BehaviorFilter>('all')
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

  const stats = useMemo(() => {
    const thisYear = new Date().getFullYear().toString()
    let flagged = 0
    let yearCount = 0
    for (const e of exams) {
      if ((e.extracted?.flagged?.length ?? 0) > 0) flagged++
      if (e.examDate.startsWith(thisYear)) yearCount++
    }
    return { total: exams.length, flagged, yearCount }
  }, [exams])

  // Cream-paper palette (mirrors WeekCard / LogSheet)
  const ink = isDark ? colors.text : '#141313'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const inkMuted = isDark ? colors.textMuted : 'rgba(20,19,19,0.55)'
  const inkFaint = isDark ? colors.textFaint : 'rgba(20,19,19,0.35)'

  const showChildRow =
    children.length > 1 && (behaviorFilter === 'all' || behaviorFilter === 'kids')

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ChevronLeft size={24} color={ink} strokeWidth={2} />
        </Pressable>
        <Display size={28} color={ink}>Exams</Display>
        <View style={{ width: 32 }} />
      </View>

      {/* Behavior segmented tabs */}
      <View style={styles.segWrap}>
        <SegmentedTabs
          options={[
            { key: 'all', label: 'All' },
            { key: 'pre-pregnancy', label: 'Pre-preg' },
            { key: 'pregnancy', label: 'Pregnancy' },
            { key: 'kids', label: 'Kids' },
          ]}
          value={behaviorFilter}
          onChange={(k) => setBehaviorFilter(k as BehaviorFilter)}
        />
      </View>

      {/* Child filter — only shown when relevant */}
      {showChildRow && (
        <View style={styles.childRowWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childRow}
          >
            <ChildPill
              label="All kids"
              active={childFilter === 'all'}
              onPress={() => setChildFilter('all')}
              accent={ink}
              isAll
              ink={ink}
              paper={paper}
              paperBorder={paperBorder}
              inkMuted={inkMuted}
              font={font}
            />
            {children.map((c, i) => (
              <ChildPill
                key={c.id}
                label={c.name}
                active={childFilter === c.id}
                onPress={() => setChildFilter(c.id)}
                accent={childColor(i)}
                ink={ink}
                paper={paper}
                paperBorder={paperBorder}
                inkMuted={inkMuted}
                font={font}
              />
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats summary card — only when exams exist */}
        {!isLoading && exams.length > 0 && (
          <View style={[styles.statsCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <StatCell value={stats.total} label="Total" ink={ink} inkMuted={inkMuted} font={font} />
            <View style={[styles.statDivider, { backgroundColor: paperBorder }]} />
            <StatCell
              value={stats.flagged}
              label="Flagged"
              accent={stats.flagged > 0 ? brand.error : undefined}
              ink={ink}
              inkMuted={inkMuted}
              font={font}
            />
            <View style={[styles.statDivider, { backgroundColor: paperBorder }]} />
            <StatCell value={stats.yearCount} label="This year" ink={ink} inkMuted={inkMuted} font={font} />
          </View>
        )}

        {isLoading && (
          <Body size={13} color={inkMuted} align="center" style={{ marginTop: 40 }}>
            Loading…
          </Body>
        )}

        {!isLoading && exams.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <View style={[styles.emptyStickerWrap, { backgroundColor: '#F3ECD9', borderColor: paperBorder }]}>
              {logSticker('exam', 56, isDark)}
            </View>
            <Display size={22} color={ink} align="center" style={{ marginTop: 16 }}>
              No exams yet
            </Display>
            <Text style={[styles.emptyTagline, { color: ink, fontFamily: font.italic }]}>
              Photos &amp; PDFs get auto-read by AI.
            </Text>
            <Body size={13} color={inkMuted} align="center" style={{ marginTop: 12 }}>
              Open the calendar and tap the&nbsp;+ to log a new exam — title,
              result, photos and reference range get extracted for you.
            </Body>
            <Pressable
              onPress={() => router.push('/(tabs)/agenda')}
              style={({ pressed }) => [
                styles.emptyCta,
                { backgroundColor: ink, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.emptyCtaText, { color: paper, fontFamily: font.bodySemiBold }]}>
                Open calendar
              </Text>
            </Pressable>
          </View>
        )}

        {grouped.map(([monthKey, items]) => (
          <View key={monthKey} style={styles.monthGroup}>
            <MonoCaps size={11} color={inkFaint} style={{ marginBottom: 10, letterSpacing: 1.8 }}>
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
                  ink={ink}
                  inkMuted={inkMuted}
                  paper={paper}
                  paperBorder={paperBorder}
                  font={font}
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

interface PillBase {
  ink: string
  paper: string
  paperBorder: string
  inkMuted: string
  font: ReturnType<typeof useTheme>['font']
}

function ChildPill({
  label,
  active,
  onPress,
  accent,
  isAll,
  ink,
  paper,
  paperBorder,
  inkMuted,
  font,
}: {
  label: string
  active: boolean
  onPress: () => void
  accent: string
  /** "All kids" pill — uses ink fill for active state */
  isAll?: boolean
} & PillBase) {
  // Active-children pills are filled in their pastel accent (legible because
  // pastels are light); "All" is filled in solid ink with cream text — mirrors
  // SegmentedTabs and the empty-state CTA for design-system consistency.
  const activeBg = isAll ? ink : accent
  const activeFg = isAll ? paper : ink
  const activeBorder = isAll ? ink : 'rgba(20,19,19,0.18)'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.childPill,
        active
          ? {
              backgroundColor: activeBg,
              borderColor: activeBorder,
              shadowColor: '#141313',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }
          : {
              backgroundColor: paper,
              borderColor: paperBorder,
            },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
      ]}
    >
      {/* Dot only on inactive pills — when active, the whole pill IS the color */}
      {!active && (
        <View
          style={[
            styles.childPillDot,
            { backgroundColor: accent, borderColor: 'rgba(20,19,19,0.18)' },
          ]}
        />
      )}
      <Text
        style={[
          styles.childPillText,
          {
            color: active ? activeFg : inkMuted,
            fontFamily: active ? font.bodySemiBold : font.bodyMedium,
            letterSpacing: active ? 0.1 : 0,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function StatCell({
  value,
  label,
  accent,
  ink,
  inkMuted,
  font,
}: {
  value: number
  label: string
  accent?: string
  ink: string
  inkMuted: string
  font: ReturnType<typeof useTheme>['font']
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: accent ?? ink, fontFamily: font.display }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: inkMuted, fontFamily: font.bodySemiBold }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

function ExamCard({
  exam,
  childName,
  childIndex,
  isDark,
  ink,
  inkMuted,
  paper,
  paperBorder,
  font,
  onPress,
}: {
  exam: Exam
  childName?: string
  childIndex: number
  isDark: boolean
  ink: string
  inkMuted: string
  paper: string
  paperBorder: string
  font: ReturnType<typeof useTheme>['font']
  onPress: () => void
}) {
  const accent = BEHAVIOR_COLORS[exam.behavior]
  const firstPhotoPath = exam.photos[0]
  const [thumbUrl] = useExamPhotoUrls(firstPhotoPath ? [firstPhotoPath] : [])
  const flaggedCount = exam.extracted?.flagged?.length ?? 0
  const provider = exam.provider ?? exam.extracted?.provider

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: paper, borderColor: paperBorder, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      {thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.cardThumb} />
      ) : (
        <View style={[styles.cardIconWrap, { backgroundColor: accent + '1A', borderColor: accent + '40' }]}>
          {logSticker('exam', 32, isDark)}
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text
            style={[styles.cardTitle, { color: ink, fontFamily: font.display }]}
            numberOfLines={1}
          >
            {exam.title}
          </Text>
          {flaggedCount > 0 && (
            <View style={[styles.flagPill, { backgroundColor: brand.error + '15', borderColor: brand.error + '50' }]}>
              <Text style={[styles.flagPillText, { color: brand.error, fontFamily: font.bodySemiBold }]}>
                {flaggedCount} flagged
              </Text>
            </View>
          )}
        </View>

        {exam.result && (
          <Text
            style={[styles.cardResult, { color: ink, fontFamily: font.italic }]}
            numberOfLines={1}
          >
            {exam.result}
          </Text>
        )}

        <View style={styles.cardMetaRow}>
          <Text style={[styles.cardMeta, { color: inkMuted, fontFamily: font.bodyMedium }]}>
            {formatExamDate(exam.examDate)}
          </Text>
          {provider && (
            <>
              <Text style={[styles.cardDot, { color: inkMuted }]}>·</Text>
              <Text
                style={[styles.cardMeta, { color: inkMuted, fontFamily: font.bodyMedium }]}
                numberOfLines={1}
              >
                {provider}
              </Text>
            </>
          )}
        </View>

        <View style={styles.cardChipRow}>
          <View style={[styles.behaviorPill, { backgroundColor: accent + '1A', borderColor: accent + '50' }]}>
            <Text style={[styles.behaviorPillText, { color: accent, fontFamily: font.bodySemiBold }]}>
              {examBehaviorLabel(exam.behavior)}
            </Text>
          </View>
          {childName && childIndex >= 0 && (
            <View style={[styles.behaviorPill, { backgroundColor: childColor(childIndex) + '1A', borderColor: childColor(childIndex) + '50' }]}>
              <Text style={[styles.behaviorPillText, { color: childColor(childIndex), fontFamily: font.bodySemiBold }]}>
                {childName}
              </Text>
            </View>
          )}
          {exam.photos.length > 0 && (
            <Text style={[styles.cardPhotos, { color: inkMuted, fontFamily: font.bodyMedium }]}>
              {exam.photos.length} {exam.photos.length === 1 ? 'photo' : 'photos'}
            </Text>
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
    paddingBottom: 14,
  },
  backBtn: { padding: 4 },

  segWrap: { paddingHorizontal: 16, marginBottom: 12 },

  childRowWrap: { height: 48, marginBottom: 10 },
  childRow: {
    gap: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  childPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  childPillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  childPillText: { fontSize: 13.5 },

  scroll: { paddingHorizontal: 16, paddingTop: 6 },

  // Stats summary
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 36, opacity: 0.6 },
  statValue: { fontSize: 32, letterSpacing: -1, lineHeight: 36 },
  statLabel: { fontSize: 9.5, letterSpacing: 1.8, opacity: 0.7 },

  // Empty state
  emptyCard: {
    padding: 28,
    paddingBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyStickerWrap: {
    width: 88,
    height: 88,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTagline: {
    fontSize: 16,
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyCta: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // Month group
  monthGroup: { marginBottom: 22 },

  // Exam card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
  },
  cardThumb: { width: 64, height: 64, borderRadius: 14 },
  cardIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, letterSpacing: -0.3, lineHeight: 20, flex: 1 },
  cardResult: { fontSize: 13, opacity: 0.85, fontStyle: 'italic' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardMeta: { fontSize: 11.5 },
  cardDot: { fontSize: 11 },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  cardPhotos: { fontSize: 11, opacity: 0.6 },
  behaviorPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  behaviorPillText: { fontSize: 10, letterSpacing: 0.3 },
  flagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  flagPillText: { fontSize: 10, letterSpacing: 0.3 },
})
