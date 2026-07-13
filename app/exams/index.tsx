/**
 * Exams list — per-behavior view (Pre-pregnancy / Pregnancy / Kids).
 *
 * Cream-paper sticker aesthetic. Defaults the behavior tab to the user's
 * active journey mode so each behavior gets its own focused exam history,
 * not a mashed-together list. Surfaces total / flagged / this-year counts,
 * month-grouped paper cards, and an inviting empty state with a CTA back
 * to the calendar (where new exams are actually created).
 */

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { ChevronLeft, Plus } from 'lucide-react-native'
import { LogSheet } from '../../components/calendar/LogSheet'
import { ExamForm } from '../../components/exams/ExamForm'

import { useTheme, brand, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseSegmentPill, DiffuseMetricTile, DiffuseEmptyState } from '../../components/ui/diffuse/DiffusePrimitives'
import { Character } from '../../components/characters/Characters'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
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
import { useTranslation } from '../../lib/i18n'

const BEHAVIOR_COLORS: Record<ExamBehavior, string> = {
  'pre-pregnancy': brand.prePregnancy,
  pregnancy: brand.pregnancy,
  kids: brand.kids,
}

/** Map the global journey mode → exam behavior key (they share the same tokens). */
function modeToBehavior(mode: string): ExamBehavior {
  if (mode === 'pre-pregnancy') return 'pre-pregnancy'
  if (mode === 'pregnancy') return 'pregnancy'
  return 'kids'
}

