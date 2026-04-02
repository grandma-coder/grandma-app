import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

const FEED_TYPES = [
  { id: 'breast_left', icon: '🤱', label: 'Left' },
  { id: 'breast_right', icon: '🤱', label: 'Right' },
  { id: 'bottle', icon: '🍼', label: 'Bottle' },
  { id: 'pump', icon: '⏱️', label: 'Pump' },
]

interface MilkTrackerProps {
  onLog?: (feedType: string) => void
}

export function MilkTracker({ onLog }: MilkTrackerProps) {
  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Milk Control</Text>
        <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
      </View>

      <View style={styles.grid}>
        {FEED_TYPES.map((type) => (
          <Pressable
            key={type.id}
            onPress={() => onLog?.(type.id)}
            style={({ pressed }) => [
              styles.feedButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={styles.feedIcon}>{type.icon}</Text>
            <Text style={styles.feedLabel}>{type.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>Tap to start tracking a session</Text>
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
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  feedButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  feedIcon: {
    fontSize: 24,
  },
  feedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
  },
})
