/**
 * C5 — Pregnancy Calendar (v2)
 *
 * 4-tab view system:
 * 1. Month   — grid with trimester tints + log dots from real data
 * 2. Week    — 7-day strip + "still to log" chips + day timeline feed
 * 3. Journey — all 40 weeks with log summaries
 * 4. Appts   — standard appointment timeline
 */

import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import { getTrimester, weekForDate } from '../../lib/pregnancyWeeks'
import { pregnancyWeeks } from '../../lib/pregnancyData'
import { toDateStr } from '../../lib/cycleLogic'
import { supabase } from '../../lib/supabase'
import {
  usePregnancyCalendarLogs,
  usePregnancyTodayLogs,
} from '../../lib/analyticsData'
import type { PregnancyCalendarLog } from '../../lib/analyticsData'
import { STANDARD_APPOINTMENTS } from '../../lib/pregnancyAppointments'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  AppointmentForm,
  ExamResultForm,
  KickCountForm,
  WeightLogForm,
  SleepLogForm,
  ExerciseLogForm,
  NutritionLogForm,
  KegelLogForm,
  WaterLogForm,
  VitaminsLogForm,
  NestingTaskForm,
  BirthPrepTaskForm,
  ContractionTimerLogForm,
} from './PregnancyLogForms'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Trimester colors — brand.trimester doesn't exist, use direct values
const TRIMESTER_TINT: Record<1 | 2 | 3, string> = {
  1: '#A2FF8620',
  2: brand.pregnancy + '20',
  3: '#FBBF2420',
}
const TRIMESTER_COLOR: Record<1 | 2 | 3, string> = {
  1: '#A2FF86',
  2: brand.pregnancy,
  3: '#FBBF24',
}

type ViewTab = 'month' | 'week' | 'journey' | 'appointments'
type LogFormType =
  | 'mood' | 'weight' | 'symptom' | 'appointment' | 'exam_result' | 'kick_count'
  | 'sleep' | 'exercise' | 'nutrition' | 'kegel' | 'water' | 'vitamins'
  | 'nesting' | 'birth_prep' | 'contraction'

function dotColor(type: string): string {
  if (['mood', 'symptom'].includes(type)) return brand.pregnancy
  if (['vitamins', 'water', 'sleep', 'exercise', 'kegel', 'nutrition', 'kick_count'].includes(type)) return '#A2FF86'
  if (['appointment', 'exam_result'].includes(type)) return '#FBBF24'
  if (['birth_prep', 'nesting', 'contraction'].includes(type)) return '#FF6B35'
  return 'rgba(255,255,255,0.3)'
}

function LogFormRouter({
  type,
  date,
  onSaved,
}: {
  type: LogFormType
  date: string
  onSaved: () => void
}): React.ReactElement | null {
  if (type === 'mood') return <PregnancyMoodForm date={date} onSaved={onSaved} />
  if (type === 'weight') return <WeightLogForm date={date} onSaved={onSaved} />
  if (type === 'symptom') return <PregnancySymptomsForm date={date} onSaved={onSaved} />
  if (type === 'appointment') return <AppointmentForm date={date} onSaved={onSaved} />
  if (type === 'exam_result') return <ExamResultForm date={date} onSaved={onSaved} />
  if (type === 'kick_count') return <KickCountForm date={date} onSaved={onSaved} />
  if (type === 'sleep') return <SleepLogForm date={date} onSaved={onSaved} />
  if (type === 'exercise') return <ExerciseLogForm date={date} onSaved={onSaved} />
  if (type === 'nutrition') return <NutritionLogForm date={date} onSaved={onSaved} />
  if (type === 'kegel') return <KegelLogForm date={date} onSaved={onSaved} />
  if (type === 'water') return <WaterLogForm date={date} onSaved={onSaved} />
  if (type === 'vitamins') return <VitaminsLogForm date={date} onSaved={onSaved} />
  if (type === 'nesting') return <NestingTaskForm date={date} onSaved={onSaved} />
  if (type === 'birth_prep') return <BirthPrepTaskForm date={date} onSaved={onSaved} />
  if (type === 'contraction') return <ContractionTimerLogForm date={date} onSaved={onSaved} />
  return null
}

