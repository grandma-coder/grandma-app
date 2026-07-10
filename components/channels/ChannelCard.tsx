import { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Hash, Lock, Users, ChevronRight } from 'lucide-react-native'
import { PaperCard } from '../ui/PaperCard'
import { useTheme, useDiffuseTheme, diffuseFont } from '../../constants/theme'
import { useIsDiffuse } from '../ui/diffuse/DiffuseKit'
import { DiffuseBloomIcon } from '../ui/diffuse/DiffusePrimitives'
import type { Channel } from '../../lib/channels'
import { useTranslation } from '../../lib/i18n'

interface ChannelCardProps {
  channel: Channel
  onPress?: () => void
}

export function ChannelCard({ channel, onPress }: ChannelCardProps) {
  const { colors } = useTheme()
  const diffuse = useIsDiffuse()
  const dt = useDiffuseTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const isPrivate = channel.channelType === 'private'
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <PaperCard radius={28} padding={20} style={styles.container}>
        <View style={styles.row}>
          {diffuse ? (
            <View style={[styles.avatar, { backgroundColor: 'transparent', borderRadius: 20, borderWidth: 1, borderColor: dt.colors.line2 }]}>
              <DiffuseBloomIcon size={26}>
                {isPrivate
                  ? <Lock size={16} color={dt.colors.ink3} strokeWidth={1.7} />
                  : <Hash size={16} color={dt.colors.ink3} strokeWidth={1.7} />}
              </DiffuseBloomIcon>
            </View>
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{isPrivate ? '🔒' : '#'}</Text>
            </View>
          )}
          <View style={styles.content}>
            <Text style={[styles.name, diffuse && { fontFamily: diffuseFont.bodySemiBold, color: dt.colors.ink, fontWeight: undefined }]}>{channel.name}</Text>
            {channel.description && (
              <Text style={[styles.description, diffuse && { fontFamily: diffuseFont.body, color: dt.colors.ink3 }]} numberOfLines={2}>{channel.description}</Text>
            )}
            <View style={styles.metaRow}>
              {diffuse
                ? <Users size={11} color={dt.colors.ink3} strokeWidth={1.7} />
                : <Ionicons name="people-outline" size={12} color={colors.textMuted} />}
              <Text style={[styles.metaText, diffuse && metaMono(dt.colors.ink3)]}>{t('channelCard_memberCount', { count: channel.memberCount })}</Text>
              <Text style={[styles.metaDot, diffuse && metaMono(dt.colors.ink4)]}>{t('common_dotSeparator')}</Text>
              <Text style={[styles.metaText, diffuse && metaMono(dt.colors.ink3)]}>{channel.category}</Text>
            </View>
          </View>
          {diffuse
            ? <ChevronRight size={18} color={dt.colors.ink3} strokeWidth={1.7} />
            : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
        </View>
      </PaperCard>
    </Pressable>
  )
}

const metaMono = (color: string) => ({
  fontFamily: diffuseFont.mono,
  color,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.8,
})

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
