/**
 * C4 — Cycle Calendar (cream-paper redesign, Apr 2026)
 *
 * 2-tab shell: Cycle / Exams.
 * Cycle tab (site look): the shared AgendaCalendar (week | month) painted from the LOGGED cycles —
 * logged period days solid, estimated ones dashed, fertile window green, ovulation egg, what was
 * logged as tiny stickers — then the selected day's detail (edit / remove what was logged).
 * "+" in the header opens the shared log launcher for the selected day (today when a future day is
 * selected: future days can't hold logs). Every form comes from the shared CycleLogRouter.
 */

import { useState, useMemo, useCallback } from 'react'
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme, useDiffuseTheme, getModeColorSoft } from '../../constants/theme'
import { useIsDiffuse, useScrollBottomInset } from '../ui/diffuse/DiffuseKit'
import { getCycleCalendarDay, toDateStr, type CycleConfig, type CycleCalendarInput } from '../../lib/cycleLogic'
import { useCycleCalendarInput, useCycleHistory } from '../../lib/cycleAnalytics'
import { useCycleSettingsStore } from '../../store/useCycleSettingsStore'
import { isFutureDate } from '../../lib/futureDate'
import { appIntlLocale } from '../../lib/cycleLogForms'
import { useTranslation } from '../../lib/i18n'
import { AgendaHeader } from './AgendaHeader'
import { SegmentedTabs } from './SegmentedTabs'
import { CycleMonthGrid, CycleSiteLegend, cycleSiteDay, useCycleLogDates } from './CycleMonthGrid'
import { AgendaCalendar, DayMarks } from './AgendaCalendar'
import { cycleDayMarks } from '../../lib/logStickers'
import { deviceWeekStart, monthGridDates } from './agendaDates'
import { CycleDayDetail } from './CycleDayDetail'
import { LogActivitySheet, type LogType } from './LogActivitySheet'
import { CycleLogRouter } from './CycleLogRouter'
import { Display, Body } from '../ui/Typography'
import { ExamsBody } from '../exams/ExamsBody'

// ─── Constants ─────────────────────────────────────────────────────────────

type ViewTab = 'cycle' | 'health'

const NO_CYCLES: CycleCalendarInput = { cycles: [], cycleLength: 28, periodLength: 5, lutealPhase: 14 }

// ─── Main Component ────────────────────────────────────────────────────────

