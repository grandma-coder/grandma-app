/**
 * C5 — Pregnancy Calendar Screen
 *
 * Two views: Month (trimester-colored grid) and Timeline (week cards).
 * Phase banner, quick log buttons, 5 bottom sheet log forms.
 */

import { useState, useMemo } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  StyleSheet,
} from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  Smile,
  Activity,
  Calendar,
  FlaskConical,
  Hand,
  Baby,
  Star,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { usePregnancyStore } from '../../store/usePregnancyStore'
import {
  getWeekInfo,
  getTrimester,
  weekForDate,
  PREGNANCY_WEEKS,
} from '../../lib/pregnancyWeeks'
import { toDateStr } from '../../lib/cycleLogic'
import { LogSheet } from './LogSheet'
import {
  PregnancyMoodForm,
  PregnancySymptomsForm,
  AppointmentForm,
  ExamResultForm,
  KickCountForm,
} from './PregnancyLogForms'

// ─── Constants ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TRIMESTER_TINT = {
  1: brand.trimester.first + '25',
  2: brand.trimester.second + '25',
  3: brand.trimester.third + '25',
}

const TRIMESTER_COLOR = {
  1: brand.trimester.first,
  2: brand.trimester.second,
  3: brand.trimester.third,
}

type LogType = 'mood' | 'symptom' | 'appointment' | 'exam' | 'kick_count'

// ─── Main Component ────────────────────────────────────────────────────────

