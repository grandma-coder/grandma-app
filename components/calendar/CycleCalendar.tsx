/**
 * C4 — Cycle Calendar (cream-paper redesign, Apr 2026)
 *
 * 3-tab shell: Cycle / Checklist / Visits (ink active pill).
 * Cycle tab: week strip + Today section with pastel ActivityPillCards for each
 * loggable type. Tapping a card opens the matching LogSheet form.
 * "+" in header opens a Log Activity sheet with all quick-log tiles.
 */

import { useState, useMemo } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native'
import { X, Check, Circle as CircleIcon } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme, brand, useDiffuseTheme, diffuseFont, getDiffuseAccent } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { getCycleInfo, toDateStr, type CyclePhase, type CycleConfig } from '../../lib/cycleLogic'
import { useCycleHistory, useCycleChecklist, useToggleChecklistItem } from '../../lib/cycleAnalytics'
import { useExams } from '../../lib/examData'
import { PrePregChecklist } from '../agenda/PrePregChecklist'
import { PillButton } from '../ui/PillButton'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'
import { LogSheet } from './LogSheet'
import { AgendaHeader } from './AgendaHeader'
import { SegmentedTabs } from './SegmentedTabs'
import { CycleMonthGrid } from './CycleMonthGrid'
import { CycleDayDetail } from './CycleDayDetail'
import { LogTile, LogTileGrid } from './LogTile'
import { PaperCard } from '../ui/PaperCard'
import { Display, Body } from '../ui/Typography'
import { logSticker } from './logStickers'
import { Character } from '../characters/Characters'
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue } from './DiffuseLogTimeline'
import { MissingStickers } from '../stickers/MissingStickers'
import {
  PeriodStartForm,
  PeriodEndForm,
  SymptomsForm,
  MoodForm,
  BbtForm,
  IntimacyForm,
} from './CycleLogForms'
import { ExamForm } from '../exams/ExamForm'

// ─── Constants ─────────────────────────────────────────────────────────────

type LogType = 'period_start' | 'period_end' | 'symptom' | 'mood' | 'basal_temp' | 'intercourse' | 'exam'
type ViewTab = 'cycle' | 'checklist' | 'health'

interface LogEntry {
  id: LogType
  labelKey: keyof TranslationKeys
  subtitleKey: keyof TranslationKeys
  tint: string
}

const LOG_ENTRIES: LogEntry[] = [
  { id: 'basal_temp',   labelKey: 'cycleCalendar_logEntry_temperature',  subtitleKey: 'cycleCalendar_logEntry_temperatureSub', tint: 'temperature' },
  { id: 'symptom',      labelKey: 'cycleCalendar_logEntry_symptoms',     subtitleKey: 'cycleCalendar_logEntry_symptomsSub',    tint: 'symptom' },
  { id: 'mood',         labelKey: 'cycleCalendar_logEntry_mood',         subtitleKey: 'cycleCalendar_logEntry_moodSub',        tint: 'mood' },
  { id: 'intercourse',  labelKey: 'cycleCalendar_logEntry_intimacy',     subtitleKey: 'cycleCalendar_logEntry_intimacySub',    tint: 'intimacy' },
  { id: 'period_start', labelKey: 'cycleCalendar_logEntry_periodStart',  subtitleKey: 'cycleCalendar_logEntry_periodStartSub', tint: 'period' },
  { id: 'period_end',   labelKey: 'cycleCalendar_logEntry_periodEnd',    subtitleKey: 'cycleCalendar_logEntry_periodEndSub',   tint: 'period' },
  { id: 'exam',         labelKey: 'cycleCalendar_logEntry_exam',         subtitleKey: 'cycleCalendar_logEntry_examSub',        tint: 'exam' },
]

// ─── Log Activity Sheet (opened by header "+") ─────────────────────────────

function LogActivitySheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (type: LogType) => void
}) {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const bg = diffuse ? dt.colors.bg : (isDark ? colors.bg : '#F3ECD9')
  const ink = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')

  function handleSelect(type: LogType) {
    onClose()
    onSelect(type)
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }, diffuse ? { borderTopWidth: 1, borderColor: dt.colors.line } : null]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: diffuse ? dt.colors.line2 : paperBorder }]} />
        </View>
        <View style={styles.sheetHeader}>
          {diffuse ? (
            <Text style={{ fontFamily: diffuseFont.display, fontSize: 22, color: dt.colors.ink, letterSpacing: -0.3 }}>{t('cycleCalendar_logActivity')}</Text>
          ) : (
            <Display size={22} color={ink}>{t('cycleCalendar_logActivity')}</Display>
          )}
          <Pressable onPress={onClose} style={[styles.closeBtn, diffuse ? { backgroundColor: 'transparent', borderColor: dt.colors.hairline } : { backgroundColor: paper, borderColor: paperBorder }]}>
            <X size={18} color={ink} />
          </Pressable>
        </View>
        <View style={styles.sheetBody}>
          <LogTileGrid>
            {LOG_ENTRIES.map((e) => (
              <LogTile
                key={e.id}
                label={t(e.labelKey)}
                tint={e.tint}
                icon={diffuse && DIFFUSE_LOG_CHARACTER[e.id]
                  ? <Character name={DIFFUSE_LOG_CHARACTER[e.id]} size={34} color={diffuseLogHue(e.id)} />
                  : logSticker(e.id, 36, isDark)}
                onPress={() => handleSelect(e.id)}
              />
            ))}
          </LogTileGrid>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export function CycleCalendar() {
  const { colors, isDark } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 40)
  // Ink/muted resolved per variant so shared Display/Body typography matches.
  const dInk = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const dMuted = diffuse ? dt.colors.ink3 : (isDark ? colors.textMuted : '#6E6763')

  const [tab, setTab] = useState<ViewTab>('cycle')
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [sheetType, setSheetType] = useState<LogType | null>(null)
  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  // Derive the real cycle config from the user's logged period_start history.
  // Falls back to a 10-days-ago default so the UI still renders for users
  // who haven't logged anything yet.
  const { data: history } = useCycleHistory()
  const cycleConfig: CycleConfig = useMemo(() => {
    const latest = history?.cycles[history.cycles.length - 1]
    const avgLen = history?.avg ?? 28
    if (latest) {
      return { lastPeriodStart: latest.startDate, cycleLength: avgLen, periodLength: 5, lutealPhase: 14 }
    }
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5, lutealPhase: 14 }
  }, [history])

  const selectedInfo = getCycleInfo(cycleConfig, selectedDate)
  const modeColor = diffuse ? getDiffuseAccent('pre-pregnancy', dt.isDark) : brand.prePregnancy

  // Checklist (intent-aware: TTC vs cycle-health) + completion state
  const { data: checklist } = useCycleChecklist()
  const toggleChecklistItem = useToggleChecklistItem()

  // Health tab: pre-pregnancy exam / lab results
  const { data: exams = [] } = useExams({ behavior: 'pre-pregnancy' })

  function handleSaved() {
    setSheetType(null)
  }

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AgendaHeader onAdd={() => setLogSheetOpen(true)} />

        <View style={{ marginBottom: 14 }}>
          <SegmentedTabs
            options={[
              { key: 'cycle', label: t('cycleCalendar_tabCycle') },
              { key: 'checklist', label: t('cycleCalendar_tabChecklist') },
              { key: 'health', label: t('cycleCalendar_tabHealth') },
            ]}
            value={tab}
            onChange={(k) => setTab(k as ViewTab)}
          />
        </View>

        {tab === 'cycle' && (
          <>
            <View style={{ marginBottom: 14 }}>
              <CycleMonthGrid
                cycleConfig={cycleConfig}
                selectedDate={selectedDate}
                visibleMonth={visibleMonth}
                onSelectDate={setSelectedDate}
                onPrevMonth={() => setVisibleMonth((m) => {
                  const d = new Date(m.year, m.month - 1, 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })}
                onNextMonth={() => setVisibleMonth((m) => {
                  const d = new Date(m.year, m.month + 1, 1)
                  return { year: d.getFullYear(), month: d.getMonth() }
                })}
              />
            </View>

            <CycleDayDetail
              cycleConfig={cycleConfig}
              date={selectedDate}
              onAddLog={() => setLogSheetOpen(true)}
              onOpenLog={(type) => setSheetType(type)}
            />
          </>
        )}

        {tab === 'checklist' && (
          checklist && checklist.items.length > 0 ? (
            <>
              <Display
                size={20}
                color={dInk}
                style={{ marginBottom: 4 }}
              >
                {checklist.title}
              </Display>
              <Body
                size={13}
                color={dMuted}
                style={{ marginBottom: 14 }}
              >
                {t('cycleCalendar_checklist_body')}
              </Body>
              <PrePregChecklist
                items={checklist.items}
                onToggle={(itemId) => {
                  const current = checklist.items.find((i) => i.id === itemId)
                  toggleChecklistItem.mutate({
                    itemId,
                    completed: !(current?.completed ?? false),
                  })
                }}
              />
            </>
          ) : (
            <PaperCard style={{ marginTop: 4 }}>
              <View style={styles.tabEmpty}>
                <MissingStickers.PrepregChecklistEmpty size={88} />
                <Display size={20} color={dInk}>{t('cycleCalendar_checklist_title')}</Display>
                <Body size={13} color={dMuted} align="center" style={{ marginTop: 6 }}>
                  {t('cycleCalendar_checklist_body')}
                </Body>
              </View>
            </PaperCard>
          )
        )}

        {tab === 'health' && (
          <>
            <Display size={20} color={dInk} style={{ marginBottom: 4 }}>
              {t('cycleCalendar_examsLabs')}
            </Display>
            <Body size={13} color={dMuted} style={{ marginBottom: 12 }}>
              {t('cycleCalendar_visits_body')}
            </Body>

            {exams.length > 0 ? (
              <>
                {exams.map((ex) => (
                  <Pressable key={ex.id} onPress={() => router.push(`/exams/${ex.id}`)}>
                    <PaperCard radius={20} padding={16} style={{ marginBottom: 8 }}>
                      <View style={styles.examRow}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.examTitle, { color: diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313'), fontFamily: diffuse ? diffuseFont.body : undefined }]}
                            numberOfLines={1}
                          >
                            {ex.title}
                          </Text>
                          {ex.result ? (
                            <Text style={[styles.examResult, { color: diffuse ? dt.colors.ink3 : colors.textSecondary, fontFamily: diffuse ? diffuseFont.body : undefined }]} numberOfLines={1}>
                              {ex.result}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.examDate, { color: diffuse ? dt.colors.ink3 : colors.textMuted, fontFamily: diffuse ? diffuseFont.mono : undefined }]}>
                          {new Date(ex.examDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                    </PaperCard>
                  </Pressable>
                ))}
                <PillButton
                  label={t('cycleCalendar_logExam')}
                  variant="paper"
                  onPress={() => setSheetType('exam')}
                  style={{ marginTop: 4 }}
                />
              </>
            ) : (
              <PaperCard style={{ marginTop: 4 }}>
                <View style={styles.tabEmpty}>
                  <View style={[styles.tabEmptyIcon, diffuse ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: dt.colors.line2 } : { backgroundColor: modeColor + '22' }]}>
                    <CircleIcon size={22} color={diffuse ? dt.colors.ink3 : modeColor} strokeWidth={diffuse ? 1.6 : 2} />
                  </View>
                  <Display size={20} color={dInk}>{t('cycleCalendar_noExams')}</Display>
                  <Body size={13} color={dMuted} align="center" style={{ marginTop: 6 }}>
                    {t('cycleCalendar_visits_body')}
                  </Body>
                  <PillButton
                    label={t('cycleCalendar_logExam')}
                    variant="accent"
                    accentColor={modeColor}
                    onPress={() => setSheetType('exam')}
                    style={{ marginTop: 14 }}
                  />
                </View>
              </PaperCard>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── Bottom sheets per log type ────────────────────────────────── */}

      <LogSheet visible={sheetType === 'period_start'} title={t('cycleCalendar_logSheet_periodStart')} onClose={() => setSheetType(null)}>
        <PeriodStartForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'period_end'} title={t('cycleCalendar_logSheet_periodEnd')} onClose={() => setSheetType(null)}>
        <PeriodEndForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'symptom'} title={t('cycleCalendar_logSheet_symptoms')} onClose={() => setSheetType(null)}>
        <SymptomsForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'mood'} title={t('cycleCalendar_logSheet_mood')} onClose={() => setSheetType(null)}>
        <MoodForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'basal_temp'} title={t('cycleCalendar_logSheet_temperature')} onClose={() => setSheetType(null)}>
        <BbtForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'intercourse'} title={t('cycleCalendar_logSheet_intimacy')} onClose={() => setSheetType(null)}>
        <IntimacyForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'exam'} title={t('cycleCalendar_logSheet_exam')} onClose={() => setSheetType(null)}>
        <ExamForm behavior="pre-pregnancy" date={selectedDate} onSaved={() => setSheetType(null)} />
      </LogSheet>

      {/* Log Activity sheet (opened by header "+") */}
      <LogActivitySheet
        open={logSheetOpen}
        onClose={() => setLogSheetOpen(false)}
        onSelect={(type) => setSheetType(type)}
      />
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  tabEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 4,
  },
  tabEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  // Health tab — exam rows
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  examTitle: { fontSize: 14, fontWeight: '700' },
  examResult: { fontSize: 12, marginTop: 2 },
  examDate: { fontSize: 12, fontWeight: '600' },

  // Sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,6,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 42, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: 20 },
})
