import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, THEME_COLORS, borderRadius } from '../../constants/theme'

interface DailyPulseProps {
  weight?: number | null
  mood?: string | null
  onAddSymptom?: () => void
}

export function DailyPulse({ weight, mood, onAddSymptom }: DailyPulseProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Pulse</Text>
        <Ionicons name="help-circle-outline" size={24} color={colors.textTertiary} />
      </View>

      {/* Empty state */}
      <View style={styles.emptyCard}>
        <Ionicons name="information-circle-outline" size={32} color={colors.textTertiary} style={{ marginBottom: 12 }} />
        <Text style={styles.emptyText}>No entries for today yet...</Text>
      </View>
    </View>
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
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  emptyCard: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
})
