import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface FeedSession {
  id: string
  feedType: string
  durationMinutes?: number
  amountMl?: number
  createdAt: string
}

interface MilkControlProps {
  sessions?: FeedSession[]
  onStartSession?: (feedType: string) => void
}

const FEED_BUTTONS = [
  { id: 'breast_left', icon: '🤱', label: 'Left Breast', shortLabel: 'L' },
  { id: 'breast_right', icon: '🤱', label: 'Right Breast', shortLabel: 'R' },
  { id: 'bottle', icon: '🍼', label: 'Bottle', shortLabel: 'Bottle' },
  { id: 'pump', icon: '⏱️', label: 'Pump', shortLabel: 'Pump' },
]

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function MilkControl({ sessions = [], onStartSession }: MilkControlProps) {
  return (
    <GlassCard>
      <Text style={styles.title}>Milk Control</Text>
      <Text style={styles.subtitle}>Track breast, bottle, and pump sessions</Text>

      {/* Quick start buttons */}
      <View style={styles.buttonGrid}>
        {FEED_BUTTONS.map((btn) => (
          <Pressable
            key={btn.id}
            onPress={() => onStartSession?.(btn.id)}
            style={({ pressed }) => [
              styles.feedBtn,
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text style={styles.feedIcon}>{btn.icon}</Text>
            <Text style={styles.feedLabel}>{btn.shortLabel}</Text>
          </Pressable>
        ))}
      </View>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <View style={styles.history}>
          <Text style={styles.historyTitle}>Today's Sessions</Text>
          {sessions.slice(0, 5).map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <Text style={styles.sessionType}>{s.feedType.replace('_', ' ')}</Text>
              <Text style={styles.sessionDetail}>
                {s.durationMinutes ? `${s.durationMinutes}min` : ''}
                {s.amountMl ? ` · ${s.amountMl}ml` : ''}
              </Text>
              <Text style={styles.sessionTime}>{formatTime(s.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}

      {sessions.length === 0 && (
        <Text style={styles.emptyText}>
          Tap a button above to start tracking a feeding session.
        </Text>
      )}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  feedBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
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
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  history: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  sessionType: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
    width: 90,
  },
  sessionDetail: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  sessionTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
})
