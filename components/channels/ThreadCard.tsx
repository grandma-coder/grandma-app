import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, borderRadius } from '../../constants/theme'
import type { Thread } from '../../lib/channels'

interface ThreadCardProps {
  thread: Thread
  onPress?: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function ThreadCard({ thread, onPress }: ThreadCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.85 }]}
    >
      {thread.isPinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={10} color={colors.accent} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>{thread.title}</Text>
      <Text style={styles.content} numberOfLines={2}>{thread.content}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="chatbubble-outline" size={12} color={colors.textTertiary} />
        <Text style={styles.metaText}>{thread.replyCount} replies</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>{timeAgo(thread.createdAt)}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  content: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  metaDot: {
    color: colors.textTertiary,
  },
})
