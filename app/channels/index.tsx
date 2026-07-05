import { useEffect, useMemo } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getChannels } from '../../lib/channels'
import { useChannelsStore } from '../../store/useChannelsStore'
import { ChannelCard } from '../../components/channels/ChannelCard'
import { typography, spacing, useTheme, font } from '../../constants/theme'
import { useTranslation } from '../../lib/i18n'
import type { Channel } from '../../lib/channels'

export default function ChannelBrowser() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const { channels, loading, setChannels, setLoading } = useChannelsStore()

  useEffect(() => {
    loadChannels()
  }, [])

  async function loadChannels() {
    setLoading(true)
    try {
      const data = await getChannels()
      setChannels(data)
    } catch {
      // empty state
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>{t('channelBrowser_title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          {t('channelBrowser_subtitle')}
        </Text>

        {channels.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{t('channelBrowser_emptyIcon')}</Text>
            <Text style={styles.emptyTitle}>{t('channelBrowser_emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('channelBrowser_emptySubtitle')}
            </Text>
            <Pressable
              onPress={() => router.push('/channel/create')}
              accessibilityRole="button"
              style={styles.emptyCta}
            >
              <Ionicons name="add" size={18} color={colors.textInverse} />
              <Text style={styles.emptyCtaText}>{t('channelBrowser_createCta')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={channels}
            renderItem={({ item }: { item: Channel }) => (
              <ChannelCard
                channel={item}
                onPress={() => router.push(`/channels/${item.id}`)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshing={loading}
            onRefresh={loadChannels}
          />
        )}
      </View>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.caption,
    paddingHorizontal: spacing['2xl'],
    marginBottom: 20,
  },
  list: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 40,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12, fontFamily: font.display },
  emptyTitle: {
    ...typography.title,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  emptyCtaText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
  },
})
