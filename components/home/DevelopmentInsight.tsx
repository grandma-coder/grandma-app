import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, typography, spacing } from '../../constants/theme'
import { getWeekData } from '../../lib/pregnancyData'

interface DevelopmentInsightProps {
  weekNumber: number
}

export function DevelopmentInsight({ weekNumber }: DevelopmentInsightProps) {
  const data = getWeekData(weekNumber)

  return (
    <GlassCard style={styles.container}>
      <Text style={styles.label}>DEVELOPMENT INSIGHT</Text>
      <Text style={styles.title}>Finding Their{'\n'}Voice</Text>
      <Text style={styles.body}>{data.developmentFact}</Text>

      <Pressable style={styles.action}>
        <Ionicons name="mic-outline" size={18} color={colors.text} />
        <Text style={styles.actionText}>Record a lullaby for baby</Text>
      </Pressable>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 32,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceGlass,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
})
