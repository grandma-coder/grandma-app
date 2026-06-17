import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PaperCard } from '../ui/PaperCard'
import { useTheme } from '../../constants/theme'
import type { Channel } from '../../lib/channels'

interface ChannelCardProps {
  channel: Channel
  onPress?: () => void
}

export function ChannelCard({ channel, onPress }: ChannelCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <PaperCard radius={28} padding={20} style={styles.container}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{channel.channelType === 'private' ? '🔒' : '#'}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.name}>{channel.name}</Text>
            {channel.description && (
              <Text style={styles.description} numberOfLines={2}>{channel.description}</Text>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{channel.memberCount} members</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{channel.category}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </PaperCard>
    </Pressable>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  metaDot: {
    color: colors.textMuted,
  },
})
