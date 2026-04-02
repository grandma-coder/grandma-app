import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface DailyPulseProps {
  weight?: number | null
  mood?: string | null
  onAddSymptom?: () => void
}

export function DailyPulse({ weight, mood, onAddSymptom }: DailyPulseProps) {
  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Pulse</Text>
        <Text style={styles.sparkle}>✨</Text>
      </View>

      <View style={styles.row}>
        <Ionicons name="fitness-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.rowLabel}>Weight</Text>
        <Text style={styles.rowValue}>
          {weight ? `${weight} lbs` : '—'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Ionicons name="happy-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.rowLabel}>Mood</Text>
        <Text style={[styles.rowValue, mood && styles.moodActive]}>
          {mood || '—'}
        </Text>
      </View>

      <Pressable
        onPress={onAddSymptom}
        style={styles.addButton}
      >
        <Text style={styles.addButtonText}>ADD SYMPTOM</Text>
      </Pressable>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sparkle: {
    fontSize: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  moodActive: {
    color: colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  addButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 12,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
})
