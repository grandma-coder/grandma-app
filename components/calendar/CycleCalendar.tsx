/**
 * C4 — Cycle Calendar Screen
 *
 * Full month grid with phase coloring, dot indicators, phase banner,
 * quick log buttons, and bottom sheet log forms.
 */

import { useState, useMemo, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  Thermometer,
  Heart,
  Smile,
  Activity,
  HeartHandshake,
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, brand } from '../../constants/theme'
import { getCycleInfo, toDateStr, type CyclePhase } from '../../lib/cycleLogic'
import { LogSheet } from './LogSheet'
import { AgendaHeader } from './AgendaHeader'
import {
  PeriodStartForm,
  PeriodEndForm,
  SymptomsForm,
  MoodForm,
  TemperatureForm,
  IntimacyForm,
} from './LogForms'

// ─── Constants ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const PHASE_TINT: Record<CyclePhase, string> = {
  menstruation: brand.phase.menstrual + '18',
  follicular: brand.prePregnancy + '12',
  ovulation: brand.phase.luteal + '18',
  luteal: brand.kids + '12',
}

const PHASE_DOT: Record<CyclePhase, string> = {
  menstruation: brand.phase.menstrual,
  follicular: brand.prePregnancy,
  ovulation: brand.phase.ovulation,
  luteal: brand.phase.luteal,
}

type LogType = 'period_start' | 'period_end' | 'symptom' | 'mood' | 'basal_temp' | 'intercourse'

const QUICK_LOGS: { id: LogType; label: string; icon: typeof Droplets; color: string }[] = [
  { id: 'period_start', label: 'Period Start', icon: Droplets, color: brand.phase.menstrual },
  { id: 'period_end', label: 'Period End', icon: Droplets, color: brand.phase.menstrual },
  { id: 'symptom', label: 'Symptoms', icon: Activity, color: brand.accent },
  { id: 'mood', label: 'Mood', icon: Smile, color: brand.phase.ovulation },
  { id: 'basal_temp', label: 'Temperature', icon: Thermometer, color: brand.secondary },
  { id: 'intercourse', label: 'Intimacy', icon: HeartHandshake, color: brand.prePregnancy },
]

// ─── Main Component ────────────────────────────────────────────────────────