export function PregnancyCalendar() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  const weekNumber = usePregnancyStore((s) => s.weekNumber) ?? 24
  const dueDate = usePregnancyStore((s) => s.dueDate) ?? ''
  const trimester = getTrimester(weekNumber)
  const weekInfo = getWeekInfo(weekNumber)
  const showKicks = weekNumber >= 28

  // View toggle
  const [view, setView] = useState<'month' | 'timeline'>('month')

  // Month navigation
  const [viewDate, setViewDate] = useState(() => new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Selected date + sheet
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [sheetType, setSheetType] = useState<LogType | null>(null)

  const todayStr = toDateStr(new Date())

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: {
      date: string
      day: number
      inMonth: boolean
      trimester: 1 | 2 | 3
      week: number
      isToday: boolean
      isFuture: boolean
    }[] = []

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, inMonth: false, trimester: 1, week: 0, isToday: false, isFuture: false })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const wk = dueDate ? weekForDate(dueDate, dateStr) : weekNumber
      const tri = getTrimester(wk)
      days.push({
        date: dateStr,
        day: d,
        inMonth: true,
        trimester: tri,
        week: wk,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      })
    }
    return days
  }, [year, month, dueDate, weekNumber, todayStr])

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  function handleSaved() {
    setSheetType(null)
  }

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Quick log config
  const quickLogs: { id: LogType; label: string; icon: typeof Smile; color: string }[] = [
    { id: 'mood', label: 'Mood', icon: Smile, color: brand.accent },
    { id: 'symptom', label: 'Symptoms', icon: Activity, color: brand.phase.menstrual },
    { id: 'appointment', label: 'Appointment', icon: Calendar, color: brand.secondary },
    { id: 'exam', label: 'Exam Result', icon: FlaskConical, color: brand.phase.ovulation },
    ...(showKicks
      ? [{ id: 'kick_count' as LogType, label: 'Kick Count', icon: Hand, color: brand.pregnancy }]
      : []),
  ]

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. View Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceRaised, borderRadius: radius.lg }]}>
          <Pressable
            onPress={() => setView('month')}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: view === 'month' ? colors.primary : 'transparent',
                borderRadius: radius.md,
              },
            ]}
          >
            <Text style={[styles.toggleText, { color: view === 'month' ? '#FFFFFF' : colors.textSecondary }]}>
              Month
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setView('timeline')}
            style={[
              styles.toggleBtn,
              {
                backgroundColor: view === 'timeline' ? colors.primary : 'transparent',
                borderRadius: radius.md,
              },
            ]}
          >
            <Text style={[styles.toggleText, { color: view === 'timeline' ? '#FFFFFF' : colors.textSecondary }]}>
              Timeline
            </Text>
          </Pressable>
        </View>

        {view === 'month' ? (
          <>
            {/* 2. Month Header */}
            <View style={styles.monthHeader}>
              <Pressable onPress={prevMonth} style={styles.chevron}>
                <ChevronLeft size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
              <Pressable onPress={nextMonth} style={styles.chevron}>
                <ChevronRight size={24} color={colors.text} />
              </Pressable>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarWrap}>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={[styles.weekday, { color: colors.textMuted }]}>{w}</Text>
                ))}
              </View>

              <View style={styles.dayGrid}>
                {calendarDays.map((d, i) => {
                  if (!d.inMonth) return <View key={`e-${i}`} style={styles.dayCell} />
                  const isSelected = d.date === selectedDate
                  return (
                    <Pressable
                      key={d.date}
                      onPress={() => setSelectedDate(d.date)}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor: TRIMESTER_TINT[d.trimester],
                          borderRadius: radius.sm,
                          opacity: d.isFuture ? 0.4 : 1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.dayInner,
                          d.isToday && { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.sm },
                          isSelected && !d.isToday && { borderWidth: 1.5, borderColor: colors.textSecondary, borderRadius: radius.sm },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            { color: d.isToday ? colors.primary : colors.text },
                            d.isToday && { fontWeight: '800' },
                          ]}
                        >
                          {d.day}
                        </Text>
                        <View style={[styles.triDot, { backgroundColor: TRIMESTER_COLOR[d.trimester] }]} />
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </>
        ) : (
          /* 3. Timeline View */
          <View style={styles.timelineWrap}>
            {Array.from({ length: 37 }, (_, i) => i + 4).map((wk) => {
              const info = getWeekInfo(wk)
              const tri = getTrimester(wk)
              const isCurrent = wk === weekNumber
              return (
                <View
                  key={wk}
                  style={[
                    styles.weekCard,
                    {
                      backgroundColor: isCurrent ? TRIMESTER_TINT[tri] : colors.surface,
                      borderRadius: radius.xl,
                      borderColor: isCurrent ? TRIMESTER_COLOR[tri] + '40' : colors.border,
                      borderWidth: isCurrent ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.weekCardHeader}>
                    <View style={[styles.weekBadge, { backgroundColor: TRIMESTER_COLOR[tri] + '20', borderRadius: radius.full }]}>
                      <Text style={[styles.weekBadgeText, { color: TRIMESTER_COLOR[tri] }]}>
                        Week {wk}
                      </Text>
                    </View>
                    {isCurrent && (
                      <View style={[styles.currentTag, { backgroundColor: colors.primary, borderRadius: radius.full }]}>
                        <Text style={styles.currentTagText}>NOW</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.weekSize, { color: colors.text }]}>
                    Baby is the size of {info.size}
                  </Text>
                  <Text style={[styles.weekNote, { color: colors.textSecondary }]}>
                    {info.note}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* 4. Banner — current week */}
        <View
          style={[
            styles.banner,
            {
              backgroundColor: TRIMESTER_TINT[trimester],
              borderRadius: radius.xl,
              borderColor: TRIMESTER_COLOR[trimester] + '30',
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.bannerHeader}>
            <Baby size={20} color={TRIMESTER_COLOR[trimester]} strokeWidth={2} />
            <Text style={[styles.bannerWeek, { color: TRIMESTER_COLOR[trimester] }]}>
              Week {weekNumber} — Trimester {trimester}
            </Text>
          </View>
          <Text style={[styles.bannerSize, { color: colors.text }]}>
            Your baby is the size of {weekInfo.size}
          </Text>
          <Text style={[styles.bannerNote, { color: colors.textSecondary }]}>
            {weekInfo.note}
          </Text>
        </View>

        {/* 5. Quick Log Buttons */}
        <View style={styles.quickLogGrid}>
          {quickLogs.map((log) => {
            const Icon = log.icon
            return (
              <Pressable
                key={log.id}
                onPress={() => setSheetType(log.id)}
                style={({ pressed }) => [
                  styles.quickLogBtn,
                  { backgroundColor: colors.surface, borderRadius: radius.xl },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
              >
                <View style={[styles.quickLogIcon, { backgroundColor: log.color + '15' }]}>
                  <Icon size={20} color={log.color} strokeWidth={2} />
                </View>
                <Text style={[styles.quickLogLabel, { color: colors.text }]}>{log.label}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      {/* ─── Bottom Sheets ─────────────────────────────────────────────── */}

      <LogSheet visible={sheetType === 'mood'} title="Log Mood" onClose={() => setSheetType(null)}>
        <PregnancyMoodForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      <LogSheet visible={sheetType === 'symptom'} title="Log Symptoms" onClose={() => setSheetType(null)}>
        <PregnancySymptomsForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      <LogSheet visible={sheetType === 'appointment'} title="Log Appointment" onClose={() => setSheetType(null)}>
        <AppointmentForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      <LogSheet visible={sheetType === 'exam'} title="Log Exam Result" onClose={() => setSheetType(null)}>
        <ExamResultForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      <LogSheet visible={sheetType === 'kick_count'} title="Kick Counter" onClose={() => setSheetType(null)}>
        <KickCountForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Month header
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  chevron: { padding: 8 },
  monthLabel: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Calendar grid
  calendarWrap: { marginBottom: 16 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayNumber: { fontSize: 14, fontWeight: '600' },
  triDot: { width: 4, height: 4, borderRadius: 2 },

  // Timeline
  timelineWrap: { gap: 10, marginBottom: 16 },
  weekCard: {
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  weekBadge: { paddingVertical: 3, paddingHorizontal: 10 },
  weekBadgeText: { fontSize: 12, fontWeight: '700' },
  currentTag: { paddingVertical: 2, paddingHorizontal: 8 },
  currentTagText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  weekSize: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  weekNote: { fontSize: 13, fontWeight: '400', lineHeight: 18 },

  // Banner
  banner: { padding: 20, marginBottom: 16 },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bannerWeek: { fontSize: 16, fontWeight: '800' },
  bannerSize: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  bannerNote: { fontSize: 14, fontWeight: '400', lineHeight: 20 },

  // Quick log grid
  quickLogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickLogBtn: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quickLogIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickLogLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
})
