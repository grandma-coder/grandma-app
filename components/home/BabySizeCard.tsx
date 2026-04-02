import { View, Text, StyleSheet } from 'react-native'
import { GlassCard } from '../ui/GlassCard'
import { colors, typography } from '../../constants/theme'
import { getWeekData, getDaysToGo } from '../../lib/pregnancyData'

interface BabySizeCardProps {
  weekNumber: number
  dueDate?: string | null
}

export function BabySizeCard({ weekNumber, dueDate }: BabySizeCardProps) {
  const data = getWeekData(weekNumber)
  const daysLeft = dueDate ? getDaysToGo(dueDate) : null

  return (
    <View style={styles.row}>
      {daysLeft !== null && (
        <GlassCard style={styles.card}>
          <Text style={styles.value}>{daysLeft}</Text>
          <Text style={styles.label}>DAYS TO GO</Text>
        </GlassCard>
      )}
      <GlassCard style={styles.card}>
        <Text style={styles.value}>{data.babySize}</Text>
        <Text style={styles.label}>SIZE OF BABY</Text>
      </GlassCard>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1,
  },
})