export function CycleCalendar() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()

  // Month navigation
  const [viewDate, setViewDate] = useState(() => new Date())
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Selected date + sheet state
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()))
  const [sheetType, setSheetType] = useState<LogType | 'day_view' | null>(null)

  // Cycle config (mock — will come from Supabase)
  const cycleConfig = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 10)
    return { lastPeriodStart: toDateStr(d), cycleLength: 28, periodLength: 5 }
  }, [])

  const todayStr = toDateStr(new Date())
  const selectedInfo = getCycleInfo(cycleConfig, selectedDate)

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { date: string; day: number; inMonth: boolean; phase: CyclePhase; isToday: boolean; isFuture: boolean }[] = []

    // Leading empty days
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: '', day: 0, inMonth: false, phase: 'follicular', isToday: false, isFuture: false })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const info = getCycleInfo(cycleConfig, dateStr)
      const isFuture = dateStr > todayStr
      days.push({
        date: dateStr,
        day: d,
        inMonth: true,
        phase: info.phase,
        isToday: dateStr === todayStr,
        isFuture,
      })
    }

    return days
  }, [year, month, cycleConfig, todayStr])

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  function handleDayPress(date: string) {
    setSelectedDate(date)
    setSheetType('day_view')
  }

  function handleDayLongPress(date: string) {
    setSelectedDate(date)
    setSheetType('mood')
  }

  function handleQuickLog(type: LogType) {
    setSheetType(type)
  }

  function handleSaved() {
    setSheetType(null)
    // TODO: invalidate queries to refresh dots
  }

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Agenda title */}
        <AgendaHeader />

        {/* 1. Month Header */}
        <View style={styles.monthHeader}>
          <Pressable onPress={prevMonth} style={styles.chevron}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
          <Pressable onPress={nextMonth} style={styles.chevron}>
            <ChevronRight size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* 2. Calendar Grid */}
        <View style={styles.calendarWrap}>
          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={[styles.weekday, { color: colors.textMuted }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* Day cells */}
          <View style={styles.dayGrid}>
            {calendarDays.map((d, i) => {
              if (!d.inMonth) {
                return <View key={`empty-${i}`} style={styles.dayCell} />
              }
              const isSelected = d.date === selectedDate
              return (
                <Pressable
                  key={d.date}
                  onPress={() => handleDayPress(d.date)}
                  onLongPress={() => handleDayLongPress(d.date)}
                  style={[
                    styles.dayCell,
                    {
                      backgroundColor: PHASE_TINT[d.phase],
                      borderRadius: radius.sm,
                      opacity: d.isFuture ? 0.45 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dayInner,
                      d.isToday && {
                        borderWidth: 2,
                        borderColor: colors.primary,
                        borderRadius: radius.sm,
                      },
                      isSelected && !d.isToday && {
                        borderWidth: 1.5,
                        borderColor: colors.textSecondary,
                        borderRadius: radius.sm,
                      },
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
                    {/* Phase dot */}
                    <View style={[styles.phaseDot, { backgroundColor: PHASE_DOT[d.phase] }]} />
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* 3. Phase Banner */}
        <View
          style={[
            styles.phaseBanner,
            {
              backgroundColor: PHASE_TINT[selectedInfo.phase],
              borderRadius: radius.xl,
              borderColor: PHASE_DOT[selectedInfo.phase] + '30',
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.phaseBannerHeader}>
            <Text style={[styles.phaseName, { color: PHASE_DOT[selectedInfo.phase] }]}>
              {selectedInfo.phaseLabel}
            </Text>
            {selectedInfo.conceptionProbability !== 'none' && (
              <View
                style={[
                  styles.fertilityTag,
                  {
                    backgroundColor: PHASE_DOT[selectedInfo.phase] + '20',
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text style={[styles.fertilityTagText, { color: PHASE_DOT[selectedInfo.phase] }]}>
                  {selectedInfo.conceptionProbability.toUpperCase()} CHANCE
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.phaseDesc, { color: colors.textSecondary }]}>
            {selectedInfo.phaseDescription}
          </Text>
        </View>

        {/* 4. Quick Log Buttons — 2x3 grid */}
        <View style={styles.quickLogGrid}>
          {QUICK_LOGS.map((log) => {
            const Icon = log.icon
            return (
              <Pressable
                key={log.id}
                onPress={() => handleQuickLog(log.id)}
                style={({ pressed }) => [
                  styles.quickLogBtn,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radius.xl,
                  },
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

      {/* Day view sheet */}
      <LogSheet
        visible={sheetType === 'day_view'}
        title={`Logs for ${formatDateLong(selectedDate)}`}
        onClose={() => setSheetType(null)}
      >
        <View style={styles.dayViewSheet}>
          <View style={[styles.dayViewPhase, { backgroundColor: PHASE_TINT[selectedInfo.phase], borderRadius: radius.lg }]}>
            <Text style={[styles.dayViewPhaseText, { color: PHASE_DOT[selectedInfo.phase] }]}>
              {selectedInfo.phaseLabel} — Day {selectedInfo.cycleDay}
            </Text>
          </View>
          <Text style={[styles.dayViewDesc, { color: colors.textSecondary }]}>
            {selectedInfo.phaseDescription}
          </Text>
          <Text style={[styles.dayViewHint, { color: colors.textMuted }]}>
            Tap a quick log button above to add an entry for this date.
          </Text>
        </View>
      </LogSheet>

      {/* Period Start */}
      <LogSheet visible={sheetType === 'period_start'} title="Log Period Start" onClose={() => setSheetType(null)}>
        <PeriodStartForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      {/* Period End */}
      <LogSheet visible={sheetType === 'period_end'} title="Log Period End" onClose={() => setSheetType(null)}>
        <PeriodEndForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      {/* Symptoms */}
      <LogSheet visible={sheetType === 'symptom'} title="Log Symptoms" onClose={() => setSheetType(null)}>
        <SymptomsForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      {/* Mood */}
      <LogSheet visible={sheetType === 'mood'} title="Log Mood" onClose={() => setSheetType(null)}>
        <MoodForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      {/* Temperature */}
      <LogSheet visible={sheetType === 'basal_temp'} title="Log Temperature" onClose={() => setSheetType(null)}>
        <TemperatureForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>

      {/* Intimacy */}
      <LogSheet visible={sheetType === 'intercourse'} title="Log Intimacy" onClose={() => setSheetType(null)}>
        <IntimacyForm date={selectedDate} onSaved={handleSaved} />
      </LogSheet>
    </View>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateLong(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
  },

  // Month header
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  chevron: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Calendar grid
  calendarWrap: {
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  dayInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  phaseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Phase banner
  phaseBanner: {
    padding: 20,
    marginBottom: 16,
  },
  phaseBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  phaseName: {
    fontSize: 18,
    fontWeight: '800',
  },
  fertilityTag: {
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  fertilityTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  phaseDesc: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },

  // Quick log grid
  quickLogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
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
  quickLogIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLogLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Day view sheet
  dayViewSheet: {
    gap: 12,
    paddingBottom: 8,
  },
  dayViewPhase: {
    padding: 12,
  },
  dayViewPhaseText: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayViewDesc: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  dayViewHint: {
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
})
