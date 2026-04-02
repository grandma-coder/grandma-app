import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors, THEME_COLORS, shadows } from '../../constants/theme'
import { getWeekData } from '../../lib/pregnancyData'

interface PregnancyWeekDisplayProps {
  weekNumber: number
}

export function PregnancyWeekDisplay({ weekNumber }: PregnancyWeekDisplayProps) {
  const data = getWeekData(weekNumber)

  return (
    <View style={styles.container}>
      {/* Moon phase label */}
      <Text style={styles.moonPhaseLabel}>{data.moonPhase.toUpperCase()}</Text>

      {/* Week number */}
      <Text style={styles.weekTitle}>Week {weekNumber}</Text>

      {/* Gradient ring globe */}
      <View style={styles.globeWrapper}>
        <LinearGradient
          colors={[THEME_COLORS.blue, THEME_COLORS.pink, THEME_COLORS.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientRing}
        >
          <View style={styles.globeInner}>
            <View style={styles.globeCore}>
              <Ionicons name="happy-outline" size={64} color="rgba(255,255,255,0.8)" />
            </View>
          </View>
        </LinearGradient>

        {/* Active badge */}
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  moonPhaseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME_COLORS.pink,
    letterSpacing: 3,
    marginBottom: 8,
  },
  weekTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  globeWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  gradientRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    padding: 6,
    ...shadows.glowBlue,
  },
  globeInner: {
    flex: 1,
    borderRadius: 110,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  globeCore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    marginTop: -8,
    backgroundColor: THEME_COLORS.yellow,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: colors.background,
    ...shadows.glow,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.textOnAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
