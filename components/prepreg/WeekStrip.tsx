/**
 * WeekStrip — horizontal day-of-week selector with today emphasised as a
 * filled phase-color circle. Used in the pre-pregnancy agenda above the
 * cycle ring.
 */

import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { toDateStr } from '../../lib/cycleLogic'
import { useTheme, radius, spacing } from '../../constants/theme'
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
  for (let i = -dayOfWeek; i < 7 - dayOfWeek; i++) {
    const d = new Date(center)
    d.setDate(center.getDate() + i)
    dates.push({ date: d, dateStr: toDateStr(d) })
  }
  return dates
}

export function WeekStrip({ onSelectDate, cycleInfo }: WeekStripProps) {
  const { colors, font } = useTheme()
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
            <Text
              style={[
                styles.dayLabel,
                {
                  color: isToday ? cycleInfo.phaseColor : colors.textFaint,
                  fontFamily: isToday ? font.bodySemiBold : font.bodyMedium,
                },
              ]}
            >
              {dayLabel}
            </Text>

            {isToday ? (
              <View style={[styles.todayCircle, { backgroundColor: cycleInfo.phaseColor }]}>
                <Text style={[styles.todayText, { color: colors.bg, fontFamily: font.bodySemiBold }]}>
                  {date.getDate()}
                </Text>
              </View>
            ) : (
              <Text style={[styles.dateText, { color: colors.text, fontFamily: font.bodySemiBold }]}>
                {date.getDate()}
              </Text>
            )}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  cell: {
    width: 48,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 16,
  },
  todayCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    fontSize: 16,
  },
})
