import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GlassCard } from '../ui/GlassCard'
import { colors } from '../../constants/theme'
import type { Channel } from '../../lib/channels'

interface ChannelCardProps {
  channel: Channel
  onPress?: () => void
}

export function ChannelCard({ channel, onPress }: ChannelCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <GlassCard style={styles.container}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>#</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.name}>{channel.name}</Text>
            {channel.description && (
              <Text style={styles.description} numberOfLines={2}>{channel.description}</Text>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
              <Text style={styles.metaText}>{channel.memberCount} members</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{channel.category}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </GlassCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.accentMuted,
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
    color: colors.textTertiary,
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
    color: colors.textTertiary,
  },
  metaDot: {
    color: colors.textTertiary,
  },
})
