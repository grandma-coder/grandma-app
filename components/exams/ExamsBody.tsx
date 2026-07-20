/**
 * ExamsBody — the shared scrollable exam surface: stat tiles (total / flagged /
 * this-year), an "exams over time" beaded-thread chart, and month-grouped exam
 * cards, with an inviting empty state.
 *
 * Extracted from app/exams/index.tsx so the same surface renders in TWO hosts
 * without duplicating layout:
 *   1. The dedicated /exams screen (owns header + behavior tabs + add sheet)
 *   2. The Cycle calendar's EXAMS tab (embeds this inside the Agenda shell)
 *
 * This component owns ONLY the body. Navigation to a detail screen and the
 * add-exam flow are delegated to the host via onOpenExam / onAddExam so each
 * surface wires them its own way (router.push vs a local LogSheet).
 */

import { useMemo } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Image, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme, brand, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { DiffuseMetricTile, DiffuseEmptyState } from '../ui/diffuse/DiffusePrimitives'
import { Character } from '../characters/Characters'
import { useChildStore } from '../../store/useChildStore'
import {
  type Exam,
  type ExamBehavior,
  useExams,
  useExamPhotoUrls,
  formatExamDate,
  examBehaviorLabel,
  buildExamInsights,
} from '../../lib/examData'
import { toDateStr } from '../../lib/cycleLogic'
import { BeadedThread } from '../analytics/shared/MiniCharts'
import { Display, Body, MonoCaps } from '../ui/Typography'
import { logSticker } from '../calendar/logStickers'
import { childColor } from '../ui/ChildPills'
import { useTranslation } from '../../lib/i18n'

const BEHAVIOR_COLORS: Record<ExamBehavior, string> = {
  'pre-pregnancy': brand.prePregnancy,
  pregnancy: brand.pregnancy,
  kids: brand.kids,
}

interface Props {
  /** Which behavior's exams to show. */
  behavior: ExamBehavior
  /** Kids child filter; 'all' (default) shows every child's exams. */
  childFilter?: string | 'all'
  /** Show the per-child marker on cards (only meaningful when several kids mix). */
  showChild?: boolean
  /** Open an exam's detail screen. */
  onOpenExam: (examId: string) => void
  /** Start the add-exam flow (host owns the sheet / navigation). */
  onAddExam: () => void
  /** Outer ScrollView content padding-bottom (safe-area aware host value). */
  contentBottomInset?: number
  /** When embedded (no own ScrollView needed), render children flat instead. */
  scroll?: boolean
  style?: StyleProp<ViewStyle>
}

