import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { toDateStr } from '../../lib/cycleLogic'
import type { CycleInfo } from '../../lib/cycleLogic'

interface WeekStripProps {
  selectedDate: string
  onSelectDate: (date: string) => void
  cycleInfo: CycleInfo
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function getStripDates(centerDate: string): { date: Date; dateStr: string }[] {
  const center = new Date(centerDate + 'T00:00:00')
  const dayOfWeek = center.getDay()
  const dates: { date: Date; dateStr: string }[] = []
  // Show current week starting from Sunday
  for (let i = -dayOfWeek; i < 7 - dayOfWeek; i++) {
    const d = new Date(center)
    d.setDate(center.getDate() + i)
    dates.push({ date: d, dateStr: toDateStr(d) })
  }
  return dates
}

export function WeekStrip({ selectedDate, onSelectDate, cycleInfo }: WeekStripProps) {
  const todayStr = toDateStr(new Date())
  const dates = getStripDates(todayStr)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {dates.map(({ date, dateStr }) => {
        const isToday = dateStr === todayStr
        const dayLabel = DAYS[date.getDay()]

        return (
          <Pressable
            key={dateStr}
            onPress={() => onSelectDate(dateStr)}
            style={styles.cell}
          >
            {/* Day label — matches HTML: text-[10px] text-white/40 uppercase mb-2 */}
            <Text style={[
              styles.dayLabel,
              isToday && { color: cycleInfo.phaseColor, fontWeight: '700' },
            ]}>
              {dayLabel}
            </Text>

            {/* Date — matches HTML: today = w-9 h-9 rounded-full bg-green */}
            {isToday ? (
              <View style={[styles.todayCircle, { backgroundColor: cycleInfo.phaseColor }]}>
                <Text style={styles.todayText}>{date.getDate()}</Text>
              </View>
            ) : (
              <Text style={styles.dateText}>{date.getDate()}</Text>
            )}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  // matches HTML: .flex.space-x-4.overflow-x-auto.pb-4
  container: {
    gap: 16,
    paddingBottom: 16,
  },

  // matches HTML: .flex.flex-col.items-center.shrink-0.w-12
  cell: {
    width: 48,
    alignItems: 'center',
  },

  // matches HTML: text-[10px] text-white/40 uppercase mb-2
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // matches HTML: text-base font-bold
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // matches HTML: w-9 h-9 rounded-full bg-[#A2FF86] text-[#1A1030]
  todayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1030',
  },
})
