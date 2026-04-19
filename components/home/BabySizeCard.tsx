/**
 * BabySizeCard (Apr 2026 redesign)
 *
 * Paper card with a small "Baby is the size of…" chip inside the pregnancy
 * hero. Serif display for the size word.
 */

import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../constants/theme'
import { getWeekData } from '../../lib/pregnancyData'
import { MonoCaps } from '../ui/Typography'

interface BabySizeCardProps {
  weekNumber: number
  dueDate?: string | null
}

export function BabySizeCard({ weekNumber }: BabySizeCardProps) {
  const { colors, font, isDark } = useTheme()
  const data = getWeekData(weekNumber)

  const paper = isDark ? colors.surface : '#FFFEF8'
  const paperBorder = isDark ? colors.border : 'rgba(20,19,19,0.08)'
  const ink = isDark ? colors.text : '#141313'

  return (
    <View style={styles.wrap}>
      <View style={[styles.chip, { backgroundColor: paper, borderColor: paperBorder }]}>
        <MonoCaps>Baby is the size of</MonoCaps>
        <Text style={[styles.value, { fontFamily: font.display, color: ink }]}>
          {data.babySize}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  value: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
})
