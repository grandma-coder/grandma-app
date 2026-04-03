import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useAppTheme } from '../ui/ThemeProvider'
import { THEME_COLORS, borderRadius } from '../../constants/theme'
import { toDateStr } from '../../lib/cycleLogic'
import type { CycleInfo } from '../../lib/cycleLogic'

interface WeekStripProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  cycleInfo: CycleInfo
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function getWeekDates(centerDate: string): { date: Date; dateStr: string }[] {
  const center = new Date(centerDate + 'T00:00:00')
  const dayOfWeek = center.getDay()
  const dates: { date: Date; dateStr: string }[] = []

  // Show 2 weeks centered on today
  for (let i = -dayOfWeek - 3; i < 14 - dayOfWeek; i++) {
    const d = new Date(center)
    d.setDate(center.getDate() + i)
    dates.push({ date: d, dateStr: toDateStr(d) })
  }
  return dates
}

function getDotColor(dateStr: string, cycleInfo: CycleInfo): string | null {
  // Simple: check if this date falls in period, fertile, or ovulation
  // This is a simplification — in production, use getMonthCycleDots
  if (!cycleInfo.cycleDay) return null
  // We only show dots for demonstration
  return null
}

export function WeekStrip({ selectedDate, onSelectDate, cycleInfo }: WeekStripProps) {
  const { colors: tc } = useAppTheme()
  const todayStr = toDateStr(new Date())
  const dates = getWeekDates(todayStr)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {dates.map(({ date, dateStr }) => {
        const isToday = dateStr === todayStr
        const isSelected = dateStr === selectedDate
        const dayLabel = DAYS[date.getDay()]

        return (
          <Pressable
            key={dateStr}
            onPress={() => onSelectDate(dateStr)}
            style={styles.dayCell}
          >
            <Text style={[
              styles.dayLabel,
              { color: tc.textTertiary },
              isToday && { color: cycleInfo.phaseColor, fontWeight: '800' },
            ]}>
              {dayLabel}
            </Text>

            <View style={[
              styles.dateCircle,
              isToday && { backgroundColor: cycleInfo.phaseColor },
              isSelected && !isToday && { borderWidth: 2, borderColor: cycleInfo.phaseColor },
            ]}>
              <Text style={[
                styles.dateNumber,
                { color: tc.text },
                isToday && { color: '#1A1030' },
              ]}>
                {date.getDate()}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    gap: 4,
    paddingBottom: 8,
  },

  dayCell: {
    width: 48,
    alignItems: 'center',
    gap: 6,
  },

  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
})
