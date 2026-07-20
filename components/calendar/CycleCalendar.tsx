/**
 * C4 — Cycle Calendar (cream-paper redesign, Apr 2026)
 *
 * 2-tab shell: Cycle / Health (ink active pill).
 * Cycle tab: week strip + Today section with pastel ActivityPillCards for each
 * loggable type. Tapping a card opens the matching LogSheet form.
 * "+" in header opens a Log Activity sheet with all quick-log tiles.
 */

import { useState, useMemo } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native'
import { X, Check } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { getCycleInfo, toDateStr, type CyclePhase, type CycleConfig } from '../../lib/cycleLogic'
import { useCycleHistory } from '../../lib/cycleAnalytics'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { useTranslation } from '../../lib/i18n'
import type { TranslationKeys } from '../../lib/i18n/keys'
import { LogSheet } from './LogSheet'
import { AgendaHeader } from './AgendaHeader'
import { SegmentedTabs } from './SegmentedTabs'
import { CycleMonthGrid } from './CycleMonthGrid'
import { CycleDayDetail } from './CycleDayDetail'
import { LogActivitySheet, type LogType } from './LogActivitySheet'
import { Display, Body } from '../ui/Typography'
import { logSticker } from './logStickers'
import { Character } from '../characters/Characters'
import { DIFFUSE_LOG_CHARACTER, diffuseLogHue } from './DiffuseLogTimeline'
import { ExamsBody } from '../exams/ExamsBody'
import {
  PeriodStartForm,
  PeriodEndForm,
  SymptomsForm,
  MoodForm,
  BbtForm,
  IntimacyForm,
  PregnancyTestForm,
  SexDriveForm,
  ClotsForm,
  WeightForm,
  WaterForm,
  ActivityForm,
} from './CycleLogForms'
import { ExamForm } from '../exams/ExamForm'

// ─── Constants ─────────────────────────────────────────────────────────────

type ViewTab = 'cycle' | 'health'

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
  // User cycle settings override the measured average + hardcoded defaults.
  const cs = useCycleSettingsStore()
  const cycleConfig: CycleConfig = useMemo(() => {
    const latest = history?.cycles[history.cycles.length - 1]
    const cycleLength = cs.cycleLength ?? history?.avg ?? 28
    if (latest) {
      return { lastPeriodStart: latest.startDate, cycleLength, periodLength: cs.periodLength, lutealPhase: cs.lutealPhase }
    }
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength, periodLength: cs.periodLength, lutealPhase: cs.lutealPhase }
  }, [history, cs.cycleLength, cs.periodLength, cs.lutealPhase])

  const selectedInfo = getCycleInfo(cycleConfig, selectedDate)

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

        {tab === 'health' && (
          <>
            <Display size={20} color={dInk} style={{ marginBottom: 4 }}>
              {t('cycleCalendar_examsLabs')}
            </Display>
            <Body size={13} color={dMuted} style={{ marginBottom: 12 }}>
              {t('cycleCalendar_visits_body')}
            </Body>

            {/* Full exams surface (stats + over-time chart + month groups),
                shared with the dedicated /exams screen. scroll=false because
                the tab content lives inside this screen's outer ScrollView. */}
            <ExamsBody
              behavior="pre-pregnancy"
              onOpenExam={(id) => router.push(`/exams/${id}`)}
              onAddExam={() => setSheetType('exam')}
              scroll={false}
            />
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
      <LogSheet visible={sheetType === 'pregnancy_test'} title={t('cycleCalendar_logSheet_pregTest')} onClose={() => setSheetType(null)}>
        <PregnancyTestForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'sex_drive'} title={t('cycleCalendar_logSheet_sexDrive')} onClose={() => setSheetType(null)}>
        <SexDriveForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'clots'} title={t('cycleCalendar_logSheet_clots')} onClose={() => setSheetType(null)}>
        <ClotsForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'weight'} title={t('cycleCalendar_logSheet_weight')} onClose={() => setSheetType(null)}>
        <WeightForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'water'} title={t('cycleCalendar_logSheet_water')} onClose={() => setSheetType(null)}>
        <WaterForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
      </LogSheet>
      <LogSheet visible={sheetType === 'activity'} title={t('cycleCalendar_logSheet_activity')} onClose={() => setSheetType(null)}>
        <ActivityForm date={selectedDate} phase={selectedInfo.phase as CyclePhase} onSaved={handleSaved} />
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