export function ExamsBody({
  behavior,
  childFilter = 'all',
  showChild = false,
  onOpenExam,
  onAddExam,
  contentBottomInset = 40,
  scroll = true,
  style,
}: Props) {
  const { colors, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const children = useChildStore((s) => s.children)

  const { data: exams = [], isLoading } = useExams({
    behavior,
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

  const insights = useMemo(() => buildExamInsights(exams, toDateStr(new Date())), [exams])

  // Cream-paper palette (mirrors app/exams/index.tsx so both surfaces match).
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const paper = diffuse ? dt.colors.surface : (isDark ? colors.surface : '#FFFEF8')
  const paperBorder = diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.08)')
  const inkMuted = diffuse ? dt.colors.ink3 : (isDark ? colors.textMuted : 'rgba(20,19,19,0.55)')
  const inkFaint = diffuse ? dt.colors.ink3 : (isDark ? colors.textFaint : 'rgba(20,19,19,0.35)')

  const behaviorAccent = diffuse ? getDiffuseAccent(behavior, dt.isDark) : BEHAVIOR_COLORS[behavior]

  const body = (
    <>
      {/* Stats summary card — only when exams exist */}
      {!isLoading && exams.length > 0 && (
        diffuse ? (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <DiffuseMetricTile value={stats.total} label={t('exams_statTotal')} />
            <DiffuseMetricTile value={stats.flagged} label={t('exams_statFlagged')} highlighted={stats.flagged > 0} />
            <DiffuseMetricTile value={stats.yearCount} label={t('exams_statThisYear')} />
          </View>
        ) : (
          <View style={[styles.statsCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <StatCell value={stats.total} label={t('exams_statTotal')} ink={ink} inkMuted={inkMuted} font={font} />
            <View style={[styles.statDivider, { backgroundColor: paperBorder }]} />
            <StatCell
              value={stats.flagged}
              label={t('exams_statFlagged')}
              accent={stats.flagged > 0 ? brand.error : undefined}
              ink={ink}
              inkMuted={inkMuted}
              font={font}
            />
            <View style={[styles.statDivider, { backgroundColor: paperBorder }]} />
            <StatCell value={stats.yearCount} label={t('exams_statThisYear')} ink={ink} inkMuted={inkMuted} font={font} />
          </View>
        )
      )}

      {/* Exams over time — a beaded thread (bead size = exams that month). */}
      {!isLoading && insights.months.length > 1 && (
        <View style={styles.chartBlock}>
          <MonoCaps size={11} color={inkFaint} style={{ marginBottom: 12, letterSpacing: 1.8 }}>
            {t('exams_insight_overTime')}
          </MonoCaps>
          <View style={diffuse ? undefined : [styles.chartCard, { backgroundColor: paper, borderColor: paperBorder }]}>
            <BeadedThread
              data={insights.months.map((m) => m.count)}
              labels={insights.months.map((m) => m.label)}
              color={behaviorAccent}
              accent={behaviorAccent}
              height={130}
              showValues
            />
          </View>
        </View>
      )}

      {isLoading && (
        <Body size={13} color={inkMuted} align="center" style={{ marginTop: 40 }}>
          {t('exams_loading')}
        </Body>
      )}

      {!isLoading && exams.length === 0 && diffuse && (
        <DiffuseEmptyState
          icon={<Character name="exam" size={40} color={behaviorAccent} />}
          title={t('exams_emptyTitle')}
          message={t('exams_emptyBody')}
          ctaLabel={t('exams_addExam')}
          onCta={onAddExam}
          style={{ marginTop: 24 }}
        />
      )}

      {!isLoading && exams.length === 0 && !diffuse && (
        <View style={[styles.emptyCard, { backgroundColor: paper, borderColor: paperBorder }]}>
          <View style={[styles.emptyStickerWrap, { backgroundColor: '#F3ECD9', borderColor: paperBorder }]}>
            {logSticker('exam', 56, isDark)}
          </View>
          <Display size={22} color={ink} align="center" style={{ marginTop: 16 }}>
            {t('exams_emptyTitle')}
          </Display>
          <Text style={[styles.emptyTagline, { color: ink, fontFamily: font.italic }]}>
            {t('exams_emptyTagline')}
          </Text>
          <Body size={13} color={inkMuted} align="center" style={{ marginTop: 12 }}>
            {t('exams_emptyBody')}
          </Body>
          <Pressable
            onPress={onAddExam}
            style={({ pressed }) => [
              styles.emptyCta,
              {
                backgroundColor: behaviorAccent,
                borderColor: isDark ? colors.border : '#141313',
                shadowColor: '#141313',
                shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 4,
                transform: [{ translateY: pressed ? 2 : 0 }],
              },
            ]}
          >
            <Text style={[styles.emptyCtaText, { color: '#141313', fontFamily: font.bodySemiBold }]}>
              {t('exams_addExam')}
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
                showChild={showChild && childFilter === 'all'}
                isDark={isDark}
                ink={ink}
                inkMuted={inkMuted}
                paper={paper}
                paperBorder={paperBorder}
                font={font}
                diffuse={diffuse}
                onPress={() => onOpenExam(exam.id)}
              />
            ))}
          </View>
        </View>
      ))}
    </>
  )

  if (!scroll) {
    return <View style={style}>{body}</View>
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: contentBottomInset }, style]}
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

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
  showChild,
  isDark,
  ink,
  inkMuted,
  paper,
  paperBorder,
  font,
  diffuse,
  onPress,
}: {
  exam: Exam
  childName?: string
  childIndex: number
  showChild?: boolean
  isDark: boolean
  ink: string
  inkMuted: string
  paper: string
  paperBorder: string
  font: ReturnType<typeof useTheme>['font']
  diffuse?: boolean
  onPress: () => void
}) {
  const { t } = useTranslation()
  const dt = useDiffuseTheme()
  const accent = diffuse ? getDiffuseAccent(exam.behavior, dt.isDark) : BEHAVIOR_COLORS[exam.behavior]
  const firstPhotoPath = exam.photos[0]
  const [thumbUrl] = useExamPhotoUrls(firstPhotoPath ? [firstPhotoPath] : [])
  const flaggedCount = exam.extracted?.flagged?.length ?? 0
  const provider = exam.provider ?? exam.extracted?.provider
  const markChild = !!showChild && !!childName && childIndex >= 0

  if (diffuse) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: dt.colors.line, opacity: pressed ? 0.65 : 1 }]}
      >
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={{ width: 46, height: 46, borderRadius: 12 }} />
        ) : (
          <Character name="exam" size={30} color={markChild ? childColor(childIndex) : accent} />
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: diffuseFont.display, fontSize: 17, color: dt.colors.ink, letterSpacing: -0.2 }} numberOfLines={1}>{exam.title}</Text>
            {flaggedCount > 0 && (
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, color: dt.colors.error }}>
                {t('exams_flaggedCount', { count: String(flaggedCount) })}
              </Text>
            )}
          </View>
          {exam.result && (
            <Text style={{ fontFamily: diffuseFont.italic, fontSize: 13, color: dt.colors.ink2 }} numberOfLines={1}>{exam.result}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {markChild && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: childColor(childIndex) }} />
                <Text style={{ fontFamily: diffuseFont.monoBold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: dt.colors.ink2 }} numberOfLines={1}>{childName}</Text>
              </View>
            )}
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: dt.colors.ink3 }}>{markChild ? `· ${formatExamDate(exam.examDate)}` : formatExamDate(exam.examDate)}</Text>
            {provider && (
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: dt.colors.ink3 }} numberOfLines={1}>{`· ${provider}`}</Text>
            )}
            {exam.photos.length > 0 && (
              <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: dt.colors.ink3 }}>
                {`· ${exam.photos.length}`}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    )
  }

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
                {t('exams_flaggedCount', { count: String(flaggedCount) })}
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
              <Text style={[styles.cardDot, { color: inkMuted }]}>{t('common_dotSeparator')}</Text>
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
          {markChild && (
            <View style={[styles.behaviorPill, { backgroundColor: childColor(childIndex) + '1A', borderColor: childColor(childIndex) + '50' }]}>
              <Text style={[styles.behaviorPillText, { color: childColor(childIndex), fontFamily: font.bodySemiBold }]}>
                {childName}
              </Text>
            </View>
          )}
          {exam.photos.length > 0 && (
            <Text style={[styles.cardPhotos, { color: inkMuted, fontFamily: font.bodyMedium }]}>
              {exam.photos.length === 1
                ? t('exams_photoCount', { count: String(exam.photos.length) })
                : t('exams_photosCount', { count: String(exam.photos.length) })}
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
  scroll: { paddingHorizontal: 16, paddingTop: 6 },

  // Exams-over-time chart (inline in the list, below the stats)
  chartBlock: { marginBottom: 22 },
  chartCard: { borderWidth: 1, borderRadius: 22, padding: 14 },

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
    borderWidth: 1.5,
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
