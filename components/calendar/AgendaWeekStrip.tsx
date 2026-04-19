/**
 * AgendaWeekStrip — horizontal week strip used by pregnancy + pre-pregnancy.
 *
 * Top row: "APRIL" small-caps on left, "Week N →" tappable on right.
 * Grid: 7 day cells with weekday label, date number, and colored dots.
 * Selected day = filled circle in mode color. Today (if not selected) = amber.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ArrowRight } from 'lucide-react-native'
import { useTheme } from '../../constants/theme'
import { MonoCaps, Body } from '../ui/Typography'
import { toDateStr } from '../../lib/cycleLogic'

interface AgendaWeekStripProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  /** Map of date → list of dot colors to render under that day */
  dotsByDate?: Record<string, string[]>
  /** Caption on the right, e.g. "Week 16" — tappable */
  weekLabel?: string
  onWeekTap?: () => void
  /** Mode color for the selected day circle */
  modeColor: string
}

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const TODAY_AMBER = '#F9D77E'

function getWeekDates(centerDate: string): { date: Date; dateStr: string }[] {
  const center = new Date(centerDate + 'T00:00:00')
  const dow = center.getDay()
  const out: { date: Date; dateStr: string }[] = []
  // Start from Monday (per mock): offset so Mon is first
  const offsetToMon = dow === 0 ? -6 : 1 - dow
  for (let i = 0; i < 7; i++) {
    const d = new Date(center)
    d.setDate(center.getDate() + offsetToMon + i)
    out.push({ date: d, dateStr: toDateStr(d) })
  }
  return out
}

export function AgendaWeekStrip({
  selectedDate,
  onSelectDate,
  dotsByDate,
  weekLabel,
  onWeekTap,
  modeColor,
}: AgendaWeekStripProps) {
  const { colors, isDark } = useTheme()
  const ink = isDark ? colors.text : '#141313'
  const textMuted = isDark ? colors.textMuted : '#6E6763'
  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'

  const todayStr = toDateStr(new Date())
  const days = getWeekDates(selectedDate)

  // Month label = month of the first day in strip
  const monthLabel = days[0].date
    .toLocaleDateString('en-US', { month: 'long' })
    .toUpperCase()

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: paper,
          borderColor: paperBorder,
        },
      ]}
    >
      <View style={styles.captionRow}>
        <MonoCaps size={11} color={textMuted}>
          {monthLabel}
        </MonoCaps>
        {weekLabel ? (
          <Pressable
            onPress={onWeekTap}
            disabled={!onWeekTap}
            hitSlop={8}
            style={styles.weekChip}
          >
            <Body size={13} color={ink} style={styles.weekLabel}>
              {weekLabel}
            </Body>
            {onWeekTap ? <ArrowRight size={13} color={ink} strokeWidth={2.2} /> : null}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.grid}>
        {days.map(({ date, dateStr }) => {
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr && !isSelected
          const dots = dotsByDate?.[dateStr] ?? []
          const labelColor = textMuted
          const numColor = isSelected ? '#FFFEF8' : ink

          return (
            <Pressable
              key={dateStr}
              onPress={() => onSelectDate(dateStr)}
              style={styles.cell}
            >
              <Text style={[styles.weekday, { color: labelColor }]}>
                {DAY_INITIALS[date.getDay()]}
              </Text>
              <View
                style={[
                  styles.bubble,
                  isSelected && { backgroundColor: modeColor },
                  isToday && { backgroundColor: TODAY_AMBER },
                ]}
              >
                <Text style={[styles.num, { color: numColor }]}>
                  {date.getDate()}
                </Text>
              </View>
              <View style={styles.dotRow}>
                {dots.slice(0, 3).map((c, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  weekChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekLabel: {
    letterSpacing: -0.1,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekday: {
    fontSize: 11,
    fontWeight: '500',
  },
  bubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontSize: 14,
    fontWeight: '600',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    height: 5,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
