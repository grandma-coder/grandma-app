import { useState, useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, THEME_COLORS, borderRadius, shadows } from '../../constants/theme'

export type CalendarViewMode = 'month' | 'week' | 'day'

export interface ActivityDot {
  date: string
  color: string
  type: string
}

interface CalendarViewProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  activityDots?: ActivityDot[]
  viewMode?: CalendarViewMode
  onViewModeChange?: (mode: CalendarViewMode) => void
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const VIEW_MODES: { id: CalendarViewMode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates(dateStr: string): Date[] {
  const d = new Date(dateStr)
  const day = d.getDay()
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(start)
    dd.setDate(start.getDate() + i)
    dates.push(dd)
  }
  return dates
}

export function CalendarView({
  selectedDate,
  onSelectDate,
  activityDots = [],
  viewMode = 'month',
  onViewModeChange,
}: CalendarViewProps) {
  const [viewDate, setViewDate] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const todayStr = toDateStr(new Date())

  // Group dots by date
  const dotsByDate = useMemo(() => {
    const map: Record<string, ActivityDot[]> = {}
    activityDots.forEach((d) => {
      if (!map[d.date]) map[d.date] = []
      map[d.date].push(d)
    })
    return map
  }, [activityDots])

  const { year, month } = viewDate

  function navigate(dir: -1 | 1) {
    if (viewMode === 'day') {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() + dir)
      onSelectDate(toDateStr(d))
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate)
      d.setDate(d.getDate() + dir * 7)
      onSelectDate(toDateStr(d))
    } else {
      setViewDate((prev) => {
        let m = prev.month + dir
        let y = prev.year
        if (m < 0) { m = 11; y-- }
        if (m > 11) { m = 0; y++ }
        return { year: y, month: m }
      })
    }
  }

  // ─── Header label ──────
  function getHeaderLabel(): string {
    if (viewMode === 'day') {
      const d = new Date(selectedDate)
      return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })
    }
    if (viewMode === 'week') {
      const dates = getWeekDates(selectedDate)
      const start = dates[0]
      const end = dates[6]
      return `${start.toLocaleDateString('default', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
    }
    return new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  // ─── Render day cell ──────
  function renderDayCell(day: number | null, index: number, dateStr?: string) {
    if (day === null) return <View key={`e${index}`} style={styles.cell} />

    const ds = dateStr!
    const isSelected = ds === selectedDate
    const isToday = ds === todayStr
    const dots = dotsByDate[ds] ?? []

    return (
      <Pressable
        key={ds}
        onPress={() => onSelectDate(ds)}
        style={[styles.cell, isSelected && styles.cellSelected]}
      >
        <Text
          style={[
            styles.cellText,
            isToday && !isSelected && styles.cellTextToday,
            isSelected && styles.cellTextSelected,
          ]}
        >
          {day}
        </Text>
        {/* Activity color dots */}
        {dots.length > 0 && (
          <View style={styles.dotsRow}>
            {dots.slice(0, 3).map((dot, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: isSelected ? colors.textOnAccent : dot.color }]} />
            ))}
          </View>
        )}
      </Pressable>
    )
  }

  // ─── Month grid ──────
  function renderMonthView() {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: { day: number | null; dateStr?: string }[] = []
    for (let i = 0; i < firstDay; i++) cells.push({ day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      })
    }

    return (
      <>
        <View style={styles.dayHeaderRow}>
          {DAYS.map((d) => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((c, i) => renderDayCell(c.day, i, c.dateStr))}
        </View>
      </>
    )
  }

  // ─── Week strip ──────
  function renderWeekView() {
    const dates = getWeekDates(selectedDate)

    return (
      <View style={styles.weekStrip}>
        {dates.map((d, i) => {
          const ds = toDateStr(d)
          const isSelected = ds === selectedDate
          const isToday = ds === todayStr
          const dots = dotsByDate[ds] ?? []

          return (
            <Pressable
              key={ds}
              onPress={() => onSelectDate(ds)}
              style={[styles.weekCell, isSelected && styles.weekCellSelected]}
            >
              <Text style={[styles.weekDayLabel, isSelected && { color: colors.textOnAccent }]}>
                {DAYS[i].substring(0, 3)}
              </Text>
              <Text
                style={[
                  styles.weekDayNum,
                  isToday && !isSelected && { color: THEME_COLORS.yellow },
                  isSelected && { color: colors.textOnAccent },
                ]}
              >
                {d.getDate()}
              </Text>
              {dots.length > 0 && (
                <View style={styles.dotsRow}>
                  {dots.slice(0, 2).map((dot, j) => (
                    <View key={j} style={[styles.dot, { backgroundColor: isSelected ? colors.textOnAccent : dot.color }]} />
                  ))}
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
    )
  }

  // ─── Day view ──────
  function renderDayView() {
    const d = new Date(selectedDate)
    const dots = dotsByDate[selectedDate] ?? []

    return (
      <View style={styles.dayViewCard}>
        <Text style={styles.dayViewDate}>{d.getDate()}</Text>
        <Text style={styles.dayViewWeekday}>
          {d.toLocaleDateString('default', { weekday: 'long' })}
        </Text>
        {dots.length > 0 ? (
          <View style={styles.dayViewDots}>
            {dots.map((dot, i) => (
              <View key={i} style={styles.dayViewDotRow}>
                <View style={[styles.dayViewDotColor, { backgroundColor: dot.color }]} />
                <Text style={styles.dayViewDotText}>{dot.type}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.dayViewEmpty}>No activities for this day</Text>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* View mode switcher */}
      {onViewModeChange && (
        <View style={styles.viewModeRow}>
          {VIEW_MODES.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => onViewModeChange(m.id)}
              style={[styles.viewModePill, viewMode === m.id && styles.viewModePillActive]}
            >
              <Text style={[styles.viewModeText, viewMode === m.id && styles.viewModeTextActive]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Month navigation header */}
      <View style={styles.monthRow}>
        <Pressable onPress={() => navigate(-1)} style={styles.navButton}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.monthLabel}>{getHeaderLabel()}</Text>
        <Pressable onPress={() => navigate(1)} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* View content */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },

  // View mode switcher
  viewModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  viewModePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  viewModePillActive: {
    backgroundColor: THEME_COLORS.yellow,
  },
  viewModeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewModeTextActive: {
    color: colors.textOnAccent,
  },

  // Month header
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Day headers
  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Month grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  cellSelected: {
    backgroundColor: THEME_COLORS.yellow,
    borderRadius: 18,
    ...shadows.glow,
    transform: [{ scale: 1.1 }],
    zIndex: 10,
  },
  cellText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  cellTextToday: {
    color: THEME_COLORS.yellow,
    fontWeight: '900',
  },
  cellTextSelected: {
    color: colors.textOnAccent,
    fontWeight: '900',
  },

  // Activity dots
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  // Week strip
  weekStrip: {
    flexDirection: 'row',
    gap: 6,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  weekCellSelected: {
    backgroundColor: THEME_COLORS.yellow,
    borderColor: THEME_COLORS.yellow,
    ...shadows.glow,
  },
  weekDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
  },
  weekDayNum: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },

  // Day view
  dayViewCard: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
  },
  dayViewDate: {
    fontSize: 56,
    fontWeight: '900',
    color: THEME_COLORS.yellow,
    marginBottom: 4,
  },
  dayViewWeekday: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 20,
  },
  dayViewDots: {
    gap: 8,
    width: '100%',
  },
  dayViewDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayViewDotColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dayViewDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  dayViewEmpty: {
    fontSize: 14,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
})