const DAILY_ROUTINES: { type: LogFormType; label: string; emoji: string; minWeek?: number }[] = [
  { type: 'vitamins', label: 'Vitamins', emoji: '💊' },
  { type: 'water', label: 'Water', emoji: '💧' },
  { type: 'mood', label: 'Mood', emoji: '😊' },
  { type: 'sleep', label: 'Sleep', emoji: '😴' },
  { type: 'exercise', label: 'Exercise', emoji: '🧘' },
  { type: 'kick_count', label: 'Kicks', emoji: '👶', minWeek: 28 },
]

type TodayLogMap = Record<string, { value: string | null; notes: string | null; created_at: string }>

function RoutineStrip({
  todayLogs,
  weekNumber,
  onPressRoutine,
}: {
  todayLogs: TodayLogMap
  weekNumber: number
  onPressRoutine: (type: LogFormType) => void
}): React.ReactElement | null {
  const visible = DAILY_ROUTINES.filter(
    (r) => r.minWeek === undefined || weekNumber >= r.minWeek
  )
  const pending = visible.filter((r) => !todayLogs[r.type])
  if (pending.length === 0) return null

  return (
    <View style={[styles.routineStrip, { backgroundColor: brand.pregnancy + '15', borderColor: brand.pregnancy + '30' }]}>
      <Text style={[styles.routineStripLabel, { color: brand.pregnancy }]}>Still to log today</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routineStripScroll}>
        {pending.map((r) => (
          <Pressable
            key={r.type}
            onPress={() => onPressRoutine(r.type)}
            style={[styles.routineChip, { borderColor: brand.pregnancy + '50' }]}
          >
            <Text style={styles.routineChipText}>{r.emoji} + {r.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

export function PregnancyCalendar() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''

  const [view, setView] = useState<ViewTab>('month')
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [logForm, setLogForm] = useState<{ type: LogFormType; date: string } | null>(null)

  const [userId, setUserId] = useState<string | undefined>(undefined)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id))
  }, [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const todayStr = toDateStr(new Date())

  const { data: calLogs = {}, refetch } = usePregnancyCalendarLogs(userId, year, month)
  const { data: todayLogs = {}, refetch: refetchToday } = usePregnancyTodayLogs(userId)

  function handleSaved() {
    setLogForm(null)
    void refetch()
    void refetchToday()
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: {
      date: string
      day: number
      inMonth: boolean
      trimester: 1 | 2 | 3
      isToday: boolean
      isFuture: boolean
      logs: PregnancyCalendarLog[]
    }[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, inMonth: false, trimester: 1, isToday: false, isFuture: false, logs: [] })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const wk = dueDate ? weekForDate(dueDate, dateStr) : weekNumber
      const tri = getTrimester(wk) as 1 | 2 | 3
      days.push({
        date: dateStr,
        day: d,
        inMonth: true,
        trimester: tri,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
        logs: calLogs[dateStr] ?? [],
      })
    }
    return days
  }, [year, month, dueDate, weekNumber, todayStr, calLogs])

  const weekDays = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - dayOfWeek)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      const dateStr = toDateStr(d)
      return {
        dateStr,
        dayLabel: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        logs: calLogs[dateStr] ?? [],
      }
    })
  }, [calLogs, todayStr])

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function renderMonthView() {
    return (
      <>
        <View style={styles.monthNav}>
          <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} style={styles.navBtn}>
            <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
          <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} style={styles.navBtn}>
            <ChevronRight size={22} color={colors.text} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={[styles.weekdayLabel, { color: colors.textMuted }]}>{w}</Text>
          ))}
        </View>
        <View style={styles.dayGrid}>
          {calendarDays.map((d, i) => {
            if (!d.inMonth) return <View key={`e-${i}`} style={styles.dayCell} />
            const isSelected = d.date === selectedDate
            const uniqueTypes = [...new Set(d.logs.map((l) => l.log_type))].slice(0, 3)
            return (
              <Pressable
                key={d.date}
                onPress={() => setSelectedDate(d.date)}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: isSelected
                      ? brand.pregnancy + '30'
                      : d.isToday
                      ? brand.pregnancy + '15'
                      : TRIMESTER_TINT[d.trimester],
                    borderRadius: 12,
                    borderWidth: isSelected || d.isToday ? 1 : 0,
                    borderColor: isSelected ? brand.pregnancy : brand.pregnancy + '60',
                    opacity: d.isFuture ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={[styles.dayNum, { color: d.isToday ? brand.pregnancy : colors.text }]}>
                  {d.day}
                </Text>
                <View style={styles.dotRow}>
                  {uniqueTypes.map((t) => (
                    <View key={t} style={[styles.dot, { backgroundColor: dotColor(t) }]} />
                  ))}
                </View>
              </Pressable>
            )
          })}
        </View>
        {selectedDate ? (
          <View style={[styles.dayPanel, { backgroundColor: colors.surface }]}>
            <View style={styles.dayPanelHeader}>
              <Text style={[styles.dayPanelDate, { color: colors.text }]}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Pressable
                onPress={() => setLogForm({ type: 'mood', date: selectedDate })}
                style={[styles.addBtn, { backgroundColor: brand.pregnancy }]}
              >
                <Plus size={14} color="#fff" strokeWidth={3} />
                <Text style={styles.addBtnText}>Log</Text>
              </Pressable>
            </View>
            {(calLogs[selectedDate] ?? []).length === 0 ? (
              <Text style={[styles.emptyDay, { color: colors.textMuted }]}>No logs for this day</Text>
            ) : (
              (calLogs[selectedDate] ?? []).map((log, i) => (
                <View key={i} style={styles.logEntry}>
                  <View style={[styles.logDot, { backgroundColor: dotColor(log.log_type) }]} />
                  <Text style={[styles.logType, { color: colors.text }]}>{log.log_type.replace(/_/g, ' ')}</Text>
                  {log.value ? (
                    <Text style={[styles.logValue, { color: colors.textSecondary }]}>{log.value}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : null}
      </>
    )
  }

  function renderWeekView() {
    return (
      <>
        <RoutineStrip
          todayLogs={todayLogs}
          weekNumber={weekNumber}
          onPressRoutine={(type) => setLogForm({ type, date: todayStr })}
        />
        <View style={styles.weekStrip}>
          {weekDays.map((d) => (
            <Pressable
              key={d.dateStr}
              onPress={() => setSelectedDate(d.dateStr)}
              style={[
                styles.weekDayBtn,
                {
                  backgroundColor:
                    selectedDate === d.dateStr
                      ? brand.pregnancy
                      : d.isToday
                      ? brand.pregnancy + '20'
                      : 'transparent',
                  borderRadius: 12,
                },
              ]}
            >
              <Text style={[styles.weekDayName, { color: selectedDate === d.dateStr ? '#fff' : colors.textMuted }]}>
                {d.dayLabel}
              </Text>
              <Text style={[styles.weekDayNum, { color: selectedDate === d.dateStr ? '#fff' : colors.text }]}>
                {d.dayNum}
              </Text>
              {d.logs.length > 0 && (
                <View style={[styles.weekDotIndicator, { backgroundColor: selectedDate === d.dateStr ? '#fff' : brand.pregnancy }]} />
              )}
            </Pressable>
          ))}
        </View>
        <View style={[styles.dayPanel, { backgroundColor: colors.surface, marginTop: 12 }]}>
          <View style={styles.dayPanelHeader}>
            <Text style={[styles.dayPanelDate, { color: colors.text }]}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
            <Pressable
              onPress={() => setLogForm({ type: 'mood', date: selectedDate })}
              style={[styles.addBtn, { backgroundColor: brand.pregnancy }]}
            >
              <Plus size={14} color="#fff" strokeWidth={3} />
              <Text style={styles.addBtnText}>Log</Text>
            </Pressable>
          </View>
          {(calLogs[selectedDate] ?? []).length === 0 ? (
            <Text style={[styles.emptyDay, { color: colors.textMuted }]}>No logs for this day</Text>
          ) : (
            (calLogs[selectedDate] ?? []).map((log, i) => (
              <View key={i} style={styles.timelineEntry}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: dotColor(log.log_type) }]} />
                  {i < (calLogs[selectedDate] ?? []).length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  )}
                </View>
                <View style={styles.timelineRight}>
                  <Text style={[styles.timelineType, { color: colors.text }]}>
                    {log.log_type.replace(/_/g, ' ')}
                  </Text>
                  {log.value ? (
                    <Text style={[styles.timelineValue, { color: colors.textSecondary }]}>
                      {log.value}
                    </Text>
                  ) : null}
                  <Text style={[styles.timelineTime, { color: colors.textMuted }]}>
                    {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </>
    )
  }

  function renderJourneyView() {
    return (
      <>
        {pregnancyWeeks.map((wkData) => {
          const isCurrent = wkData.week === weekNumber
          const isPast = wkData.week < weekNumber
          const tri = getTrimester(wkData.week) as 1 | 2 | 3
          return (
            <View
              key={wkData.week}
              style={[
                styles.journeyRow,
                {
                  backgroundColor: isCurrent ? TRIMESTER_TINT[tri] : colors.surface,
                  borderLeftWidth: isCurrent ? 3 : 0,
                  borderLeftColor: TRIMESTER_COLOR[tri],
                  opacity: isPast || isCurrent ? 1 : 0.4,
                },
              ]}
            >
              <View style={[styles.journeyWeekBadge, { backgroundColor: TRIMESTER_COLOR[tri] + '20' }]}>
                <Text style={[styles.journeyWeekNum, { color: TRIMESTER_COLOR[tri] }]}>{wkData.week}</Text>
              </View>
              <View style={styles.journeyContent}>
                <Text style={[styles.journeySize, { color: colors.text }]}>
                  {wkData.babySize} · {wkData.babyLength}
                </Text>
                <Text style={[styles.journeyFact, { color: colors.textSecondary }]} numberOfLines={1}>
                  {wkData.developmentFact}
                </Text>
              </View>
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: brand.pregnancy }]}>
                  <Text style={styles.currentBadgeText}>Now</Text>
                </View>
              )}
            </View>
          )
        })}
      </>
    )
  }

  function renderAppointmentsView() {
    return (
      <>
        {STANDARD_APPOINTMENTS.map((appt, i) => {
          const isDone = weekNumber > appt.week
          const isNext = !isDone && weekNumber >= appt.week - 2
          const color = isDone ? '#A2FF86' : isNext ? '#FBBF24' : colors.textMuted
          return (
            <View key={appt.id} style={styles.apptRow}>
              <View style={styles.apptTimelineLeft}>
                <View
                  style={[
                    styles.apptDot,
                    {
                      backgroundColor: isDone ? '#A2FF86' : isNext ? '#FBBF24' : colors.surface,
                      borderColor: color,
                    },
                  ]}
                >
                  {isDone && <Check size={10} color="#1A1030" strokeWidth={3} />}
                </View>
                {i < STANDARD_APPOINTMENTS.length - 1 && (
                  <View style={[styles.apptLine, { backgroundColor: colors.border }]} />
                )}
              </View>
              <View style={[styles.apptCard, { backgroundColor: colors.surface, borderColor: isNext ? '#FBBF2440' : 'transparent', borderWidth: isNext ? 1 : 0 }]}>
                <View style={styles.apptCardHeader}>
                  <Text style={[styles.apptName, { color: isDone ? colors.textSecondary : isNext ? '#FBBF24' : colors.text }]}>
                    {appt.name}
                  </Text>
                  <Text style={[styles.apptWeek, { color: colors.textMuted }]}>W{appt.week}</Text>
                </View>
                {isNext ? (
                  <Text style={[styles.apptPrep, { color: '#FBBF24' }]}>{appt.prepNote}</Text>
                ) : null}
                {isDone ? (
                  <Text style={[styles.apptDone, { color: '#A2FF86' }]}>Done</Text>
                ) : null}
              </View>
            </View>
          )
        })}
        <Pressable
          onPress={() => setLogForm({ type: 'appointment', date: todayStr })}
          style={[styles.addApptBtn, { backgroundColor: brand.pregnancy }]}
        >
          <Plus size={18} color="#fff" strokeWidth={3} />
          <Text style={styles.addApptBtnText}>Add appointment / exam</Text>
        </Pressable>
      </>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.tabBar, { paddingTop: insets.top + 8 }]}>
        {(['month', 'week', 'journey', 'appointments'] as ViewTab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setView(tab)}
            style={[
              styles.tabBtn,
              view === tab && { borderBottomWidth: 2, borderBottomColor: brand.pregnancy },
            ]}
          >
            <Text style={[styles.tabLabel, { color: view === tab ? brand.pregnancy : colors.textMuted }]}>
              {tab === 'appointments' ? 'Appts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'journey' && renderJourneyView()}
        {view === 'appointments' && renderAppointmentsView()}
      </ScrollView>

      <Modal
        visible={logForm !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setLogForm(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <Pressable onPress={() => setLogForm(null)} style={styles.modalClose}>
              <X size={20} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
            <ScrollView>
              {logForm !== null && (
                <LogFormRouter type={logForm.type} date={logForm.date} onSaved={handleSaved} />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabLabel: { fontSize: 12, fontFamily: 'Satoshi-Variable', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  scroll: { padding: 16 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 18, fontFamily: 'CabinetGrotesk-Black' },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Satoshi-Variable', fontWeight: '700' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 0.85, padding: 4, alignItems: 'center' },
  dayNum: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  dayPanel: { borderRadius: 20, padding: 16, marginTop: 12 },
  dayPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayPanelDate: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  addBtnText: { fontSize: 12, fontFamily: 'Satoshi-Variable', fontWeight: '700', color: '#fff' },
  emptyDay: { fontSize: 13, fontFamily: 'Satoshi-Variable', textAlign: 'center', paddingVertical: 8 },
  logEntry: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logType: { fontSize: 13, fontFamily: 'Satoshi-Variable', fontWeight: '600', textTransform: 'capitalize', flex: 1 },
  logValue: { fontSize: 12, fontFamily: 'Satoshi-Variable' },

  routineStrip: { borderRadius: 16, padding: 12, borderWidth: 1, marginBottom: 12 },
  routineStripLabel: { fontSize: 11, fontFamily: 'Satoshi-Variable', fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  routineStripScroll: { gap: 8 },
  routineChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, backgroundColor: 'rgba(185,131,255,0.08)' },
  routineChipText: { fontSize: 12, fontFamily: 'Satoshi-Variable', fontWeight: '600', color: '#B983FF' },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekDayBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 2 },
  weekDayName: { fontSize: 10, fontFamily: 'Satoshi-Variable', fontWeight: '700', marginBottom: 2 },
  weekDayNum: { fontSize: 16, fontFamily: 'CabinetGrotesk-Black' },
  weekDotIndicator: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  timelineEntry: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  timelineLeft: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineLine: { width: 2, flex: 1, marginTop: 2 },
  timelineRight: { flex: 1, paddingBottom: 8 },
  timelineType: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '600', textTransform: 'capitalize' },
  timelineValue: { fontSize: 12, fontFamily: 'Satoshi-Variable', marginTop: 1 },
  timelineTime: { fontSize: 11, fontFamily: 'Satoshi-Variable', marginTop: 1 },

  journeyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12, marginBottom: 8, gap: 12 },
  journeyWeekBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  journeyWeekNum: { fontSize: 14, fontFamily: 'CabinetGrotesk-Black' },
  journeyContent: { flex: 1 },
  journeySize: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '600' },
  journeyFact: { fontSize: 12, fontFamily: 'Satoshi-Variable', marginTop: 1 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  currentBadgeText: { fontSize: 10, fontFamily: 'Satoshi-Variable', fontWeight: '700', color: '#fff' },

  apptRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  apptTimelineLeft: { alignItems: 'center', width: 24 },
  apptDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  apptLine: { width: 2, flex: 1, marginTop: 2 },
  apptCard: { flex: 1, borderRadius: 16, padding: 12, marginBottom: 8 },
  apptCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  apptName: { fontSize: 14, fontFamily: 'Satoshi-Variable', fontWeight: '600' },
  apptWeek: { fontSize: 12, fontFamily: 'Satoshi-Variable' },
  apptPrep: { fontSize: 12, fontFamily: 'Satoshi-Variable', marginTop: 4 },
  apptDone: { fontSize: 12, fontFamily: 'Satoshi-Variable', marginTop: 4 },
  addApptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 999, marginTop: 16 },
  addApptBtnText: { fontSize: 15, fontFamily: 'Satoshi-Variable', fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12 },
  modalClose: { position: 'absolute', right: 16, top: 12, padding: 8, zIndex: 10 },
})