export function CycleCalendar() {
  const { colors, isDark, stickers } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const insets = useSafeAreaInsets()
  const bottomInset = useScrollBottomInset(insets.bottom + 40)
  // Ink/muted resolved per variant so shared Display/Body typography matches.
  const dInk = diffuse ? dt.colors.ink : (isDark ? colors.text : '#141313')
  const dMuted = diffuse ? dt.colors.ink3 : (isDark ? colors.textMuted : '#6E6763')

  const [tab, setTab] = useState<ViewTab>('cycle')
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [sheetType, setSheetType] = useState<LogType | null>(null)
  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  // Derive the real cycle config from the user's logged period_start history.
  // (Diffuse month grid + the forms' phase hints.) Falls back to a 10-days-ago
  // default so Diffuse still renders for users who haven't logged anything yet.
  const { data: history } = useCycleHistory()
  // User cycle settings override the measured average + hardcoded defaults.
  const cs = useCycleSettingsStore()
  const cycleConfig: CycleConfig = useMemo(() => {
    const latest = history?.cycles[history.cycles.length - 1]
    const cycleLength = cs.cycleLength ?? history?.avg ?? 28
    if (latest) {
      return { lastPeriodStart: latest.startDate, cycleLength, periodLength: cs.periodLength, lutealPhase: cs.lutealPhase }
    }
    // Light look with no period logged: no invented anchor.
    if (!diffuse && history && history.cycles.length === 0) {
      return { lastPeriodStart: '', cycleLength, periodLength: cs.periodLength, lutealPhase: cs.lutealPhase }
    }
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength, periodLength: cs.periodLength, lutealPhase: cs.lutealPhase }
  }, [history, cs.cycleLength, cs.periodLength, cs.lutealPhase, diffuse])

  // Site look: every day is read from the logged cycles (past cycles keep their real length,
  // nothing before the first logged period, estimates pause while the period is late).
  const { input: calendarInput, isLoading: calendarLoading } = useCycleCalendarInput()
  const todayStr = toDateStr(new Date())
  const dayOf = useCallback(
    (date: string) => getCycleCalendarDay(calendarInput ?? NO_CYCLES, date, todayStr),
    [calendarInput, todayStr],
  )

  // Logged-day stickers for the agenda calendar — the month around the selected day (whole weeks,
  // so the week view is covered too).
  const weekStart = useMemo(() => deviceWeekStart(), [])
  const agendaRange = useMemo(() => {
    const cells = monthGridDates(selectedDate, weekStart)
    return { start: cells[0].date, end: cells[cells.length - 1].date }
  }, [selectedDate, weekStart])
  const { logsByDate: agendaLogs, isLoading: agendaLogsLoading } = useCycleLogDates(agendaRange.start, agendaRange.end)
  // First load: no real cycle yet → skeleton, never a provisional cycle that then jumps.
  const agendaLoading = (calendarLoading && !calendarInput) || agendaLogsLoading

  // "+" logs for the selected day — or today when a future day is selected (no future logs).
  const logDate = isFutureDate(selectedDate, todayStr) ? todayStr : selectedDate
  const openLauncher = useCallback(() => {
    if (logDate !== selectedDate) setSelectedDate(logDate)
    setLogSheetOpen(true)
  }, [logDate, selectedDate])
  const launcherTitle = logDate === todayStr
    ? t('cycleLog_todayTitle')
    : t('cycleLog_dateTitle', {
        date: new Date(logDate + 'T12:00:00').toLocaleDateString(appIntlLocale(), { weekday: 'short', month: 'short', day: 'numeric' }),
      })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        qc.refetchQueries({ queryKey: ['cycleLogs'], type: 'active' }),
        tab === 'health' ? qc.refetchQueries({ queryKey: ['exams'], type: 'active' }) : Promise.resolve(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [qc, tab])

  const refreshTint = diffuse ? dt.colors.ink3 : colors.text

  return (
    <View style={[styles.root, { backgroundColor: diffuse ? dt.colors.bg : colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={refreshTint} colors={[refreshTint]} />}
      >
        <AgendaHeader onAdd={openLauncher} />

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
            {diffuse ? (
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
            ) : (
            <View style={{ marginBottom: 14 }}>
              <AgendaCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                tone={getModeColorSoft('pre', isDark)}
                loading={agendaLoading}
                dayTint={(date) => cycleSiteDay(dayOf(date), stickers).tint}
                dayDashed={(date) => cycleSiteDay(dayOf(date), stickers).dashed}
                renderDayDecoration={(date) => {
                  const { isOvulation } = cycleSiteDay(dayOf(date), stickers)
                  // What was logged, at a glance — heart for intimacy first, then tests, period, symptoms…
                  const marks = cycleDayMarks(agendaLogs.get(date) ?? [])
                  if (!isOvulation && marks.length === 0) return null
                  return <DayMarks stickers={isOvulation ? ['egg', ...marks] : marks} max={2} />
                }}
                footer={<CycleSiteLegend />}
              />
            </View>
            )}

            <CycleDayDetail
              cycleConfig={cycleConfig}
              day={dayOf(selectedDate)}
              dayLoading={agendaLoading}
              date={selectedDate}
              onAddLog={openLauncher}
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

      {/* Every log form (incl. LH + cervical mucus) — the same switchboard the home uses. */}
      <CycleLogRouter
        sheetType={sheetType}
        date={sheetType === 'exam' ? selectedDate : logDate}
        cycleConfig={cycleConfig}
        onClose={() => setSheetType(null)}
        onSaved={() => setSheetType(null)}
      />

      {/* Log Activity sheet (opened by header "+" / the day's log pill) */}
      <LogActivitySheet
        open={logSheetOpen}
        onClose={() => setLogSheetOpen(false)}
        onSelect={(type) => setSheetType(type)}
        title={launcherTitle}
      />
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
})
