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
import { useTheme, brand, useDiffuseTheme, diffuseFont, getDiffuseAccent, getModeColorSoft } from '../../constants/theme'
import { SiteSticker } from '../stickers/SiteSticker'
import { ACTION_TONES } from '../ui/AuthDock'
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

const BEHAVIOR_MODE: Record<ExamBehavior, 'pre' | 'preg' | 'kids'> = {
  'pre-pregnancy': 'pre',
  pregnancy: 'preg',
  kids: 'kids',
}

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

  const hairline = isDark ? colors.border : 'rgba(22,21,19,0.14)'

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
          <View style={[styles.statsStrip, { borderColor: hairline }]}>
            <StatCell value={stats.total} label={t('exams_statTotal')} ink={colors.text} inkMuted={colors.textMuted} font={font} />
            <View style={[styles.statDivider, { backgroundColor: hairline }]} />
            <StatCell value={stats.flagged} label={t('exams_statFlagged')} ink={colors.text} inkMuted={colors.textMuted} font={font} />
            <View style={[styles.statDivider, { backgroundColor: hairline }]} />
            <StatCell value={stats.yearCount} label={t('exams_statThisYear')} ink={colors.text} inkMuted={colors.textMuted} font={font} />
          </View>
        )
      )}

      {/* Exams over time — a beaded thread (bead size = exams that month). */}
      {!isLoading && insights.months.length > 1 && (
        <View style={styles.chartBlock}>
          <MonoCaps size={11} color={inkFaint} style={{ marginBottom: 12, letterSpacing: 1.8 }}>
            {t('exams_insight_overTime')}
          </MonoCaps>
          <View style={undefined}>
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
        <View style={styles.emptyWrap}>
          <SiteSticker name="doc" size={72} cut />
          <Display size={20} color={colors.text} align="center" style={{ marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.2 }}>
            {t('exams_emptyTitle')}
          </Display>
          <Body size={14} color={colors.textSecondary} align="center" style={{ marginTop: 8 }}>
            {t('exams_emptyBody')}
          </Body>
          <Pressable onPress={onAddExam} hitSlop={10} style={({ pressed }) => [{ marginTop: 16, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.emptyLink, { color: colors.text, fontFamily: font.bodyBold }]}>
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
          <View>
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
  ink,
  inkMuted,
  font,
}: {
  value: number
  label: string
  ink: string
  inkMuted: string
  font: ReturnType<typeof useTheme>['font']
}) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: ink, fontFamily: font.displayBold }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: inkMuted }]}>{label.toUpperCase()}</Text>
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

  const { colors } = useTheme()
  const softTone = getModeColorSoft(BEHAVIOR_MODE[exam.behavior])
  const hairline = isDark ? colors.border : 'rgba(22,21,19,0.14)'
  const tagBase = { borderColor: colors.text }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderTopColor: hairline, opacity: pressed ? 0.65 : 1 }]}
    >
      {thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={styles.rowThumb} />
      ) : (
        <View style={styles.rowSticker}>
          <SiteSticker name="doc" size={40} cut />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text, fontFamily: font.display }]} numberOfLines={1}>
          {exam.title}
        </Text>

        {exam.result && (
          <Text style={[styles.cardResult, { color: colors.textSecondary, fontFamily: font.body }]} numberOfLines={1}>
            {exam.result}
          </Text>
        )}

        <Text style={[styles.cardMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {[formatExamDate(exam.examDate), provider].filter(Boolean).join(' · ').toUpperCase()}
        </Text>

        <View style={styles.cardChipRow}>
          {flaggedCount > 0 && (
            <View style={[styles.tag, tagBase, { backgroundColor: ACTION_TONES.peach }]}>
              <Text style={[styles.tagText, { color: colors.text, fontFamily: font.bodyBold }]}>
                {t('exams_flaggedCount', { count: String(flaggedCount) })}
              </Text>
            </View>
          )}
          <View style={[styles.tag, tagBase, { backgroundColor: softTone }]}>
            <Text style={[styles.tagText, { color: colors.text, fontFamily: font.bodyBold }]}>
              {examBehaviorLabel(exam.behavior)}
            </Text>
          </View>
          {markChild && (
            <View style={[styles.tag, tagBase, { backgroundColor: childColor(childIndex) }]}>
              <Text style={[styles.tagText, { color: colors.text, fontFamily: font.bodyBold }]}>{childName}</Text>
            </View>
          )}
          {exam.photos.length > 0 && (
            <Text style={[styles.cardPhotos, { color: colors.textMuted }]}>
              {(exam.photos.length === 1
                ? t('exams_photoCount', { count: String(exam.photos.length) })
                : t('exams_photosCount', { count: String(exam.photos.length) })).toUpperCase()}
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

  // Stats strip — quiet numbers, hairline separators
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
    marginBottom: 22,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36 },
  statValue: { fontSize: 30, lineHeight: 34 },
  statLabel: { fontSize: 10, letterSpacing: 1.4, fontFamily: 'SpaceMono_400Regular' },

  // Empty state
  emptyWrap: { alignItems: 'center', marginTop: 40, paddingHorizontal: 24 },
  emptyLink: { fontSize: 15, textDecorationLine: 'underline' },

  // Month group
  monthGroup: { marginBottom: 22 },

  // Exam row (card-less, hairline divider)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  rowThumb: { width: 52, height: 52, borderRadius: 12 },
  rowSticker: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, letterSpacing: 0.2, lineHeight: 20, textTransform: 'uppercase' },
  cardResult: { fontSize: 14 },
  cardMeta: { fontSize: 10, letterSpacing: 1.4, fontFamily: 'SpaceMono_400Regular', marginTop: 2 },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  cardPhotos: { fontSize: 10, letterSpacing: 1.4, fontFamily: 'SpaceMono_400Regular' },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  tagText: { fontSize: 11 },
})
