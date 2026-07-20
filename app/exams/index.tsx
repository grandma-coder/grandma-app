/**
 * Exams list — per-behavior view (Pre-pregnancy / Pregnancy / Kids).
 *
 * Cream-paper sticker aesthetic. Defaults the behavior tab to the user's
 * active journey mode so each behavior gets its own focused exam history,
 * not a mashed-together list. Surfaces total / flagged / this-year counts,
 * month-grouped paper cards, and an inviting empty state with a CTA back
 * to the calendar (where new exams are actually created).
 */

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { ChevronLeft, Plus } from 'lucide-react-native'
import { LogSheet } from '../../components/calendar/LogSheet'
import { ExamForm } from '../../components/exams/ExamForm'
import { ExamsBody } from '../../components/exams/ExamsBody'

import { useTheme, brand, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse } from '../../components/ui/diffuse/DiffuseKit'
import { DiffuseSegmentPill } from '../../components/ui/diffuse/DiffusePrimitives'
import { useChildStore } from '../../store/useChildStore'
import { useModeStore } from '../../store/useModeStore'
import { useBehaviorStore } from '../../store/useBehaviorStore'
import { type ExamBehavior } from '../../lib/examData'
import { Display } from '../../components/ui/Typography'
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

  // A `behavior` route param (passed by each behavior's wallet card) LOCKS the
  // screen to that behavior — exams are isolated per behavior, so opening Exams
  // from Pregnancy shows pregnancy exams only, with no tabs into other journeys.
  const params = useLocalSearchParams<{ behavior?: string }>()
  const lockedBehavior: ExamBehavior | null =
    params.behavior === 'pre-pregnancy' || params.behavior === 'pregnancy' || params.behavior === 'kids'
      ? params.behavior
      : null

  // Only show tabs for the behaviors the user is actually enrolled in — a
  // cycle-only user sees just Pre-preg, not all three. Preserve the canonical
  // order (pre-preg → pregnancy → kids). Fall back to all three only if the
  // enrolled list hasn't hydrated yet (empty).
  const BEHAVIOR_ORDER: ExamBehavior[] = ['pre-pregnancy', 'pregnancy', 'kids']
  const visibleBehaviors: ExamBehavior[] =
    enrolledBehaviors.length > 0
      ? BEHAVIOR_ORDER.filter((b) => enrolledBehaviors.includes(b))
      : BEHAVIOR_ORDER

  // Default to the locked behavior (if the wallet passed one), else the user's
  // active journey (if enrolled), else the first enrolled behavior — so the
  // screen opens already filtered, no "All" mixing.
  const [behaviorFilter, setBehaviorFilter] = useState<ExamBehavior>(() => {
    if (lockedBehavior) return lockedBehavior
    const fromMode = modeToBehavior(activeMode)
    return visibleBehaviors.includes(fromMode) ? fromMode : (visibleBehaviors[0] ?? fromMode)
  })
  const [childFilter, setChildFilter] = useState<string | 'all'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const qc = useQueryClient()

  // Cream-paper palette (mirrors WeekCard / LogSheet) — only the header/tab/
  // child-pill chrome needs these now; the exam surface owns its own palette.
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const paper = diffuse ? dt.colors.surface : (isDark ? colors.surface : '#FFFEF8')
  const paperBorder = diffuse ? dt.colors.line : (isDark ? colors.border : 'rgba(20,19,19,0.08)')
  const inkMuted = diffuse ? dt.colors.ink3 : (isDark ? colors.textMuted : 'rgba(20,19,19,0.55)')

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
          Hidden entirely when there's just one (nothing to switch between) OR
          when the screen is locked to a single behavior (opened from a wallet). */}
      {!lockedBehavior && visibleBehaviors.length > 1 && (
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

      <ExamsBody
        behavior={behaviorFilter}
        childFilter={childFilter}
        showChild={showChildRow}
        contentBottomInset={insets.bottom + 40}
        onOpenExam={(id) => router.push({ pathname: '/exams/[id]', params: { id } })}
        onAddExam={() => setShowAddForm(true)}
      />

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
})