export default function ExamsListScreen() {
  const { colors, isDark, font } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const children = useChildStore((s) => s.children)
  const activeMode = useModeStore((s) => s.mode)
  const enrolledBehaviors = useBehaviorStore((s) => s.enrolledBehaviors)

  // Only show tabs for the behaviors the user is actually enrolled in — a
  // cycle-only user sees just Pre-preg, not all three. Preserve the canonical
  // order (pre-preg → pregnancy → kids). Fall back to all three only if the
  // enrolled list hasn't hydrated yet (empty).
  const BEHAVIOR_ORDER: ExamBehavior[] = ['pre-pregnancy', 'pregnancy', 'kids']
  const visibleBehaviors: ExamBehavior[] =
    enrolledBehaviors.length > 0
      ? BEHAVIOR_ORDER.filter((b) => enrolledBehaviors.includes(b))
      : BEHAVIOR_ORDER

  // Default to the user's active journey (if enrolled), else the first enrolled
  // behavior, so the screen opens already filtered — no "All" mixing.
  const [behaviorFilter, setBehaviorFilter] = useState<ExamBehavior>(() => {
    const fromMode = modeToBehavior(activeMode)
    return visibleBehaviors.includes(fromMode) ? fromMode : (visibleBehaviors[0] ?? fromMode)
  })
  const [childFilter, setChildFilter] = useState<string | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const qc = useQueryClient()

  const { data: exams = [], isLoading } = useExams({
    behavior: behaviorFilter,
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

  // Cream-paper palette (mirrors WeekCard / LogSheet).
  // Under Diffuse these resolve to the diffuse ink/paper tokens so the shared
  // subcomponents (cards, pills, stats) pick up the new language automatically.
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const paper = diffuse ? dt.colors.surface : (isDark ? colors.surface : '#FFFEF8')
  const paperBorder = diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.08)')
  const inkMuted = diffuse ? dt.colors.ink3 : (isDark ? colors.textMuted : 'rgba(20,19,19,0.55)')
  const inkFaint = diffuse ? dt.colors.ink3 : (isDark ? colors.textFaint : 'rgba(20,19,19,0.35)')

  const showChildRow = children.length > 1 && behaviorFilter === 'kids'
  const behaviorAccent = diffuse ? getDiffuseAccent(behaviorFilter, dt.isDark) : BEHAVIOR_COLORS[behaviorFilter]

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      {/* Header — sticker-style back chip (hairline circle under Diffuse) */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backChip,
            diffuse
              ? {
                  backgroundColor: 'transparent',
                  borderColor: dt.colors.hairline,
                  opacity: pressed ? 0.6 : 1,
                }
              : {
                  backgroundColor: paper,
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
          <ChevronLeft size={20} color={ink} strokeWidth={diffuse ? 1.6 : 2.2} />
        </Pressable>
        {diffuse ? (
          <Text style={{ fontFamily: diffuseFont.display, fontSize: 28, color: dt.colors.ink, letterSpacing: -0.5 }}>{t('exams_title')}</Text>
        ) : (
          <Display size={28} color={ink}>{t('exams_title')}</Display>
        )}
        {/* Add exam — opens the shared ExamForm scoped to the current behavior. */}
        <Pressable
          onPress={() => setShowAddForm(true)}
          hitSlop={10}
          accessibilityLabel={t('exams_addExam')}
          style={({ pressed }) => [
            styles.backChip,
            diffuse
              ? { backgroundColor: 'transparent', borderColor: dt.colors.hairline, opacity: pressed ? 0.6 : 1 }
              : {
                  backgroundColor: paper, borderColor: isDark ? colors.border : '#141313',
                  shadowColor: '#141313', shadowOffset: { width: 0, height: pressed ? 1 : 3 },
                  shadowOpacity: 1, shadowRadius: 0, elevation: 4, transform: [{ translateY: pressed ? 2 : 0 }],
                },
          ]}
        >
          <Plus size={20} color={ink} strokeWidth={diffuse ? 1.6 : 2.2} />
        </Pressable>
      </View>

      {/* Behavior segmented tabs — only the behaviors the user is enrolled in.
          Hidden entirely when there's just one (nothing to switch between). */}
      {visibleBehaviors.length > 1 && (
      <View style={styles.segWrap}>
        {(() => {
          const labelFor: Record<ExamBehavior, string> = {
            'pre-pregnancy': t('exams_tabPrePreg'),
            pregnancy: t('exams_tabPregnancy'),
            kids: t('exams_tabKids'),
          }
          const options = visibleBehaviors.map((b) => ({ key: b, label: labelFor[b] }))
          return diffuse ? (
            <DiffuseSegmentPill
              options={options}
              value={behaviorFilter}
              onChange={(k) => setBehaviorFilter(k as ExamBehavior)}
            />
          ) : (
            <SegmentedTabs
              options={options}
              value={behaviorFilter}
              onChange={(k) => setBehaviorFilter(k as ExamBehavior)}
              activeBg={behaviorAccent}
              activeFg="#141313"
            />
          )
        })()}
      </View>
      )}

      {/* Child filter — only shown when relevant */}
      {showChildRow && (
        <View style={styles.childRowWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childRow}
          >
            <ChildPill
              label={t('exams_allKids')}
              active={childFilter === 'all'}
              onPress={() => setChildFilter('all')}
              accent={ink}
              isAll
              ink={ink}
              paper={paper}
              paperBorder={paperBorder}
              inkMuted={inkMuted}
              font={font}
              diffuse={diffuse}
              hairline={dt.colors.hairline}
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
                diffuse={diffuse}
                hairline={dt.colors.hairline}
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
            ctaLabel={t('exams_openCalendar')}
            onCta={() => router.push('/(tabs)/agenda')}
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
              onPress={() => router.push('/(tabs)/agenda')}
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
                {t('exams_openCalendar')}
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
                  diffuse={diffuse}
                  onPress={() => router.push({ pathname: '/exams/[id]', params: { id: exam.id } })}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add-exam sheet — the shared ExamForm, scoped to the current behavior
          + child filter so the new exam lands in the tab the user is viewing. */}
      <LogSheet visible={showAddForm} title={t('exams_addExam')} onClose={() => setShowAddForm(false)}>
        <ExamForm
          behavior={behaviorFilter}
          childId={
            behaviorFilter === 'kids'
              ? (childFilter !== 'all' ? childFilter : (children[0]?.id ?? null))
              : null
          }
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['exams'] })
            setShowAddForm(false)
          }}
        />
      </LogSheet>
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
  diffuse,
  hairline,
}: {
  label: string
  active: boolean
  onPress: () => void
  accent: string
  /** "All kids" pill — uses ink fill for active state */
  isAll?: boolean
  diffuse?: boolean
  hairline?: string
} & PillBase) {
  // Active-children pills are filled in their pastel accent (legible because
  // pastels are light); "All" is filled in solid ink with cream text — mirrors
  // SegmentedTabs and the empty-state CTA for design-system consistency.
  // Under Diffuse, selection = hairline outline + surface + mono-bold (no fill).
  const activeBg = isAll ? ink : accent
  const activeFg = isAll ? paper : ink
  const activeBorder = isAll ? ink : 'rgba(20,19,19,0.18)'

  if (diffuse) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.childPill,
          {
            backgroundColor: active ? paper : 'transparent',
            borderColor: active ? (hairline ?? ink) : paperBorder,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        {!isAll && <View style={[styles.childPillDot, { backgroundColor: accent, borderColor: paperBorder }]} />}
        <Text
          style={[
            styles.childPillText,
            { color: active ? ink : inkMuted, fontFamily: active ? diffuseFont.bodySemiBold : diffuseFont.body },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    )
  }

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
  diffuse,
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

  if (diffuse) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: dt.colors.line, opacity: pressed ? 0.65 : 1 }]}
      >
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={{ width: 46, height: 46, borderRadius: 12 }} />
        ) : (
          <Character name="exam" size={30} color={accent} />
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
            <Text style={{ fontFamily: diffuseFont.mono, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: dt.colors.ink3 }}>{formatExamDate(exam.examDate)}</Text>
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
          {childName && childIndex >= 0 && (
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
  root: { flex: 1 },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: { padding: 4 },
  backChip: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
