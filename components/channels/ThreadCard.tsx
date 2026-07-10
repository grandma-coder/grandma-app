import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Pin, MessageCircle } from 'lucide-react-native'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import type { Thread } from '../../lib/channels'
import { useTranslation } from '../../lib/i18n'

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
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const metaMono = diffuse
    ? { fontFamily: diffuseFont.mono, color: dt.colors.ink3, textTransform: 'uppercase' as const, letterSpacing: 0.8 }
    : null
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, diffuse && { borderBottomColor: dt.colors.line }, pressed && { opacity: 0.85 }]}
    >
      {thread.isPinned && (
        <View style={styles.pinnedBadge}>
          {diffuse
            ? <Pin size={10} color={dt.colors.ink3} strokeWidth={1.8} />
            : <Ionicons name="pin" size={10} color={colors.accent} />}
          <Text style={[styles.pinnedText, diffuse && { fontFamily: diffuseFont.mono, color: dt.colors.ink3, letterSpacing: 1.4 }]}>{t('channelScreen_pinned')}</Text>
        </View>
      )}
      <Text style={[styles.title, diffuse && { fontFamily: diffuseFont.bodySemiBold, color: dt.colors.ink, fontWeight: undefined }]} numberOfLines={2}>{thread.title}</Text>
      <Text style={[styles.content, diffuse && { fontFamily: diffuseFont.body, color: dt.colors.ink2 }]} numberOfLines={2}>{thread.content}</Text>
      <View style={styles.metaRow}>
        {diffuse
          ? <MessageCircle size={11} color={dt.colors.ink3} strokeWidth={1.7} />
          : <Ionicons name="chatbubble-outline" size={12} color={colors.textMuted} />}
        <Text style={[styles.metaText, metaMono]}>
          {thread.replyCount === 1
            ? t('channelScreen_replyCountOne', { count: thread.replyCount })
            : t('channelScreen_replyCountMany', { count: thread.replyCount })}
        </Text>
        <Text style={[styles.metaDot, diffuse && { color: dt.colors.ink4 }]}>{t('common_dotSeparator')}</Text>
        <Text style={[styles.metaText, metaMono]}>{timeAgo(thread.createdAt)}</Text>
      </View>
    </Pressable>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
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
    color: colors.textMuted,
  },
  metaDot: {
    color: colors.textMuted,
  },
})
