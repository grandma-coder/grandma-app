import { useEffect } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getChannels } from '../../lib/channels'
import { useChannelsStore } from '../../store/useChannelsStore'
import { CosmicBackground } from '../../components/ui/CosmicBackground'
import { ChannelCard } from '../../components/channels/ChannelCard'
import { colors, typography, spacing } from '../../constants/theme'
import type { Channel } from '../../lib/channels'

export default function ChannelBrowser() {
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
    <CosmicBackground>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Channels</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          Join discussions with other parents, nannies, and future parents.
        </Text>

        {channels.length === 0 && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No channels yet</Text>
            <Text style={styles.emptySubtitle}>
              Community channels for birth stories, breastfeeding, recipes, and local meetups are coming soon.
            </Text>
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
    </CosmicBackground>
  )
}

const styles = StyleSheet.create({
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
    marginBottom: 12, fontFamily: 'Fraunces_600SemiBold' },
  emptyTitle: {
    ...typography.title,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})
