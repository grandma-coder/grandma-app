import { View, Text, StyleSheet } from 'react-native'
import { colors, borderRadius } from '../../constants/theme'

export interface TimelineEntry {
  id: string
  activityType: string
  value: string
  notes: string
  createdAt: string
  loggedBy?: string
}

const ACTIVITY_CONFIG: Record<string, { icon: string; color: string }> = {
  feeding: { icon: '🍼', color: '#F9A8D4' },
  sleep: { icon: '😴', color: '#93C5FD' },
  diaper: { icon: '🧷', color: '#FDE68A' },
  mood: { icon: '😊', color: '#86EFAC' },
  growth: { icon: '📏', color: '#C4B5FD' },
  medicine: { icon: '💊', color: '#FCA5A5' },
  vaccines: { icon: '💉', color: '#93C5FD' },
  milestones: { icon: '⭐', color: '#67E8F9' },
  food: { icon: '🥑', color: '#86EFAC' },
  symptoms: { icon: '🤢', color: '#F9A8D4' },
  appointments: { icon: '🏥', color: '#93C5FD' },
  weight: { icon: '⚖️', color: '#FDE68A' },
  nutrition: { icon: '🥗', color: '#86EFAC' },
}

interface ActivityTimelineProps {
  entries: TimelineEntry[]
  loading?: boolean
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function ActivityTimeline({ entries, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    )
  }

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No activity today</Text>
        <Text style={styles.emptyText}>
          Activities logged by you or your caregivers will appear here.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {entries.map((entry, i) => {
        const config = ACTIVITY_CONFIG[entry.activityType] ?? { icon: '📝', color: '#93C5FD' }
        const isLast = i === entries.length - 1

        return (
          <View key={entry.id} style={styles.row}>
            {/* Timeline line + dot */}
            <View style={styles.lineColumn}>
              <View style={[styles.dot, { backgroundColor: config.color + '40' }]}>
                <Text style={styles.dotIcon}>{config.icon}</Text>
              </View>
              {!isLast && <View style={styles.line} />}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.contentHeader}>
                <Text style={styles.activityType}>{entry.activityType}</Text>
                <Text style={styles.time}>{formatTime(entry.createdAt)}</Text>
              </View>
              {entry.value ? <Text style={styles.value}>{entry.value}</Text> : null}
              {entry.notes ? <Text style={styles.notes}>{entry.notes}</Text> : null}
              {entry.loggedBy && (
                <Text style={styles.loggedBy}>by {entry.loggedBy}</Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    minHeight: 60,
  },
  lineColumn: {
    width: 44,
    alignItems: 'center',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotIcon: {
    fontSize: 18,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  time: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  value: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notes: {
    fontSize: 13,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  loggedBy: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
})
