import { View, Text, StyleSheet } from 'react-native'
import { colors, shadows } from '../../constants/theme'
import { getWeekData } from '../../lib/pregnancyData'

interface PregnancyWeekDisplayProps {
  weekNumber: number
}

export function PregnancyWeekDisplay({ weekNumber }: PregnancyWeekDisplayProps) {
  const data = getWeekData(weekNumber)

  return (
    <View style={styles.container}>
      <Text style={styles.moonPhaseLabel}>{data.moonPhase.toUpperCase()}</Text>
      <Text style={styles.weekTitle}>Week {weekNumber}</Text>

      {/* Globe placeholder */}
      <View style={styles.globe}>
        <View style={styles.globeInner}>
          <Text style={styles.globeEmoji}>🌙</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  moonPhaseLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  weekTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
  },
  globe: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
    borderWidth: 2,
    borderColor: 'rgba(147, 197, 253, 0.2)',
  },
  globeInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(147, 197, 253, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeEmoji: {
    fontSize: 60,
  },
})
