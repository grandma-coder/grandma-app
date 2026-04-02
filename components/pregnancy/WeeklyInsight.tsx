import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors } from '../../constants/theme'
import { getWeekData } from '../../lib/pregnancyData'

interface WeeklyInsightProps {
  weekNumber: number
}

export function WeeklyInsight({ weekNumber }: WeeklyInsightProps) {
  const data = getWeekData(weekNumber)

  return (
    <GlassCard>
      <Text style={styles.label}>WEEK {weekNumber} DEEP DIVE</Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="body-outline" size={16} color={colors.accent} />
          <Text style={styles.sectionTitle}>Baby's Development</Text>
        </View>
        <Text style={styles.body}>{data.developmentFact}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.babyLength}</Text>
          <Text style={styles.statLabel}>Length</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.babyWeight}</Text>
          <Text style={styles.statLabel}>Weight</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.babySize}</Text>
          <Text style={styles.statLabel}>Size</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="heart-outline" size={16} color={colors.accent} />
          <Text style={styles.sectionTitle}>Tip for You</Text>
        </View>
        <Text style={styles.body}>{data.momTip}</Text>
      </View>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textTertiary,
  },
})
