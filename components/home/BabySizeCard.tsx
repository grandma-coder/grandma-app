import { View, Text, StyleSheet } from 'react-native'
import { colors, THEME_COLORS, borderRadius } from '../../constants/theme'
import { getWeekData, getDaysToGo } from '../../lib/pregnancyData'

interface BabySizeCardProps {
  weekNumber: number
  dueDate?: string | null
}

export function BabySizeCard({ weekNumber, dueDate }: BabySizeCardProps) {
  const data = getWeekData(weekNumber)

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Size of Baby</Text>
        <Text style={styles.value}>{data.babySize}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: 28,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    fontSize: 36,
    fontWeight: '900',
    color: THEME_COLORS.green,
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
})
