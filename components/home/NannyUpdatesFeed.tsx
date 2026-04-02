import { View, Text, StyleSheet } from 'react-native'
import { GlassCard } from '../ui/GlassCard'
import { colors, borderRadius } from '../../constants/theme'

interface NannyUpdate {
  id: string
  name: string
  timeAgo: string
  content: string
  tags: string[]
}

interface NannyUpdatesFeedProps {
  updates?: NannyUpdate[]
}

export function NannyUpdatesFeed({ updates = [] }: NannyUpdatesFeedProps) {
  if (updates.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Nanny Updates</Text>
        </View>
        <GlassCard>
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👩‍👦</Text>
            <Text style={styles.emptyText}>No nanny updates yet</Text>
            <Text style={styles.emptySubtext}>
              Invite a caregiver to start seeing their notes here
            </Text>
          </View>
        </GlassCard>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nanny Updates</Text>
        <Text style={styles.viewHistory}>View History</Text>
      </View>

      {updates.map((update) => (
        <GlassCard key={update.id} style={styles.updateCard}>
          <View style={styles.updateHeader}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 16 }}>👩</Text>
            </View>
            <Text style={styles.nannyName}>{update.name}</Text>
            <Text style={styles.timeAgo}>{update.timeAgo}</Text>
          </View>
          <Text style={styles.updateContent}>"{update.content}"</Text>
          <View style={styles.tags}>
            {update.tags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      ))}
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
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  viewHistory: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  updateCard: {
    marginBottom: 10,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nannyName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  updateContent: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 10,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
})
